'use client';

import { useCallback, useState, useEffect } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  Background,
  Controls,
  MiniMap,
  Connection,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import TriggerNode from '@/components/nodes/TriggerNode';
import ActionNode from '@/components/nodes/ActionNode';

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
};

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'trigger',
    position: { x: 250, y: 0 },
    data: { label: 'Start Trigger', type: 'Event' },
  },
];

const initialEdges: Edge[] = [];

function FlowEditor({ workflowId, workflowName }: { workflowId: string; workflowName: string }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddPanel, setShowAddPanel] = useState(false);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#10b981', strokeWidth: 2 } }, eds)),
    [setEdges]
  );

  const addNode = (type: 'trigger' | 'action', label: string, actionType?: string) => {
    if (!reactFlowInstance) return;

    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position: { x: 250, y: 100 + nodes.length * 150 },
      data: { label, type: type === 'trigger' ? 'Event' : 'Action', actionType },
    };

    setNodes((nds) => [...nds, newNode]);
    setShowAddPanel(false);
  };

  const handleSave = async () => {
    if (!reactFlowInstance) return;
    
    setIsSaving(true);
    try {
      const flowData = {
        nodes: reactFlowInstance.getNodes().map((node) => ({
          id: node.id,
          type: node.type,
          position: node.position,
          data: node.data,
        })),
        edges: reactFlowInstance.getEdges().map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
        })),
      };

      await fetch(`/api/workflows/${workflowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(flowData),
      });
    } catch (error) {
      console.error('Failed to save workflow:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteSelectedNode = useCallback(() => {
    setNodes((nds) => {
      const selectedIds = nds.filter((node) => node.selected).map((node) => node.id);
      return nds.filter((node) => !node.selected);
    });
    setEdges((eds) =>
      eds.filter(
        (edge) =>
          !edge.source || !edge.target || 
          (nodes.some((node) => node.selected && node.id === edge.source) ||
           nodes.some((node) => node.selected && node.id === edge.target))
      )
    );
  }, [setNodes, setEdges, nodes]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelectedNode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelectedNode]);

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
            {workflowName}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            ID: {workflowId.slice(-8)}
          </p>
        </div>

        <div className="flex-1">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            Add Nodes
          </p>
          
          <div className="space-y-2">
            <button
              onClick={() => addNode('trigger', 'New Trigger', 'Event')}
              className="w-full p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Trigger</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Start workflow</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => addNode('action', 'New Action', 'Custom')}
              className="w-full p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Action</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Add step</p>
                </div>
              </div>
            </button>
          </div>

          <div className="mt-6">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Tips
            </p>
            <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-2">
              <li>• Drag from handles to connect nodes</li>
              <li>• Click node to select, Delete to remove</li>
              <li>• Scroll to zoom, drag to pan</li>
            </ul>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="mt-4 w-full px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Workflow'}
        </button>

        <a
          href="/dashboard"
          className="mt-2 w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-center"
        >
          Back to Dashboard
        </a>
      </div>

      {/* Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          nodeTypes={nodeTypes}
          fitView
          snapToGrid
          snapGrid={[15, 15]}
          className="bg-slate-50 dark:bg-slate-950"
        >
          <Background color="#888" gap={20} />
          <Controls />
          <MiniMap
            nodeStrokeColor={(n) => {
              if (n.type === 'trigger') return '#3b82f6';
              if (n.type === 'action') return '#10b981';
              return '#888';
            }}
            nodeColor={(n) => {
              if (n.type === 'trigger') return '#dbeafe';
              if (n.type === 'action') return '#d1fae5';
              return '#f1f5f9';
            }}
            className="!bg-white dark:!bg-slate-900 !border !border-slate-200 dark:!border-slate-800"
          />
        </ReactFlow>
      </div>
    </div>
  );
}

export default function WorkflowEditorPage({ workflowId, workflowName }: { workflowId: string; workflowName: string }) {
  return (
    <div className="h-screen w-screen">
      <ReactFlowProvider>
        <FlowEditor workflowId={workflowId} workflowName={workflowName} />
      </ReactFlowProvider>
    </div>
  );
}
