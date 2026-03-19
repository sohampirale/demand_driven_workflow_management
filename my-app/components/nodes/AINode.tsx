import { Handle, Position, NodeProps } from 'reactflow';

export default function AINode({ data, selected }: NodeProps) {
  return (
    <div
      className={`px-4 py-3 rounded-xl border-2 shadow-lg min-w-[200px] ${
        selected
          ? 'border-purple-500 shadow-purple-500/30'
          : 'border-purple-200 dark:border-purple-800'
      } bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/30 dark:to-slate-900`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
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
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
            {data.label || 'AI Action'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {data.aiType || 'LLM Processing'}
          </p>
        </div>
      </div>
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white dark:!border-slate-900"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white dark:!border-slate-900"
      />
    </div>
  );
}
