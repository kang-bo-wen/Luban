'use client';

import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

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
  icon: string;
  imageUrl?: string;
  searchTerm?: string;
}

interface DeconstructionPart {
  name: string;
  description: string;
  is_raw_material: boolean;
  icon: string;
  imageUrl?: string;
  searchTerm?: string;
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
  icon?: string;
  imageUrl?: string;
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

function DeconstructionGameContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [identificationResult, setIdentificationResult] = useState<IdentificationResult | null>(null);
  const [deconstructionTree, setDeconstructionTree] = useState<TreeNode | null>(null);
  const [isDeconstructing, setIsDeconstructing] = useState(false);
  const [loadingNodeIds, setLoadingNodeIds] = useState<Set<string>>(new Set()); // 跟踪正在加载的节点
  const [knowledgeCard, setKnowledgeCard] = useState<{ node: TreeNode; data: KnowledgeCardData } | null>(null); // 知识卡片状态
  const [loadingKnowledge, setLoadingKnowledge] = useState(false); // 知识卡片加载状态
  const [knowledgeCache, setKnowledgeCache] = useState<Map<string, KnowledgeCardData>>(new Map()); // 知识卡片缓存
  const [loadingKnowledgeIds, setLoadingKnowledgeIds] = useState<Set<string>>(new Set()); // 跟踪正在加载知识卡片的节点
  const [isFullscreen, setIsFullscreen] = useState(false); // 跟踪全屏状态

  // Session management state
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [sessionCache, setSessionCache] = useState<Map<string, any>>(new Map()); // 会话缓存
  const [isLoadingSession, setIsLoadingSession] = useState(false); // 会话加载状态

  // Prompt 自定义相关状态
  const [showPromptSettings, setShowPromptSettings] = useState(false); // 是否显示设置面板
  const [promptMode, setPromptMode] = useState<'simple' | 'advanced'>('simple'); // 模式
  const [humorLevel, setHumorLevel] = useState(50); // 幽默度 0-100
  const [professionalLevel, setProfessionalLevel] = useState(70); // 专业度 0-100
  const [customPrompt, setCustomPrompt] = useState(''); // 自定义 prompt

  // 监听全屏状态变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // 从 localStorage 恢复状态
  useEffect(() => {
    // 如果 URL 中有 sessionId，跳过 localStorage 恢复，等待从数据库加载
    const sessionId = searchParams.get('sessionId');
    if (sessionId) {
      return;
    }

    const savedTree = localStorage.getItem('deconstructionTree');
    const savedIdentification = localStorage.getItem('identificationResult');
    const savedImagePreview = localStorage.getItem('imagePreview');
    const savedKnowledgeCache = localStorage.getItem('knowledgeCache');

    if (savedTree) {
      try {
        setDeconstructionTree(JSON.parse(savedTree));
      } catch (error) {
        console.error('恢复拆解树失败:', error);
      }
    }

    if (savedIdentification) {
      try {
        setIdentificationResult(JSON.parse(savedIdentification));
      } catch (error) {
        console.error('恢复识别结果失败:', error);
      }
    }

    if (savedImagePreview) {
      setImagePreview(savedImagePreview);
    }

    if (savedKnowledgeCache) {
      try {
        const cacheArray = JSON.parse(savedKnowledgeCache);
        setKnowledgeCache(new Map(cacheArray));
      } catch (error) {
        console.error('恢复知识卡片缓存失败:', error);
      }
    }

    // 恢复 prompt 设置
    const savedHumor = localStorage.getItem('humorLevel');
    const savedProfessional = localStorage.getItem('professionalLevel');
    const savedMode = localStorage.getItem('promptMode');
    const savedCustom = localStorage.getItem('customPrompt');

    if (savedHumor) setHumorLevel(Number(savedHumor));
    if (savedProfessional) setProfessionalLevel(Number(savedProfessional));
    if (savedMode) setPromptMode(savedMode as 'simple' | 'advanced');
    if (savedCustom) setCustomPrompt(savedCustom);
  }, [searchParams]);

  // 保存拆解树到 localStorage
  useEffect(() => {
    if (deconstructionTree) {
      localStorage.setItem('deconstructionTree', JSON.stringify(deconstructionTree));
    }
  }, [deconstructionTree]);

  // 保存识别结果到 localStorage
  useEffect(() => {
    if (identificationResult) {
      localStorage.setItem('identificationResult', JSON.stringify(identificationResult));
    }
  }, [identificationResult]);

  // 保存图片预览到 localStorage
  useEffect(() => {
    if (imagePreview) {
      localStorage.setItem('imagePreview', imagePreview);
    }
  }, [imagePreview]);

  // 保存知识卡片缓存到 localStorage
  useEffect(() => {
    if (knowledgeCache.size > 0) {
      const cacheArray = Array.from(knowledgeCache.entries());
      localStorage.setItem('knowledgeCache', JSON.stringify(cacheArray));
    }
  }, [knowledgeCache]);

  // 保存 prompt 设置到 localStorage（防抖优化）
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('humorLevel', String(humorLevel));
      localStorage.setItem('professionalLevel', String(professionalLevel));
      localStorage.setItem('promptMode', promptMode);
      if (customPrompt) localStorage.setItem('customPrompt', customPrompt);
    }, 500); // 500ms 防抖

    return () => clearTimeout(timer);
  }, [humorLevel, professionalLevel, promptMode, customPrompt]);

  // 检查 URL 中的 sessionId 并加载会话
  useEffect(() => {
    const sessionId = searchParams.get('sessionId');
    if (sessionId && status === 'authenticated') {
      loadSession(sessionId);
    }
  }, [searchParams, status]);

  // 自动创建会话（当识别结果和拆解树都存在时）
  useEffect(() => {
    if (!identificationResult || !deconstructionTree || currentSessionId || status !== 'authenticated') return;

    // 自动创建新会话
    const createSession = async () => {
      try {
        // 读取节点位置
        const savedPositions = localStorage.getItem('nodePositions');
        const nodePositions = savedPositions ? JSON.parse(savedPositions) : undefined;

        const response = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `${identificationResult.name} 拆解`,
            treeData: deconstructionTree,
            promptSettings: {
              humorLevel,
              professionalLevel,
              promptMode,
              customPrompt: promptMode === 'advanced' ? customPrompt : undefined
            },
            knowledgeCache: knowledgeCache.size > 0
              ? Array.from(knowledgeCache.entries())
              : undefined,
            nodePositions,
            identificationResult: identificationResult,
            rootObjectName: identificationResult.name,
            rootObjectIcon: identificationResult.icon,
            rootObjectImage: imagePreview
          })
        });

        if (response.ok) {
          const data = await response.json();
          setCurrentSessionId(data.session.id);
          router.push(`/deconstruct?sessionId=${data.session.id}`);
        }
      } catch (error) {
        console.error('自动创建会话失败:', error);
      }
    };

    createSession();
  }, [identificationResult, deconstructionTree, currentSessionId, status]);

  // 自动保存会话（每次拆解树更新后立即保存）
  useEffect(() => {
    if (!currentSessionId || !deconstructionTree || status !== 'authenticated') return;

    // 清除当前会话的缓存（因为内容已更改）
    if (sessionCache.has(currentSessionId)) {
      setSessionCache(prev => {
        const newCache = new Map(prev);
        newCache.delete(currentSessionId);
        return newCache;
      });
    }

    // 使用较短的防抖时间，确保用户操作后快速保存
    const timer = setTimeout(() => {
      saveSessionToDatabase(false);
    }, 2000); // 2秒防抖，确保快速保存

    return () => clearTimeout(timer);
  }, [deconstructionTree, knowledgeCache, currentSessionId, status]);

  // 从数据库加载会话
  const loadSession = async (sessionId: string) => {
    setIsLoadingSession(true); // 开始加载
    try {
      // 检查缓存
      if (sessionCache.has(sessionId)) {
        console.log('✨ 从缓存加载会话:', sessionId);
        const session = sessionCache.get(sessionId);

        // 恢复状态（从缓存）
        setDeconstructionTree(session.treeData);

        if (session.identificationResult) {
          setIdentificationResult(session.identificationResult);
        } else {
          setIdentificationResult({
            name: session.rootObjectName,
            category: '',
            brief_description: '',
            icon: session.rootObjectIcon || '',
            imageUrl: session.rootObjectImage
          });
        }

        setImagePreview(session.rootObjectImage);

        if (session.promptSettings) {
          setHumorLevel(session.promptSettings.humorLevel || 50);
          setProfessionalLevel(session.promptSettings.professionalLevel || 70);
          if (session.promptSettings.promptMode) {
            setPromptMode(session.promptSettings.promptMode);
          }
          if (session.promptSettings.customPrompt) {
            setCustomPrompt(session.promptSettings.customPrompt);
          }
        }

        if (session.knowledgeCache) {
          try {
            const cacheArray = session.knowledgeCache as [string, KnowledgeCardData][];
            const restoredCache = new Map<string, KnowledgeCardData>(cacheArray);
            setKnowledgeCache(restoredCache);
          } catch (error) {
            console.error('恢复知识卡片缓存失败:', error);
          }
        }

        // 恢复节点位置
        if (session.nodePositions) {
          try {
            localStorage.setItem('nodePositions', JSON.stringify(session.nodePositions));
            console.log('✅ 节点位置已恢复');
          } catch (error) {
            console.error('恢复节点位置失败:', error);
          }
        }

        setCurrentSessionId(sessionId);
        setIsLoadingSession(false); // 加载完成
        return; // 从缓存加载完成，直接返回
      }

      // 缓存中没有，从 API 加载
      console.log('🌐 从服务器加载会话:', sessionId);
      const response = await fetch(`/api/sessions/${sessionId}`);

      if (!response.ok) {
        throw new Error('加载会话失败');
      }

      const data = await response.json();

      // 提取 session 对象
      const session = data.session || data;

      // 保存到缓存
      setSessionCache(prev => new Map(prev).set(sessionId, session));

      // 恢复状态
      setDeconstructionTree(session.treeData);

      // 恢复识别结果 - 优先使用完整的 identificationResult，否则从单独字段构建
      if (session.identificationResult) {
        setIdentificationResult(session.identificationResult);
      } else {
        // 向后兼容：从单独字段构建
        setIdentificationResult({
          name: session.rootObjectName,
          category: '',
          brief_description: '',
          icon: session.rootObjectIcon || '',
          imageUrl: session.rootObjectImage
        });
      }

      setImagePreview(session.rootObjectImage);

      if (session.promptSettings) {
        setHumorLevel(session.promptSettings.humorLevel || 50);
        setProfessionalLevel(session.promptSettings.professionalLevel || 70);
        // 恢复提示词模式
        if (session.promptSettings.promptMode) {
          setPromptMode(session.promptSettings.promptMode);
        }
        // 恢复自定义提示词
        if (session.promptSettings.customPrompt) {
          setCustomPrompt(session.promptSettings.customPrompt);
        }
      }

      // 恢复知识卡片缓存
      if (session.knowledgeCache) {
        try {
          console.log('📚 恢复知识卡片缓存:', session.knowledgeCache);
          const cacheArray = session.knowledgeCache as [string, KnowledgeCardData][];
          const restoredCache = new Map<string, KnowledgeCardData>(cacheArray);
          console.log('✅ 知识卡片缓存已恢复，数量:', restoredCache.size);
          setKnowledgeCache(restoredCache);
        } catch (error) {
          console.error('恢复知识卡片缓存失败:', error);
        }
      } else {
        console.log('⚠️ 此会话没有保存知识卡片缓存');
      }

      // 恢复节点位置
      if (session.nodePositions) {
        try {
          localStorage.setItem('nodePositions', JSON.stringify(session.nodePositions));
          console.log('✅ 节点位置已恢复');
        } catch (error) {
          console.error('恢复节点位置失败:', error);
        }
      }

      setCurrentSessionId(sessionId);
    } catch (error) {
      console.error('❌ 加载会话错误:', error);
      alert('加载会话失败，请重试');
    } finally {
      setIsLoadingSession(false); // 加载完成（无论成功或失败）
    }
  };

  // 保存会话到数据库
  const saveSessionToDatabase = async (showSuccessMessage: boolean = true) => {
    if (!deconstructionTree || !identificationResult) return;

    setIsSaving(true);

    try {
      const method = currentSessionId ? 'PUT' : 'POST';
      const url = currentSessionId
        ? `/api/sessions/${currentSessionId}`
        : '/api/sessions';

      // 读取节点位置
      const savedPositions = localStorage.getItem('nodePositions');
      const nodePositions = savedPositions ? JSON.parse(savedPositions) : undefined;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: currentSessionId
            ? undefined
            : `${identificationResult.name} 拆解`,
          treeData: deconstructionTree,
          promptSettings: {
            humorLevel,
            professionalLevel,
            promptMode,
            customPrompt: promptMode === 'advanced' ? customPrompt : undefined
          },
          knowledgeCache: knowledgeCache.size > 0
            ? Array.from(knowledgeCache.entries())
            : undefined,
          nodePositions,
          identificationResult: identificationResult,
          rootObjectName: identificationResult.name,
          rootObjectIcon: identificationResult.icon,
          rootObjectImage: imagePreview
        })
      });

      if (!response.ok) {
        throw new Error('保存会话失败');
      }

      const data = await response.json();

      if (!currentSessionId) {
        setCurrentSessionId(data.session.id);
        router.push(`/deconstruct?sessionId=${data.session.id}`);
      }

      if (showSuccessMessage) {
        alert('保存成功！');
      }
    } catch (error) {
      console.error('保存会话错误:', error);
      if (showSuccessMessage) {
        alert('保存失败，请重试');
      }
    } finally {
      setIsSaving(false);
    }
  };

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
    parentContext?: string,
    parentIcon?: string,
    parentImageUrl?: string
  ): Promise<TreeNode> => {

    const response = await fetch('/api/deconstruct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemName,
        parentContext,
        // 传递 prompt 自定义参数
        promptOptions: {
          humorLevel,
          professionalLevel,
          customTemplate: promptMode === 'advanced' ? customPrompt : undefined
        }
      }),
    });

    if (!response.ok) {
      throw new Error('拆解失败');
    }

    const result: DeconstructionResult = await response.json();


    // 创建子节点（不递归拆解）
    const children: TreeNode[] = result.parts.map(part => ({
      id: `${Date.now()}-${Math.random()}-${part.name}`,
      name: part.name,
      description: part.description,
      isRawMaterial: part.is_raw_material,
      icon: part.icon,
      imageUrl: part.imageUrl,
      children: [],
      isExpanded: false,
    }));

    const currentNode: TreeNode = {
      id: `${Date.now()}-${itemName}`,
      name: itemName,
      description: parentDescription,
      isRawMaterial: false,
      icon: parentIcon,
      imageUrl: parentImageUrl,
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

    try {
      const tree = await deconstructItem(
        identificationResult.name,
        identificationResult.brief_description,
        undefined,
        identificationResult.icon,
        imagePreview || identificationResult.imageUrl // 使用原始上传的图片
      );
      setDeconstructionTree(tree);

      // 后台预加载知识卡片（不阻塞）
      if (tree.children.length > 0) {
        fetchKnowledgeCard(tree, false);
      }
    } catch (error) {
      console.error('拆解错误:', error);
      alert('拆解失败，请重试');
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
      const isCurrentlyExpanded = targetNode.isExpanded;
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

      // 如果是从折叠变为展开，且知识卡片未缓存，则尝试加载
      if (!isCurrentlyExpanded && !knowledgeCache.has(nodeId)) {
        fetchKnowledgeCard(targetNode, false);
      }
      return;
    }

    // 如果还没有拆解过，进行拆解

    // 添加到加载集合
    setLoadingNodeIds(prev => new Set(prev).add(nodeId));

    try {
      const response = await fetch('/api/deconstruct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName: nodeName,
          parentContext,
          // 传递 prompt 自定义参数
          promptOptions: {
            humorLevel,
            professionalLevel,
            customTemplate: promptMode === 'advanced' ? customPrompt : undefined
          }
        }),
      });

      if (!response.ok) {
        throw new Error('拆解失败');
      }

      const result: DeconstructionResult = await response.json();


      // 创建子节点
      const children: TreeNode[] = result.parts.map(part => ({
        id: `${Date.now()}-${Math.random()}-${part.name}`,
        name: part.name,
        description: part.description,
        isRawMaterial: part.is_raw_material,
        icon: part.icon,
        imageUrl: part.imageUrl,
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
      return;
    }

    // 标记为加载中
    setLoadingKnowledgeIds(prev => new Set(prev).add(node.id));

    // 将请求加入队列（前台请求高优先级，后台预加载低优先级）
    knowledgeRequestQueue.enqueue(async () => {
      if (showModal) {
        setLoadingKnowledge(true);
      }

      // 添加超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 120秒超时

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
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error('获取知识卡片失败');
        }

        const data: KnowledgeCardData = await response.json();

        // 存入缓存
        setKnowledgeCache(prev => new Map(prev).set(node.id, data));

        if (showModal) {
          setKnowledgeCard({ node, data });
        }

      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          console.error('知识卡片请求超时 (120s):', node.name);
          if (showModal) {
            alert('获取知识卡片超时，请重试');
          }
        } else {
          console.error('知识卡片错误:', error);
          if (showModal) {
            alert('获取知识卡片失败，请重试');
          }
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
          <div className="flex items-center justify-center gap-4 mb-4">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              🔬 Break It Down
            </h1>
          </div>
          <p className="text-xl text-gray-300">
            物体拆解游戏 - 探索万物的本质
          </p>
        </div>

        {/* 知识卡片弹窗 */}
        {knowledgeCard && !isFullscreen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100000] p-4"
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
                  {/* 标题 */}
                  <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg p-4 border border-yellow-500/30">
                    <div className="text-xl font-bold text-yellow-300">{knowledgeCard.data.title}</div>
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
                步骤2: 验证识别和定制
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

            {/* Prompt 自定义设置面板 */}
            {!deconstructionTree && (
              <div className="mt-6 space-y-4">
                {/* 展开/收起按钮 */}
                <button
                  onClick={() => setShowPromptSettings(!showPromptSettings)}
                  className="w-full bg-indigo-500/20 hover:bg-indigo-500/30 px-4 py-3 rounded-lg border border-indigo-500/50 transition flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <span>⚙️</span>
                    <span>自定义分解风格（可选）</span>
                  </span>
                  <span>{showPromptSettings ? '▲' : '▼'}</span>
                </button>

                {/* 设置面板 */}
                {showPromptSettings && (
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-white/10 space-y-6">
                    {/* 模式切换 */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPromptMode('simple')}
                        className={`flex-1 px-4 py-2 rounded-lg transition ${
                          promptMode === 'simple'
                            ? 'bg-indigo-500 text-white'
                            : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                        }`}
                      >
                        简单模式
                      </button>
                      <button
                        onClick={() => setPromptMode('advanced')}
                        className={`flex-1 px-4 py-2 rounded-lg transition ${
                          promptMode === 'advanced'
                            ? 'bg-indigo-500 text-white'
                            : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                        }`}
                      >
                        高级模式
                      </button>
                    </div>

                    {/* 简单模式：滑块 */}
                    {promptMode === 'simple' && (
                      <div className="space-y-4">
                        {/* 幽默度滑块 */}
                        <div>
                          <label className="block text-sm font-medium mb-2 flex items-center justify-between">
                            <span>😄 幽默度</span>
                            <span className="text-indigo-400">{humorLevel}%</span>
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={humorLevel}
                            onChange={(e) => setHumorLevel(Number(e.target.value))}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                          />
                          <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>严肃</span>
                            <span>幽默</span>
                          </div>
                        </div>

                        {/* 专业度滑块 */}
                        <div>
                          <label className="block text-sm font-medium mb-2 flex items-center justify-between">
                            <span>🎓 专业度</span>
                            <span className="text-indigo-400">{professionalLevel}%</span>
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={professionalLevel}
                            onChange={(e) => setProfessionalLevel(Number(e.target.value))}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                          />
                          <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>通俗</span>
                            <span>专业</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 高级模式：自定义 prompt */}
                    {promptMode === 'advanced' && (
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          自定义 Prompt 模板
                        </label>
                        <textarea
                          value={customPrompt}
                          onChange={(e) => setCustomPrompt(e.target.value)}
                          placeholder={`使用 {{ITEM}} 代表物品名称，{{CONTEXT}} 代表上下文\n\n示例：\n请将 {{ITEM}} 拆解为主要组成部分。要求：\n1. 使用幽默风趣的语言\n2. 每个部分提供详细说明\n3. 标注是否为原材料`}
                          className="w-full h-40 bg-slate-900 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-indigo-500 focus:outline-none resize-none font-mono text-sm"
                        />
                        <button
                          onClick={() => {
                            // 加载默认模板作为参考
                            const template = `请将 {{ITEM}} 拆解为主要组成部分。

要求：
1. 列出所有主要组件或材料
2. 每个部分提供简短描述
3. 标注是否为原材料（is_raw_material: true/false）
4. 为每个部分选择合适的 emoji 图标

返回 JSON 格式：
{
  "parent_item": "{{ITEM}}",
  "parts": [
    {
      "name": "组件名称",
      "description": "功能描述",
      "is_raw_material": false,
      "icon": "📦"
    }
  ]
}`;
                            setCustomPrompt(template);
                          }}
                          className="mt-2 text-sm text-indigo-400 hover:text-indigo-300"
                        >
                          📋 加载默认模板
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

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
                  💡 <strong>备注：</strong>因网络原因，图片检索功能暂不可用，已用卡通图标代替，敬请谅解
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
                💡 <strong>交互提示：</strong>点击节点继续拆解，绿色节点是自然材料（拆解终点）。使用鼠标滚轮缩放，拖拽画布移动视图。
              </div>
              <div className="text-sm text-red-200">
                💡 <strong>备注：</strong>因modelscope网络限制原因，图片检索功能暂不可用，已用卡通图标代替，敬请谅解
              </div>
            </div>
            <div id="graph-container" className="bg-black/50 rounded-xl relative">
              <GraphView
                tree={deconstructionTree}
                loadingNodeIds={loadingNodeIds}
                knowledgeCache={knowledgeCache}
                loadingKnowledgeIds={loadingKnowledgeIds}
                onNodeExpand={handleNodeClick}
                onShowKnowledge={(node) => fetchKnowledgeCard(node, true)}
              />

              {/* 全屏模式下的知识卡片弹窗 */}
              {knowledgeCard && isFullscreen && (
                <div
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100000] p-4"
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
                        {/* 标题 */}
                        <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg p-4 border border-yellow-500/30">
                          <div className="text-xl font-bold text-yellow-300">{knowledgeCard.data.title}</div>
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
            </div>
          </div>
        )}
      </div>

      {/* 加载进度条覆盖层 */}
      {isLoadingSession && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-gray-900 rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mb-6">
                <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent"></div>
              </div>
              <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                加载中...
              </h3>
              <p className="text-gray-400 mb-6">
                正在加载拆解历史记录
              </p>
              {/* 进度条 */}
              <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 使用 Suspense 包裹组件以支持 useSearchParams
export default function DeconstructionGame() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mb-4"></div>
          <p className="text-gray-400">加载中...</p>
        </div>
      </div>
    }>
      <DeconstructionGameContent />
    </Suspense>
  );
}
