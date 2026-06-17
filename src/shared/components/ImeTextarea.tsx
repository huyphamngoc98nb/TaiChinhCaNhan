import { TextareaHTMLAttributes } from 'react';
import { useImeSafeInputValue } from '@/shared/hooks/useImeSafeInputValue';

type ImeTextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'value' | 'onChange' | 'onCompositionStart' | 'onCompositionEnd'
> & {
  value: string;
  onValueChange: (value: string) => void;
};

export function ImeTextarea({
  value,
  onValueChange,
  onBlur,
  ...props
}: ImeTextareaProps) {
  const input = useImeSafeInputValue<HTMLTextAreaElement>({
    value,
    onChange: onValueChange,
    onBlur,
  });

  return (
    <textarea
      {...props}
      {...input.inputProps}
    />
  );
}
