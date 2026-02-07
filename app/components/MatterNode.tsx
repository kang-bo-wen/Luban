'use client';

import { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface MatterNodeData {
  name: string;
  description: string;
  isRawMaterial: boolean;
  isExpanded: boolean;
  isLoading: boolean;
  hasChildren: boolean;
  hasKnowledgeCard: boolean;
  isLoadingKnowledge: boolean;
  level: number;
  onExpand: () => void;
  onShowKnowledge: () => void;
}

function MatterNode({ data }: NodeProps<MatterNodeData>) {
  const {
    name,
    description,
    isRawMaterial,
    isLoading,
    hasKnowledgeCard,
    isLoadingKnowledge,
    level,
    onExpand,
    onShowKnowledge,
  } = data;

  const [isHovered, setIsHovered] = useState(false);

  // 根据层级计算节点大小
  const getNodeSize = () => {
    const baseSize = 120;
    const sizeReduction = level * 15;
    return Math.max(baseSize - sizeReduction, 60); // 最小60px
  };

  const nodeSize = getNodeSize();
  const fontSize = Math.max(nodeSize / 8, 12); // 字体大小随节点缩放

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 连接点 */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-2 h-2 !bg-blue-500 border-2 border-white opacity-0"
      />

      {/* 圆形节点 */}
      <div
        className={`
          rounded-full flex items-center justify-center
          shadow-2xl backdrop-blur-sm border-4
          transition-all duration-300 cursor-pointer
          ${
            isRawMaterial
              ? 'bg-gradient-to-br from-green-400 to-emerald-600 border-green-300'
              : isLoading
              ? 'bg-gradient-to-br from-gray-400 to-gray-600 border-gray-300 cursor-wait'
              : 'bg-gradient-to-br from-blue-400 to-purple-600 border-blue-300 hover:scale-110'
          }
          ${isHovered ? 'z-50' : 'z-10'}
        `}
        style={{
          width: `${nodeSize}px`,
          height: `${nodeSize}px`,
        }}
        onClick={() => !isRawMaterial && !isLoading && onExpand()}
      >
        {/* 默认显示：图标和名字 */}
        <div className="flex flex-col items-center justify-center p-2">
          <span style={{ fontSize: `${fontSize * 2}px` }}>
            {isLoading ? (
              <span className="inline-block animate-spin">🔄</span>
            ) : isRawMaterial ? (
              '🌿'
            ) : (
              '📦'
            )}
          </span>
          <div
            className="text-white font-bold text-center mt-1 line-clamp-2"
            style={{ fontSize: `${fontSize}px` }}
          >
            {name}
          </div>
        </div>
      </div>

      {/* Hover 时显示的详细信息卡片 */}
      {isHovered && (
        <div
          className="absolute left-full ml-4 top-1/2 -translate-y-1/2 z-50 pointer-events-none"
          style={{ minWidth: '250px' }}
        >
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 shadow-2xl border-2 border-white/20 backdrop-blur-xl">
            {/* 名称 */}
            <div className="text-lg font-bold text-white mb-2">
              {name}
            </div>

            {/* 描述 */}
            <div className="text-sm text-gray-300 mb-3">
              {description}
            </div>

            {/* 状态标签 */}
            <div className="flex flex-wrap gap-2 mb-3">
              {isRawMaterial && (
                <span className="px-2 py-1 bg-green-400/30 rounded-full text-xs text-white font-semibold">
                  ✅ 原材料
                </span>
              )}
              {isLoading && (
                <span className="px-2 py-1 bg-gray-400/30 rounded-full text-xs text-white font-semibold">
                  ⏳ 拆解中
                </span>
              )}
              {!isRawMaterial && !isLoading && (
                <span className="px-2 py-1 bg-blue-400/30 rounded-full text-xs text-white font-semibold">
                  👆 点击拆解
                </span>
              )}
            </div>

            {/* 操作按钮 */}
            {!isRawMaterial && hasKnowledgeCard && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onShowKnowledge();
                }}
                className="w-full px-3 py-2 bg-yellow-500/80 hover:bg-yellow-400/90 rounded-lg text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-lg pointer-events-auto"
              >
                <span>💡</span>
                <span>查看工艺流程</span>
              </button>
            )}

            {/* 加载中提示 */}
            {!isRawMaterial && !hasKnowledgeCard && isLoadingKnowledge && (
              <div className="w-full px-3 py-2 bg-gray-500/50 rounded-lg text-white text-sm flex items-center justify-center gap-2">
                <span className="inline-block animate-spin">🔄</span>
                <span className="text-xs">加载工艺中...</span>
              </div>
            )}

            {/* 三角形指示器 */}
            <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 border-r-slate-800"></div>
          </div>
        </div>
      )}

      {/* 连接点 */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 !bg-blue-500 border-2 border-white opacity-0"
      />
    </div>
  );
}

export default memo(MatterNode);
