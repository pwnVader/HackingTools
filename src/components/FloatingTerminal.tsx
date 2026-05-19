import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/cn';
import { BashIcon } from './CustomIcons';

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
  const [showTip, setShowTip] = useState(true);
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
        setShowTip(false);
      } else if (!isTyping && e.key === '~') {
        e.preventDefault();
        setOpen((o) => !o);
        setShowTip(false);
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
      {/* Micro-Tooltip de Activación */}
      {showTip && !open && (
        <div
          onClick={() => {
            setOpen(true);
            setShowTip(false);
          }}
          onMouseEnter={() => setShowTip(false)}
          className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-md border border-borderCustom bg-bgSurface/95 backdrop-blur-md px-3 py-1.5 font-mono text-[10px] text-textSecondary shadow-glow select-none cursor-pointer animate-bounce transition-all duration-300 hover:border-accent-mauve/60"
        >
          {/* LED Verde Parpadeante */}
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-green"></span>
          </span>
          <span>consola_activa</span>
          <kbd className="rounded border border-borderCustom bg-bgBase px-1 text-[8px] text-textMuted">~</kbd>
        </div>
      )}

      {/* Botón Disparador Táctico */}
      <button
        onClick={() => {
          setOpen((o) => !o);
          setShowTip(false);
        }}
        onMouseEnter={() => setShowTip(false)}
        className={cn(
          'fixed bottom-4 right-4 z-40 inline-flex items-center gap-2.5 rounded-full border bg-bgSurface/95 backdrop-blur-md px-4 py-2.5 font-mono text-xs shadow-lg transition-all duration-300 select-none outline-none focus:ring-2 focus:ring-accent-mauve/40',
          open
            ? 'text-accent-green border-accent-green/60 shadow-glowGreen'
            : 'text-textSecondary border-borderCustom hover:border-accent-mauve/60 hover:text-accent-mauve shadow-glow animate-pulse-glow'
        )}
        aria-label="terminal flotante"
      >
        <BashIcon
          className={cn(
            'transition-transform duration-500',
            open ? 'rotate-180 text-accent-green' : 'text-accent-mauve'
          )}
          size={16}
        />
        <span className="font-bold tracking-wider">{open ? 'sys.exit()' : 'kali_shell'}</span>
        <kbd className="hidden sm:inline-flex items-center rounded border border-borderCustom bg-bgBase px-1.5 py-0.5 text-[9px] text-textMuted ml-1 font-mono">
          ~
        </kbd>
      </button>

      {/* Panel de la Consola Glassmórfica */}
      {open && (
        <div className="fixed bottom-20 right-4 z-40 w-[min(640px,calc(100vw-2rem))] overflow-hidden rounded-lg border border-borderCustom bg-bgSurface/95 backdrop-blur-md shadow-glow">
          {/* Cabecera Interactiva estilo macOS */}
          <div className="relative flex items-center border-b border-borderCustom bg-bgBase/95 px-3 py-2.5 select-none">
            {/* Botones de Control de Ventana */}
            <div className="relative flex items-center gap-1.5 z-10">
              <button
                onClick={() => setOpen(false)}
                className="group relative h-3 w-3 rounded-full bg-accent-red/80 hover:bg-accent-red transition-colors flex items-center justify-center"
                aria-label="Cerrar terminal"
              >
                <span className="absolute text-[8px] font-bold text-bgBase opacity-0 group-hover:opacity-100 transition-opacity">×</span>
              </button>
              <span className="h-3 w-3 rounded-full bg-accent-yellow/80" aria-hidden />
              <span className="h-3 w-3 rounded-full bg-accent-green/80" aria-hidden />
            </div>

            {/* Título de Consola Centrado Absolutamente */}
            <div className="pointer-events-none absolute inset-x-0 flex justify-center">
              <span className="text-[11px] font-mono text-textMuted tracking-wider font-semibold">
                pwnvader@kali:~
              </span>
            </div>

            {/* Indicador de Canal TTY y Atajos */}
            <div className="relative ml-auto flex items-center gap-2 text-[9px] font-mono text-textMuted/80 z-10">
              <span className="px-1.5 py-0.5 rounded bg-bgElevated border border-borderCustom/60 font-bold">
                tty0
              </span>
              <span className="hidden sm:inline">esc para salir</span>
            </div>
          </div>

          {/* Historial de Outputs de Consola */}
          <div
            ref={scrollerRef}
            className="h-72 overflow-y-auto px-4 py-3.5 font-mono text-xs select-text"
          >
            {lines.map((l, i) => (
              <div key={i} className="mb-2.5 leading-relaxed">
                {l.prompt && (
                  <div className="flex flex-wrap items-center gap-1 mb-1.5 select-none">
                    <span className="text-accent-green font-semibold">pwnvader</span>
                    <span className="text-textMuted">@</span>
                    <span className="text-accent-green font-semibold">kali</span>
                    <span className="text-textMuted">:</span>
                    <span className="text-accent-mauve font-semibold">~</span>
                    <span className="text-accent-red">$</span>
                    <span className="text-textPrimary ml-1 break-all select-text font-semibold">
                      {l.prompt}
                    </span>
                  </div>
                )}
                {l.output && (
                  <pre
                    className={cn(
                      'whitespace-pre-wrap break-words text-[11px] leading-relaxed font-mono pl-2.5 border-l-2 mb-1',
                      l.variant === 'error' && 'text-accent-red border-accent-red/30',
                      l.variant === 'success' && 'text-accent-green border-accent-green/30',
                      (!l.variant || l.variant === 'normal') &&
                        'text-textSecondary/90 border-borderCustom/30'
                    )}
                  >
                    {l.output}
                  </pre>
                )}
              </div>
            ))}
          </div>

          {/* Formulario de Prompt de Entrada */}
          <form
            onSubmit={onSubmit}
            className="flex items-center gap-1.5 border-t border-borderCustom bg-bgBase/65 px-3.5 py-2.5"
          >
            <span className="text-accent-green font-mono text-xs font-semibold select-none">
              pwnvader
            </span>
            <span className="text-textMuted font-mono text-xs select-none">@</span>
            <span className="text-accent-green font-mono text-xs font-semibold select-none">
              kali
            </span>
            <span className="text-textMuted font-mono text-xs select-none">:</span>
            <span className="text-accent-mauve font-mono text-xs font-semibold select-none">~</span>
            <span className="text-accent-red font-mono text-xs select-none">$</span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              autoComplete="off"
              spellCheck={false}
              className="flex-1 bg-transparent font-mono text-xs text-textPrimary outline-none placeholder:text-textMuted/40 pl-1"
              placeholder="escribe un comando o 'help'..."
            />
          </form>
        </div>
      )}
    </>
  );
}

