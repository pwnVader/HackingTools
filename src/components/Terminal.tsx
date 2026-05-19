import { ReactNode } from 'react';
import { cn } from '../lib/cn';

interface TerminalProps {
  title?: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

/**
 * Wrapper con barra de título tipo terminal (3 botones macOS-like).
 * Útil para enmarcar bloques de output o demos.
 */
export default function Terminal({ title, children, className, bodyClassName }: TerminalProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-bg-line bg-bg-card shadow-lg',
        className
      )}
    >
      <div className="flex items-center gap-2 border-b border-bg-line bg-bg-soft px-3 py-2">
        <span className="h-3 w-3 rounded-full bg-accent-red/70" />
        <span className="h-3 w-3 rounded-full bg-accent-yellow/70" />
        <span className="h-3 w-3 rounded-full bg-accent-green/70" />
        {title && (
          <span className="ml-3 text-xs text-fg-muted tracking-wide">{title}</span>
        )}
      </div>
      <div className={cn('p-4', bodyClassName)}>{children}</div>
    </div>
  );
}
