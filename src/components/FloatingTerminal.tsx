import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/cn';

interface Line {
  prompt: string;
  output?: string;
  variant?: 'normal' | 'error' | 'success';
}

const BANNER = `pwnvader@kali — toolkit shell
escribe "help" para ver comandos.`;

const COMMANDS: Record<string, string> = {
  help: `comandos disponibles:
  help          esta ayuda
  whoami        identidad
  ls            lista secciones
  cd <sec>      navega a /networking | /cms | /encoders
  open <tool>   atajo: subnet | revshell | wp | recipes | emoji
  uname         info del entorno
  date          fecha actual
  history       comandos pasados
  banner        muestra el banner
  clear         limpia la terminal
  exit | q      cierra`,
  whoami: 'pwnvader',
  uname: 'pwnvader-toolkit 1.0 #1 SMP serverless x86_64 GNU/Linux',
  ls: `drwxr-xr-x  networking/
drwxr-xr-x  cms/
drwxr-xr-x  encoders/`,
  banner: BANNER,
};

const TOOL_ROUTES: Record<string, string> = {
  subnet: '/networking/subnet',
  revshell: '/networking/revshell',
  wp: '/cms/wordpress',
  wordpress: '/cms/wordpress',
  recipes: '/encoders/recipes',
  emoji: '/encoders/emoji-stego',
};

const SECTION_ROUTES: Record<string, string> = {
  '/': '/',
  '~': '/',
  networking: '/networking',
  cms: '/cms',
  'cms-audit': '/cms',
  encoders: '/encoders',
};

export default function FloatingTerminal() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [lines, setLines] = useState<Line[]>([{ prompt: '', output: BANNER }]);
  const [history, setHistory] = useState<string[]>([]);
  const [hIndex, setHIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const nav = useNavigate();

  // Toggle con `~` (tilde) o Ctrl+`
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable;
      if (e.key === '`' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (!isTyping && e.key === '~') {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (open && e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight });
  }, [lines, open]);

  const exec = (raw: string) => {
    const cmd = raw.trim();
    if (!cmd) return;
    setHistory((h) => [...h, cmd]);
    setHIndex(-1);

    const [head, ...rest] = cmd.split(/\s+/);
    const arg = rest.join(' ');
    const push = (output: string, variant: Line['variant'] = 'normal') =>
      setLines((l) => [...l, { prompt: cmd, output, variant }]);

    switch (head) {
      case 'clear':
        setLines([]);
        return;
      case 'exit':
      case 'q':
        setOpen(false);
        return;
      case 'date':
        push(new Date().toString(), 'success');
        return;
      case 'history':
        push(history.map((h, i) => `${String(i + 1).padStart(3, ' ')}  ${h}`).join('\n') || '(vacío)');
        return;
      case 'cd': {
        const target = SECTION_ROUTES[arg.toLowerCase()] ?? null;
        if (!target) {
          push(`cd: ${arg}: no such directory`, 'error');
        } else {
          nav(target);
          push(`→ ${target}`, 'success');
        }
        return;
      }
      case 'open': {
        const target = TOOL_ROUTES[arg.toLowerCase()] ?? null;
        if (!target) {
          push(`open: ${arg}: tool desconocida (usa: subnet | revshell | wp | recipes | emoji)`, 'error');
        } else {
          nav(target);
          push(`→ ${target}`, 'success');
        }
        return;
      }
      default: {
        if (head in COMMANDS) {
          push(COMMANDS[head]);
        } else {
          push(`${head}: command not found (try "help")`, 'error');
        }
      }
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    exec(input);
    setInput('');
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const next = hIndex < 0 ? history.length - 1 : Math.max(0, hIndex - 1);
      setHIndex(next);
      setInput(history[next]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (hIndex < 0) return;
      const next = hIndex + 1;
      if (next >= history.length) {
        setHIndex(-1);
        setInput('');
      } else {
        setHIndex(next);
        setInput(history[next]);
      }
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border border-bg-line bg-bg-card px-4 py-2 font-mono text-xs shadow-lg transition',
          'hover:border-accent-green/60 hover:text-accent-green',
          open ? 'text-accent-green border-accent-green/60' : 'text-fg-muted'
        )}
        aria-label="terminal flotante"
      >
        <span className="text-accent-red">$</span>
        <span>{open ? 'close' : 'shell'}</span>
        <kbd className="rounded border border-bg-line bg-bg-soft px-1.5 py-0.5 text-[10px] hidden sm:inline">
          ~
        </kbd>
      </button>

      {open && (
        <div className="fixed bottom-20 right-4 z-40 w-[min(640px,calc(100vw-2rem))] rounded-lg border border-bg-line bg-bg-card shadow-2xl">
          <div className="flex items-center gap-2 border-b border-bg-line bg-bg-soft px-3 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-accent-red/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-accent-yellow/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-accent-green/70" />
            <span className="ml-2 text-xs text-fg-muted">pwnvader@kali ~ shell</span>
            <span className="ml-auto text-[10px] text-fg-dim">esc para cerrar</span>
          </div>
          <div ref={scrollerRef} className="max-h-72 overflow-y-auto px-3 py-2 text-sm">
            {lines.map((l, i) => (
              <div key={i} className="mb-1">
                {l.prompt && (
                  <div className="text-fg-muted">
                    <span className="text-prompt-user">pwnvader</span>
                    <span className="text-fg-dim">@</span>
                    <span className="text-prompt-user">kali</span>
                    <span className="text-fg-dim">:</span>
                    <span className="text-prompt-path">~</span>
                    <span className="text-accent-red">$</span>{' '}
                    <span className="text-fg">{l.prompt}</span>
                  </div>
                )}
                {l.output && (
                  <pre
                    className={cn(
                      'whitespace-pre-wrap break-words text-xs leading-relaxed',
                      l.variant === 'error' && 'text-accent-red',
                      l.variant === 'success' && 'text-accent-green',
                      (!l.variant || l.variant === 'normal') && 'text-fg-muted'
                    )}
                  >
                    {l.output}
                  </pre>
                )}
              </div>
            ))}
          </div>
          <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-bg-line px-3 py-2">
            <span className="text-prompt-user font-mono text-sm">pwnvader@kali</span>
            <span className="text-fg-dim font-mono text-sm">:</span>
            <span className="text-prompt-path font-mono text-sm">~</span>
            <span className="text-accent-red font-mono text-sm">$</span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              autoComplete="off"
              spellCheck={false}
              className="flex-1 bg-transparent font-mono text-sm text-fg outline-none placeholder:text-fg-dim"
              placeholder="help"
            />
          </form>
        </div>
      )}
    </>
  );
}
