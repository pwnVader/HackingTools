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
    'bg-accent/10 border border-accent/60 text-accent hover:bg-accent/20 hover:border-accent/80 hover:shadow-glow',
  ghost:
    'border border-transparent text-text-primary hover:border-accent/40 hover:bg-accent/5 hover:text-accent',
  danger:
    'border border-accent-red/50 text-accent-red hover:bg-accent-red/10 hover:border-accent-red/80 hover:shadow-glowRed',
  outline:
    'border border-bg-line text-text-secondary hover:text-text-primary hover:border-accent/50 hover:bg-bg-elevated/20',
};

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, ...rest }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-mono font-semibold transition-all duration-200 active:scale-[0.98]',
        'focus:outline-none focus:ring-2 focus:ring-accent/30',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:scale-100 disabled:shadow-none',
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

