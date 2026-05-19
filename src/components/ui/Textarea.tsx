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
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={taId} className="text-xs uppercase tracking-wider text-text-secondary font-semibold font-mono">
            {label}
          </label>
        )}
        <textarea
          id={taId}
          ref={ref}
          className={cn(
            'min-h-[120px] rounded-md border border-bg-line bg-bg-soft px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-muted transition-all duration-200',
            'hover:border-accent/40 focus:border-accent/80 focus:outline-none focus:ring-2 focus:ring-accent/25',
            'resize-y',
            className
          )}
          {...rest}
        />
        {hint && <span className="text-[11px] text-text-muted font-mono">{hint}</span>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
export default Textarea;

