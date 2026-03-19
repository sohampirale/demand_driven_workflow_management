import { Handle, Position, NodeProps } from 'reactflow';

export default function ActionNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`px-4 py-3 rounded-xl border-2 shadow-lg min-w-[180px] ${
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
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
            {data.label || 'Action'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {data.actionType || 'Step'}
          </p>
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
