'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import WorkflowEditorPage from '@/components/WorkflowEditor';

export default function WorkflowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [workflowName, setWorkflowName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/workflows/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Workflow not found');
        return res.json();
      })
      .then((data) => {
        setWorkflowName(data.workflow?.name || 'Workflow');
      })
      .catch(() => {
        router.push('/dashboard');
      })
      .finally(() => setIsLoading(false));
  }, [id, router]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Loading workflow...</p>
        </div>
      </div>
    );
  }

  return <WorkflowEditorPage workflowId={id} workflowName={workflowName} />;
}
