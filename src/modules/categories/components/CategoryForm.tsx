import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { Category, CategoryInput, CategoryType } from '../domain/category.model';
import { CategoryIcon, getCategoryIconPresets, getLocalizedCategoryDescription } from './CategoryIcon';
import { CategoryIconPicker } from './CategoryIconPicker';
import { useLanguage } from '@/shared/context/LanguageContext';

interface Props {
  existing?: Category;
  defaultType: CategoryType;
  onSave: (input: CategoryInput) => Promise<void>;
  onCancel: () => void;
}

const COLOR_PRESETS = [
  '#10B981', '#3B82F6', '#F59E0B', '#EC4899',
  '#6366F1', '#EF4444', '#14B8A6', '#8B5CF6',
];

export function CategoryForm({ existing, defaultType, onSave, onCancel }: Props) {
  const { t, language } = useLanguage();
  const [name, setName] = useState(existing?.name ?? '');
  const [type, setType] = useState<CategoryType>(existing?.type ?? defaultType);
  const [icon, setIcon] = useState(existing?.icon ?? '');
  const [color, setColor] = useState(existing?.color ?? COLOR_PRESETS[0]);
  const [description, setDescription] = useState(
    getLocalizedCategoryDescription(existing?.icon, existing?.description, language) ?? '',
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  useEffect(() => {
    if (!existing) setType(defaultType);
  }, [defaultType, existing]);

  const iconPresets = useMemo(
    () => getCategoryIconPresets(language).filter((preset) => preset.type === type || preset.type === 'all'),
    [language, type],
  );

  useEffect(() => {
    setDescription((current) => getLocalizedCategoryDescription(icon, current, language) ?? current);
  }, [icon, language]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError(t('categories.name_required'));
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        type,
        icon: icon.trim() || null,
        color,
        description: description.trim() || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('categories.save_failed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h3 className="text-[18px] font-bold text-gray-900">
          {existing ? t('categories.edit') : t('categories.add')}
        </h3>
        <p className="text-[12px] text-gray-500 mt-1">
          {t('categories.subtitle')}
        </p>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-[12px] text-[13px] text-red-600 font-medium">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-[13px] font-semibold text-gray-700">{t('categories.name')} *</p>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t('categories.name_placeholder')}
          className="w-full h-[48px] bg-gray-50 border border-gray-200 rounded-[14px] px-4 text-[14px] text-gray-900 outline-none focus:border-indigo-400 transition-colors"
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-[13px] font-semibold text-gray-700">{t('categories.type')}</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'expense' as const, label: t('categories.expense_type') },
            { id: 'income' as const, label: t('categories.income_type') },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setType(item.id)}
              className={`h-[44px] rounded-[12px] text-[13px] font-semibold border transition-all ${
                type === item.id
                  ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm'
                  : 'bg-gray-50 text-gray-600 border-gray-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold text-gray-700">{t('categories.icon')}</p>
          {icon && (
            <button
              type="button"
              onClick={() => setIcon('')}
              className="text-[12px] font-semibold text-gray-400"
            >
              {t('categories.clear_icon')}
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 rounded-[14px] border border-gray-200 bg-gray-50 p-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-white text-gray-700"
            style={{ color: color || '#6366F1' }}
          >
            <CategoryIcon icon={icon} name={name || t('categories.icon')} type={type} size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-gray-900">{t('categories.selected_icon')}</p>
            <p className="truncate text-[12px] text-gray-500">
              {icon || t('categories.no_icon_selected')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIconPickerOpen(true)}
            className="h-10 shrink-0 rounded-[10px] bg-indigo-500 px-3 text-[12px] font-semibold text-white active:scale-[0.98]"
          >
            {t('categories.view_more_icons')}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {iconPresets.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => setIcon(preset.value)}
              className={`h-10 px-3 rounded-[10px] text-[12px] font-semibold border inline-flex items-center gap-2 ${
                icon === preset.value ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-gray-200 bg-gray-50 text-gray-500'
              }`}
            >
              <CategoryIcon icon={preset.value} name={preset.label} type={type} size={15} />
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-[13px] font-semibold text-gray-700">{t('categories.icon_description')}</p>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          placeholder={t('categories.description_placeholder')}
          className="w-full bg-gray-50 border border-gray-200 rounded-[14px] px-4 py-3 text-[14px] text-gray-900 outline-none focus:border-indigo-400 transition-colors resize-none"
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-[13px] font-semibold text-gray-700">{t('categories.color')}</p>
        <div className="flex flex-wrap gap-2">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setColor(preset)}
              className="w-9 h-9 rounded-full border-2 transition-transform"
              style={{
                backgroundColor: preset,
                borderColor: color === preset ? '#111827' : 'transparent',
                transform: color === preset ? 'scale(1.12)' : 'scale(1)',
              }}
              aria-label={`${t('categories.choose_color')} ${preset}`}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 h-[52px] rounded-[14px] border border-gray-200 text-gray-600 text-[15px] font-semibold active:scale-[0.98] transition-all"
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          disabled={saving}
          className={`flex-[2] h-[52px] rounded-[14px] bg-indigo-500 text-white text-[15px] font-bold active:scale-[0.98] transition-all ${
            saving ? 'opacity-50' : 'shadow-lg shadow-indigo-500/20'
          }`}
        >
          {saving ? t('common.saving') : t('categories.save')}
        </button>
      </div>
    </form>
    <CategoryIconPicker
      isOpen={iconPickerOpen}
      type={type}
      selectedIcon={icon}
      onSelect={setIcon}
      onClose={() => setIconPickerOpen(false)}
    />
    </>
  );
}
