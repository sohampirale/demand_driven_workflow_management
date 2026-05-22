import mongoose from 'mongoose';

export interface IWorkflowRun {
  _id: mongoose.Types.ObjectId;
  workflowId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  status: 'queued' | 'running' | 'success' | 'failed';
  trigger: {
    type: string;
    source: string;
  };
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  steps: Array<{
    id: string;
    stepType: string;
    status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
    startedAt?: Date;
    finishedAt?: Date;
    error?: string;
    output?: Record<string, unknown>;
  }>;
  error?: string;
  startedAt?: Date;
  finishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const workflowRunSchema = new mongoose.Schema<IWorkflowRun>(
  {
    workflowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workflow',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['queued', 'running', 'success', 'failed'],
      default: 'queued',
    },
    trigger: {
      type: {
        type: String,
        required: true,
      },
      source: {
        type: String,
        required: true,
      },
    },
    inputs: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    outputs: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    steps: {
      type: [
        {
          id: String,
          stepType: String,
          status: {
            type: String,
            enum: ['pending', 'running', 'success', 'failed', 'skipped'],
            default: 'pending',
          },
          startedAt: Date,
          finishedAt: Date,
          error: String,
          output: mongoose.Schema.Types.Mixed,
        },
      ],
      default: [],
    },
    error: String,
    startedAt: Date,
    finishedAt: Date,
  },
  {
    timestamps: true,
  }
);

const existingModel = mongoose.models.WorkflowRun as mongoose.Model<IWorkflowRun> | undefined;
const hasLegacyStepType = Boolean(existingModel?.schema?.path('steps.0.type'));

if (hasLegacyStepType) {
  delete mongoose.models.WorkflowRun;
}

const WorkflowRun =
  mongoose.models.WorkflowRun ||
  mongoose.model<IWorkflowRun>('WorkflowRun', workflowRunSchema);

export default WorkflowRun;
