import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import { cn } from '../lib/cn';
import FloatingTerminal from './FloatingTerminal';

const NAV = [
  { to: '/networking', label: 'networking', desc: 'subnetting · reverse shells' },
  { to: '/cms', label: 'cms-audit', desc: 'wordpress · más pronto' },
  { to: '/encoders', label: 'encoders', desc: 'b64 · url · hash · emoji-stego' },
];

function cwdFromPath(pathname: string) {
  if (pathname === '/') return '~';
  return '~' + pathname;
}

export default function Layout() {
  const loc = useLocation();
  const cwd = useMemo(() => cwdFromPath(loc.pathname), [loc.pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header cwd={cwd} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:py-10">
        <Outlet />
      </main>
      <Footer />
      <FloatingTerminal />
    </div>
  );
}

function Header({ cwd }: { cwd: string }) {
  return (
    <header className="border-b border-bg-line bg-bg-soft/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="flex h-2 items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-accent-red/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-accent-yellow/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-accent-green/80" />
          </div>
          <div className="font-mono text-sm">
            <span className="text-prompt-user">pwnvader㉿kali</span>
            <span className="text-fg-muted">:</span>
            <span className="text-prompt-path">{cwd}</span>
            <span className="text-accent-red">$</span>
            <span className="ml-1 text-fg-muted group-hover:text-accent-green transition">hacking-toolkit</span>
          </div>
        </Link>

        <nav className="flex flex-wrap items-center gap-1 text-sm">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                cn(
                  'rounded px-3 py-1.5 font-mono transition',
                  isActive
                    ? 'border border-accent-green/50 text-accent-green bg-accent-green/5'
                    : 'border border-transparent text-fg-muted hover:text-fg hover:border-bg-line'
                )
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-bg-line bg-bg-soft/50">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-5 text-xs text-fg-muted md:flex-row md:items-center md:justify-between">
        <div className="font-mono space-y-0.5">
          <div>
            <span className="text-prompt-user">pwnvader㉿kali</span>
            <span className="text-fg-dim">:</span>
            <span className="text-prompt-path">~</span>
            <span className="text-accent-red">$</span>{' '}
            <span>cat /etc/credits.txt</span>
          </div>
          <div className="pl-2">
            <span className="text-accent-green">[+]</span>{' '}
            <span>compilado con</span>{' '}
            <span title="café">☕</span>
            <span className="text-fg-dim mx-1">×</span>
            <span title="insomnio">🌙</span>
            <span className="text-fg-dim mx-1">×</span>
            <span title="curiosidad">🧠</span>{' '}
            <span>por</span>{' '}
            <span className="text-accent-green font-semibold">pwnVader</span>{' '}
            <span className="text-fg-dim">·</span>{' '}
            <span className="text-accent-yellow">hack the planet</span>{' '}
            <span title="planeta">🌍</span>
          </div>
        </div>
        <div className="flex items-center gap-4 font-mono">
          <a
            href="https://pwnvader.com"
            target="_blank"
            rel="noreferrer noopener"
            className="hover:text-accent-blue transition"
          >
            pwnvader.com
          </a>
          <a
            href="https://github.com/pwnVader"
            target="_blank"
            rel="noreferrer noopener"
            className="hover:text-accent-blue transition"
          >
            github
          </a>
        </div>
      </div>
    </footer>
  );
}
