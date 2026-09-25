import { Handle, Position, NodeProps } from 'reactflow';

export default function ChatTriggerNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`px-4 py-3 rounded-xl border-2 shadow-lg min-w-[210px] ${
        selected
          ? 'border-indigo-500 shadow-indigo-500/30'
          : 'border-indigo-200 dark:border-indigo-800'
      } bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/30 dark:to-slate-900`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
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
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {data.label || 'Chat Trigger'}
            </p>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300">
              Trigger
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            User Chat Input
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <p className="text-[11px] text-slate-600 dark:text-slate-400">
          Trigger workflow on message and pass text downstream.
        </p>
        {typeof data?.onOpenChat === 'function' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              data.onOpenChat();
            }}
            className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors shadow-sm"
          >
            <svg
              className="w-3.5 h-3.5"
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
            Open Chat Window
          </button>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-white dark:!border-slate-900"
      />
    </div>
  );
}
