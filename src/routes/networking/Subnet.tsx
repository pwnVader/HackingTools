import { useMemo, useState } from 'react';
import { Calculator } from 'lucide-react';
import Prompt from '../../components/Prompt';
import Terminal from '../../components/Terminal';
import Input from '../../components/ui/Input';
import CopyButton from '../../components/CopyButton';
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
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-lg border border-accent-green/40 bg-accent-green/5">
            <Calculator className="h-6 w-6 text-accent-green" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-fg">Subnet Calculator</h1>
            <p className="mt-2 max-w-2xl text-sm text-fg-muted leading-relaxed">
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

      <section className="flex flex-wrap gap-2">
        {[8, 16, 24, 25, 26, 27, 28, 29, 30, 31, 32].map((c) => (
          <button
            key={c}
            onClick={() => setState((s) => ({ ...s, cidr: String(c) }))}
            className={cn(
              'rounded border px-2.5 py-1 font-mono text-xs transition',
              state.cidr === String(c)
                ? 'border-accent-green/60 bg-accent-green/10 text-accent-green'
                : 'border-bg-line text-fg-muted hover:border-accent-blue/40 hover:text-accent-blue'
            )}
          >
            /{c}
          </button>
        ))}
      </section>

      {result.error && (
        <Terminal title="stderr">
          <p className="text-accent-red text-sm">{result.error}</p>
        </Terminal>
      )}

      {result.data && (
        <>
          <Terminal title="output" className="">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <p className="text-accent-green text-sm font-medium">{summary}</p>
              <CopyButton value={summary} label="resumen" />
            </div>
          </Terminal>

          <Grid info={result.data} />

          {result.data.notes.length > 0 && (
            <Terminal title="notes">
              <ul className="space-y-1 text-sm text-fg-muted">
                {result.data.notes.map((n, i) => (
                  <li key={i}>
                    <span className="text-accent-yellow">!</span> {n}
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
    <div className="grid grid-cols-[140px_1fr_auto] items-center gap-3 border-b border-bg-line/60 px-3 py-2 last:border-0">
      <span className="text-xs uppercase tracking-wider text-fg-muted">{label}</span>
      <span className={cn('text-sm text-fg break-all', mono && 'font-mono')}>{v}</span>
      <CopyButton value={v} label="" />
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
        <Row label="Privada (RFC1918)" value={info.isPrivate ? 'sí' : 'no'} />
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
