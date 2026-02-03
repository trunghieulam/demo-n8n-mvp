import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useWorkflowStore } from '../stores/workflowStore';
import { useNodeTypesStore } from '../stores/nodeTypesStore';
import { useCanvasStore } from '../stores/canvasStore';
import NodePalette from '../components/NodePalette';
import NodeConfigPanel from '../components/NodeConfigPanel';
import { apiClient } from '../api/client';
import type { INode, IConnections } from '@shared/types';

export default function CanvasEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedWorkflow, updateWorkflow, executeWorkflow } = useWorkflowStore();
  const { nodeTypes, fetchNodeTypes } = useNodeTypesStore();
  const { selectNode, selectedNodeId } = useCanvasStore();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (id) {
      fetchWorkflow(id);
    }
    fetchNodeTypes();
  }, [id]);

  const fetchWorkflow = async (workflowId: string) => {
    try {
      const response = await apiClient.get(`/workflows/${workflowId}`);
      const workflow = response.data;
      useWorkflowStore.getState().setSelectedWorkflow(workflow);

      // Convert workflow nodes/connections to React Flow format
      const reactFlowNodes: Node[] = workflow.nodes.map((node: INode) => ({
        id: node.id,
        type: 'default',
        position: node.position,
        data: { label: node.name, nodeType: node.type, ...node },
      }));

      const reactFlowEdges: Edge[] = [];
      for (const [sourceId, connMap] of Object.entries(workflow.connections)) {
        for (const [connType, connArray] of Object.entries(connMap)) {
          for (const connGroup of connArray) {
            for (const conn of connGroup) {
              reactFlowEdges.push({
                id: `${sourceId}-${conn.node}`,
                source: sourceId,
                target: conn.node,
                type: connType === 'error' ? 'step' : 'default',
              });
            }
          }
        }
      }

      setNodes(reactFlowNodes);
      setEdges(reactFlowEdges);
    } catch (error) {
      console.error('Failed to fetch workflow:', error);
    }
  };

  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        setEdges((eds) => addEdge(params, eds));
        setIsDirty(true);
      }
    },
    [setEdges]
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  const handleSave = async () => {
    if (!id || !selectedWorkflow) return;

    setIsSaving(true);
    try {
      // Convert React Flow nodes/edges back to workflow format
      const workflowNodes: INode[] = nodes.map((node) => ({
        id: node.id,
        name: node.data.label,
        type: node.data.nodeType,
        position: node.position,
        parameters: node.data.parameters || {},
        credentials: node.data.credentials,
        disabled: node.data.disabled,
      }));

      const workflowConnections: IConnections = {};
      for (const edge of edges) {
        if (!workflowConnections[edge.source]) {
          workflowConnections[edge.source] = { main: [] };
        }
        if (!workflowConnections[edge.source].main) {
          workflowConnections[edge.source].main = [];
        }
        workflowConnections[edge.source].main.push([
          {
            node: edge.target,
            type: 'main',
            index: 0,
          },
        ]);
      }

      await updateWorkflow(id, {
        nodes: workflowNodes,
        connections: workflowConnections,
      });

      setIsDirty(false);
    } catch (error) {
      console.error('Failed to save workflow:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecute = async () => {
    if (!id) return;
    try {
      await apiClient.post(`/workflows/${id}/execute`, {});
      alert('Execution started');
    } catch (error) {
      console.error('Failed to execute workflow:', error);
    }
  };

  const addNode = (nodeType: string, position: { x: number; y: number }) => {
    const newNode: Node = {
      id: `node_${Date.now()}`,
      type: 'default',
      position,
      data: {
        label: nodeType,
        nodeType,
        parameters: {},
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setIsDirty(true);
  };

  return (
    <div className="flex h-screen">
      <NodePalette onAddNode={addNode} />
      <div className="flex-1 relative">
        <div className="absolute top-0 left-0 right-0 bg-white border-b p-2 flex justify-between items-center z-10">
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : isDirty ? 'Save *' : 'Save'}
            </button>
            <button
              onClick={handleExecute}
              className="px-4 py-2 bg-green-600 text-white rounded"
            >
              Execute
            </button>
          </div>
          <button
            onClick={() => navigate('/workflows')}
            className="px-4 py-2 border rounded"
          >
            Back to Workflows
          </button>
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          fitView
        >
          <Controls />
          <Background />
          <MiniMap />
        </ReactFlow>
      </div>
      {selectedNodeId && <NodeConfigPanel nodeId={selectedNodeId} />}
    </div>
  );
}
