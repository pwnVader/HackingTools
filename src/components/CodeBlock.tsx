import { cn } from '../lib/cn';
import CopyButton from './CopyButton';

interface CodeBlockProps {
  code: string;
  language?: string;
  showCopy?: boolean;
  className?: string;
  wrap?: boolean;
}

export default function CodeBlock({
  code,
  language,
  showCopy = true,
  className,
  wrap = false,
}: CodeBlockProps) {
  return (
    <div className={cn('group relative rounded-md border border-bg-line bg-bg-soft', className)}>
      {(language || showCopy) && (
        <div className="flex items-center justify-between border-b border-bg-line px-3 py-1.5">
          <span className="text-[11px] uppercase tracking-wider text-fg-dim">
            {language ?? ''}
          </span>
          {showCopy && <CopyButton value={code} />}
        </div>
      )}
      <pre
        className={cn(
          'overflow-x-auto px-3 py-3 text-sm leading-relaxed text-fg',
          wrap && 'whitespace-pre-wrap break-words'
        )}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}
