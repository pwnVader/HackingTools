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
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-lg border border-accent/40 bg-accent/5 shadow-glow">
            <Smile className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-fg font-mono tracking-tight">Emoji Stego</h1>
            <p className="mt-2 max-w-2xl text-sm text-fg-muted leading-relaxed font-mono">
              Esconde mensajes arbitrarios dentro de un emoji usando Unicode tag chars (U+E0000–U+E00FF).
              El emoji se ve normal; el mensaje viaja invisible.
            </p>
          </div>
        </div>
      </header>

      <div className="inline-flex rounded-xl border border-borderCustom bg-bgSurface p-1.5 shadow-sm">
        {(['encode', 'decode'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              'rounded-lg px-6 py-2 font-mono text-xs font-semibold tracking-wider transition-all duration-300',
              mode === m
                ? 'bg-accent/15 text-accent border border-accent/25 shadow-glow'
                : 'text-fg-dim hover:text-fg border border-transparent'
            )}
          >
            {m === 'encode' ? '🕵️ OCULTAR' : '🔓 REVELAR'}
          </button>
        ))}
      </div>

      {mode === 'encode' && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-[1fr_240px] items-start">
            <div className="space-y-5">
              <Input
                label="Carrier (emoji o caracter visible)"
                name="carrier"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                placeholder="🙂"
                className="text-lg font-mono border-borderCustom hover:border-accent/40 focus:ring-accent/20 transition-all"
              />

              <div className="space-y-2">
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-fg-dim block">Sugerencias</span>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_CARRIERS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCarrier(c)}
                      className={cn(
                        'w-11 h-11 flex items-center justify-center text-xl rounded-lg border transition-all duration-200 hover:scale-105 active:scale-95',
                        carrier === c
                          ? 'border-accent bg-accent/15 text-accent shadow-glow'
                          : 'border-borderCustom hover:border-accent/40 bg-bgSurface text-fg-muted'
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
                className="font-mono text-sm border-borderCustom hover:border-accent/40 focus:ring-accent/20 transition-all"
              />
            </div>

            {/* Carrier preview viewport */}
            <div className="flex flex-col items-center justify-center p-6 rounded-xl border border-borderCustom bg-bgSurface/60 shadow-inner space-y-4 md:sticky md:top-4 select-none">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-fg-dim">VISUALIZADOR</span>
              <div className="relative w-32 h-32 rounded-full border-2 border-dashed border-accent/40 flex items-center justify-center bg-bgBase shadow-glow">
                {/* scanning laser sweep line */}
                <div className="absolute w-full h-0.5 bg-accent/30 top-1/2 left-0 animate-bounce" />
                <span className="text-6xl animate-pulse select-none filter drop-shadow-[0_0_12px_rgba(250,179,135,0.4)]">
                  {carrier || '🙂'}
                </span>
              </div>
              <span className="text-[10px] font-mono text-accent text-center bg-accent/5 px-2.5 py-1 rounded border border-accent/20">
                LISTO PARA CODIFICAR
              </span>
            </div>
          </div>

          {encoded && (
            <div className="space-y-5 mt-4">
              <Terminal title="código generado (invisible)" className="border-borderCustom">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3 font-mono">
                  <span className="text-xs text-fg-dim">
                    {encoded.bytesHidden} bytes ocultos · longitud visual: {encoded.visualLength}
                  </span>
                  <CopyButton value={encoded.encoded} label="copiar emoji" />
                </div>
                <div className="rounded-xl border border-borderCustom bg-bgBase p-6 text-center shadow-inner relative overflow-hidden group/gen">
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none opacity-40" />
                  <span className="text-6xl select-all inline-block transition-transform duration-300 hover:scale-110 filter drop-shadow-[0_0_15px_rgba(250,179,135,0.55)] cursor-pointer" style={{ wordBreak: 'break-all' }}>
                    {encoded.encoded}
                  </span>
                </div>
                <p className="mt-3 text-xs text-fg-dim leading-relaxed font-mono">
                  Selecciona y copia el emoji de arriba. Cuando lo pegues en otra parte (chat, email,
                  comentario), llevará el mensaje invisible adjunto. Para recuperarlo, usa el modo{' '}
                  <button onClick={() => setMode('decode')} className="text-accent hover:underline">
                    revelar
                  </button>
                  .
                </p>
              </Terminal>

              <Terminal title="raw" className="border-borderCustom/60">
                <pre className="text-xs leading-relaxed text-fg-dim whitespace-pre-wrap break-all font-mono">
                  <code>{encoded.encoded}</code>
                </pre>
                <p className="mt-2 text-[11px] text-fg-dim font-mono">
                  Bytes en el string: {visualByteSize(encoded.encoded)} (UTF-8).
                </p>
              </Terminal>
            </div>
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
            className="text-lg font-mono border-borderCustom hover:border-accent/40 focus:ring-accent/20 transition-all"
            spellCheck={false}
          />

          {decoded && (
            <div className="space-y-5">
              <Terminal title={decoded.bytes > 0 ? 'mensaje recuperado' : 'sin mensaje oculto'} className={cn(decoded.bytes > 0 ? 'border-accent-green/40 shadow-glowGreen' : 'border-borderCustom')}>
                {decoded.bytes === 0 ? (
                  <p className="text-fg-dim text-sm font-mono italic">
                    Este string no contiene tag chars — no hay mensaje oculto detectado.
                  </p>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3 mb-2 font-mono">
                      <span className="text-xs text-accent-green font-bold uppercase tracking-wider">
                        {decoded.bytes} bytes recuperados
                      </span>
                      <CopyButton value={decoded.message} label="mensaje" />
                    </div>
                    <pre className="text-sm leading-relaxed text-accent-green whitespace-pre-wrap break-words font-mono bg-bgBase/40 p-4 rounded-lg border border-borderCustom/60">
                      <code>{decoded.message}</code>
                    </pre>
                  </>
                )}
              </Terminal>

              {decoded.carrier && (
                <Terminal title="carrier visible" className="border-borderCustom">
                  <div className="flex items-center justify-center p-6">
                    <span className="text-5xl filter drop-shadow-[0_0_8px_rgba(137,180,250,0.3)]">{decoded.carrier}</span>
                  </div>
                </Terminal>
              )}
            </div>
          )}

          {!encodedInput && (
            <Button variant="ghost" size="sm" onClick={() => setEncodedInput('🙂')} className="font-mono text-xs hover:text-accent transition-all duration-200">
              probar con un emoji limpio
            </Button>
          )}
        </div>
      )}

      <Terminal title="cómo funciona" className="border-borderCustom/60">
        <div className="space-y-3 text-xs text-fg-muted leading-relaxed font-mono">
          <p className="flex items-start gap-2.5">
            <span className="text-accent font-bold">▶</span> 
            <span>Cada byte del mensaje UTF-8 se mapea al code point <code className="text-accent-blue bg-bgBase px-1.5 py-0.5 rounded border border-borderCustom/40">U+E0000 + byte</code> (rango "Tags" de Unicode).</span>
          </p>
          <p className="flex items-start gap-2.5">
            <span className="text-accent font-bold">▶</span>
            <span>Estos tag chars son <strong className="text-fg font-semibold">invisibles</strong> en la mayoría de fuentes y se preservan al copiar/pegar en la mayoría de navegadores y mensajerías (Slack, Discord, WhatsApp, etc.).</span>
          </p>
          <p className="flex items-start gap-2.5">
            <span className="text-accent font-bold">▶</span>
            <span>El receptor solo ve el emoji carrier, pero si itera el string por code points, recupera los bytes originales sin alteración.</span>
          </p>
          <p className="flex items-start gap-2.5 border-t border-borderCustom/40 pt-3 mt-3">
            <span className="text-accent-red font-bold">!</span>
            <span className="text-fg-dim">Algunos clientes normalizan o sanean el texto de entrada y pueden eliminar los tag chars (notablemente algunos clientes de email). Pruébalo siempre antes de confiar en el canal.</span>
          </p>
        </div>
      </Terminal>
    </div>
  );
}
