import { Node, Edge } from 'reactflow';

interface TreeNode {
  id: string;
  name: string;
  description: string;
  isRawMaterial: boolean;
  children: TreeNode[];
  isExpanded: boolean;
}

interface RadialLayoutOptions {
  centerX: number;
  centerY: number;
  radiusStep: number;
  angleOffset: number;
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
    radiusStep: 250,
    angleOffset: 0,
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
    angleSpan: number
  ) {
    const { centerX, centerY, radiusStep } = options;

    // 计算当前节点的位置
    const radius = level * radiusStep;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);

    // 添加节点
    nodes.push({
      id: node.id,
      type: 'matterNode',
      position: { x: x - 100, y: y - 75 }, // 调整偏移使节点居中
      data: {
        name: node.name,
        description: node.description,
        isRawMaterial: node.isRawMaterial,
        isExpanded: node.isExpanded,
        hasChildren: node.children.length > 0,
        level: level, // 添加层级信息
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
      const childAngleSpan = angleSpan / Math.max(childCount, 1);

      node.children.forEach((child, index) => {
        const childAngle =
          angle - angleSpan / 2 + childAngleSpan * (index + 0.5);
        traverse(child, level + 1, childAngle, node.id, childAngleSpan);
      });
    }
  }

  // 从根节点开始遍历
  traverse(tree, 0, 0, null, Math.PI * 2);

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
