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

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://140.245.228.27:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'apikey-ropmitra-prod-12345';
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'soham-pirale';

async function executeWhatsAppNode(node: CanvasNode) {
  const data = node.data || {};
  const rawPhone = normalizeString(data.phone || data.to) || '918208363244';
  const digitsOnly = rawPhone.replace(/\D/g, '');
  const message = normalizeString(data.message || data.text || data.body) || 'Hello from DemandFlow WhatsApp!';

  if (!digitsOnly) {
    throw new Error('WhatsApp node requires a valid recipient phone number');
  }

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

  const result = await response.json();
  return {
    provider: 'evolution-api',
    instance: EVOLUTION_INSTANCE,
    to: digitsOnly,
    messageId: result?.key?.id || result?.messageId || result?.id,
    response: result,
  };
}

async function executeGmailNode(node: CanvasNode) {
  requireResendConfig();
  const data = node.data || {};
  const to = normalizeString(data.to);
  const subject = normalizeString(data.subject);
  const body = normalizeString(data.body || data.message);

  if (!to) {
    throw new Error('Gmail node requires a recipient');
  }

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

  return {
    provider: 'resend',
    messageId: sent?.id,
    to,
    subject: subject || 'Workflow email',
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

    try {
      let output: Record<string, unknown> | undefined;
      if (node.type === 'gmail') {
        output = await executeGmailNode(node);
      } else if (node.type === 'whatsapp') {
        output = await executeWhatsAppNode(node);
      } else {
        output = { skipped: true };
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
