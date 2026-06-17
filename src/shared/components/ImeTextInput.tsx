import { InputHTMLAttributes } from 'react';
import { useImeSafeInputValue } from '@/shared/hooks/useImeSafeInputValue';

type ImeTextInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'onCompositionStart' | 'onCompositionEnd'
> & {
  value: string;
  onValueChange: (value: string) => void;
};

export function ImeTextInput({
  value,
  onValueChange,
  onBlur,
  ...props
}: ImeTextInputProps) {
  const input = useImeSafeInputValue<HTMLInputElement>({
    value,
    onChange: onValueChange,
    onBlur,
  });

  return (
    <input
      {...props}
      {...input.inputProps}
    />
  );
}
