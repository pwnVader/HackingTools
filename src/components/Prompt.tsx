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
 * Renderiza un prompt estilo Kali Linux:
 *   ┌──(user@host)-[cwd]
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
    <div className={cn('font-mono text-sm leading-tight select-none', className)}>
      <div className="text-fg">
        <span className="text-prompt-user">┌──(</span>
        <span className="text-prompt-user font-semibold">
          {user}㉿{host}
        </span>
        <span className="text-prompt-user">)-[</span>
        <span className="text-prompt-path font-semibold">{cwd}</span>
        <span className="text-prompt-user">]</span>
      </div>
      <div className="text-fg">
        <span className="text-prompt-user">└─</span>
        <span className="text-accent-red font-semibold">$</span>
        {command && (
          <>
            {' '}
            <span className={cn('text-fg', blink && 'cursor-blink')}>{command}</span>
          </>
        )}
        {!command && blink && <span className="cursor-blink"> </span>}
      </div>
    </div>
  );
}
