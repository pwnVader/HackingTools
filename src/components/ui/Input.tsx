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
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs uppercase tracking-wider text-text-secondary font-semibold font-mono">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'rounded-md border border-bg-line bg-bg-soft px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-muted transition-all duration-200',
            'hover:border-accent/40 focus:border-accent/80 focus:outline-none focus:ring-2 focus:ring-accent/25',
            error && 'border-accent-red/60 hover:border-accent-red/80 focus:border-accent-red focus:ring-accent-red/20',
            className
          )}
          {...rest}
        />
        {hint && !error && <span className="text-[11px] text-text-muted font-mono">{hint}</span>}
        {error && <span className="text-[11px] text-accent-red font-mono font-medium">{error}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';
export default Input;

