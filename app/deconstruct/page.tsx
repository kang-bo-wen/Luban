'use client';

import { useState } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';

// 动态导入 GraphView 以避免 SSR 问题
const GraphView = dynamic(() => import('../components/GraphView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[700px] flex items-center justify-center bg-black/30 rounded-lg">
      <div className="text-gray-400">加载中...</div>
    </div>
  ),
});

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

export default function DeconstructionGame() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [identificationResult, setIdentificationResult] = useState<IdentificationResult | null>(null);
  const [deconstructionTree, setDeconstructionTree] = useState<TreeNode | null>(null);
  const [isDeconstructing, setIsDeconstructing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>(''); // 新增：显示当前处理状态
  const [loadingNodeIds, setLoadingNodeIds] = useState<Set<string>>(new Set()); // 跟踪正在加载的节点
  const [knowledgeCard, setKnowledgeCard] = useState<{ node: TreeNode; data: KnowledgeCardData } | null>(null); // 知识卡片状态
  const [loadingKnowledge, setLoadingKnowledge] = useState(false); // 知识卡片加载状态
  const [knowledgeCache, setKnowledgeCache] = useState<Map<string, KnowledgeCardData>>(new Map()); // 知识卡片缓存
  const [loadingKnowledgeIds, setLoadingKnowledgeIds] = useState<Set<string>>(new Set()); // 跟踪正在加载知识卡片的节点

  // 高亮显示文本中的子节点名称
  const highlightChildrenNames = (text: string, childrenNames: string[]) => {
    if (!text || childrenNames.length === 0) return text;

    // 按长度从长到短排序，避免短名称先匹配导致长名称无法匹配
    const sortedNames = [...childrenNames].sort((a, b) => b.length - a.length);

    // 创建正则表达式，匹配所有子节点名称
    const pattern = sortedNames.map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const regex = new RegExp(`(${pattern})`, 'g');

    // 分割文本并高亮匹配的部分
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

  // 知识卡片请求队列（限制并发数，支持优先级）
  const knowledgeRequestQueue = useState(() => {
    let activeRequests = 0;
    const maxConcurrent = 4; // 最多同时4个请求
    const highPriorityQueue: Array<() => Promise<void>> = []; // 高优先级队列（前台请求）
    const lowPriorityQueue: Array<() => Promise<void>> = []; // 低优先级队列（后台预加载）

    const processQueue = async () => {
      if (activeRequests >= maxConcurrent) return;

      // 优先处理高优先级队列
      const task = highPriorityQueue.shift() || lowPriorityQueue.shift();
      if (!task) return;

      activeRequests++;
      try {
        await task();
      } finally {
        activeRequests--;
        processQueue(); // 处理下一个任务
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

          // 计算缩放比例
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
        // 压缩图片
        const compressedFile = await compressImage(file);
        setImageFile(compressedFile);

        // 生成预览
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(compressedFile);

        // 重置之前的结果
        setIdentificationResult(null);
        setDeconstructionTree(null);
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

  // 单层拆解（不递归）
  const deconstructItem = async (
    itemName: string,
    parentDescription: string,
    parentContext?: string
  ): Promise<TreeNode> => {
    setProcessingStatus(prev => prev + `\n🔍 正在拆解: ${itemName}`);

    const response = await fetch('/api/deconstruct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemName, parentContext }),
    });

    if (!response.ok) {
      throw new Error('拆解失败');
    }

    const result: DeconstructionResult = await response.json();

    setProcessingStatus(prev => prev + `\n✅ 获取到 ${result.parts.length} 个组成部分`);

    // 创建子节点（不递归拆解）
    const children: TreeNode[] = result.parts.map(part => ({
      id: `${Date.now()}-${Math.random()}-${part.name}`,
      name: part.name,
      description: part.description,
      isRawMaterial: part.is_raw_material,
      children: [],
      isExpanded: false,
    }));

    const currentNode: TreeNode = {
      id: `${Date.now()}-${itemName}`,
      name: itemName,
      description: parentDescription,
      isRawMaterial: false,
      children,
      isExpanded: false,
    };

    return currentNode;
  };

  // 开始初始拆解（只拆解第一层）
  const startDeconstruction = async () => {
    if (!identificationResult) return;

    setIsDeconstructing(true);
    setDeconstructionTree(null);
    setProcessingStatus('🚀 开始拆解第一层...');

    try {
      const tree = await deconstructItem(
        identificationResult.name,
        identificationResult.brief_description
      );
      setDeconstructionTree(tree);
      setProcessingStatus(prev => prev + '\n\n✅ 第一层拆解完成！点击节点继续拆解');

      // 后台预加载知识卡片（不阻塞）
      if (tree.children.length > 0) {
        fetchKnowledgeCard(tree, false);
      }
    } catch (error) {
      console.error('拆解错误:', error);
      alert('拆解失败，请重试');
      setProcessingStatus(prev => prev + '\n\n❌ 拆解失败');
    } finally {
      setIsDeconstructing(false);
    }
  };

  // 处理节点点击（展开拆解）
  const handleNodeClick = async (nodeId: string, nodeName: string, parentContext?: string) => {
    // 如果节点正在加载中，不响应点击
    if (loadingNodeIds.has(nodeId)) return;

    // 如果是原材料，不能继续拆解
    const findNode = (tree: TreeNode | null, id: string): TreeNode | null => {
      if (!tree) return null;
      if (tree.id === id) return tree;
      for (const child of tree.children) {
        const found = findNode(child, id);
        if (found) return found;
      }
      return null;
    };

    const targetNode = findNode(deconstructionTree, nodeId);
    if (!targetNode || targetNode.isRawMaterial) return;

    // 如果已经展开过，只是切换展开状态
    if (targetNode.children.length > 0) {
      setDeconstructionTree(prevTree => {
        if (!prevTree) return null;
        const updateNode = (node: TreeNode): TreeNode => {
          if (node.id === nodeId) {
            return { ...node, isExpanded: !node.isExpanded };
          }
          return {
            ...node,
            children: node.children.map(updateNode),
          };
        };
        return updateNode(prevTree);
      });
      return;
    }

    // 如果还没有拆解过，进行拆解
    setProcessingStatus(prev => prev + `\n\n🔍 点击拆解: ${nodeName}`);

    // 添加到加载集合
    setLoadingNodeIds(prev => new Set(prev).add(nodeId));

    try {
      const response = await fetch('/api/deconstruct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemName: nodeName, parentContext }),
      });

      if (!response.ok) {
        throw new Error('拆解失败');
      }

      const result: DeconstructionResult = await response.json();

      setProcessingStatus(prev => prev + `\n✅ 获取到 ${result.parts.length} 个组成部分`);

      // 创建子节点
      const children: TreeNode[] = result.parts.map(part => ({
        id: `${Date.now()}-${Math.random()}-${part.name}`,
        name: part.name,
        description: part.description,
        isRawMaterial: part.is_raw_material,
        children: [],
        isExpanded: false,
      }));

      // 更新树结构
      setDeconstructionTree(prevTree => {
        if (!prevTree) return null;
        const updateNode = (node: TreeNode): TreeNode => {
          if (node.id === nodeId) {
            return { ...node, children, isExpanded: true };
          }
          return {
            ...node,
            children: node.children.map(updateNode),
          };
        };
        return updateNode(prevTree);
      });

      // 后台预加载知识卡片（不阻塞）
      const updatedNode: TreeNode = {
        id: nodeId,
        name: nodeName,
        description: targetNode?.description || '',
        isRawMaterial: false,
        children,
        isExpanded: true
      };
      fetchKnowledgeCard(updatedNode, false);
    } catch (error) {
      console.error('拆解错误:', error);
      alert('拆解失败，请重试');
      setProcessingStatus(prev => prev + `\n❌ 拆解 ${nodeName} 失败`);
    } finally {
      // 从加载集合中移除
      setLoadingNodeIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(nodeId);
        return newSet;
      });
    }
  };

  // 获取知识卡片内容（后台静默加载，不阻塞）
  const fetchKnowledgeCard = async (node: TreeNode, showModal: boolean = true): Promise<void> => {
    if (!node.children || node.children.length === 0) return;

    // 检查缓存
    if (knowledgeCache.has(node.id)) {
      if (showModal) {
        setKnowledgeCard({ node, data: knowledgeCache.get(node.id)! });
      }
      return;
    }

    // 检查是否已经在加载中，避免重复请求
    if (loadingKnowledgeIds.has(node.id)) {
      console.log(`知识卡片 ${node.name} 已在加载中，跳过重复请求`);
      return;
    }

    // 标记为加载中
    setLoadingKnowledgeIds(prev => new Set(prev).add(node.id));

    // 将请求加入队列（前台请求高优先级，后台预加载低优先级）
    knowledgeRequestQueue.enqueue(async () => {
      if (showModal) {
        setLoadingKnowledge(true);
      }

      try {
        const response = await fetch('/api/knowledge-card', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parentName: node.name,
            parentDescription: node.description,
            children: node.children.map(c => ({
              name: c.name,
              description: c.description,
              isRawMaterial: c.isRawMaterial
            }))
          }),
        });

        if (!response.ok) {
          throw new Error('获取知识卡片失败');
        }

        const data: KnowledgeCardData = await response.json();

        // 存入缓存
        setKnowledgeCache(prev => new Map(prev).set(node.id, data));

        if (showModal) {
          setKnowledgeCard({ node, data });
        }

        console.log(`知识卡片 ${node.name} 加载完成并已缓存`);
      } catch (error) {
        console.error('知识卡片错误:', error);
        if (showModal) {
          alert('获取知识卡片失败，请重试');
        }
      } finally {
        // 从加载集合中移除
        setLoadingKnowledgeIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(node.id);
          return newSet;
        });

        if (showModal) {
          setLoadingKnowledge(false);
        }
      }
    }, showModal); // showModal为true时高优先级，false时低优先级
  };

  // 渲染拆解树（带点击交互）
  const renderTree = (node: TreeNode, depth: number = 0, parentName?: string) => {
    const indent = depth * 24;
    const canExpand = !node.isRawMaterial;
    const hasChildren = node.children.length > 0;
    const isLoading = loadingNodeIds.has(node.id);

    return (
      <div key={node.id} style={{ marginLeft: `${indent}px` }} className="my-2">
        <div
          className={`p-3 rounded-lg transition-all ${
            node.isRawMaterial
              ? 'bg-green-500/20 border-2 border-green-500'
              : isLoading
              ? 'bg-gray-500/20 border-2 border-gray-500 cursor-not-allowed'
              : 'bg-blue-500/20 border-2 border-blue-500 cursor-pointer hover:bg-blue-500/30'
          }`}
          onClick={() => canExpand && !isLoading && handleNodeClick(node.id, node.name, parentName)}
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">
              {isLoading ? (
                <span className="inline-block animate-spin">🔄</span>
              ) : node.isRawMaterial ? (
                '🌿'
              ) : hasChildren ? (
                node.isExpanded ? '📂' : '📦'
              ) : (
                '📦'
              )}
            </span>
            <div className="flex-1">
              <div className="font-bold text-lg">{node.name}</div>
              <div className="text-sm text-gray-300">{node.description}</div>
              {node.isRawMaterial && (
                <div className="text-xs text-green-400 mt-1">✅ 自然材料 - 拆解终点</div>
              )}
              {isLoading && (
                <div className="text-xs text-yellow-400 mt-1">⏳ 正在拆解中...</div>
              )}
              {!node.isRawMaterial && !hasChildren && !isLoading && (
                <div className="text-xs text-blue-400 mt-1">👆 点击拆解此组件</div>
              )}
              {!node.isRawMaterial && hasChildren && !node.isExpanded && !isLoading && (
                <div className="text-xs text-blue-400 mt-1">👆 点击展开 ({node.children.length} 个子组件)</div>
              )}
              {!node.isRawMaterial && hasChildren && node.isExpanded && !isLoading && (
                <div className="text-xs text-gray-400 mt-1">👆 点击折叠</div>
              )}
            </div>
            {/* 知识卡片按钮 - 只在知识卡片已缓存时显示 */}
            {!node.isRawMaterial && hasChildren && knowledgeCache.has(node.id) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  fetchKnowledgeCard(node);
                }}
                className="px-3 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 rounded-lg transition-all text-sm flex items-center gap-1"
                title="查看知识卡片"
              >
                <span>💡</span>
                <span className="hidden sm:inline">知识</span>
              </button>
            )}
            {/* 知识卡片加载中提示 */}
            {!node.isRawMaterial && hasChildren && !knowledgeCache.has(node.id) && loadingKnowledgeIds.has(node.id) && (
              <div className="px-3 py-2 bg-gray-500/20 border border-gray-500/50 rounded-lg text-sm flex items-center gap-1 text-gray-400">
                <span className="inline-block animate-spin">🔄</span>
                <span className="hidden sm:inline text-xs">加载中</span>
              </div>
            )}
          </div>
        </div>
        {hasChildren && node.isExpanded && (
          <div className="mt-2">
            {node.children.map(child => renderTree(child, depth + 1, node.name))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* 标题区域 - 更现代化的设计 */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            🔬 Entropy Reverse
          </h1>
          <p className="text-xl text-gray-300">
            物体拆解游戏 - 探索万物的本质
          </p>
        </div>

        {/* 知识卡片弹窗 */}
        {knowledgeCard && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setKnowledgeCard(null)}
          >
            <div
              className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 max-w-2xl w-full border-2 border-yellow-500/50 shadow-2xl max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <span>💡</span>
                  <span>知识卡片：{knowledgeCard.node.name}</span>
                </h3>
                <button
                  onClick={() => setKnowledgeCard(null)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>

              {loadingKnowledge ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <span className="text-4xl animate-spin">🔄</span>
                    <span className="text-gray-400">正在生成知识卡片...</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* 标题和文档编号 */}
                  <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg p-4 border border-yellow-500/30">
                    <div className="text-xl font-bold text-yellow-300">{knowledgeCard.data.title}</div>
                    <div className="text-sm text-gray-400 mt-1">文档编号: {knowledgeCard.data.doc_number}</div>
                  </div>

                  {/* 流程步骤 */}
                  <div className="space-y-4">
                    {knowledgeCard.data.steps.map((step, idx) => (
                      <div key={idx} className="relative">
                        {/* 步骤卡片 */}
                        <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg p-4 border-2 border-blue-500/50 hover:border-blue-400/70 transition-all">
                          <div className="flex items-start gap-3">
                            {/* 步骤编号 */}
                            <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center font-bold text-lg">
                              {step.step_number}
                            </div>

                            <div className="flex-1">
                              {/* 步骤标题 */}
                              <div className="text-lg font-bold text-blue-300 mb-2">
                                {step.action_title}
                              </div>

                              {/* 步骤描述 */}
                              <div className="text-gray-300 text-sm mb-3">
                                {highlightChildrenNames(
                                  step.description,
                                  knowledgeCard.node.children.map(c => c.name)
                                )}
                              </div>

                              {/* 参数列表 */}
                              {step.parameters.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {step.parameters.map((param, pidx) => (
                                    <div key={pidx} className="bg-black/30 rounded px-3 py-1 text-xs border border-gray-600">
                                      <span className="text-gray-400">{param.label}:</span>
                                      <span className="text-white ml-1 font-semibold">{param.value}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 连接箭头 */}
                        {idx < knowledgeCard.data.steps.length - 1 && (
                          <div className="flex justify-center my-2">
                            <div className="text-3xl text-blue-400">↓</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* 组成部分总结 */}
                  <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/30">
                    <div className="text-sm text-blue-300 font-semibold mb-2">
                      📦 使用的组成部分
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {knowledgeCard.node.children.map((child, idx) => (
                        <div key={idx} className="bg-black/30 rounded-full px-3 py-1 text-sm border border-gray-600 flex items-center gap-1">
                          <span className="text-white">{child.name}</span>
                          {child.isRawMaterial && <span className="text-green-400 text-xs">🌿</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 步骤1: 上传图片 */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 mb-6 border-2 border-white/10 hover:border-white/20 transition-all shadow-2xl">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <span className="text-4xl">📸</span>
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              步骤1: 上传图片
            </span>
          </h2>
          <div className="flex flex-col items-center gap-4">
            <label className="cursor-pointer bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 px-8 py-4 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105">
              选择图片
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>

            {imagePreview && (
              <div className="relative w-full max-w-md h-64 bg-black/30 rounded-lg overflow-hidden">
                <Image
                  src={imagePreview}
                  alt="预览"
                  fill
                  className="object-contain"
                />
              </div>
            )}

            {imageFile && !identificationResult && (
              <button
                onClick={identifyImage}
                disabled={isIdentifying}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-500 px-8 py-3 rounded-lg font-semibold transition flex items-center gap-2"
              >
                {isIdentifying ? (
                  <>
                    <span className="inline-block animate-spin">🔄</span>
                    <span>识别中...</span>
                  </>
                ) : (
                  '🔍 识别物体'
                )}
              </button>
            )}
          </div>
        </div>

        {/* 步骤2: 识别结果 */}
        {identificationResult && (
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 mb-6 border-2 border-white/10 hover:border-white/20 transition-all shadow-2xl">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
              <span className="text-4xl">✅</span>
              <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                步骤2: 识别结果
              </span>
            </h2>
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl p-6 border border-white/10">
              <div className="text-2xl font-bold mb-3 text-white">{identificationResult.name}</div>
              <div className="text-sm text-gray-300 mb-3">
                分类: {identificationResult.category}
              </div>
              <div className="text-gray-200">
                {identificationResult.brief_description}
              </div>
            </div>

            {!deconstructionTree && (
              <button
                onClick={startDeconstruction}
                disabled={isDeconstructing}
                className="mt-4 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-500 px-8 py-3 rounded-lg font-semibold transition flex items-center gap-2"
              >
                {isDeconstructing ? (
                  <>
                    <span className="inline-block animate-spin">🔄</span>
                    <span>拆解中...</span>
                  </>
                ) : (
                  '🔨 开始拆解（第一层）'
                )}
              </button>
            )}

            {deconstructionTree && (
              <div className="mt-4 bg-blue-500/20 rounded-lg p-4 border border-blue-500/50">
                <div className="text-sm text-blue-300">
                  💡 <strong>交互提示：</strong>点击蓝色节点继续拆解，绿色节点是自然材料（拆解终点）
                </div>
              </div>
            )}
          </div>
        )}

        {/* 步骤3: 拆解图谱 */}
        {deconstructionTree && (
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border-2 border-white/10 hover:border-white/20 transition-all shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold flex items-center gap-3">
                <span className="text-4xl">🌌</span>
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  步骤3: 拆解图谱
                </span>
              </h2>
              <button
                onClick={() => {
                  const element = document.getElementById('graph-container');
                  if (element) {
                    if (document.fullscreenElement) {
                      document.exitFullscreen();
                    } else {
                      element.requestFullscreen();
                    }
                  }
                }}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl text-white font-semibold transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <span>🔍</span>
                <span>全屏查看</span>
              </button>
            </div>
            <div className="mb-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl p-4 border border-blue-400/30">
              <div className="text-sm text-blue-200">
                💡 <strong>交互提示：</strong>点击蓝色节点继续拆解，绿色节点是自然材料（拆解终点）。使用鼠标滚轮缩放，拖拽画布移动视图。
              </div>
            </div>
            <div id="graph-container" className="bg-black/50 rounded-xl">
              <GraphView
                tree={deconstructionTree}
                loadingNodeIds={loadingNodeIds}
                knowledgeCache={knowledgeCache}
                loadingKnowledgeIds={loadingKnowledgeIds}
                onNodeExpand={handleNodeClick}
                onShowKnowledge={(node) => fetchKnowledgeCard(node, true)}
              />
            </div>
          </div>
        )}

        {/* 实时处理日志 */}
        {processingStatus && (
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 mt-6 border border-white/20">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-2xl font-semibold">📋 处理日志</h2>
              {isDeconstructing && (
                <div className="flex items-center gap-2 text-yellow-400">
                  <div className="text-2xl animate-spin">🔄</div>
                  <span className="text-sm font-semibold">正在拆解中...</span>
                </div>
              )}
            </div>
            <div className="bg-black/50 rounded-lg p-4 max-h-[400px] overflow-y-auto font-mono text-sm">
              <pre className="whitespace-pre-wrap text-gray-300">{processingStatus}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
