'use client';

import { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { createPortal } from 'react-dom';

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
  zoom?: number;
  icon?: string;
  imageUrl?: string;
  onExpand: () => void;
  onShowKnowledge: () => void;
  onHover?: (isHovered: boolean) => void;
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
    zoom = 1,
    icon,
    imageUrl,
    onExpand,
    onShowKnowledge,
    onHover,
  } = data;

  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const nodeRef = useRef<HTMLDivElement>(null);

  // 更新悬浮窗位置
  useEffect(() => {
    if (isHovered && nodeRef.current) {
      const updatePosition = () => {
        const rect = nodeRef.current!.getBoundingClientRect();
        setTooltipPosition({
          x: rect.right + 16, // 节点右侧 + 16px 间距
          y: rect.top + rect.height / 2, // 节点垂直居中
        });
      };

      updatePosition();

      // 监听滚动和缩放事件，实时更新位置
      const handleUpdate = () => {
        if (isHovered && nodeRef.current) {
          updatePosition();
        }
      };

      window.addEventListener('scroll', handleUpdate, true);
      window.addEventListener('resize', handleUpdate);

      return () => {
        window.removeEventListener('scroll', handleUpdate, true);
        window.removeEventListener('resize', handleUpdate);
      };
    }
  }, [isHovered]);

  // 显示悬浮窗
  const handleMouseEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setIsHovered(true);
    onHover?.(true);
  };

  // 延迟隐藏悬浮窗
  const handleMouseLeave = () => {
    hideTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
      onHover?.(false);
    }, 200); // 200ms延迟，给用户时间移动鼠标到悬浮窗
  };

  // 根据层级计算节点大小
  const getNodeSize = () => {
    const baseSize = 120;
    const sizeReduction = level * 15;
    return Math.max(baseSize - sizeReduction, 60); // 最小60px
  };

  const nodeSize = getNodeSize();
  const fontSize = Math.max(nodeSize / 8, 12); // 字体大小随节点缩放

  // 根据层级获取节点颜色
  const getNodeColor = () => {
    if (isRawMaterial) {
      return 'bg-gradient-to-br from-green-400 to-emerald-600 border-green-300';
    }
    if (isLoading) {
      return 'bg-gradient-to-br from-gray-400 to-gray-600 border-gray-300 cursor-wait';
    }

    // 根据层级分配颜色（使用和谐的色系）
    const levelColors = [
      'bg-gradient-to-br from-blue-400 to-blue-600 border-blue-300',      // Level 0: 蓝色
      'bg-gradient-to-br from-purple-400 to-purple-600 border-purple-300', // Level 1: 紫色
      'bg-gradient-to-br from-pink-400 to-pink-600 border-pink-300',       // Level 2: 粉色
      'bg-gradient-to-br from-orange-400 to-orange-600 border-orange-300', // Level 3: 橙色
      'bg-gradient-to-br from-yellow-400 to-yellow-600 border-yellow-300', // Level 4: 黄色
      'bg-gradient-to-br from-cyan-400 to-cyan-600 border-cyan-300',       // Level 5+: 青色
    ];

    // 如果层级超过数组长度，循环使用颜色
    const colorIndex = level % levelColors.length;
    return levelColors[colorIndex] + ' hover:scale-110';
  };

  return (
    <div
      ref={nodeRef}
      className={`relative ${isHovered ? 'z-[9999]' : 'z-10'}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
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
          ${getNodeColor()}
          ${isHovered ? 'z-50' : 'z-10'}
        `}
        style={{
          width: `${nodeSize}px`,
          height: `${nodeSize}px`,
        }}
        onClick={() => !isRawMaterial && !isLoading && onExpand()}
      >
        {/* 默认显示：图片或图标 */}
        <div className="flex items-center justify-center w-full h-full overflow-hidden rounded-full">
          {isLoading ? (
            <span className="inline-block animate-spin" style={{ fontSize: `${nodeSize * 0.5}px` }}>
              🔄
            </span>
          ) : imageUrl && !imageError ? (
            <img
              src={imageUrl}
              alt={name}
              loading="lazy"
              className="w-full h-full object-cover sketch-effect"
              onError={() => setImageError(true)}
              style={{
                filter: 'grayscale(100%) contrast(150%) brightness(110%)',
              }}
            />
          ) : (
            <span style={{ fontSize: `${nodeSize * 0.5}px` }}>
              {icon || (isRawMaterial ? '🌿' : '📦')}
            </span>
          )}
        </div>
      </div>

      {/* 连接点 */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 !bg-blue-500 border-2 border-white opacity-0"
      />

      {/* Hover 时显示的详细信息卡片 - 使用 Portal 渲染到 body，确保始终置顶 */}
      {isHovered && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed z-[99999]"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: 'translateY(-50%)',
            width: '320px',
            maxHeight: '400px',
            pointerEvents: 'auto',
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 shadow-2xl border-2 border-white/20 backdrop-blur-xl overflow-y-auto max-h-full">
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
        </div>,
        document.fullscreenElement || document.body
      )}
    </div>
  );
}

export default memo(MatterNode);
