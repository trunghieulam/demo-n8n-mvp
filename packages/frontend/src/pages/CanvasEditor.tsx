import { useEffect, useState, useCallback, useRef } from 'react';
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
  useReactFlow,
  ReactFlowProvider,
  NodeChange,
  EdgeChange,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useWorkflowStore } from '../stores/workflowStore';
import { useNodeTypesStore } from '../stores/nodeTypesStore';
import { useCanvasStore } from '../stores/canvasStore';
import NodePalette from '../components/NodePalette';
import NodeConfigPanel from '../components/NodeConfigPanel';
import { apiClient } from '../api/client';
import type { INode, IConnections } from '@shared/types';

function CanvasEditorInner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedWorkflow, updateWorkflow, executeWorkflow } = useWorkflowStore();
  const { nodeTypes, fetchNodeTypes } = useNodeTypesStore();
  const { selectNode, selectedNodeId } = useCanvasStore();
  const { fitView, screenToFlowPosition, setCenter } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const hasInitialFit = useRef(false);

  // Handle node changes and clean up edges when nodes are deleted
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Check for node deletions
      const deletedNodeIds = new Set<string>();
      changes.forEach((change) => {
        if (change.type === 'remove') {
          deletedNodeIds.add(change.id);
        }
      });

      // Remove edges connected to deleted nodes
      if (deletedNodeIds.size > 0) {
        setEdges((eds) =>
          eds.filter(
            (edge) => !deletedNodeIds.has(edge.source) && !deletedNodeIds.has(edge.target)
          )
        );
        setIsDirty(true);
      }

      // Call the default handler
      onNodesChange(changes);
      
      // Mark as dirty if any changes occurred
      if (changes.length > 0) {
        setIsDirty(true);
      }
    },
    [onNodesChange, setEdges]
  );

  // Delete node handler
  const deleteNode = useCallback(
    (nodeId: string) => {
      // Prevent deleting the last node
      if (nodes.length <= 1) {
        alert('Cannot delete the last node. A workflow must have at least one node.');
        return;
      }

      // Remove the node
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      
      // Remove edges connected to this node
      setEdges((eds) =>
        eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
      );
      
      // Clear selection if the deleted node was selected
      if (selectedNodeId === nodeId) {
        selectNode(null);
      }
      
      setIsDirty(true);
    },
    [nodes.length, setNodes, setEdges, selectedNodeId, selectNode]
  );

  useEffect(() => {
    if (id) {
      hasInitialFit.current = false; // Reset fit flag when workflow changes
      fetchWorkflow(id);
    }
    fetchNodeTypes();
  }, [id]);

  // Fit view when nodes are first loaded from workflow
  useEffect(() => {
    if (nodes.length > 0 && !hasInitialFit.current) {
      hasInitialFit.current = true;
      setTimeout(() => {
        fitView({ padding: 0.2, duration: 300 });
      }, 100);
    }
  }, [nodes.length, fitView]);

  const fetchWorkflow = async (workflowId: string) => {
    try {
      const response = await apiClient.get(`/workflows/${workflowId}`);
      const workflow = response.data;
      useWorkflowStore.getState().setSelectedWorkflow(workflow);

      // If workflow has no nodes, create a default trigger node
      let workflowNodes = workflow.nodes;
      if (!workflowNodes || workflowNodes.length === 0) {
        const defaultTriggerNode: INode = {
          id: `node_${Date.now()}`,
          name: 'Start',
          type: 'Webhook',
          position: { x: 250, y: 200 },
          parameters: {
            httpMethod: 'POST',
            path: `webhook/${Date.now()}`,
          },
        };
        workflowNodes = [defaultTriggerNode];
        setIsDirty(true); // Mark as dirty so user knows to save
      }

      // Convert workflow nodes/connections to React Flow format
      const reactFlowNodes: Node[] = workflowNodes.map((node: INode) => ({
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

  const addNode = useCallback((nodeType: string, position: { x: number; y: number }) => {
    const nodeId = `node_${Date.now()}`;
    const newNode: Node = {
      id: nodeId,
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
    
    // Focus on the new node after a short delay to ensure it's rendered
    setTimeout(() => {
      // Center the viewport on the new node's position
      setCenter(position.x, position.y, { zoom: 1, duration: 400 });
    }, 150);
  }, [setNodes, fitView]);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData('application/reactflow');
      if (!nodeType || !reactFlowWrapper.current) {
        return;
      }

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      addNode(nodeType, position);
    },
    [screenToFlowPosition, addNode]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <div className="flex h-screen">
      <NodePalette onAddNode={addNode} />
      <div className="flex-1 relative" ref={reactFlowWrapper}>
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
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          fitView
          deleteKeyCode={['Delete', 'Backspace']}
        >
          <Controls />
          <Background />
          <MiniMap />
        </ReactFlow>
      </div>
      {selectedNodeId && <NodeConfigPanel nodeId={selectedNodeId} onDelete={deleteNode} />}
    </div>
  );
}

export default function CanvasEditor() {
  return (
    <ReactFlowProvider>
      <CanvasEditorInner />
    </ReactFlowProvider>
  );
}
