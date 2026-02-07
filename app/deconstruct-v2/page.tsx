'use client';

import { useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';

import MatterNode from '../components/MatterNode';
import { calculateRadialLayout } from '../utils/layoutUtils';

interface IdentificationResult {
  name: string;
  category: string;
  brief_description: string;
}

interface DeconstructionPart {
  name: string;
  description: string;
  is_raw_material: boolean;
}

interface DeconstructionResult {
  parent_item: string;
  parts: DeconstructionPart[];
}

interface TreeNode {
  id: string;
  name: string;
  description: string;
  isRawMaterial: boolean;
  children: TreeNode[];
  isExpanded: boolean;
}

interface KnowledgeCardData {
  title: string;
  doc_number: string;
  steps: {
    step_number: number;
    action_title: string;
    description: string;
    parameters: { label: string; value: string }[];
    ai_image_prompt: string;
  }[];
}

const nodeTypes = {
  matterNode: MatterNode,
};

export default function DeconstructionGameV2() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [identificationResult, setIdentificationResult] = useState<IdentificationResult | null>(null);
  const [deconstructionTree, setDeconstructionTree] = useState<TreeNode | null>(null);
  const [isDeconstructing, setIsDeconstructing] = useState(false);
  const [loadingNodeIds, setLoadingNodeIds] = useState<Set<string>>(new Set());
  const [knowledgeCard, setKnowledgeCard] = useState<{ node: TreeNode; data: KnowledgeCardData } | null>(null);
  const [loadingKnowledge, setLoadingKnowledge] = useState(false);
  const [knowledgeCache, setKnowledgeCache] = useState<Map<string, KnowledgeCardData>>(new Map());
  const [loadingKnowledgeIds, setLoadingKnowledgeIds] = useState<Set<string>>(new Set());

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // 知识卡片请求队列
  const knowledgeRequestQueue = useState(() => {
    let activeRequests = 0;
    const maxConcurrent = 4;
    const highPriorityQueue: Array<() => Promise<void>> = [];
    const lowPriorityQueue: Array<() => Promise<void>> = [];

    const processQueue = async () => {
      if (activeRequests >= maxConcurrent) return;
      const task = highPriorityQueue.shift() || lowPriorityQueue.shift();
      if (!task) return;
      activeRequests++;
      try {
        await task();
      } finally {
        activeRequests--;
        processQueue();
      }
    };

    return {
      enqueue: (task: () => Promise<void>, highPriority: boolean = false) => {
        if (highPriority) {
          highPriorityQueue.push(task);
        } else {
          lowPriorityQueue.push(task);
        }
        processQueue();
      }
    };
  })[0];

  // 高亮显示文本中的子节点名称
  const highlightChildrenNames = (text: string, childrenNames: string[]) => {
    if (!text || childrenNames.length === 0) return text;
    const sortedNames = [...childrenNames].sort((a, b) => b.length - a.length);
    const pattern = sortedNames.map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const regex = new RegExp(`(${pattern})`, 'g');
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, index) => {
          if (sortedNames.includes(part)) {
            return (
              <span key={index} className="font-bold text-red-400">
                {part}
              </span>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </>
    );
  };

  // 压缩图片
  const compressImage = async (file: File, maxWidth: number = 800, maxHeight: number = 800, quality: number = 0.8): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement('img');
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('无法获取canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('图片压缩失败'));
                return;
              }
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = () => reject(new Error('图片加载失败'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsDataURL(file);
    });
  };

  // 处理图片上传
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedFile = await compressImage(file);
        setImageFile(compressedFile);
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(compressedFile);
        setIdentificationResult(null);
        setDeconstructionTree(null);
        setNodes([]);
        setEdges([]);
      } catch (error) {
        console.error('图片压缩失败:', error);
        alert('图片处理失败，请重试');
      }
    }
  };

  // 识别图片
  const identifyImage = async () => {
    if (!imageFile) return;
    setIsIdentifying(true);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      const response = await fetch('/api/identify', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error('识别失败');
      }
      const result: IdentificationResult = await response.json();
      setIdentificationResult(result);
    } catch (error) {
      console.error('识别错误:', error);
      alert('识别失败，请重试');
    } finally {
      setIsIdentifying(false);
    }
  };

  // 更新图形布局
  const updateGraphLayout = useCallback((tree: TreeNode) => {
    const { nodes: layoutNodes, edges: layoutEdges } = calculateRadialLayout(tree, {
      centerX: 600,
      centerY: 400,
      radiusStep: 280,
      angleOffset: 0,
    });

    // 为每个节点添加交互回调
    const enhancedNodes = layoutNodes.map((node) => {
      const treeNode = findNodeById(tree, node.id);
      if (!treeNode) return node;

      return {
        ...node,
        data: {
          ...node.data,
          isLoading: loadingNodeIds.has(node.id),
          hasKnowledgeCard: knowledgeCache.has(node.id),
          isLoadingKnowledge: loadingKnowledgeIds.has(node.id),
          onExpand: () => handleNodeExpand(node.id, treeNode.name),
          onShowKnowledge: () => fetchKnowledgeCard(treeNode, true),
        },
      };
    });

    setNodes(enhancedNodes);
    setEdges(layoutEdges);
  }, [loadingNodeIds, knowledgeCache, loadingKnowledgeIds]);

  // 查找节点
  const findNodeById = (tree: TreeNode | null, id: string): TreeNode | null => {
    if (!tree) return null;
    if (tree.id === id) return tree;
    for (const child of tree.children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
    return null;
  };

  // 继续在下一部分...
