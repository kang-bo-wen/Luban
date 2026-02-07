'use client';

import { useState } from 'react';
import Image from 'next/image';

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

export default function DeconstructionGame() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [identificationResult, setIdentificationResult] = useState<IdentificationResult | null>(null);
  const [deconstructionTree, setDeconstructionTree] = useState<TreeNode | null>(null);
  const [isDeconstructing, setIsDeconstructing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>(''); // 新增：显示当前处理状态
  const [loadingNodeIds, setLoadingNodeIds] = useState<Set<string>>(new Set()); // 跟踪正在加载的节点

  // 处理图片上传
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      // 重置之前的结果
      setIdentificationResult(null);
      setDeconstructionTree(null);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">
          🔬 Entropy Reverse - 物体拆解游戏
        </h1>

        {/* 步骤1: 上传图片 */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 mb-6 border border-white/20">
          <h2 className="text-2xl font-semibold mb-4">📸 步骤1: 上传图片</h2>
          <div className="flex flex-col items-center gap-4">
            <label className="cursor-pointer bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-lg font-semibold transition">
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
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 mb-6 border border-white/20">
            <h2 className="text-2xl font-semibold mb-4">✅ 步骤2: 识别结果</h2>
            <div className="bg-black/30 rounded-lg p-4">
              <div className="text-xl font-bold mb-2">{identificationResult.name}</div>
              <div className="text-sm text-gray-300 mb-2">
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

        {/* 步骤3: 拆解树 */}
        {deconstructionTree && (
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <h2 className="text-2xl font-semibold mb-4">🌳 步骤3: 拆解树</h2>
            <div className="bg-black/30 rounded-lg p-4 max-h-[600px] overflow-y-auto">
              {renderTree(deconstructionTree)}
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
