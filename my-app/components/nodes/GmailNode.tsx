import { Handle, Position, NodeProps } from 'reactflow';
import { useMemo } from 'react';

const EMAIL_FALLBACK = 'sohampirale20504@gmail.com';

export default function GmailNode({ data, selected }: NodeProps) {
  const to = useMemo(() => {
    if (typeof data?.to === 'string' && data.to.trim()) return data.to.trim();
    return EMAIL_FALLBACK;
  }, [data?.to]);

  const subject = useMemo(() => {
    if (typeof data?.subject === 'string' && data.subject.trim()) return data.subject.trim();
    return 'Hello from DemandFlow';
  }, [data?.subject]);

  const body = useMemo(() => {
    if (typeof data?.body === 'string' && data.body.trim()) return data.body.trim();
    return 'Write your email body here.';
  }, [data?.body]);

  return (
    <div
      className={`px-4 py-3 rounded-xl border-2 shadow-lg min-w-[200px] ${
        selected
          ? 'border-red-500 shadow-red-500/30'
          : 'border-red-200 dark:border-red-800'
      } bg-gradient-to-br from-red-50 to-white dark:from-red-900/30 dark:to-slate-900`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg
            className="w-5 h-5 text-white"
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
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
            {data.label || 'Gmail'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {data.actionType || 'Send Email'}
          </p>
        </div>
      </div>
      <div className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300">
        <div>
          <label className="block text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
            To
          </label>
          <input
            value={to}
            onChange={(event) => {
              const value = event.target.value;
              if (data.onChange) data.onChange({ ...data, to: value });
            }}
            className="w-full mt-1 rounded-lg border border-red-200 dark:border-red-800 bg-white/80 dark:bg-slate-900/60 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
            placeholder={EMAIL_FALLBACK}
          />
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Subject
          </label>
          <input
            value={subject}
            onChange={(event) => {
              const value = event.target.value;
              if (data.onChange) data.onChange({ ...data, subject: value });
            }}
            className="w-full mt-1 rounded-lg border border-red-200 dark:border-red-800 bg-white/80 dark:bg-slate-900/60 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
            placeholder="Email subject"
          />
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Body
          </label>
          <textarea
            value={body}
            onChange={(event) => {
              const value = event.target.value;
              if (data.onChange) data.onChange({ ...data, body: value });
            }}
            rows={3}
            className="w-full mt-1 rounded-lg border border-red-200 dark:border-red-800 bg-white/80 dark:bg-slate-900/60 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
            placeholder="Write email body"
          />
        </div>
      </div>
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-red-500 !border-2 !border-white dark:!border-slate-900"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-red-500 !border-2 !border-white dark:!border-slate-900"
      />
    </div>
  );
}
