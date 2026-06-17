import {
  ChangeEvent,
  CompositionEvent,
  FocusEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

type TextInputElement = HTMLInputElement | HTMLTextAreaElement;

interface UseImeSafeInputValueOptions {
  value: string;
  onChange: (value: string) => void;
  onBlur?: (event: FocusEvent<TextInputElement>) => void;
}

function eventIsComposing(event: ChangeEvent<TextInputElement>) {
  return Boolean((event.nativeEvent as Event & { isComposing?: boolean }).isComposing);
}

export function useImeSafeInputValue({
  value,
  onChange,
  onBlur,
}: UseImeSafeInputValueOptions) {
  const [draftValue, setDraftValue] = useState(value);
  const isComposingRef = useRef(false);

  useEffect(() => {
    if (!isComposingRef.current) {
      setDraftValue(value);
    }
  }, [value]);

  const commitValue = useCallback((nextValue: string) => {
    setDraftValue(nextValue);
    onChange(nextValue);
  }, [onChange]);

  const handleChange = useCallback((event: ChangeEvent<TextInputElement>) => {
    const nextValue = event.target.value;
    setDraftValue(nextValue);

    if (isComposingRef.current || eventIsComposing(event)) return;
    onChange(nextValue);
  }, [onChange]);

  const handleCompositionStart = useCallback((event: CompositionEvent<TextInputElement>) => {
    isComposingRef.current = true;
    setDraftValue(event.currentTarget.value);
  }, []);

  const handleCompositionEnd = useCallback((event: CompositionEvent<TextInputElement>) => {
    isComposingRef.current = false;
    commitValue(event.currentTarget.value);
  }, [commitValue]);

  const handleBlur = useCallback((event: FocusEvent<TextInputElement>) => {
    if (isComposingRef.current) {
      isComposingRef.current = false;
      commitValue(event.currentTarget.value);
    }
    onBlur?.(event);
  }, [commitValue, onBlur]);

  return {
    value: draftValue,
    isComposing: isComposingRef.current,
    inputProps: {
      value: draftValue,
      onChange: handleChange,
      onCompositionStart: handleCompositionStart,
      onCompositionEnd: handleCompositionEnd,
      onBlur: handleBlur,
    },
  };
}
