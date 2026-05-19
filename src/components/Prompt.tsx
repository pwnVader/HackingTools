import { cn } from '../lib/cn';

interface PromptProps {
  user?: string;
  host?: string;
  cwd?: string;
  command?: string;
  blink?: boolean;
  className?: string;
}

/**
 * Renderiza un prompt táctico estilo Kali Linux:
 *   ┌──(user㉿host)-[cwd]
 *   └─$ command
 *
 * Coherente con la estética del sitio principal pwnvader.com.
 */
export default function Prompt({
  user = 'pwnvader',
  host = 'kali',
  cwd = '~',
  command,
  blink = false,
  className,
}: PromptProps) {
  return (
    <div className={cn('font-mono text-sm leading-relaxed select-none mb-4', className)}>
      <div className="text-textSecondary flex flex-wrap items-center">
        <span className="text-accent/60 mr-0.5">┌──(</span>
        <span className="text-prompt-user font-semibold">{user}</span>
        <span className="text-accent/60">㉿</span>
        <span className="text-accent font-semibold">{host}</span>
        <span className="text-accent/60">)-[</span>
        <span className="text-prompt-path font-semibold">{cwd}</span>
        <span className="text-accent/60">]</span>
      </div>
      <div className="text-textPrimary flex items-center">
        <span className="text-accent/60 mr-1.5">└─</span>
        <span className="text-accent font-bold mr-2">$</span>
        {command && (
          <span className={cn('text-textPrimary tracking-wide', blink && 'cursor-blink')}>
            {command}
          </span>
        )}
        {!command && blink && <span className="cursor-blink"> </span>}
      </div>
    </div>
  );
}
