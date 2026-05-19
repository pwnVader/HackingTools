import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-accent-green/10 border border-accent-green/60 text-accent-green hover:bg-accent-green/20 hover:shadow-glow',
  ghost: 'border border-bg-line text-fg hover:border-accent-blue/50 hover:text-accent-blue',
  danger: 'border border-accent-red/50 text-accent-red hover:bg-accent-red/10',
  outline: 'border border-bg-line text-fg-muted hover:text-fg hover:border-fg-muted',
};

const sizes: Record<Size, string> = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-3.5 py-1.5 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, ...rest }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded font-mono font-medium transition',
        'focus:outline-none focus:ring-1 focus:ring-accent-green/50',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className
      )}
      {...rest}
    />
  )
);
Button.displayName = 'Button';
export default Button;
