import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { BottomSheet } from '@/shared/components/BottomSheet';
import { useLanguage } from '@/shared/context/LanguageContext';
import { ImeTextInput } from '@/shared/components/ImeTextInput';
import type { CategoryType } from '../domain/category.model';
import { CategoryIcon, getCategoryIconLibrary } from './CategoryIcon';
import { validateCustomCategoryIconValue } from '../utils/category-icon-validation';

interface Props {
  isOpen: boolean;
  type: CategoryType;
  selectedIcon: string;
  onSelect: (icon: string) => void;
  onClose: () => void;
}

export function CategoryIconPicker({ isOpen, type, selectedIcon, onSelect, onClose }: Props) {
  const { t, language } = useLanguage();
  const [query, setQuery] = useState('');
  const [committedQuery, setCommittedQuery] = useState('');
  const [pendingIcon, setPendingIcon] = useState(selectedIcon);
  const [customIcon, setCustomIcon] = useState('');
  const [customIconError, setCustomIconError] = useState<string | null>(null);
  const iconLibrary = useMemo(() => getCategoryIconLibrary(language), [language]);

  useEffect(() => {
    if (isOpen) {
      setPendingIcon(selectedIcon);
      setQuery('');
      setCommittedQuery('');
      setCustomIcon('');
      setCustomIconError(null);
    }
  }, [isOpen, selectedIcon]);

  const matchingIcons = useMemo(() => {
    const normalizedQuery = committedQuery.trim().toLowerCase();
    return iconLibrary
      .filter((icon) => icon.type === type || icon.type === 'all')
      .filter((icon, index, icons) => icons.findIndex((item) => item.value === icon.value) === index)
      .filter((icon) => {
        if (!normalizedQuery) return true;
        return `${icon.value} ${icon.label} ${icon.description}`.toLowerCase().includes(normalizedQuery);
      });
  }, [committedQuery, iconLibrary, type]);

  function confirmSelection() {
    onSelect(pendingIcon);
    onClose();
  }

  function useCustomIcon() {
    const validation = validateCustomCategoryIconValue(customIcon);
    if (!validation.valid || !validation.value) {
      setCustomIconError(t('categories.invalid_custom_icon'));
      return;
    }

    setCustomIconError(null);
    setPendingIcon(validation.value);

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} transitionKey={`icons-${type}`}>
      <div
        data-category-icon-picker="true"
        className="flex max-h-[min(78vh,680px)] min-h-0 flex-col gap-4"
      >
        <div className="shrink-0">
          <h3 className="text-[18px] font-bold text-gray-900">{t('categories.icon_picker_title')}</h3>
          <p className="mt-1 text-[12px] text-gray-500">{t('categories.icon_picker_hint')}</p>
        </div>

        <div className="flex items-center gap-2 rounded-[12px] border border-gray-200 bg-gray-50 px-3">
          <Search size={16} className="text-gray-400" />
          <ImeTextInput
            value={query}
            onValueChange={(nextValue) => {
              setQuery(nextValue);
              setCommittedQuery(nextValue);
            }}
            placeholder={t('categories.search_icons')}
            className="h-11 min-w-0 flex-1 bg-transparent text-[14px] text-gray-900 outline-none"
          />
        </div>

        <div className="flex shrink-0 items-center gap-3 rounded-[14px] bg-indigo-50 px-3 py-2">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-white text-indigo-600">
            <CategoryIcon icon={pendingIcon} name={t('categories.icon')} type={type} size={21} />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-indigo-700">{t('categories.selected_icon')}</p>
            <p className="truncate text-[12px] text-indigo-500">{pendingIcon || t('categories.no_icon_selected')}</p>
          </div>
        </div>

        <div className="shrink-0 space-y-2 rounded-[14px] border border-gray-200 bg-gray-50 p-3">
          <div>
            <p className="text-[13px] font-semibold text-gray-800">{t('categories.custom_icon')}</p>
            <p className="mt-0.5 text-[12px] text-gray-500">{t('categories.custom_icon_hint')}</p>
          </div>
          <div className="flex gap-2">
            <ImeTextInput
              value={customIcon}
              onValueChange={(nextValue) => {
                setCustomIcon(nextValue);
                setCustomIconError(null);
              }}
              data-category-custom-icon-input="true"
              placeholder={t('categories.custom_icon_placeholder')}
              className="h-11 min-w-0 flex-1 rounded-[12px] border border-gray-200 bg-white px-3 text-center text-[18px] font-semibold text-gray-900 outline-none focus:border-indigo-400"
            />
            <button
              type="button"
              onClick={useCustomIcon}
              className="h-11 shrink-0 rounded-[12px] bg-gray-900 px-3 text-[12px] font-bold text-white active:scale-[0.98]"
            >
              {t('categories.use_custom_icon')}
            </button>
          </div>
          {customIconError && (
            <p className="text-[12px] font-medium text-red-500">{customIconError}</p>
          )}
        </div>

        <div
          data-modal-scroll-container="true"
          className="form-scroll-container min-h-[180px] flex-1 pr-1"
        >
          {matchingIcons.length === 0 ? (
            <div className="flex min-h-[160px] items-center justify-center rounded-[14px] border border-dashed border-gray-200 px-6 text-center text-[13px] text-gray-400">
              {t('categories.no_matching_icons')}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {matchingIcons.map((icon) => (
                <button
                  key={icon.value}
                  type="button"
                  onClick={() => setPendingIcon(icon.value)}
                  className={`flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-[12px] border px-2 py-2 transition-all ${
                    pendingIcon === icon.value
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-600'
                      : 'border-gray-200 bg-gray-50 text-gray-600'
                  }`}
                  aria-label={`${t('categories.choose_icon')} ${icon.label}`}
                >
                  <CategoryIcon icon={icon.value} name={icon.label} type={type} size={20} />
                  <span className="w-full truncate text-[10px] font-semibold">{icon.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div
          data-category-icon-picker-footer="true"
          className="sticky bottom-0 flex shrink-0 gap-3 border-t border-gray-100 bg-surface pt-3"
        >
          <button
            type="button"
            onClick={onClose}
            className="h-12 flex-1 rounded-[12px] border border-gray-200 text-[14px] font-semibold text-gray-600"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={confirmSelection}
            className="h-12 flex-[2] rounded-[12px] bg-indigo-500 text-[14px] font-bold text-white shadow-lg shadow-indigo-500/20"
          >
            {t('categories.confirm_icon')}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
