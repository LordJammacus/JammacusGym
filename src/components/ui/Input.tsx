import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm text-zinc-400 font-medium">{label}</label>
        )}
        <input
          ref={ref}
          className={`
            w-full rounded-lg bg-surface-overlay border border-white/10
            px-3 py-2.5 text-white placeholder:text-zinc-500
            focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand
            min-h-[44px] text-base
            ${error ? 'border-red-500' : ''}
            ${className}
          `}
          {...props}
        />
        {error && <span className="text-sm text-red-400">{error}</span>}
      </div>
    );
  },
);

Input.displayName = 'Input';
