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
 * Útil para enmarcar bloques de output, consolas y herramientas.
 */
export default function Terminal({ title, children, className, bodyClassName }: TerminalProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-borderCustom bg-bgSurface shadow-2xl transition duration-300',
        className
      )}
    >
      {/* Cabecera de la terminal */}
      <div className="relative flex items-center justify-between border-b border-borderCustom bg-bgElevated px-4 py-3 select-none">
        <div className="flex items-center gap-2 z-10">
          <span className="h-3 w-3 rounded-full bg-accent-red/80 hover:bg-accent-red transition cursor-pointer" />
          <span className="h-3 w-3 rounded-full bg-accent-yellow/80 hover:bg-accent-yellow transition cursor-pointer" />
          <span className="h-3 w-3 rounded-full bg-accent-green/80 hover:bg-accent-green transition cursor-pointer" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="font-mono text-xs text-textMuted font-medium">
            {title || 'root@pwnvader:~'}
          </span>
        </div>
        <div className="w-12 z-10 flex justify-end">
          <span className="text-[10px] text-textMuted/40 font-mono">tty1</span>
        </div>
      </div>
      {/* Cuerpo de la terminal */}
      <div className={cn('p-5 font-mono text-textPrimary leading-relaxed', bodyClassName)}>
        {children}
      </div>
    </div>
  );
}
