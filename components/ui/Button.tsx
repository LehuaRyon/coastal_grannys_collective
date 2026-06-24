import { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'dark' | 'outline' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  full?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-amber-700 hover:bg-amber-800 text-white border border-transparent',
  dark: 'bg-stone-900 hover:bg-stone-800 text-white border border-transparent',
  outline:
    'bg-transparent hover:bg-stone-100 text-stone-800 border border-stone-300',
  ghost: 'bg-transparent hover:bg-stone-100 text-stone-600 border border-transparent',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-4 py-2 text-xs',
  md: 'px-6 py-3 text-sm',
  lg: 'px-8 py-4 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  full = false,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center font-medium rounded-full tracking-wide
        transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${full ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}
