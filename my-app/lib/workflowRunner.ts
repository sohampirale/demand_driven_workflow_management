import { Types } from 'mongoose';
import { connectDB } from '@/lib/db';
import Workflow from '@/models/Workflow';
import WorkflowRun from '@/models/WorkflowRun';
import { Resend } from 'resend';

export interface RunWorkflowInput {
  workflowId: string;
  userId: string;
  trigger: {
    type: string;
    source: string;
  };
  inputs?: Record<string, unknown>;
  overrideCanvas?: {
    nodes: CanvasNode[];
    edges: CanvasEdge[];
  };
}

interface CanvasNode {
  id: string;
  type?: string;
  data?: Record<string, unknown>;
}

interface CanvasEdge {
  id: string;
  source: string;
  target: string;
}

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || '';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://140.245.228.27:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'apikey-ropmitra-prod-12345';
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'soham-pirale';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const DEFAULT_GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

function requireResendConfig() {
  if (!RESEND_API_KEY) {
    throw new Error('Missing RESEND_API_KEY');
  }
  if (!RESEND_FROM_EMAIL) {
    throw new Error('Missing RESEND_FROM_EMAIL');
  }
}

function buildExecutionOrder(nodes: CanvasNode[], edges: CanvasEdge[]) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, string[]>();

  nodes.forEach((node) => {
    incoming.set(node.id, 0);
    outgoing.set(node.id, []);
  });

  edges.forEach((edge) => {
    if (!incoming.has(edge.target)) return;
    incoming.set(edge.target, (incoming.get(edge.target) || 0) + 1);
    const list = outgoing.get(edge.source);
    if (list) list.push(edge.target);
  });

  const queue: string[] = [];
  incoming.forEach((count, id) => {
    if (count === 0) queue.push(id);
  });

  const ordered: CanvasNode[] = [];
  while (queue.length > 0) {
    const id = queue.shift();
    if (!id) break;
    const node = nodeById.get(id);
    if (node) ordered.push(node);
    const targets = outgoing.get(id) || [];
    targets.forEach((targetId) => {
      const nextCount = (incoming.get(targetId) || 0) - 1;
      incoming.set(targetId, nextCount);
      if (nextCount === 0) queue.push(targetId);
    });
  }

  const missing = nodes.filter((node) => !ordered.some((item) => item.id === node.id));
  return ordered.concat(missing);
}

function isActionNode(node: CanvasNode) {
  const type = node.type || '';
  return ['gmail', 'action', 'ai', 'telegram', 'telegramWait', 'whatsapp'].includes(type);
}

function normalizeString(value: unknown) {
  if (typeof value === 'string') return value.trim();
  if (value == null) return '';
  return String(value).trim();
}

async function sendWhatsAppDirect(phone: string, message: string) {
  const digitsOnly = phone.replace(/\D/g, '');
  const baseUrl = EVOLUTION_API_URL.replace(/\/+$/, '');
  const endpoint = `${baseUrl}/message/sendText/${EVOLUTION_INSTANCE}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: EVOLUTION_API_KEY,
    },
    body: JSON.stringify({
      number: digitsOnly,
      text: message,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Evolution API error (${response.status}): ${errorBody || response.statusText}`);
  }

  return await response.json();
}

async function sendEmailDirect(to: string, subject: string, body: string) {
  requireResendConfig();
  const resend = new Resend(RESEND_API_KEY);
  const { data: sent, error } = await resend.emails.send({
    from: RESEND_FROM_EMAIL,
    to,
    subject: subject || 'Workflow email',
    text: body || 'Hello from DemandFlow',
  });

  if (error) {
    throw new Error(error.message || 'Failed to send email');
  }

  return { id: sent?.id, to, subject };
}

const AVAILABLE_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'send_whatsapp',
      description: 'Send an automated WhatsApp text message to a phone number via Evolution API',
      parameters: {
        type: 'object',
        properties: {
          phone: {
            type: 'string',
            description: 'Recipient phone number with country code, e.g. 918208363244',
          },
          message: {
            type: 'string',
            description: 'The exact WhatsApp message body text to send',
          },
        },
        required: ['phone', 'message'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_email',
      description: 'Send an email notification via Resend',
      parameters: {
        type: 'object',
        properties: {
          to: {
            type: 'string',
            description: 'Recipient email address',
          },
          subject: {
            type: 'string',
            description: 'Email subject line',
          },
          body: {
            type: 'string',
            description: 'Email body text content',
          },
        },
        required: ['to', 'subject', 'body'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_current_time',
      description: 'Get the current system date, time, and timezone information',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
];

async function executeAINode(node: CanvasNode, incomingMessage?: string) {
  if (!GROQ_API_KEY) {
    throw new Error('Missing GROQ_API_KEY in environment variables');
  }

  const data = node.data || {};
  const systemPrompt =
    normalizeString(data.systemPrompt) ||
    'You are an intelligent assistant in a demand-driven workflow management system. Help the user concisely, automate requested actions using available tools when appropriate.';

  const userMessage =
    normalizeString(incomingMessage) ||
    normalizeString(data.userPrompt) ||
    'Hello! Please process this workflow.';

  const model = normalizeString(data.model) || DEFAULT_GROQ_MODEL;
  const enabledTools: string[] = Array.isArray(data.tools)
    ? (data.tools as string[])
    : ['send_whatsapp', 'send_email', 'get_current_time'];

  const activeTools = AVAILABLE_TOOLS.filter((t) => enabledTools.includes(t.function.name));

  interface ChatMessage {
    role: string;
    content?: string | null;
    tool_calls?: any[];
    tool_call_id?: string;
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];

  const payload: Record<string, unknown> = {
    model,
    messages,
    max_tokens: 512,
  };

  if (activeTools.length > 0) {
    payload.tools = activeTools;
  }

  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!groqRes.ok) {
    const errorBody = await groqRes.text();
    throw new Error(`Groq API error (${groqRes.status}): ${errorBody}`);
  }

  const completion = await groqRes.json();
  const choice = completion.choices?.[0]?.message;
  let assistantText = choice?.content || '';
  const toolCalls = choice?.tool_calls || [];
  const executedToolResults: Array<{
    id: string;
    name: string;
    args: Record<string, unknown>;
    result: Record<string, unknown>;
  }> = [];

  if (toolCalls.length > 0) {
    messages.push(choice);

    for (const toolCall of toolCalls) {
      const toolName = toolCall.function?.name;
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(toolCall.function?.arguments || '{}');
      } catch {}

      let toolResult: Record<string, unknown>;
      try {
        if (toolName === 'send_whatsapp') {
          const phone = normalizeString(args.phone) || '918208363244';
          const msg = normalizeString(args.message) || 'Hello from AI Agent';
          const sent = await sendWhatsAppDirect(phone, msg);
          toolResult = { success: true, phone, message: msg, result: sent };
        } else if (toolName === 'send_email') {
          const to = normalizeString(args.to) || 'sohampirale20504@gmail.com';
          const subject = normalizeString(args.subject) || 'DemandFlow notification';
          const body = normalizeString(args.body) || 'Hello from AI Agent';
          const sent = await sendEmailDirect(to, subject, body);
          toolResult = { success: true, to, subject, result: sent };
        } else if (toolName === 'get_current_time') {
          toolResult = { iso: new Date().toISOString(), local: new Date().toLocaleString() };
        } else {
          toolResult = { error: `Unknown tool: ${toolName}` };
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Tool execution failed';
        toolResult = { error: errorMsg };
      }

      executedToolResults.push({
        id: toolCall.id,
        name: toolName,
        args,
        result: toolResult,
      });

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(toolResult),
      });
    }

    try {
      const secondRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 512,
        }),
      });
      if (secondRes.ok) {
        const secondCompletion = await secondRes.json();
        assistantText = secondCompletion.choices?.[0]?.message?.content || assistantText;
      }
    } catch {}
  }

  return {
    provider: 'groq',
    model,
    text: assistantText,
    reply: assistantText,
    userMessage,
    toolCalls: executedToolResults,
  };
}

async function executeWhatsAppNode(node: CanvasNode, incomingMessage?: string) {
  const data = node.data || {};
  const rawPhone = normalizeString(data.phone || data.to) || '918208363244';
  const digitsOnly = rawPhone.replace(/\D/g, '');

  let message = normalizeString(data.message || data.text || data.body);
  if ((!message || message === 'Hello from DemandFlow WhatsApp!') && incomingMessage) {
    message = incomingMessage;
  }
  if (!message) {
    message = 'Hello from DemandFlow WhatsApp!';
  }

  if (!digitsOnly) {
    throw new Error('WhatsApp node requires a valid recipient phone number');
  }

  const result = await sendWhatsAppDirect(digitsOnly, message);

  return {
    provider: 'evolution-api',
    instance: EVOLUTION_INSTANCE,
    to: digitsOnly,
    message,
    messageId: result?.key?.id || result?.messageId || result?.id,
    response: result,
  };
}

async function executeGmailNode(node: CanvasNode, incomingMessage?: string) {
  requireResendConfig();
  const data = node.data || {};
  const to = normalizeString(data.to);
  const subject = normalizeString(data.subject);

  let body = normalizeString(data.body || data.message);
  if ((!body || body === 'Write your email body here.') && incomingMessage) {
    body = incomingMessage;
  }
  if (!body) {
    body = 'Hello from DemandFlow';
  }

  if (!to) {
    throw new Error('Gmail node requires a recipient');
  }

  const sent = await sendEmailDirect(to, subject || 'Workflow email', body);

  return {
    provider: 'resend',
    messageId: sent.id,
    to,
    subject: subject || 'Workflow email',
    body,
  };
}

export async function runWorkflow({ workflowId, userId, trigger, inputs, overrideCanvas }: RunWorkflowInput) {
  await connectDB();

  if (!Types.ObjectId.isValid(workflowId)) {
    throw new Error('Invalid workflow id');
  }

  const workflow = await Workflow.findOne({
    _id: workflowId,
    userId,
  }).lean();

  if (!workflow) {
    throw new Error('Workflow not found');
  }

  const nodes = (overrideCanvas?.nodes || workflow.canvasData?.nodes || []) as CanvasNode[];
  const edges = (overrideCanvas?.edges || workflow.canvasData?.edges || []) as CanvasEdge[];

  if (!nodes.length) {
    throw new Error('Workflow has no nodes');
  }

  const orderedNodes = buildExecutionOrder(nodes, edges).filter(isActionNode);

  if (!orderedNodes.length) {
    throw new Error('Workflow has no executable actions');
  }

  const run = await WorkflowRun.create({
    workflowId: new Types.ObjectId(workflowId),
    userId: new Types.ObjectId(userId),
    status: 'running',
    trigger,
    inputs: inputs || {},
    steps: orderedNodes.map((node) => ({
      id: node.id,
      stepType: node.type || 'action',
      status: 'pending',
    })),
    startedAt: new Date(),
  });

  await Workflow.findByIdAndUpdate(workflowId, {
    $set: { latestRunId: run._id },
  });

  const outputs: Record<string, unknown> = {};

  for (const node of orderedNodes) {
    const stepIndex = run.steps.findIndex((step: { id?: string }) => step.id === node.id);
    if (stepIndex < 0) continue;
    run.steps[stepIndex].status = 'running';
    run.steps[stepIndex].startedAt = new Date();
    await run.save();

    // Resolve incoming message from top-down edges
    const incomingEdges = edges.filter((e) => e.target === node.id);
    let incomingMessage = '';

    for (const edge of incomingEdges) {
      const sourceOutput = outputs[edge.source] as Record<string, unknown> | undefined;
      if (sourceOutput?.text && typeof sourceOutput.text === 'string') {
        incomingMessage = sourceOutput.text;
        break;
      }
      if (sourceOutput?.reply && typeof sourceOutput.reply === 'string') {
        incomingMessage = sourceOutput.reply;
        break;
      }
      const sourceNode = nodes.find((n) => n.id === edge.source);
      if (sourceNode?.type === 'chatTrigger' || sourceNode?.type === 'trigger') {
        incomingMessage = normalizeString(inputs?.message || inputs?.text || trigger.source);
        break;
      }
    }

    if (!incomingMessage && inputs?.message) {
      incomingMessage = normalizeString(inputs.message);
    }

    try {
      let output: Record<string, unknown> | undefined;
      if (node.type === 'gmail') {
        output = await executeGmailNode(node, incomingMessage);
      } else if (node.type === 'whatsapp') {
        output = await executeWhatsAppNode(node, incomingMessage);
      } else if (node.type === 'ai') {
        output = await executeAINode(node, incomingMessage);
      } else {
        output = { skipped: true, incomingMessage };
      }

      run.steps[stepIndex].status = 'success';
      run.steps[stepIndex].finishedAt = new Date();
      run.steps[stepIndex].output = output;
      if (output) outputs[node.id] = output;
      await run.save();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      run.steps[stepIndex].status = 'failed';
      run.steps[stepIndex].finishedAt = new Date();
      run.steps[stepIndex].error = message;
      run.status = 'failed';
      run.error = message;
      run.finishedAt = new Date();
      await run.save();
      return JSON.parse(JSON.stringify(run));
    }
  }

  run.status = 'success';
  run.outputs = outputs;
  run.finishedAt = new Date();
  await run.save();

  return JSON.parse(JSON.stringify(run));
}
