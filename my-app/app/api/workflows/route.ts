import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Workflow from '@/models/Workflow';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    await connectDB();

    const workflows = await Workflow.find({ userId: user._id })
      .sort({ createdAt: 'desc' })
      .lean();

    return NextResponse.json({ workflows });
  } catch (error) {
    console.error('Get workflows error:', error);
    return NextResponse.json(
      { error: 'Failed to get workflows' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Workflow name is required' },
        { status: 400 }
      );
    }

    const workflow = await Workflow.create({
      userId: user._id,
      name,
      description: description || '',
      status: 'draft',
    });

    return NextResponse.json(
      {
        message: 'Workflow created successfully',
        workflow: JSON.parse(JSON.stringify(workflow)),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create workflow error:', error);
    return NextResponse.json(
      { error: 'Failed to create workflow' },
      { status: 500 }
    );
  }
}
