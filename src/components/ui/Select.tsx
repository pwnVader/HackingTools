import { SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/cn';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Array<{ value: string; label: string }>;
}

// Chevron SVG inline — encoded for tailwind arbitrary bg-image value.
// Stroke usa #7a8794 (= fg-muted) para que se lea sobre el fondo oscuro.
const CHEVRON =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237a8794' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")";

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, className, id, ...rest }, ref) => {
    const selectId = id ?? rest.name;
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={selectId}
            className="text-[11px] uppercase tracking-wider text-fg-muted"
          >
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          style={{
            backgroundImage: CHEVRON,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 0.7rem center',
            backgroundSize: '0.75rem auto',
          }}
          className={cn(
            'appearance-none rounded border border-bg-line bg-bg-soft pl-3 pr-8 py-2 font-mono text-sm text-fg cursor-pointer',
            'transition hover:border-fg-muted/50',
            'focus:border-accent-yellow/60 focus:outline-none focus:ring-1 focus:ring-accent-yellow/30',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          {...rest}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} className="bg-bg-card text-fg">
              {o.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
);
Select.displayName = 'Select';
export default Select;
