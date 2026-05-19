import { TextareaHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/cn';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, className, id, ...rest }, ref) => {
    const taId = id ?? rest.name;
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={taId} className="text-xs uppercase tracking-wider text-fg-muted">
            {label}
          </label>
        )}
        <textarea
          id={taId}
          ref={ref}
          className={cn(
            'min-h-[120px] rounded border border-bg-line bg-bg-soft px-3 py-2 font-mono text-sm text-fg placeholder:text-fg-dim',
            'focus:border-accent-green/60 focus:outline-none focus:ring-1 focus:ring-accent-green/30',
            'resize-y',
            className
          )}
          {...rest}
        />
        {hint && <span className="text-[11px] text-fg-dim">{hint}</span>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
export default Textarea;
