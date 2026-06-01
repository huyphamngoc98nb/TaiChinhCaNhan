import { ReactNode, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { registerAppBackHandler } from '@/shared/utils/app-back-stack';

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
  openOnInputBlurPointerDown?: boolean;
}

function isEditableElement(element: Element | null): element is HTMLElement {
  if (!(element instanceof HTMLElement)) return false;
  const tagName = element.tagName.toLowerCase();

  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    element.isContentEditable
  );
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
  openOnInputBlurPointerDown = false,
}: DropdownListProps<T>) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const ignoreNextClickRef = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  const selected = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  const updateMenuPosition = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    const margin = 16;
    const gap = 6;
    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const openUp = spaceBelow < 220 && spaceAbove > spaceBelow;
    const availableSpace = openUp ? spaceAbove : spaceBelow;
    const maxHeight = Math.min(280, Math.max(160, availableSpace));

    setMenuStyle({
      position: 'fixed',
      left: rect.left,
      top: openUp ? undefined : rect.bottom + 6,
      bottom: openUp ? window.innerHeight - rect.top + gap : undefined,
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
    const handleScroll = (event: Event) => {
      const target = event.target as Node | null;
      if (target && menuRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
    };
    const handleResize = () => {
      if (openOnInputBlurPointerDown) {
        updateMenuPosition();
        return;
      }

      setIsOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, openOnInputBlurPointerDown]);

  useEffect(() => {
    if (!isOpen) return undefined;

    return registerAppBackHandler(() => {
      setIsOpen(false);
      buttonRef.current?.focus();
      return true;
    });
  }, [isOpen]);

  const handleSelect = (option: DropdownOption<T>) => {
    if (option.disabled) return;
    onChange(option.value);
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  const handleTriggerPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!openOnInputBlurPointerDown || disabled || event.pointerType === 'mouse') return;

    const activeElement = document.activeElement;
    if (!isEditableElement(activeElement) || buttonRef.current?.contains(activeElement)) return;

    activeElement.blur();
    updateMenuPosition();
    setIsOpen(true);
    ignoreNextClickRef.current = true;
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
        onPointerDown={handleTriggerPointerDown}
        onClick={() => {
          if (ignoreNextClickRef.current) {
            ignoreNextClickRef.current = false;
            return;
          }

          if (!disabled) {
            updateMenuPosition();
            setIsOpen((open) => !open);
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
          ref={menuRef}
          id={`${id}-listbox`}
          role="listbox"
          aria-label={ariaLabel}
          style={menuStyle}
          className={`overscroll-contain overflow-y-auto rounded-[14px] border border-gray-200 bg-white p-1 shadow-xl shadow-gray-900/12 ${menuClassName}`}
        >
          {options.map((option) => {
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
