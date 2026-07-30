import { useState } from 'react';
import { Calculator, Delete } from 'lucide-react';
import { CurrencyCode } from '@/shared/context/CurrencyContext';
import { useLanguage } from '@/shared/context/LanguageContext';
import { triggerLightHaptic } from '@/shared/utils/haptics';
import { MoneyCalculatorPanel } from './MoneyCalculatorPanel';
import { MoneyKeyboardButton } from './MoneyKeyboardButton';

type MoneyKeyboardMode = 'number' | 'calculator';

export interface MoneyKeyboardProps {
  value: string;
  currency: CurrencyCode;
  onInsert: (key: string) => void;
  onBackspace: () => void;
  onReplace: (value: string) => void;
  onDone: () => void;
  className?: string;
}

const numberKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'backspace'];

export function MoneyKeyboard({
  value,
  currency,
  onInsert,
  onBackspace,
  onReplace,
  onDone,
  className = '',
}: MoneyKeyboardProps) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<MoneyKeyboardMode>('number');
  const [statusText, setStatusText] = useState('');

  const applyCalculatorValue = (nextValue: string) => {
    void triggerLightHaptic();
    onReplace(nextValue);
    setStatusText(t('money_keyboard.calculation_applied'));
    setMode('number');
  };

  return (
    <div
      className={`w-full rounded-t-[24px] border-t border-border bg-surface px-4 pb-4 pt-3 shadow-2xl ${className}`}
      data-money-keyboard-panel="true"
      aria-label={t('money_keyboard.title')}
    >
      <p className="sr-only">{t('money_keyboard.hint')}</p>
      <p className="sr-only" role="status" aria-live="polite">{statusText}</p>
      <div
        className="mx-auto mb-4 h-1 w-9 rounded-full bg-border"
        data-money-keyboard-handle="true"
      />

      {mode === 'calculator' ? (
        <MoneyCalculatorPanel
          value={value}
          currency={currency}
          onApply={applyCalculatorValue}
          onBack={() => setMode('number')}
        />
      ) : (
        <div className="space-y-3" data-money-keyboard-number-pad="true">
          <div
            className="grid grid-cols-3 gap-2.5"
            data-money-keyboard-number-grid="true"
          >
            {numberKeys.map(key => (
              <MoneyKeyboardButton
                key={key}
                aria-label={key === 'backspace' ? t('money_keyboard.backspace') : undefined}
                onClick={() => {
                  void triggerLightHaptic();
                  if (key === 'backspace') {
                    onBackspace();
                    return;
                  }

                  onInsert(key);
                }}
              >
                {key === 'backspace' ? <Delete size={22} strokeWidth={2.4} /> : key}
              </MoneyKeyboardButton>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <MoneyKeyboardButton
              className="h-12 text-[15px]"
              aria-label={t('money_keyboard.calculator')}
              title={t('money_keyboard.calculator')}
              onClick={() => {
                void triggerLightHaptic();
                setMode('calculator');
              }}
            >
              <Calculator size={22} strokeWidth={2.4} />
            </MoneyKeyboardButton>
            <MoneyKeyboardButton
              className="h-12 text-[15px]"
              variant="primary"
              aria-label={t('money_keyboard.done')}
              onClick={() => {
                void triggerLightHaptic();
                onDone();
              }}
            >
              {t('money_keyboard.done')}
            </MoneyKeyboardButton>
          </div>
        </div>
      )}
    </div>
  );
}
