import { Handle, Position, NodeProps } from 'reactflow';
import { useMemo } from 'react';

const DEFAULT_PHONE = '918208363244';
const DEFAULT_INSTANCE = 'soham-pirale';

export default function WhatsAppNode({ data, selected }: NodeProps) {
  const phone = useMemo(() => {
    if (typeof data?.phone === 'string' && data.phone.trim()) return data.phone.trim();
    return DEFAULT_PHONE;
  }, [data?.phone]);

  const message = useMemo(() => {
    if (typeof data?.message === 'string' && data.message.trim()) return data.message.trim();
    return 'Hello from DemandFlow WhatsApp!';
  }, [data?.message]);

  return (
    <div
      className={`px-4 py-3 rounded-xl border-2 shadow-lg min-w-[220px] ${
        selected
          ? 'border-emerald-500 shadow-emerald-500/30'
          : 'border-emerald-200 dark:border-emerald-800'
      } bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/30 dark:to-slate-900`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
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
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {data.label || 'WhatsApp'}
            </p>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
              Live
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {DEFAULT_INSTANCE}
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300">
        <div>
          <label className="block text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Phone Number (Recipient)
          </label>
          <input
            value={phone}
            onChange={(event) => {
              const value = event.target.value;
              if (data.onChange) data.onChange({ ...data, phone: value });
            }}
            className="w-full mt-1 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white/80 dark:bg-slate-900/60 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
            placeholder={DEFAULT_PHONE}
          />
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Message
          </label>
          <textarea
            value={message}
            onChange={(event) => {
              const value = event.target.value;
              if (data.onChange) data.onChange({ ...data, message: value });
            }}
            rows={3}
            className="w-full mt-1 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white/80 dark:bg-slate-900/60 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
            placeholder="Write WhatsApp message..."
          />
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white dark:!border-slate-900"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white dark:!border-slate-900"
      />
    </div>
  );
}
