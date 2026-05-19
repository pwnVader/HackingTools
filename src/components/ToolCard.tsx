import { Link } from 'react-router-dom';
import { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '../lib/cn';

interface ToolCardProps {
  to: string;
  command: string;
  title: string;
  description: string;
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
        'group relative flex h-full flex-col rounded-xl border border-bg-line bg-bg-card p-6 transition',
        ready
          ? 'hover:border-accent-green/60 hover:shadow-glow hover:-translate-y-0.5 cursor-pointer'
          : 'opacity-60 cursor-not-allowed',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-accent-green/30 bg-accent-green/5 text-accent-green">
              {icon}
            </div>
          )}
          <h3 className="text-lg font-semibold text-fg">{title}</h3>
        </div>
        {!ready && (
          <span className="rounded border border-accent-yellow/50 px-2 py-0.5 text-[10px] uppercase tracking-wider text-accent-yellow">
            soon
          </span>
        )}
      </div>
      <p className="mt-4 flex-1 text-sm text-fg-muted leading-relaxed">{description}</p>
      <div className="mt-5 flex items-center gap-2 text-xs pt-4 border-t border-bg-line/60">
        <span className="text-accent-red">$</span>
        <code className="text-accent-green">{command}</code>
        {ready && (
          <ArrowRight className="ml-auto h-4 w-4 text-fg-dim transition group-hover:text-accent-green group-hover:translate-x-0.5" />
        )}
      </div>
    </div>
  );

  if (!ready) return inner;
  return (
    <Link to={to} className="block h-full focus:outline-none focus:ring-1 focus:ring-accent-green/50 rounded-xl">
      {inner}
    </Link>
  );
}
