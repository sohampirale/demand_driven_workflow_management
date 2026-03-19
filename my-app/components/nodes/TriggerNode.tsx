import { Handle, Position, NodeProps } from 'reactflow';

export default function TriggerNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`px-4 py-3 rounded-xl border-2 shadow-lg min-w-[180px] ${
        selected
          ? 'border-blue-500 shadow-blue-500/30'
          : 'border-blue-200 dark:border-blue-800'
      } bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/30 dark:to-slate-900`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
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
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
            {data.label || 'Trigger'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {data.type || 'Event'}
          </p>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white dark:!border-slate-900"
      />
    </div>
  );
}
