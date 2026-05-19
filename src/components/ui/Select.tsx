import { SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/cn';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Array<{ value: string; label: string }>;
}

// Chevron SVG inline — encoded for tailwind arbitrary bg-image value.
// Stroke uses Catppuccin Mauve (#cba6f7) to coordinate with the core accent
const CHEVRON =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23cba6f7' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")";

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, className, id, ...rest }, ref) => {
    const selectId = id ?? rest.name;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="text-xs uppercase tracking-wider text-text-secondary font-semibold font-mono"
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
            backgroundPosition: 'right 0.75rem center',
            backgroundSize: '0.75rem auto',
          }}
          className={cn(
            'appearance-none rounded-md border border-bg-line bg-bg-soft pl-3 pr-9 py-2 font-mono text-sm text-text-primary cursor-pointer',
            'transition-all duration-200 hover:border-accent/40',
            'focus:border-accent/80 focus:outline-none focus:ring-2 focus:ring-accent/25',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          {...rest}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} className="bg-bgSurface text-textPrimary">
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

