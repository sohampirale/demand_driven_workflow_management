import { Handle, Position, NodeProps } from 'reactflow';
import { useMemo } from 'react';

const DEFAULT_SYSTEM_PROMPT =
  'You are an intelligent assistant in a demand-driven workflow management system. Help the user concisely, automate their requested actions using available tools when appropriate.';

export default function AINode({ data, selected }: NodeProps) {
  const systemPrompt = useMemo(() => {
    if (typeof data?.systemPrompt === 'string' && data.systemPrompt.trim()) {
      return data.systemPrompt;
    }
    return DEFAULT_SYSTEM_PROMPT;
  }, [data?.systemPrompt]);

  const model = useMemo(() => {
    return (data?.model as string) || 'openai/gpt-oss-20b';
  }, [data?.model]);

  const tools: string[] = useMemo(() => {
    if (Array.isArray(data?.tools)) {
      return data.tools as string[];
    }
    return ['send_whatsapp', 'send_email', 'get_current_time'];
  }, [data?.tools]);

  const toggleTool = (toolName: string) => {
    const updated = tools.includes(toolName)
      ? tools.filter((t) => t !== toolName)
      : [...tools, toolName];
    if (data.onChange) {
      data.onChange({ ...data, tools: updated });
    }
  };

  return (
    <div
      className={`px-4 py-3 rounded-xl border-2 shadow-lg min-w-[260px] max-w-[320px] ${
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
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {data.label || 'Groq AI Agent'}
            </p>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300">
              Groq LLM
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {model}
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
        <div>
          <label className="block text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500 font-medium">
            Model
          </label>
          <select
            value={model}
            onChange={(e) => {
              if (data.onChange) data.onChange({ ...data, model: e.target.value });
            }}
            className="w-full mt-1 rounded-lg border border-purple-200 dark:border-purple-800 bg-white/80 dark:bg-slate-900/60 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            <option value="openai/gpt-oss-20b">openai/gpt-oss-20b</option>
            <option value="qwen/qwen3.8-27b">qwen/qwen3.8-27b</option>
            <option value="openai/gpt-oss-120b">openai/gpt-oss-120b</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500 font-medium">
            System Prompt
          </label>
          <textarea
            value={systemPrompt}
            onChange={(e) => {
              if (data.onChange) data.onChange({ ...data, systemPrompt: e.target.value });
            }}
            rows={3}
            className="w-full mt-1 rounded-lg border border-purple-200 dark:border-purple-800 bg-white/80 dark:bg-slate-900/60 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400"
            placeholder="Define AI behavior and instructions..."
          />
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500 font-medium mb-1">
            Tools Available to AI
          </label>
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-2 cursor-pointer text-[11px]">
              <input
                type="checkbox"
                checked={tools.includes('send_whatsapp')}
                onChange={() => toggleTool('send_whatsapp')}
                className="rounded border-purple-300 text-purple-600 focus:ring-purple-400 h-3.5 w-3.5"
              />
              <span>WhatsApp (Evolution API)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-[11px]">
              <input
                type="checkbox"
                checked={tools.includes('send_email')}
                onChange={() => toggleTool('send_email')}
                className="rounded border-purple-300 text-purple-600 focus:ring-purple-400 h-3.5 w-3.5"
              />
              <span>Email (Resend)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-[11px]">
              <input
                type="checkbox"
                checked={tools.includes('get_current_time')}
                onChange={() => toggleTool('get_current_time')}
                className="rounded border-purple-300 text-purple-600 focus:ring-purple-400 h-3.5 w-3.5"
              />
              <span>Current Date & Time</span>
            </label>
          </div>
        </div>

        <div className="pt-1 border-t border-purple-100 dark:border-purple-900/40 text-[10px] text-purple-600 dark:text-purple-400 italic">
          💡 Incoming message from top node (e.g. Chat Trigger) is fed as the User Message.
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
