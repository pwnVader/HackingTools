import { useEffect, useMemo, useState } from 'react';
import {
  ShieldOff,
  AlertTriangle,
  Copy,
  Check,
  Zap,
  Bug,
  RotateCcw,
  Plus,
} from 'lucide-react';
import Prompt from '../../components/Prompt';
import Terminal from '../../components/Terminal';
import { cn } from '../../lib/cn';
import {
  decodeJwt,
  reencode,
  setAlgNone,
  scanPrivilegeFields,
  COMMON_PRIV_INJECTIONS,
  prettyJson,
  type DecodedJwt,
} from '../../lib/jwt';

const STORAGE_KEY = 'pwn:jwt:v1';

const SAMPLE_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwicm9sZSI6InVzZXIiLCJpYXQiOjE1MTYyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

interface State {
  token: string;
  headerEdit: string;
  payloadEdit: string;
  signatureEdit: string;
}

function loadState(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialFrom(SAMPLE_TOKEN);
    const p = JSON.parse(raw);
    if (p?.token) return p;
  } catch {
    /* */
  }
  return initialFrom(SAMPLE_TOKEN);
}

function initialFrom(token: string): State {
  const d = decodeJwt(token);
  if (!d) return { token, headerEdit: '{}', payloadEdit: '{}', signatureEdit: '' };
  return {
    token,
    headerEdit: prettyJson(d.header),
    payloadEdit: prettyJson(d.payload),
    signatureEdit: d.signature,
  };
}

export default function JwtAttacker() {
  const [state, setState] = useState<State>(loadState);
  const [copiedToken, setCopiedToken] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* */
    }
  }, [state]);

  // Decode at parse time — defines what panels show when token changes
  const decoded = useMemo<DecodedJwt | null>(() => decodeJwt(state.token), [state.token]);

  // Re-encoded output from edits
  const reencoded = useMemo(
    () => reencode(state.headerEdit, state.payloadEdit, state.signatureEdit),
    [state.headerEdit, state.payloadEdit, state.signatureEdit]
  );

  // Sync edits when a new token is pasted
  const loadFromToken = (t: string) => {
    const d = decodeJwt(t);
    if (!d) {
      setState((s) => ({ ...s, token: t }));
      return;
    }
    setState({
      token: t,
      headerEdit: prettyJson(d.header),
      payloadEdit: prettyJson(d.payload),
      signatureEdit: d.signature,
    });
  };

  const adoptReencoded = () => {
    if (reencoded.token) setState((s) => ({ ...s, token: reencoded.token }));
  };

  // ── attack: alg none
  const applyAlgNone = () => {
    if (!decoded) return;
    const mutated = setAlgNone(decoded);
    setState((s) => ({
      ...s,
      headerEdit: prettyJson(mutated.header),
      signatureEdit: '',
    }));
  };

  // ── attack: privilege escalation
  const payloadParsed = (() => {
    try {
      return JSON.parse(state.payloadEdit || '{}') as Record<string, unknown>;
    } catch {
      return {} as Record<string, unknown>;
    }
  })();
  const privFields = useMemo(() => scanPrivilegeFields(payloadParsed), [state.payloadEdit]);

  const escalateField = (key: string, suggested: unknown) => {
    const next = { ...payloadParsed, [key]: suggested };
    setState((s) => ({ ...s, payloadEdit: prettyJson(next) }));
  };

  const injectField = (key: string, value: unknown) => {
    const next = { ...payloadParsed, [key]: value };
    setState((s) => ({ ...s, payloadEdit: prettyJson(next) }));
  };

  const copyToken = () => {
    if (!reencoded.token || !navigator.clipboard) return;
    navigator.clipboard.writeText(reencoded.token).then(() => {
      setCopiedToken(true);
      window.setTimeout(() => setCopiedToken(false), 1500);
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="space-y-4">
        <Prompt cwd="~/web/jwt" command="./jwt-attacker" />
        <div className="flex items-start gap-4">
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-lg border border-accent/40 bg-accent/5 shadow-glow">
            <ShieldOff className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-textPrimary font-mono tracking-tight">
              JWT Attacker
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-textSecondary leading-relaxed font-mono">
              Editor de tokens JWT con ataques de un clic. Manipula header, payload y signature en
              tres paneles editables y obtén el token re-codificado al instante.
            </p>
          </div>
        </div>
      </header>

      <Terminal title="!! aviso" className="border-accent-peach/40">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-accent-peach flex-shrink-0 mt-0.5" />
          <p className="text-xs text-textPrimary leading-relaxed font-mono">
            Este editor <strong>no verifica firmas</strong>. Manipular tokens contra servicios sin
            autorización explícita es delito. Úsalo en CTFs, labs y engagements con permiso.
          </p>
        </div>
      </Terminal>

      {/* Token input */}
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label className="text-sm uppercase tracking-wider text-textMuted font-mono font-semibold">
            Token entrada
          </label>
          {decoded && (
            <span className="text-[11px] font-mono text-accent-green uppercase tracking-wider">
              ✓ token decodificado
            </span>
          )}
          {!decoded && state.token.trim() && (
            <span className="text-[11px] font-mono text-accent-red uppercase tracking-wider">
              ✗ formato inválido
            </span>
          )}
        </div>
        <textarea
          value={state.token}
          onChange={(e) => loadFromToken(e.target.value)}
          placeholder="eyJ..."
          spellCheck={false}
          rows={3}
          className="w-full rounded-md border border-borderCustom bg-bgSurface px-3 py-2 font-mono text-xs text-accent outline-none focus:border-accent/60 transition resize-y break-all"
        />
      </section>

      {/* 3 editable panels */}
      <section className="grid gap-3 lg:grid-cols-3">
        <JsonPanel
          title="Header"
          subtitle="JOSE · alg, typ, kid"
          accent="red"
          value={state.headerEdit}
          onChange={(v) => setState((s) => ({ ...s, headerEdit: v }))}
        />
        <JsonPanel
          title="Payload"
          subtitle="Claims · sub, exp, role"
          accent="mauve"
          value={state.payloadEdit}
          onChange={(v) => setState((s) => ({ ...s, payloadEdit: v }))}
        />
        <SignaturePanel
          value={state.signatureEdit}
          onChange={(v) => setState((s) => ({ ...s, signatureEdit: v }))}
        />
      </section>

      {/* Quick actions */}
      <section className="rounded-xl border-2 border-accent/30 bg-bgSurface p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-accent" />
          <h2 className="text-sm uppercase tracking-wider font-mono font-semibold text-accent">
            Quick Actions · ataques de un clic
          </h2>
        </div>

        {/* Alg: none */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-md border border-borderCustom bg-bgBase/40 p-3">
          <div>
            <div className="text-sm font-mono text-textPrimary font-semibold">Set Alg: None</div>
            <div className="text-[11px] text-textMuted font-mono leading-relaxed">
              Cambia el header a <code className="text-accent">{`{"alg":"none"}`}</code>, borra la
              signature. Funciona contra backends mal configurados.
            </div>
          </div>
          <button
            type="button"
            onClick={applyAlgNone}
            disabled={!decoded}
            className={cn(
              'inline-flex items-center gap-2 rounded-md px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider border transition flex-shrink-0',
              decoded
                ? 'border-accent-red/60 bg-accent-red/10 text-accent-red hover:bg-accent-red/20'
                : 'border-borderCustom text-textMuted cursor-not-allowed opacity-50'
            )}
          >
            <Zap className="h-3.5 w-3.5" />
            Aplicar
          </button>
        </div>

        {/* Privilege escalation */}
        <div className="rounded-md border border-borderCustom bg-bgBase/40 p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Bug className="h-4 w-4 text-accent-peach" />
            <span className="text-sm font-mono text-textPrimary font-semibold">
              Privilege Escalation
            </span>
            <span className="text-[11px] text-textMuted font-mono">
              {privFields.length === 0
                ? 'sin campos de privilegio detectados'
                : `${privFields.length} campo${privFields.length === 1 ? '' : 's'} detectado${privFields.length === 1 ? '' : 's'}`}
            </span>
          </div>

          {privFields.length > 0 ? (
            <div className="space-y-2">
              {privFields.map((f) => (
                <div
                  key={f.key}
                  className="flex flex-wrap items-center gap-2 rounded border border-borderCustom/60 bg-bgSurface px-3 py-2"
                >
                  <code className="text-xs font-mono text-accent-peach font-bold">{f.key}</code>
                  <span className="text-[11px] text-textMuted font-mono">actual:</span>
                  <code className="text-[11px] font-mono text-textSecondary bg-bgBase px-1.5 py-0.5 rounded">
                    {JSON.stringify(f.value)}
                  </code>
                  <span className="text-textMuted font-mono">→</span>
                  <code className="text-[11px] font-mono text-accent-green bg-accent-green/10 px-1.5 py-0.5 rounded border border-accent-green/30">
                    {JSON.stringify(f.suggested)}
                  </code>
                  <button
                    type="button"
                    onClick={() => escalateField(f.key, f.suggested)}
                    className="ml-auto inline-flex items-center gap-1 rounded border border-accent-peach/60 bg-accent-peach/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent-peach hover:bg-accent-peach/20 transition"
                  >
                    <Zap className="h-3 w-3" />
                    Escalar
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-textMuted font-mono italic">
              No se encontraron campos `role`, `admin`, `scope`, etc. en el payload. Prueba
              inyectando uno de los comunes:
            </p>
          )}

          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-borderCustom/40">
            <span className="text-[10px] text-textMuted font-mono uppercase tracking-wider mr-1">
              Inyectar:
            </span>
            {COMMON_PRIV_INJECTIONS.map((inj) => {
              const exists = Object.prototype.hasOwnProperty.call(payloadParsed, inj.key);
              return (
                <button
                  key={inj.key}
                  type="button"
                  onClick={() => injectField(inj.key, inj.value)}
                  className={cn(
                    'inline-flex items-center gap-1 rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider transition',
                    exists
                      ? 'border-accent-green/40 bg-accent-green/5 text-accent-green'
                      : 'border-borderCustom text-textMuted hover:text-accent-peach hover:border-accent-peach/50'
                  )}
                  title={`${inj.key} = ${JSON.stringify(inj.value)}`}
                >
                  <Plus className="h-2.5 w-2.5" />
                  {inj.key}
                </button>
              );
            })}
          </div>
        </div>

        {/* Reset */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => loadFromToken(SAMPLE_TOKEN)}
            className="inline-flex items-center gap-1.5 rounded border border-borderCustom px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-textMuted hover:text-textPrimary transition"
          >
            <RotateCcw className="h-3 w-3" />
            Cargar token de ejemplo
          </button>
        </div>
      </section>

      {/* Output token */}
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm uppercase tracking-wider text-textMuted font-mono font-semibold">
            Token re-codificado
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={adoptReencoded}
              disabled={!!reencoded.error || !reencoded.token}
              className={cn(
                'inline-flex items-center gap-1.5 rounded border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition',
                reencoded.error || !reencoded.token
                  ? 'border-borderCustom text-textMuted cursor-not-allowed opacity-50'
                  : 'border-borderCustom text-textMuted hover:text-textPrimary'
              )}
              title="Mover este token al input para iterar"
            >
              <RotateCcw className="h-3 w-3" />
              Usar como input
            </button>
            <button
              type="button"
              onClick={copyToken}
              disabled={!!reencoded.error || !reencoded.token}
              className={cn(
                'inline-flex items-center gap-2 rounded-md px-4 py-2 font-mono text-sm font-medium border transition',
                copiedToken
                  ? 'border-accent-green/60 bg-accent-green/10 text-accent-green'
                  : reencoded.error || !reencoded.token
                  ? 'border-borderCustom text-textMuted cursor-not-allowed opacity-50'
                  : 'border-accent/50 bg-accent/10 text-accent hover:bg-accent/20'
              )}
            >
              {copiedToken ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copiedToken ? '¡Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>
        {reencoded.error ? (
          <div className="rounded-md border border-accent-red/40 bg-accent-red/5 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-accent-red font-bold mb-1 font-mono">
              JSON inválido
            </div>
            <code className="text-[11px] text-textSecondary font-mono">{reencoded.error}</code>
          </div>
        ) : (
          <pre className="rounded-xl border-2 border-accent/40 bg-bgSurface px-5 py-5 font-mono text-xs text-accent overflow-x-auto whitespace-pre-wrap break-all shadow-glow">
            <code>{reencoded.token}</code>
          </pre>
        )}
      </section>
    </div>
  );
}

// ────────────────────────── sub-components ──────────────────────────

function JsonPanel({
  title,
  subtitle,
  accent,
  value,
  onChange,
}: {
  title: string;
  subtitle: string;
  accent: 'red' | 'mauve' | 'sapphire';
  value: string;
  onChange: (v: string) => void;
}) {
  const palette = {
    red: { border: 'border-accent-red/40', text: 'text-accent-red', bg: 'bg-accent-red/5' },
    mauve: { border: 'border-accent/40', text: 'text-accent', bg: 'bg-accent/5' },
    sapphire: {
      border: 'border-accent-sapphire/40',
      text: 'text-accent-sapphire',
      bg: 'bg-accent-sapphire/5',
    },
  }[accent];

  let validityHint: 'ok' | 'err' = 'ok';
  try {
    JSON.parse(value || '{}');
  } catch {
    validityHint = 'err';
  }

  return (
    <div className={cn('rounded-xl border-2 bg-bgSurface overflow-hidden flex flex-col', palette.border)}>
      <div className={cn('flex items-center justify-between gap-2 border-b px-3 py-2', palette.border, palette.bg)}>
        <div>
          <div className={cn('text-xs font-bold font-mono uppercase tracking-wider', palette.text)}>
            {title}
          </div>
          <div className="text-[10px] text-textMuted font-mono uppercase tracking-wider mt-0.5">
            {subtitle}
          </div>
        </div>
        <span
          className={cn(
            'text-[10px] font-mono uppercase tracking-wider',
            validityHint === 'ok' ? 'text-accent-green' : 'text-accent-red'
          )}
        >
          {validityHint === 'ok' ? '✓ json' : '✗ json'}
        </span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className={cn(
          'flex-1 min-h-[200px] resize-y px-3 py-2 font-mono text-xs outline-none bg-bgBase/40',
          palette.text
        )}
      />
    </div>
  );
}

function SignaturePanel({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="rounded-xl border-2 border-accent-sapphire/40 bg-bgSurface overflow-hidden flex flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-accent-sapphire/40 bg-accent-sapphire/5 px-3 py-2">
        <div>
          <div className="text-xs font-bold font-mono uppercase tracking-wider text-accent-sapphire">
            Signature
          </div>
          <div className="text-[10px] text-textMuted font-mono uppercase tracking-wider mt-0.5">
            base64url · raw
          </div>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-wider text-textMuted">
          {value.length} chars
        </span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        placeholder="(vacía si usas alg: none)"
        className="flex-1 min-h-[200px] resize-y px-3 py-2 font-mono text-xs outline-none bg-bgBase/40 text-accent-sapphire break-all"
      />
    </div>
  );
}
