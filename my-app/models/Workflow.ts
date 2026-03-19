import mongoose from 'mongoose';

export interface IWorkflow {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  triggers?: Array<{
    type: string;
    config: Record<string, unknown>;
  }>;
  actions?: Array<{
    type: string;
    config: Record<string, unknown>;
    order: number;
  }>;
  settings?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

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
    settings: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

const Workflow = mongoose.models.Workflow || mongoose.model<IWorkflow>('Workflow', workflowSchema);

export default Workflow;
