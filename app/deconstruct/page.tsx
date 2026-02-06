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

  // 递归拆解
  const deconstructItem = async (itemName: string, parentContext?: string): Promise<TreeNode> => {
    const response = await fetch('/api/deconstruct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemName, parentContext }),
    });

    const result: DeconstructionResult = await response.json();

    const children: TreeNode[] = [];
    for (const part of result.parts) {
      if (!part.is_raw_material) {
        // 继续递归拆解
        const childNode = await deconstructItem(part.name, itemName);
        children.push(childNode);
      } else {
        // 原材料，停止拆解
        children.push({
          id: `${itemName}-${part.name}`,
          name: part.name,
          description: part.description,
          isRawMaterial: true,
          children: [],
          isExpanded: false,
        });
      }
    }

    return {
      id: itemName,
      name: itemName,
      description: result.parts[0]?.description || '',
      isRawMaterial: false,
      children,
      isExpanded: true,
    };
  };

  // 开始拆解
  const startDeconstruction = async () => {
    if (!identificationResult) return;

    setIsDeconstructing(true);
    try {
      const tree = await deconstructItem(identificationResult.name);
      setDeconstructionTree(tree);
    } catch (error) {
      console.error('拆解错误:', error);
      alert('拆解失败，请重试');
    } finally {
      setIsDeconstructing(false);
    }
  };

  // 渲染拆解树
  const renderTree = (node: TreeNode, depth: number = 0) => {
    const indent = depth * 24;

    return (
      <div key={node.id} style={{ marginLeft: `${indent}px` }} className="my-2">
        <div className={`p-3 rounded-lg ${
          node.isRawMaterial
            ? 'bg-green-500/20 border-2 border-green-500'
            : 'bg-blue-500/20 border-2 border-blue-500'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-2xl">
              {node.isRawMaterial ? '🌿' : '📦'}
            </span>
            <div>
              <div className="font-bold text-lg">{node.name}</div>
              <div className="text-sm text-gray-300">{node.description}</div>
              {node.isRawMaterial && (
                <div className="text-xs text-green-400 mt-1">✅ 自然材料 - 拆解完成</div>
              )}
            </div>
          </div>
        </div>
        {node.children.length > 0 && (
          <div className="mt-2">
            {node.children.map(child => renderTree(child, depth + 1))}
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
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-500 px-8 py-3 rounded-lg font-semibold transition"
              >
                {isIdentifying ? '识别中...' : '🔍 识别物体'}
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
                className="mt-4 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-500 px-8 py-3 rounded-lg font-semibold transition"
              >
                {isDeconstructing ? '拆解中...' : '🔨 开始拆解'}
              </button>
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

        {isDeconstructing && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-8 text-center">
              <div className="text-4xl mb-4">🔄</div>
              <div className="text-xl">正在递归拆解...</div>
              <div className="text-sm text-gray-300 mt-2">这可能需要1-2分钟</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
