import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import { History as HistoryIcon } from 'lucide-react';
import { cn } from '../lib/cn';
import FloatingTerminal from './FloatingTerminal';
import { KaliIcon, LinkedinIcon, GithubIcon, TikTokIcon } from './CustomIcons';

const NAV = [
  { to: '/networking', label: 'networking', desc: 'subnetting · revshell · pivot' },
  { to: '/cms', label: 'cms-audit', desc: 'wp · joomla · drupal' },
  { to: '/web', label: 'web', desc: 'jwt' },
  { to: '/cracking', label: 'cracking', desc: 'hashcat masks' },
  { to: '/encoders', label: 'encoders', desc: 'b64 · url · stego' },
];

function cwdFromPath(pathname: string) {
  if (pathname === '/') return '~';
  return '~' + pathname;
}

export default function Layout() {
  const loc = useLocation();
  const cwd = useMemo(() => cwdFromPath(loc.pathname), [loc.pathname]);

  return (
    // overflow-x-clip en vez de overflow-x-hidden: clip NO crea contexto de
    // scroll en hijos, por lo que las cabeceras position:sticky funcionan
    // correctamente al hacer scroll vertical.
    <div className="min-h-screen flex flex-col bg-bgBase text-textPrimary relative font-mono select-none overflow-x-clip">
      {/* EcosystemStrip + Header viajan juntos pegados al top en todo scroll */}
      <div className="sticky top-0 z-30">
        <EcosystemStrip />
        <Header cwd={cwd} />
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:py-10 z-10">
        <Outlet />
      </main>

      <Footer />
      <FloatingTerminal />
    </div>
  );
}

/**
 * Franja de ecosistema — visible siempre en la parte superior, antes del header.
 *
 * Tres pills (portfolio · lab · docs) que evidencian que el usuario está
 * dentro del ecosistema pwnVader. La pill "lab" queda marcada como activa
 * (este es el sitio del laboratorio); las otras dos son enlaces externos.
 *
 * Diseñado para replicarse 1:1 en pwnvader.com y docs.pwnvader.com — basta
 * con cambiar cuál pill lleva el indicador "current".
 */
function EcosystemStrip() {
  const links = [
    { href: 'https://pwnvader.com', label: 'portfolio', current: false },
    { href: 'https://hacking.pwnvader.com', label: 'lab', current: true },
    { href: 'https://docs.pwnvader.com', label: 'docs', current: false },
  ];
  return (
    <div className="border-b border-borderCustom/40 bg-bgBase/85 backdrop-blur text-[10px] font-mono uppercase tracking-[0.18em]">
      <div className="mx-auto max-w-6xl px-4 py-1.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-textMuted">
          <span className="text-textMuted/60 hidden sm:inline">ecosystem</span>
          <span className="text-textMuted/40 hidden sm:inline">·</span>
          {links.map((l) =>
            l.current ? (
              <span
                key={l.href}
                className="text-orange-400 border-b border-orange-400 pb-0.5 -mb-0.5 font-bold"
                aria-current="page"
              >
                {l.label}
              </span>
            ) : (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-orange-400 transition-colors"
              >
                {l.label}
              </a>
            )
          )}
        </div>
        <span className="hidden md:inline text-textMuted/40">pwnVader · v1</span>
      </div>
    </div>
  );
}

function Header({ cwd }: { cwd: string }) {
  return (
    // El sticky lo gestiona el contenedor padre en Layout — aquí sólo el visual.
    <header className="border-b border-borderCustom bg-bgSurface/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="flex items-center gap-1 bg-bgElevated border border-borderCustom rounded px-2.5 py-1 text-xs">
            <KaliIcon className="h-4.5 w-4.5 text-accent animate-pulse" />
            <span className="h-2 w-2 rounded-full bg-accent/70" />
            <span className="h-2 w-2 rounded-full bg-success/70" />
          </div>
          <div className="font-mono text-sm">
            <span className="text-prompt-user">pwnvader㉿kali</span>
            <span className="text-textMuted">:</span>
            <span className="text-prompt-path">{cwd}</span>
            <span className="text-accent font-bold">$</span>
            <span className="ml-2 text-textMuted group-hover:text-accent transition duration-200">
              ./pwn-toolkit
            </span>
          </div>
        </Link>

        <nav className="flex flex-wrap items-center gap-2 text-sm">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3.5 py-1.5 font-mono border transition duration-200',
                  isActive
                    ? 'border-accent/40 text-accent bg-accent/5 shadow-[0_0_8px_rgba(203,166,247,0.08)]'
                    : 'border-transparent text-textSecondary hover:text-textPrimary hover:bg-bgElevated hover:border-borderCustom'
                )
              }
            >
              {n.label}
            </NavLink>
          ))}
          <NavLink
            to="/history"
            title="Historial global · Killswitch"
            aria-label="Historial global"
            className={({ isActive }) =>
              cn(
                'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono border transition duration-200 ml-1',
                isActive
                  ? 'border-accent-peach/50 text-accent-peach bg-accent-peach/5'
                  : 'border-borderCustom text-textMuted hover:text-accent-peach hover:border-accent-peach/40'
              )
            }
          >
            <HistoryIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline text-xs">history</span>
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    // pb-20 sm:pb-5 → reserva espacio en mobile para que el botón flotante
    // del kali_shell no tape el contenido del footer al hacer scroll al fondo.
    <footer className="border-t border-borderCustom bg-bgSurface/50 backdrop-blur z-10 mt-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pt-5 pb-20 sm:pb-5 text-xs text-textSecondary md:flex-row md:items-center md:justify-between">
        <div className="font-mono space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="text-prompt-user">pwnvader㉿kali</span>
            <span className="text-textMuted">:</span>
            <span className="text-prompt-path">~</span>
            <span className="text-accent font-bold">$</span>{' '}
            <span className="text-textPrimary">cat /etc/credits.txt</span>
          </div>
          <div className="pl-3 border-l border-borderCustom/60 ml-1.5 space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-success font-semibold">[+]</span>{' '}
              <span>compilado con</span>{' '}
              <span title="café" className="grayscale-0">☕</span>
              <span className="text-textMuted mx-0.5">×</span>
              <span title="insomnio">🌙</span>
              <span className="text-textMuted mx-0.5">×</span>
              <span title="curiosidad">🧠</span>{' '}
              <span>por</span>{' '}
              <span className="text-accent font-semibold">pwnVader</span>
            </div>
            <div>
              <span className="text-textMuted">status:</span>{' '}
              <span className="text-success font-semibold">HACK THE PLANET 🌍</span>
            </div>
          </div>
        </div>

        {/* Bloque derecho: ecosistema (texto) + redes sociales (SVGs) */}
        <div className="flex flex-col items-start md:items-end gap-3 font-mono">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <a
              href="https://pwnvader.com"
              target="_blank"
              rel="noreferrer noopener"
              className="hover:text-accent transition duration-200"
            >
              pwnvader.com
            </a>
            <a
              href="https://docs.pwnvader.com"
              target="_blank"
              rel="noreferrer noopener"
              className="hover:text-accent transition duration-200"
              title="Writeups, metodologías y guías"
            >
              docs.pwnvader.com
            </a>
          </div>
          <div className="flex items-center gap-2">
            <SocialIcon
              href="https://www.linkedin.com/in/jesuspromero/"
              label="LinkedIn · jesuspromero"
              icon={<LinkedinIcon className="h-4 w-4" />}
            />
            <SocialIcon
              href="https://github.com/pwnVader"
              label="GitHub · pwnVader"
              icon={<GithubIcon className="h-4 w-4" />}
            />
            <SocialIcon
              href="https://www.tiktok.com/@pwnvader"
              label="TikTok · @pwnvader"
              icon={<TikTokIcon className="h-4 w-4" />}
            />
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialIcon({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      title={label}
      aria-label={label}
      className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-borderCustom/60 bg-bgElevated/40 text-textMuted hover:text-orange-400 hover:border-orange-500/50 hover:bg-orange-500/5 transition duration-200"
    >
      {icon}
    </a>
  );
}
