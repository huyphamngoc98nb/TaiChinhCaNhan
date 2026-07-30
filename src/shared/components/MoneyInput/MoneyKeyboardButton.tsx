import { ButtonHTMLAttributes, ReactNode } from 'react';

type MoneyKeyboardButtonVariant = 'default' | 'primary' | 'operator' | 'danger';

interface MoneyKeyboardButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: MoneyKeyboardButtonVariant;
  className?: string;
}

const variantClasses: Record<MoneyKeyboardButtonVariant, string> = {
  default: 'border-border bg-white text-text shadow-sm active:bg-gray-100',
  primary: 'border-indigo-600 bg-indigo-600 text-white shadow-sm active:bg-indigo-700',
  operator: 'border-indigo-100 bg-indigo-50 text-indigo-700 shadow-sm active:bg-indigo-100',
  danger: 'border-rose-100 bg-rose-50 text-rose-600 shadow-sm active:bg-rose-100',
};

export function MoneyKeyboardButton({
  children,
  variant = 'default',
  className = '',
  type = 'button',
  onPointerDown,
  ...buttonProps
}: MoneyKeyboardButtonProps) {
  return (
    <button
      type={type}
      data-money-keyboard-key="true"
      onPointerDown={(event) => {
        event.preventDefault();
        onPointerDown?.(event);
      }}
      className={`flex h-14 min-w-0 items-center justify-center rounded-[14px] border text-[20px] font-bold tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${className}`}
      {...buttonProps}
    >
      {children}
    </button>
  );
}
