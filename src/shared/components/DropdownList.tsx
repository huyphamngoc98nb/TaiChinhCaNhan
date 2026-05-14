import { ReactNode, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface DropdownOption<T extends string> {
  value: T;
  label: ReactNode;
  searchLabel?: string;
  disabled?: boolean;
}

interface DropdownListProps<T extends string> {
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  ariaLabel?: string;
  placeholder?: ReactNode;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  optionClassName?: string;
  disabled?: boolean;
}

export function DropdownList<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  placeholder = 'Select',
  className = '',
  buttonClassName = '',
  menuClassName = '',
  optionClassName = '',
  disabled = false,
}: DropdownListProps<T>) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  const selected = useMemo(
    () => options.find(option => option.value === value),
    [options, value],
  );

  const updateMenuPosition = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    const spaceBelow = window.innerHeight - rect.bottom;
    const maxHeight = Math.min(280, Math.max(180, window.innerHeight - 32));
    const openUp = spaceBelow < 220 && rect.top > spaceBelow;

    setMenuStyle({
      position: 'fixed',
      left: rect.left,
      top: openUp ? undefined : rect.bottom + 6,
      bottom: openUp ? window.innerHeight - rect.top + 6 : undefined,
      width: rect.width,
      maxHeight,
      zIndex: 9999,
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    updateMenuPosition();

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleClose = () => setIsOpen(false);

    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('resize', handleClose);
    window.addEventListener('scroll', handleClose, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('resize', handleClose);
      window.removeEventListener('scroll', handleClose, true);
    };
  }, [isOpen]);

  const handleSelect = (option: DropdownOption<T>) => {
    if (option.disabled) return;
    onChange(option.value);
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={`${id}-listbox`}
        onClick={() => {
          if (!disabled) {
            updateMenuPosition();
            setIsOpen(open => !open);
          }
        }}
        className={`w-full min-h-[48px] flex items-center justify-between gap-3 rounded-[12px] border border-gray-200 bg-gray-50 px-4 text-left text-[14px] font-semibold text-gray-800 shadow-sm outline-none transition-colors active:bg-gray-100 focus:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-60 ${buttonClassName}`}
      >
        <span className="min-w-0 flex-1 truncate">{selected?.label ?? placeholder}</span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          id={`${id}-listbox`}
          role="listbox"
          aria-label={ariaLabel}
          style={menuStyle}
          className={`overflow-y-auto rounded-[14px] border border-gray-200 bg-white p-1 shadow-xl shadow-gray-900/12 ${menuClassName}`}
        >
          {options.map(option => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={option.disabled}
                onClick={() => handleSelect(option)}
                className={`flex min-h-[42px] w-full items-center justify-between gap-3 rounded-[10px] px-3 text-left text-[14px] font-medium transition-colors ${
                  isSelected
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-gray-700 active:bg-gray-100 hover:bg-gray-50'
                } disabled:cursor-not-allowed disabled:opacity-50 ${optionClassName}`}
              >
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {isSelected && <Check size={16} className="shrink-0" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
