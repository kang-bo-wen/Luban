import { Node, Edge } from 'reactflow';

interface TreeNode {
  id: string;
  name: string;
  description: string;
  isRawMaterial: boolean;
  icon?: string;
  children: TreeNode[];
  isExpanded: boolean;
}

interface RadialLayoutOptions {
  centerX: number;
  centerY: number;
  radiusStep: number;
  angleOffset: number;
  savedPositions?: Map<string, { x: number; y: number }>; // 保存的节点位置
}

/**
 * 计算径向布局
 * 根节点在中心，子节点按层级围绕展开
 */
export function calculateRadialLayout(
  tree: TreeNode,
  options: RadialLayoutOptions = {
    centerX: 400,
    centerY: 300,
    radiusStep: 180, // 减小层级间距，从 250 降到 180
    angleOffset: 0,
    savedPositions: undefined,
  }
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // 递归遍历树，计算每个节点的位置
  function traverse(
    node: TreeNode,
    level: number,
    angle: number,
    parentId: string | null,
    angleSpan: number,
    parentX: number, // 父节点的实际 X 坐标
    parentY: number  // 父节点的实际 Y 坐标
  ) {
    const { radiusStep, savedPositions } = options;

    // 如果父节点有保存的位置，使用保存的位置作为中心
    if (parentId && savedPositions) {
      const savedParentPos = savedPositions.get(parentId);
      if (savedParentPos) {
        // 需要加上节点大小的一半，因为保存的是左上角位置
        const parentLevel = level - 1;
        const parentBaseSize = 120;
        const parentSizeReduction = parentLevel * 15;
        const parentNodeSize = Math.max(parentBaseSize - parentSizeReduction, 60);
        const parentOffset = parentNodeSize / 2;

        parentX = savedParentPos.x + parentOffset;
        parentY = savedParentPos.y + parentOffset;
      }
    }

    // 计算当前节点相对于父节点的位置
    // 根节点使用固定中心点，其他节点围绕父节点展开
    let x: number, y: number;

    if (level === 0) {
      // 根节点在固定中心点
      x = parentX;
      y = parentY;
    } else {
      // 子节点围绕父节点展开
      // 使用渐进式半径增长，避免深层节点太远
      const radius = radiusStep * (1 + Math.log(level) * 0.5);
      x = parentX + radius * Math.cos(angle);
      y = parentY + radius * Math.sin(angle);
    }

    // 计算节点大小（与 MatterNode.tsx 中的逻辑一致）
    const baseSize = 120;
    const sizeReduction = level * 15;
    const nodeSize = Math.max(baseSize - sizeReduction, 60);
    const offset = nodeSize / 2;

    // 添加节点
    nodes.push({
      id: node.id,
      type: 'matterNode',
      position: { x: x - offset, y: y - offset }, // 使用动态偏移量使节点居中
      data: {
        name: node.name,
        description: node.description,
        isRawMaterial: node.isRawMaterial,
        isExpanded: node.isExpanded,
        hasChildren: node.children.length > 0,
        level: level, // 添加层级信息
        icon: node.icon,
      },
    });

    // 添加边
    if (parentId) {
      edges.push({
        id: `${parentId}-${node.id}`,
        source: parentId,
        target: node.id,
        type: 'smoothstep',
        animated: !node.isRawMaterial,
        style: {
          stroke: node.isRawMaterial ? '#10b981' : '#3b82f6',
          strokeWidth: 2,
        },
      });
    }

    // 递归处理子节点
    if (node.isExpanded && node.children.length > 0) {
      const childCount = node.children.length;

      // 根节点的子节点围绕整个圆均匀分布
      if (level === 0) {
        const angleStep = (Math.PI * 2) / childCount;
        node.children.forEach((child, index) => {
          const childAngle = index * angleStep;
          traverse(child, level + 1, childAngle, node.id, Math.PI * 2 / childCount, x, y);
        });
      } else {
        // 非根节点的子节点在父节点前方扇形区域内分布
        // 扇形角度范围：90度（约π/2），让子节点沿着父节点方向展开
        const fanAngle = Math.PI / 2;
        const childAngleSpan = fanAngle / Math.max(childCount, 1);

        node.children.forEach((child, index) => {
          // 子节点围绕父节点的方向（angle）展开，形成扇形
          // angle 是父节点相对于其父节点的方向，子节点应该沿着这个方向继续
          const childAngle = angle - fanAngle / 2 + childAngleSpan * (index + 0.5);
          traverse(child, level + 1, childAngle, node.id, childAngleSpan, x, y);
        });
      }
    }
  }

  // 从根节点开始遍历，使用固定中心点
  const { centerX, centerY } = options;
  traverse(tree, 0, 0, null, Math.PI * 2, centerX, centerY);

  return { nodes, edges };
}

/**
 * 计算力导向布局（备用方案）
 */
export function calculateForceLayout(
  tree: TreeNode
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  let nodeIndex = 0;

  function traverse(node: TreeNode, parentId: string | null, depth: number) {
    const x = 400 + (nodeIndex % 5) * 200 - 400;
    const y = depth * 200;
    nodeIndex++;

    nodes.push({
      id: node.id,
      type: 'matterNode',
      position: { x, y },
      data: {
        name: node.name,
        description: node.description,
        isRawMaterial: node.isRawMaterial,
        isExpanded: node.isExpanded,
        hasChildren: node.children.length > 0,
      },
    });

    if (parentId) {
      edges.push({
        id: `${parentId}-${node.id}`,
        source: parentId,
        target: node.id,
        type: 'smoothstep',
        animated: !node.isRawMaterial,
        style: {
          stroke: node.isRawMaterial ? '#10b981' : '#3b82f6',
          strokeWidth: 2,
        },
      });
    }

    if (node.isExpanded && node.children.length > 0) {
      node.children.forEach((child) => {
        traverse(child, node.id, depth + 1);
      });
    }
  }

  traverse(tree, null, 0);

  return { nodes, edges };
}
