import { Handle, Position, NodeProps } from 'reactflow';

export default function ButtonNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`px-4 py-3 rounded-xl border-2 shadow-lg min-w-[200px] ${
        selected
          ? 'border-pink-500 shadow-pink-500/30'
          : 'border-pink-200 dark:border-pink-800'
      } bg-gradient-to-br from-pink-50 to-white dark:from-pink-900/30 dark:to-slate-900`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
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
              d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
            {data.label || 'Button Click'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            Manual Trigger
          </p>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-pink-500 !border-2 !border-white dark:!border-slate-900"
      />
    </div>
  );
}
