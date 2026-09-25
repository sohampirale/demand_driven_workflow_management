'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
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
import ChatTriggerNode from '@/components/nodes/ChatTriggerNode';
import ActionNode from '@/components/nodes/ActionNode';
import AINode from '@/components/nodes/AINode';
import GmailNode from '@/components/nodes/GmailNode';
import TelegramNode from '@/components/nodes/TelegramNode';
import TelegramWaitNode from '@/components/nodes/TelegramWaitNode';
import WebhookNode from '@/components/nodes/WebhookNode';
import ButtonNode from '@/components/nodes/ButtonNode';
import WhatsAppNode from '@/components/nodes/WhatsAppNode';

const nodeTypes = {
  trigger: TriggerNode,
  chatTrigger: ChatTriggerNode,
  action: ActionNode,
  ai: AINode,
  gmail: GmailNode,
  whatsapp: WhatsAppNode,
  telegram: TelegramNode,
  telegramWait: TelegramWaitNode,
  webhook: WebhookNode,
  button: ButtonNode,
};

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'chatTrigger',
    position: { x: 250, y: 0 },
    data: { label: 'Chat Trigger', type: 'Chat Window' },
  },
  {
    id: '2',
    type: 'ai',
    position: { x: 250, y: 150 },
    data: {
      label: 'Groq AI Agent',
      model: 'openai/gpt-oss-20b',
      systemPrompt:
        'You are an intelligent assistant in a demand-driven workflow management system. Help the user concisely, automate requested actions using available tools when appropriate.',
      tools: ['send_whatsapp', 'send_email', 'get_current_time'],
    },
  },
];

const initialEdges: Edge[] = [
  {
    id: 'e1-2',
    source: '1',
    target: '2',
    animated: true,
    style: { stroke: '#8b5cf6', strokeWidth: 2 },
  },
];

interface ChatToolCall {
  name: string;
  args: Record<string, unknown>;
  result: Record<string, unknown>;
}

interface ChatMessageItem {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  toolCalls?: ChatToolCall[];
  status?: string;
  timestamp: Date;
}

function FlowEditor({ workflowId, workflowName }: { workflowId: string; workflowName: string }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runStatus, setRunStatus] = useState<string | null>(null);
  const [showAddPanel, setShowAddPanel] = useState(false);

  // Chat window state
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isChatSending, setIsChatSending] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessageItem[]>([
    {
      id: 'welcome',
      sender: 'system',
      text: 'Send a message below. It will trigger the workflow and flow down into your Groq AI Node and connected actions!',
      timestamp: new Date(),
    },
  ]);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showChatModal) {
      chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, showChatModal]);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge({ ...params, animated: true, style: { stroke: '#10b981', strokeWidth: 2 } }, eds)
      ),
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
        ...(type === 'chatTrigger'
          ? {
              onOpenChat: () => setShowChatModal(true),
            }
          : {}),
        ...(type === 'ai'
          ? {
              model: 'openai/gpt-oss-20b',
              systemPrompt:
                'You are an intelligent assistant in a demand-driven workflow management system. Help the user concisely, automate requested actions using available tools when appropriate.',
              tools: ['send_whatsapp', 'send_email', 'get_current_time'],
            }
          : {}),
        ...(type === 'gmail'
          ? {
              to: 'sohampirale20504@gmail.com',
              subject: 'Hello from DemandFlow',
              body: 'Write your email body here.',
            }
          : {}),
        ...(type === 'whatsapp'
          ? {
              phone: '918208363244',
              message: 'Hello from DemandFlow WhatsApp!',
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
          ...(node.type === 'chatTrigger'
            ? {
                onOpenChat: () => setShowChatModal(true),
              }
            : {}),
          onChange: (nextData: Record<string, unknown>) => {
            setNodes((current) =>
              current.map((item) => (item.id === node.id ? { ...item, data: nextData } : item))
            );
          },
        },
      }))
    );
  };

  const getCleanFlowData = () => {
    if (!reactFlowInstance) {
      return { nodes: [], edges: [] };
    }
    return {
      nodes: reactFlowInstance.getNodes().map((node) => {
        const data =
          node.data && typeof node.data === 'object' ? { ...node.data } : (node.data ?? {});
        if (data && typeof data === 'object') {
          delete (data as Record<string, unknown>).onChange;
          delete (data as Record<string, unknown>).onOpenChat;
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
  };

  const handleSave = async () => {
    if (!reactFlowInstance) return;

    setIsSaving(true);
    try {
      const flowData = getCleanFlowData();
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
      const flowData = getCleanFlowData();

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
        const errorMessage =
          data.run?.error ||
          data.run?.steps?.find((step: { status?: string }) => step.status === 'failed')?.error;
        setRunStatus(
          `Run failed${errorMessage ? `: ${errorMessage}` : ''}${runId ? ` · ${runId}` : ''}`
        );
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

  const handleSendChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const textToSend = chatInput.trim();
    if (!textToSend || isChatSending) return;

    const userMessageItem: ChatMessageItem = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, userMessageItem]);
    setChatInput('');
    setIsChatSending(true);

    try {
      const flowData = getCleanFlowData();
      const res = await fetch(`/api/workflows/${workflowId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'chat',
          trigger: { type: 'chat', source: 'chat-window' },
          message: textToSend,
          inputs: { message: textToSend },
          ...flowData,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Workflow execution failed');
      }

      const run = data.run;
      let replyText = '';
      let toolCalls: ChatToolCall[] = [];

      // Find AI step output or first available step text output
      if (run?.steps && Array.isArray(run.steps)) {
        const aiStep = run.steps.find(
          (step: { stepType?: string }) => step.stepType === 'ai'
        );
        if (aiStep?.output) {
          replyText =
            typeof aiStep.output.text === 'string'
              ? aiStep.output.text
              : typeof aiStep.output.reply === 'string'
              ? aiStep.output.reply
              : '';
          if (Array.isArray(aiStep.output.toolCalls)) {
            toolCalls = aiStep.output.toolCalls;
          }
        }

        // If no AI step output, check if any action produced output
        if (!replyText) {
          const lastCompleted = [...run.steps].reverse().find((s) => s.status === 'success');
          if (lastCompleted?.output?.text) {
            replyText = String(lastCompleted.output.text);
          } else if (lastCompleted?.output?.messageId) {
            replyText = `Action executed successfully (ID: ${lastCompleted.output.messageId})`;
          }
        }
      }

      if (!replyText) {
        replyText =
          run?.status === 'success'
            ? 'Workflow completed successfully.'
            : `Workflow finished with status: ${run?.status || 'unknown'}`;
      }

      const assistantMessageItem: ChatMessageItem = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: replyText,
        toolCalls: toolCalls.length ? toolCalls : undefined,
        status: run?.status,
        timestamp: new Date(),
      };

      setChatMessages((prev) => [...prev, assistantMessageItem]);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Execution error';
      setChatMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: `⚠️ Error running workflow: ${errorMsg}`,
          status: 'failed',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsChatSending(false);
    }
  };

  const deleteSelectedNode = useCallback(() => {
    setNodes((nds) => {
      return nds.filter((node) => !node.selected);
    });
    setEdges((eds) =>
      eds.filter(
        (edge) =>
          !edge.source ||
          !edge.target ||
          (nodes.some((node) => node.selected && node.id === edge.source) ||
            nodes.some((node) => node.selected && node.id === edge.target))
      )
    );
  }, [setNodes, setEdges, nodes]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
          return;
        }
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
            if (node.type === 'chatTrigger') {
              return {
                ...node,
                data: {
                  label: 'Chat Trigger',
                  type: 'Chat Window',
                  ...node.data,
                },
              };
            }
            if (node.type === 'ai') {
              return {
                ...node,
                data: {
                  model: 'openai/gpt-oss-20b',
                  systemPrompt:
                    'You are an intelligent assistant in a demand-driven workflow management system. Help the user concisely, automate requested actions using available tools when appropriate.',
                  tools: ['send_whatsapp', 'send_email', 'get_current_time'],
                  ...node.data,
                },
              };
            }
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
            if (node.type === 'whatsapp') {
              return {
                ...node,
                data: {
                  phone: '918208363244',
                  message: 'Hello from DemandFlow WhatsApp!',
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
    <div className="h-screen w-screen flex bg-slate-100 dark:bg-slate-900">
      {/* Sidebar Controls */}
      <div className="w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col z-10 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white truncate max-w-[180px]">
              {workflowName}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">DemandFlow Canvas</p>
          </div>
          <button
            onClick={() => setShowAddPanel(!showAddPanel)}
            className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors flex items-center justify-center"
            title="Add Node"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Add Nodes Slide-down panel */}
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="mb-4">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Triggers
            </p>
            <div className="space-y-2">
              <button
                onClick={() => addNode('chatTrigger', 'Chat Trigger', 'Chat Window')}
                className="w-full p-2.5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">Chat Trigger</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Interactive chat window</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => addNode('trigger', 'Event Trigger', 'Event')}
                className="w-full p-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">Event Trigger</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Custom demand event</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => addNode('webhook', 'Webhook Trigger', 'Webhook')}
                className="w-full p-2.5 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">Webhook</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">HTTP webhook</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Actions & AI
            </p>
            <div className="space-y-2">
              <button
                onClick={() => addNode('ai', 'Groq AI Agent', 'LLM Action')}
                className="w-full p-2.5 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">Groq AI Agent</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">System prompt + tool calling</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => addNode('whatsapp', 'Send WhatsApp', 'WhatsApp')}
                className="w-full p-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">WhatsApp</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Evolution API instance</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => addNode('gmail', 'Send Email', 'Gmail')}
                className="w-full p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">Gmail / Email</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Resend email delivery</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => addNode('telegram', 'Send Message', 'Telegram')}
                className="w-full p-2.5 bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-xl hover:bg-sky-100 dark:hover:bg-sky-900/30 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-sky-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">Telegram</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Telegram notification</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-auto pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <button
            onClick={() => setShowChatModal(true)}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
            Open Chat Window
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all disabled:opacity-50 text-sm shadow-sm"
          >
            {isSaving ? 'Saving...' : 'Save Workflow'}
          </button>

          <button
            onClick={handleRun}
            disabled={isRunning}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-slate-800 to-slate-900 text-white font-semibold rounded-xl hover:from-slate-700 hover:to-slate-800 transition-all disabled:opacity-50 text-sm"
          >
            {isRunning ? 'Running...' : 'Run Flow'}
          </button>

          {runStatus && (
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center truncate">{runStatus}</p>
          )}

          <a
            href="/dashboard"
            className="block w-full py-2 px-3 text-center text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative">
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
              if (n.type === 'chatTrigger') return '#6366f1';
              if (n.type === 'trigger') return '#3b82f6';
              if (n.type === 'ai') return '#a855f7';
              if (n.type === 'whatsapp') return '#10b981';
              if (n.type === 'gmail') return '#ef4444';
              if (n.type === 'telegram') return '#0ea5e9';
              return '#888';
            }}
            nodeColor={(n) => {
              if (n.type === 'chatTrigger') return '#e0e7ff';
              if (n.type === 'trigger') return '#dbeafe';
              if (n.type === 'ai') return '#f3e8ff';
              if (n.type === 'whatsapp') return '#d1fae5';
              if (n.type === 'gmail') return '#fee2e2';
              return '#f1f5f9';
            }}
            className="!bg-white dark:!bg-slate-900 !border !border-slate-200 dark:!border-slate-800"
          />
        </ReactFlow>

        {/* Top Floating Bar for Quick Chat Trigger */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          <button
            onClick={() => setShowChatModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-transform hover:scale-105"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            💬 Test in Chat
          </button>
        </div>
      </div>

      {/* Interactive Chat Window Modal */}
      {showChatModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl h-[640px] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-sm">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    Workflow Chat Trigger
                    <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                      Groq Powered
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Messages flow top-down into AI & action nodes
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowChatModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-950/30">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.sender === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  {msg.sender === 'system' ? (
                    <div className="w-full text-center my-2">
                      <span className="inline-block px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full text-xs">
                        ℹ️ {msg.text}
                      </span>
                    </div>
                  ) : (
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                        msg.sender === 'user'
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-none'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-bl-none'
                      }`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>

                      {/* Tool Calls Visual Feedback */}
                      {msg.toolCalls && msg.toolCalls.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700 space-y-2">
                          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            ⚡ AI Tools Invoked
                          </p>
                          {msg.toolCalls.map((tool, idx) => (
                            <div
                              key={idx}
                              className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-xs"
                            >
                              <div className="flex items-center justify-between font-mono font-medium text-emerald-600 dark:text-emerald-400">
                                <span>{tool.name}</span>
                                <span className="text-[10px] text-slate-400">Success</span>
                              </div>
                              {tool.args && (
                                <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                                  {tool.name === 'send_whatsapp' && (
                                    <>To: {String(tool.args.phone)} · Msg: &quot;{String(tool.args.message)}&quot;</>
                                  )}
                                  {tool.name === 'send_email' && (
                                    <>To: {String(tool.args.to)} · Subject: &quot;{String(tool.args.subject)}&quot;</>
                                  )}
                                  {tool.name === 'get_current_time' && (
                                    <>Time: {new Date().toLocaleTimeString()}</>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <span className="block mt-1 text-[10px] opacity-60 text-right">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}
                </div>
              ))}

              {isChatSending && (
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 w-fit">
                  <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <span>Groq AI is processing top-down flow & tools...</span>
                </div>
              )}

              <div ref={chatMessagesEndRef} />
            </div>

            {/* Quick Prompts */}
            <div className="px-4 py-2 bg-slate-100/60 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto text-xs">
              <span className="text-[11px] text-slate-400 whitespace-nowrap">Examples:</span>
              <button
                type="button"
                onClick={() => setChatInput('Send a WhatsApp to 918208363244 saying hello from DemandFlow!')}
                className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 whitespace-nowrap text-[11px]"
              >
                📱 Send WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setChatInput('Check the current time and give me a brief summary.')}
                className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 whitespace-nowrap text-[11px]"
              >
                ⏰ Get Time & Status
              </button>
              <button
                type="button"
                onClick={() => setChatInput('Send an email to sohampirale20504@gmail.com with subject Test and body hello')}
                className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 whitespace-nowrap text-[11px]"
              >
                ✉️ Send Email
              </button>
            </div>

            {/* Input Bar */}
            <form
              onSubmit={handleSendChatMessage}
              className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message to trigger the workflow..."
                disabled={isChatSending}
                className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all disabled:opacity-50"
                autoFocus
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isChatSending}
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-sm rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-indigo-500/20 flex items-center gap-1.5"
              >
                {isChatSending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Send</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WorkflowEditorPage({
  workflowId,
  workflowName,
}: {
  workflowId: string;
  workflowName: string;
}) {
  return (
    <div className="h-screen w-screen">
      <ReactFlowProvider>
        <FlowEditor workflowId={workflowId} workflowName={workflowName} />
      </ReactFlowProvider>
    </div>
  );
}
