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
import AINode from '@/components/nodes/AINode';
import GmailNode from '@/components/nodes/GmailNode';
import TelegramNode from '@/components/nodes/TelegramNode';
import TelegramWaitNode from '@/components/nodes/TelegramWaitNode';
import WebhookNode from '@/components/nodes/WebhookNode';
import ButtonNode from '@/components/nodes/ButtonNode';

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  ai: AINode,
  gmail: GmailNode,
  telegram: TelegramNode,
  telegramWait: TelegramWaitNode,
  webhook: WebhookNode,
  button: ButtonNode,
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
  const [isRunning, setIsRunning] = useState(false);
  const [runStatus, setRunStatus] = useState<string | null>(null);
  const [showAddPanel, setShowAddPanel] = useState(false);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#10b981', strokeWidth: 2 } }, eds)),
    [setEdges]
  );

  const addNode = (type: string, label: string, actionType?: string) => {
    if (!reactFlowInstance) return;

    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position: { x: 250, y: 100 + nodes.length * 150 },
      data: {
        label,
        type: actionType || 'Step',
        actionType: actionType || 'Step',
        ...(type === 'gmail'
          ? {
              to: 'sohampirale20504@gmail.com',
              subject: 'Hello from DemandFlow',
              body: 'Write your email body here.',
            }
          : {}),
        onChange: (nextData: Record<string, unknown>) => {
          setNodes((current) =>
            current.map((node) => (node.id === newNode.id ? { ...node, data: nextData } : node))
          );
        },
      },
    };

    setNodes((nds) => [...nds, newNode]);
    setShowAddPanel(false);
  };

  const hydrateNodes = (incomingNodes: Node[]) => {
    setNodes(
      incomingNodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          onChange: (nextData: Record<string, unknown>) => {
            setNodes((current) =>
              current.map((item) => (item.id === node.id ? { ...item, data: nextData } : item))
            );
          },
        },
      }))
    );
  };

  const handleSave = async () => {
    if (!reactFlowInstance) return;
    
    setIsSaving(true);
    try {
      const flowData = {
        nodes: reactFlowInstance.getNodes().map((node) => {
          const data = node.data && typeof node.data === 'object' ? { ...node.data } : node.data;
          if (data && typeof data === 'object' && 'onChange' in data) {
            delete (data as Record<string, unknown>).onChange;
          }
          return {
            id: node.id,
            type: node.type,
            position: node.position,
            data,
          };
        }),
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

  const handleRun = async () => {
    if (!reactFlowInstance) return;
    setIsRunning(true);
    setRunStatus(null);

    try {
      const flowData = {
        nodes: reactFlowInstance.getNodes().map((node) => {
          const data = node.data && typeof node.data === 'object' ? { ...node.data } : node.data;
          if (data && typeof data === 'object' && 'onChange' in data) {
            delete (data as Record<string, unknown>).onChange;
          }
          return {
            id: node.id,
            type: node.type,
            position: node.position,
            data,
          };
        }),
        edges: reactFlowInstance.getEdges().map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
        })),
      };

      const res = await fetch(`/api/workflows/${workflowId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'workflow-editor', ...flowData }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to run workflow');
      }

      const runStatusText = data.run?.status || 'started';
      const runId = data.run?._id?.slice(-6) || '';
      if (runStatusText === 'failed') {
        const errorMessage = data.run?.error || data.run?.steps?.find((step: { status?: string }) => step.status === 'failed')?.error;
        setRunStatus(`Run failed${errorMessage ? `: ${errorMessage}` : ''}${runId ? ` · ${runId}` : ''}`);
      } else {
        setRunStatus(`Run ${runStatusText}${runId ? ` · ${runId}` : ''}`.trim());
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Run failed';
      setRunStatus(message);
    } finally {
      setIsRunning(false);
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

  useEffect(() => {
    const loadWorkflow = async () => {
      try {
        const res = await fetch(`/api/workflows/${workflowId}`);
        if (!res.ok) return;
        const data = await res.json();
        const savedNodes = data.workflow?.canvasData?.nodes || [];
        const savedEdges = data.workflow?.canvasData?.edges || [];
        if (savedNodes.length) {
          const nodesWithDefaults = savedNodes.map((node: Node) => {
            if (node.type === 'gmail') {
              return {
                ...node,
                data: {
                  to: 'sohampirale20504@gmail.com',
                  subject: 'Hello from DemandFlow',
                  body: 'Write your email body here.',
                  ...node.data,
                },
              };
            }
            return node;
          });
          hydrateNodes(nodesWithDefaults);
          setEdges(savedEdges);
        }
      } catch (error) {
        console.error('Failed to load workflow canvas:', error);
      }
    };

    loadWorkflow();
  }, [workflowId]);

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

        <div className="flex-1 overflow-y-auto">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            Triggers
          </p>

          <div className="space-y-2">
            <button
              onClick={() => addNode('webhook', 'Webhook', 'HTTP Trigger')}
              className="w-full p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
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
                      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Webhook</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">HTTP trigger</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => addNode('button', 'Button Click', 'Manual Trigger')}
              className="w-full p-3 bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800 rounded-xl hover:bg-pink-100 dark:hover:bg-pink-900/30 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center">
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
                      d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Button</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Manual click</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => addNode('trigger', 'Event Trigger', 'Event')}
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
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Event</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Custom event</p>
                </div>
              </div>
            </button>
          </div>

          <div className="mt-6">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Actions
            </p>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => addNode('ai', 'AI Processing', 'LLM Action')}
              className="w-full p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
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
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">AI Node</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">LLM processing</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => addNode('gmail', 'Send Email', 'Gmail')}
              className="w-full p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
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
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Gmail</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Send email</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => addNode('telegram', 'Send Message', 'Telegram')}
              className="w-full p-3 bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-xl hover:bg-sky-100 dark:hover:bg-sky-900/30 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
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
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Telegram</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Send message</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => addNode('telegramWait', 'Send & Wait', 'Telegram')}
              className="w-full p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center relative">
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
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border border-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Telegram + Wait</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Wait for reply</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => addNode('action', 'Custom Action', 'Step')}
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
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Custom</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Custom action</p>
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

        <div className="mt-4 space-y-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Workflow'}
          </button>
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="w-full px-4 py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-semibold rounded-xl hover:from-pink-600 hover:to-rose-700 transition-all disabled:opacity-50"
          >
            {isRunning ? 'Running...' : 'Run Workflow'}
          </button>
          {runStatus && (
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center">{runStatus}</p>
          )}
        </div>

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
              if (n.type === 'ai') return '#a855f7';
              if (n.type === 'gmail') return '#ef4444';
              if (n.type === 'telegram') return '#0ea5e9';
              if (n.type === 'telegramWait') return '#6366f1';
              if (n.type === 'webhook') return '#f97316';
              if (n.type === 'button') return '#ec4899';
              return '#888';
            }}
            nodeColor={(n) => {
              if (n.type === 'trigger') return '#dbeafe';
              if (n.type === 'action') return '#d1fae5';
              if (n.type === 'ai') return '#f3e8ff';
              if (n.type === 'gmail') return '#fee2e2';
              if (n.type === 'telegram') return '#e0f2fe';
              if (n.type === 'telegramWait') return '#e0e7ff';
              if (n.type === 'webhook') return '#ffedd5';
              if (n.type === 'button') return '#fce7f3';
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
