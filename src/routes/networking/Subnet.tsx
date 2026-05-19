import { useMemo, useState } from 'react';
import Prompt from '../../components/Prompt';
import Terminal from '../../components/Terminal';
import Input from '../../components/ui/Input';
import CopyButton from '../../components/CopyButton';
import { CalculatorIcon } from '../../components/CustomIcons';
import { analyze, SubnetError, type SubnetInfo } from '../../lib/subnet';
import { cn } from '../../lib/cn';

interface State {
  ip: string;
  cidr: string;
}

const DEFAULT: State = { ip: '192.168.1.10', cidr: '24' };

export default function Subnet() {
  const [state, setState] = useState<State>(DEFAULT);

  const result = useMemo<{ data?: SubnetInfo; error?: string }>(() => {
    if (!state.ip.trim() || !state.cidr.trim()) return {};
    try {
      const data = analyze(state.ip, Number(state.cidr));
      return { data };
    } catch (e) {
      if (e instanceof SubnetError) return { error: e.message };
      return { error: 'Error desconocido' };
    }
  }, [state.ip, state.cidr]);

  const summary = result.data
    ? `${result.data.network}/${result.data.cidr}  →  ${result.data.firstHost} - ${result.data.lastHost}  (${result.data.usableHosts.toLocaleString()} hosts)`
    : '';

  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <Prompt cwd="~/networking" command={`./subnet-calc ${state.ip}/${state.cidr || '?'}`} />
        <div className="flex items-start gap-4">
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-lg border border-accent/40 bg-accent/5 shadow-glow">
            <CalculatorIcon className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-text-primary font-mono">Subnet Calculator</h1>
            <p className="mt-2 max-w-2xl text-sm text-text-secondary leading-relaxed font-mono">
              Introduce una dirección IPv4 y un CIDR. Todo se calcula en tu navegador en tiempo real.
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-[2fr_1fr]">
        <Input
          label="IP / red"
          name="ip"
          value={state.ip}
          onChange={(e) => setState((s) => ({ ...s, ip: e.target.value }))}
          placeholder="192.168.1.10"
          spellCheck={false}
          autoComplete="off"
        />
        <Input
          label="CIDR (0-32)"
          name="cidr"
          inputMode="numeric"
          value={state.cidr}
          onChange={(e) => setState((s) => ({ ...s, cidr: e.target.value.replace(/[^\d]/g, '') }))}
          placeholder="24"
        />
      </section>

      <section className="flex flex-wrap gap-1.5">
        {[8, 16, 24, 25, 26, 27, 28, 29, 30, 31, 32].map((c) => (
          <button
            key={c}
            onClick={() => setState((s) => ({ ...s, cidr: String(c) }))}
            className={cn(
              'rounded-md border px-3 py-1.5 font-mono text-xs font-semibold transition-all duration-200 active:scale-95',
              state.cidr === String(c)
                ? 'border-accent/60 bg-accent/15 text-accent shadow-glow'
                : 'border-bg-line text-text-secondary hover:border-accent/40 hover:text-accent'
            )}
          >
            /{c}
          </button>
        ))}
      </section>

      {result.error && (
        <Terminal title="stderr" className="border-accent-red/30">
          <p className="text-accent-red text-sm font-mono font-medium">{result.error}</p>
        </Terminal>
      )}

      {result.data && (
        <>
          <Terminal title="output">
            <div className="flex items-center justify-between gap-3 flex-wrap p-1 font-mono">
              <p className="text-accent-green text-sm font-bold">{summary}</p>
              <CopyButton value={summary} label="resumen" />
            </div>
          </Terminal>

          <Grid info={result.data} />

          {result.data.notes.length > 0 && (
            <Terminal title="notes" className="border-accent/30">
              <ul className="space-y-2 text-sm text-text-secondary font-mono p-1">
                {result.data.notes.map((n, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-accent font-bold">!</span>
                    <span>{n}</span>
                  </li>
                ))}
              </ul>
            </Terminal>
          )}
        </>
      )}
    </div>
  );
}

function Row({ label, value, mono = true }: { label: string; value: string | number; mono?: boolean }) {
  const v = String(value);
  return (
    <div className="grid grid-cols-[140px_1fr_auto] items-center gap-3 border-b border-bg-line/40 px-4 py-3 last:border-0 hover:bg-bg-soft/20 transition-colors duration-200">
      <span className="text-xs uppercase tracking-wider text-text-secondary font-bold font-mono">{label}</span>
      <span className={cn('text-sm text-text-primary break-all', mono && 'font-mono')}>{v}</span>
      <CopyButton value={v} label="" size="sm" />
    </div>
  );
}

function Grid({ info }: { info: SubnetInfo }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Terminal title="dirección" bodyClassName="!p-0">
        <Row label="IP" value={info.ip} />
        <Row label="CIDR" value={`/${info.cidr}`} />
        <Row label="Máscara" value={info.mask} />
        <Row label="Wildcard" value={info.wildcard} />
        <Row label="Clase" value={info.ipClass} />
        <Row label="Privada" value={info.isPrivate ? 'sí' : 'no'} />
      </Terminal>

      <Terminal title="rango" bodyClassName="!p-0">
        <Row label="Network" value={info.network} />
        <Row label="Broadcast" value={info.broadcast} />
        <Row label="First Host" value={info.firstHost} />
        <Row label="Last Host" value={info.lastHost} />
        <Row label="Total addrs" value={info.totalAddresses.toLocaleString()} />
        <Row label="Hosts usables" value={info.usableHosts.toLocaleString()} />
      </Terminal>

      <Terminal title="binario" className="md:col-span-2" bodyClassName="!p-0">
        <Row label="IP (bin)" value={info.ipBinary} />
        <Row label="Mask (bin)" value={info.maskBinary} />
        <Row label="Network (bin)" value={info.networkBinary} />
      </Terminal>
    </div>
  );
}

