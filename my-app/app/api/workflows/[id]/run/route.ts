import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { getCurrentUser } from '@/lib/auth';
import { runWorkflow } from '@/lib/workflowRunner';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid workflow ID' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const run = await runWorkflow({
      workflowId: id,
      userId: user._id,
      trigger: {
        type: 'manual',
        source: body.source || 'ui',
      },
      inputs: body.inputs || {},
      overrideCanvas: body.nodes && body.edges ? { nodes: body.nodes, edges: body.edges } : undefined,
    });

    return NextResponse.json({ run });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to run workflow';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
