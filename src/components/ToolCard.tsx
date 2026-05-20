import { Link } from 'react-router-dom';
import { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '../lib/cn';

interface ToolCardProps {
  to: string;
  command: string;
  title: string;
  description: ReactNode;
  icon?: ReactNode;
  status?: 'ready' | 'soon';
  className?: string;
}

export default function ToolCard({
  to,
  command,
  title,
  description,
  icon,
  status = 'ready',
  className,
}: ToolCardProps) {
  const ready = status === 'ready';
  const inner = (
    <div
      className={cn(
        'group relative flex h-full flex-col rounded-xl border border-bg-line bg-bg-card p-6 transition-all duration-300',
        ready
          ? 'hover:border-orange-500/50 hover:shadow-glow hover:-translate-y-1 cursor-pointer'
          : 'opacity-50 cursor-not-allowed border-bg-line/40',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {icon && (
            <div
              className={cn(
                'flex h-11 w-11 items-center justify-center rounded-lg transition-colors duration-300',
                ready
                  ? 'border border-orange-500/30 bg-orange-500/5 text-orange-400 group-hover:bg-orange-500/10 group-hover:border-orange-500/50'
                  : 'border border-bg-line bg-bg-elevated/40 text-fg-dim'
              )}
            >
              {icon}
            </div>
          )}
          <h3 className="text-lg font-semibold text-fg transition-colors duration-300 group-hover:text-text-primary">{title}</h3>
        </div>
        {!ready && (
          <span className="rounded border border-orange-500/30 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-orange-400/70 bg-orange-500/5">
            soon
          </span>
        )}
      </div>
      <p className="mt-4 flex-1 text-sm text-fg-muted leading-relaxed font-mono">{description}</p>
      <div className="mt-5 flex items-center gap-2 text-xs pt-4 border-t border-bg-line/40">
        <span className="text-orange-400 font-bold">$</span>
        <code className="text-orange-400 font-mono">{command}</code>
        {ready && (
          <ArrowRight className="ml-auto h-4 w-4 text-fg-dim transition-all duration-300 group-hover:text-orange-400 group-hover:translate-x-1" />
        )}
      </div>
    </div>
  );

  if (!ready) return inner;
  return (
    <Link to={to} className="block h-full focus:outline-none focus:ring-2 focus:ring-accent/40 rounded-xl">
      {inner}
    </Link>
  );
}

