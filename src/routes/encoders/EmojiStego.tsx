import { useEffect, useMemo, useState } from 'react';
import { Smile } from 'lucide-react';
import Prompt from '../../components/Prompt';
import Terminal from '../../components/Terminal';
import Textarea from '../../components/ui/Textarea';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import CopyButton from '../../components/CopyButton';
import {
  encodeStego,
  decodeStego,
  hasHiddenData,
  SAMPLE_CARRIERS,
} from '../../lib/emojiStego';
import { cn } from '../../lib/cn';

type Mode = 'encode' | 'decode';

export default function EmojiStego() {
  const [mode, setMode] = useState<Mode>('encode');
  const [carrier, setCarrier] = useState('🙂');
  const [message, setMessage] = useState('mensaje oculto en el emoji 👋');
  const [encodedInput, setEncodedInput] = useState('');

  const encoded = useMemo(() => {
    if (mode !== 'encode' || !carrier) return null;
    try {
      return encodeStego(carrier, message);
    } catch (e) {
      return { encoded: '', bytesHidden: 0, visualLength: 0, error: (e as Error).message };
    }
  }, [mode, carrier, message]);

  const decoded = useMemo(() => {
    if (mode !== 'decode' || !encodedInput) return null;
    return decodeStego(encodedInput);
  }, [mode, encodedInput]);

  const visualByteSize = (s: string) => new TextEncoder().encode(s).length;

  // Auto-detección: si el usuario pega algo con tag chars en modo encode, sugerirle decode.
  useEffect(() => {
    if (mode === 'encode' && hasHiddenData(message)) {
      // No cambiamos automáticamente, solo informamos abajo
    }
  }, [mode, message]);

  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <Prompt cwd="~/encoders" command={`./emoji-stego --${mode}`} />
        <div className="flex items-start gap-4">
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-lg border border-accent-purple/40 bg-accent-purple/5">
            <Smile className="h-6 w-6 text-accent-purple" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-fg">Emoji Stego</h1>
            <p className="mt-2 max-w-2xl text-sm text-fg-muted leading-relaxed">
              Esconde mensajes arbitrarios dentro de un emoji usando Unicode tag chars (U+E0000–U+E00FF).
              El emoji se ve normal; el mensaje viaja invisible.
            </p>
          </div>
        </div>
      </header>

      <div className="inline-flex rounded-lg border border-bg-line bg-bg-card p-1">
        {(['encode', 'decode'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              'rounded-md px-4 py-1.5 font-mono text-sm transition',
              mode === m
                ? 'bg-accent-green/15 text-accent-green'
                : 'text-fg-muted hover:text-fg'
            )}
          >
            {m === 'encode' ? '→ ocultar' : '← revelar'}
          </button>
        ))}
      </div>

      {mode === 'encode' && (
        <div className="space-y-4">
          <Input
            label="Carrier (emoji o caracter visible)"
            name="carrier"
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
            placeholder="🙂"
            className="text-lg"
          />

          <div>
            <span className="text-xs uppercase tracking-wider text-fg-muted">Sugerencias</span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SAMPLE_CARRIERS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCarrier(c)}
                  className={cn(
                    'rounded border px-2 py-1 text-lg transition',
                    carrier === c
                      ? 'border-accent-green/60 bg-accent-green/10'
                      : 'border-bg-line hover:border-accent-blue/40 bg-bg-soft'
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <Textarea
            label="Mensaje a ocultar"
            name="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            spellCheck={false}
          />

          {encoded && (
            <>
              <Terminal title="resultado">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <span className="text-xs text-fg-muted">
                    {encoded.bytesHidden} bytes ocultos · longitud visual: {encoded.visualLength}
                  </span>
                  <CopyButton value={encoded.encoded} label="copiar emoji" />
                </div>
                <div className="rounded border border-bg-line bg-bg p-4 text-center">
                  <span className="text-5xl select-all" style={{ wordBreak: 'break-all' }}>
                    {encoded.encoded}
                  </span>
                </div>
                <p className="mt-3 text-xs text-fg-muted leading-relaxed">
                  Selecciona y copia el emoji de arriba. Cuando lo pegues en otra parte (chat, email,
                  comentario), llevará el mensaje invisible adjunto. Para recuperarlo, usa el modo{' '}
                  <button onClick={() => setMode('decode')} className="text-accent-blue underline">
                    revelar
                  </button>
                  .
                </p>
              </Terminal>

              <Terminal title="raw">
                <pre className="text-xs leading-relaxed text-fg-muted whitespace-pre-wrap break-all">
                  <code>{encoded.encoded}</code>
                </pre>
                <p className="mt-2 text-[11px] text-fg-dim">
                  Bytes en el string: {visualByteSize(encoded.encoded)} (UTF-8).
                </p>
              </Terminal>
            </>
          )}
        </div>
      )}

      {mode === 'decode' && (
        <div className="space-y-4">
          <Textarea
            label="Pega aquí el emoji con mensaje oculto"
            name="encodedInput"
            value={encodedInput}
            onChange={(e) => setEncodedInput(e.target.value)}
            placeholder="pega el emoji que recibiste…"
            className="text-lg"
            spellCheck={false}
          />

          {decoded && (
            <>
              <Terminal title={decoded.bytes > 0 ? 'mensaje recuperado' : 'sin mensaje oculto'}>
                {decoded.bytes === 0 ? (
                  <p className="text-fg-muted text-sm">
                    Este string no contiene tag chars — no hay mensaje oculto detectado.
                  </p>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <span className="text-xs text-fg-muted">
                        {decoded.bytes} bytes recuperados
                      </span>
                      <CopyButton value={decoded.message} label="mensaje" />
                    </div>
                    <pre className="text-sm leading-relaxed text-accent-green whitespace-pre-wrap break-words">
                      <code>{decoded.message}</code>
                    </pre>
                  </>
                )}
              </Terminal>

              {decoded.carrier && (
                <Terminal title="carrier visible">
                  <p className="text-2xl">{decoded.carrier}</p>
                </Terminal>
              )}
            </>
          )}

          {!encodedInput && (
            <Button variant="ghost" size="sm" onClick={() => setEncodedInput('🙂')}>
              probar con un emoji limpio
            </Button>
          )}
        </div>
      )}

      <Terminal title="cómo funciona">
        <div className="space-y-2 text-sm text-fg-muted leading-relaxed">
          <p>
            <span className="text-accent-green">→</span> Cada byte del mensaje UTF-8 se mapea al
            code point <code className="text-accent-blue">U+E0000 + byte</code> (rango "Tags" de Unicode).
          </p>
          <p>
            <span className="text-accent-green">→</span> Estos tag chars son <strong>invisibles</strong>{' '}
            en la mayoría de fuentes y se preservan al copiar/pegar en navegadores, Slack, Discord,
            WhatsApp Web, etc.
          </p>
          <p>
            <span className="text-accent-green">→</span> El receptor solo ve el emoji carrier, pero
            si itera el string por code points, recupera los bytes originales.
          </p>
          <p>
            <span className="text-accent-yellow">!</span> Algunos clientes normalizan el texto y
            pueden eliminar los tag chars (notablemente algunos clientes de email). Probarlo siempre
            antes de confiar en el canal.
          </p>
        </div>
      </Terminal>
    </div>
  );
}
