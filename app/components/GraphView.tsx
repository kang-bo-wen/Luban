'use client';

import { useCallback, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';

import MatterNode from './MatterNode';
import { calculateRadialLayout } from '../utils/layoutUtils';

interface TreeNode {
  id: string;
  name: string;
  description: string;
  isRawMaterial: boolean;
  children: TreeNode[];
  isExpanded: boolean;
}

interface GraphViewProps {
  tree: TreeNode | null;
  loadingNodeIds: Set<string>;
  knowledgeCache: Map<string, any>;
  loadingKnowledgeIds: Set<string>;
  onNodeExpand: (nodeId: string, nodeName: string, parentContext?: string) => void;
  onShowKnowledge: (node: TreeNode) => void;
}

const nodeTypes = {
  matterNode: MatterNode,
};

export default function GraphView({
  tree,
  loadingNodeIds,
  knowledgeCache,
  loadingKnowledgeIds,
  onNodeExpand,
  onShowKnowledge,
}: GraphViewProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // 查找节点的父节点名称
  const findParentName = useCallback((currentTree: TreeNode | null, targetId: string): string | undefined => {
    if (!currentTree) return undefined;

    // 检查当前节点的子节点
    for (const child of currentTree.children) {
      if (child.id === targetId) {
        return currentTree.name;
      }
      // 递归查找
      const parentName = findParentName(child, targetId);
      if (parentName) return parentName;
    }
    return undefined;
  }, []);

  // 查找节点
  const findNodeById = useCallback((currentTree: TreeNode | null, id: string): TreeNode | null => {
    if (!currentTree) return null;
    if (currentTree.id === id) return currentTree;
    for (const child of currentTree.children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
    return null;
  }, []);

  // 更新图形布局
  useEffect(() => {
    if (!tree) {
      setNodes([]);
      setEdges([]);
      return;
    }

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
          onExpand: () => {
            const parentName = findParentName(tree, node.id);
            onNodeExpand(node.id, treeNode.name, parentName);
          },
          onShowKnowledge: () => onShowKnowledge(treeNode),
        },
      };
    });

    setNodes(enhancedNodes);
    setEdges(layoutEdges);
  }, [tree, loadingNodeIds, knowledgeCache, loadingKnowledgeIds, findNodeById, findParentName, onNodeExpand, onShowKnowledge]);

  if (!tree) {
    return (
      <div className="w-full h-[800px] flex items-center justify-center bg-black/30 rounded-lg">
        <div className="text-gray-400 text-lg">
          等待拆解结果...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[900px] bg-black/30 rounded-lg overflow-hidden border-2 border-white/10">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#ffffff20"
        />
        <Controls
          className="bg-white/10 backdrop-blur-sm border border-white/20"
        />
        <MiniMap
          className="bg-white/10 backdrop-blur-sm border border-white/20"
          nodeColor={(node) => {
            if (node.data.isRawMaterial) return '#10b981';
            if (node.data.isLoading) return '#6b7280';
            return '#3b82f6';
          }}
        />
      </ReactFlow>
    </div>
  );
}
