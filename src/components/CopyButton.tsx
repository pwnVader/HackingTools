import { useState } from 'react';
import { cn } from '../lib/cn';

interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export default function CopyButton({ value, label = 'copy', className, size = 'sm' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // Fallback: select+copy via temporary textarea
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1400);
      } catch {
        /* ignore */
      } finally {
        document.body.removeChild(ta);
      }
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded border border-bg-line bg-bg-soft font-mono text-fg-muted transition',
        'hover:border-accent-green/50 hover:text-accent-green focus:outline-none focus:ring-1 focus:ring-accent-green/50',
        size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm',
        copied && 'border-accent-green/70 text-accent-green',
        className
      )}
      aria-label={copied ? 'copiado' : `copiar ${label}`}
    >
      {copied ? '✓ copiado' : `▣ ${label}`}
    </button>
  );
}
