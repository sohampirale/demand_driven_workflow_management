import mongoose from 'mongoose';

export interface IWorkflow {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  latestRunId?: mongoose.Types.ObjectId | null;
  triggers?: Array<{
    type: string;
    config: Record<string, unknown>;
  }>;
  actions?: Array<{
    type: string;
    config: Record<string, unknown>;
    order: number;
  }>;
  canvasData?: {
    nodes?: Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
      data: Record<string, unknown>;
    }>;
    edges?: Array<{
      id: string;
      source: string;
      target: string;
    }>;
  };
  settings?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const canvasNodeSchema = new mongoose.Schema(
  {
    id: String,
    type: String,
    position: {
      x: Number,
      y: Number,
    },
    data: mongoose.Schema.Types.Mixed,
  },
  { _id: false }
);

const canvasEdgeSchema = new mongoose.Schema(
  {
    id: String,
    source: String,
    target: String,
  },
  { _id: false }
);

const workflowSchema = new mongoose.Schema<IWorkflow>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Workflow name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'paused', 'archived'],
      default: 'draft',
    },
    latestRunId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkflowRun',
      default: null,
    },
    triggers: {
      type: [
        {
          type: String,
          config: mongoose.Schema.Types.Mixed,
        },
      ],
      default: [],
    },
    actions: {
      type: [
        {
          type: String,
          config: mongoose.Schema.Types.Mixed,
          order: Number,
        },
      ],
      default: [],
    },
    canvasData: {
      nodes: [canvasNodeSchema],
      edges: [canvasEdgeSchema],
    },
    settings: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

const existingWorkflowModel = mongoose.models.Workflow as mongoose.Model<IWorkflow> | undefined;
const hasLegacyCanvasNodes = Boolean(existingWorkflowModel?.schema?.path('canvasData.nodes.0'));

if (hasLegacyCanvasNodes) {
  delete mongoose.models.Workflow;
}

const Workflow = mongoose.models.Workflow || mongoose.model<IWorkflow>('Workflow', workflowSchema);

export default Workflow;
