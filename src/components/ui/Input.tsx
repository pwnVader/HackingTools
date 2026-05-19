import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, className, id, ...rest }, ref) => {
    const inputId = id ?? rest.name;
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-xs uppercase tracking-wider text-fg-muted">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'rounded border border-bg-line bg-bg-soft px-3 py-2 font-mono text-sm text-fg placeholder:text-fg-dim',
            'focus:border-accent-green/60 focus:outline-none focus:ring-1 focus:ring-accent-green/30',
            error && 'border-accent-red/60 focus:border-accent-red focus:ring-accent-red/30',
            className
          )}
          {...rest}
        />
        {hint && !error && <span className="text-[11px] text-fg-dim">{hint}</span>}
        {error && <span className="text-[11px] text-accent-red">{error}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';
export default Input;
