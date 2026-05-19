import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import { History as HistoryIcon } from 'lucide-react';
import { cn } from '../lib/cn';
import FloatingTerminal from './FloatingTerminal';
import { KaliIcon } from './CustomIcons';

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
    <div className="min-h-screen flex flex-col bg-bgBase text-textPrimary relative font-mono select-none overflow-x-hidden">
      <Header cwd={cwd} />
      
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:py-10 z-10">
        <Outlet />
      </main>

      <Footer />
      <FloatingTerminal />
    </div>
  );
}

function Header({ cwd }: { cwd: string }) {
  return (
    <header className="border-b border-borderCustom bg-bgSurface/80 backdrop-blur z-20 sticky top-0">
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
    <footer className="border-t border-borderCustom bg-bgSurface/50 backdrop-blur z-10 mt-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 text-xs text-textSecondary md:flex-row md:items-center md:justify-between">
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
        <div className="flex items-center gap-4 font-mono">
          <a
            href="https://pwnvader.com"
            target="_blank"
            rel="noreferrer noopener"
            className="hover:text-accent transition duration-200 flex items-center gap-1"
          >
            <span>pwnvader.com</span>
          </a>
          <a
            href="https://github.com/pwnVader"
            target="_blank"
            rel="noreferrer noopener"
            className="hover:text-accent transition duration-200 flex items-center gap-1"
          >
            <span>github</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
