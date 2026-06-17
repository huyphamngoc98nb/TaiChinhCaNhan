import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeftRight,
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  Bike,
  BookOpen,
  Briefcase,
  Building2,
  Bus,
  Calendar,
  Car,
  CircleDollarSign,
  Clock,
  Coffee,
  CreditCard,
  Dumbbell,
  Film,
  Fuel,
  Gift,
  GraduationCap,
  HandCoins,
  HeartPulse,
  Home,
  Landmark,
  Laptop,
  MapPin,
  Music,
  Plane,
  Phone,
  Receipt,
  Shield,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Stethoscope,
  Ticket,
  TrendingUp,
  Train,
  Truck,
  Utensils,
  Wallet,
  Wifi,
  Wrench,
  Zap,
} from 'lucide-react';
import { translations, type Language, type TranslationPath } from '@/shared/constants/translations';
import type { CategoryType } from '../domain/category.model';

export interface CategoryIconPreset {
  value: string;
  label: string;
  type: CategoryType | 'all';
  description: string;
}

interface LocalizedCategoryIconPreset {
  value: string;
  type: CategoryType | 'all';
  labelKey: TranslationPath;
  descriptionKey: TranslationPath;
}

const ICONS: Record<string, LucideIcon> = {
  'arrow-left-right': ArrowLeftRight,
  'arrow-down-circle': ArrowDownCircle,
  'arrow-up-circle': ArrowUpCircle,
  banknote: Banknote,
  bike: Bike,
  book: BookOpen,
  'book-open': BookOpen,
  briefcase: Briefcase,
  building: Building2,
  'building-2': Building2,
  bus: Bus,
  calendar: Calendar,
  car: Car,
  clock: Clock,
  coffee: Coffee,
  'credit-card': CreditCard,
  dining: Utensils,
  education: GraduationCap,
  fitness: Dumbbell,
  film: Film,
  food: Utensils,
  fuel: Fuel,
  gift: Gift,
  health: HeartPulse,
  'hand-coins': HandCoins,
  home: Home,
  investment: TrendingUp,
  investments: TrendingUp,
  landmark: Landmark,
  laptop: Laptop,
  location: MapPin,
  map: MapPin,
  'map-pin': MapPin,
  medical: Stethoscope,
  music: Music,
  plane: Plane,
  phone: Phone,
  receipt: Receipt,
  salary: Briefcase,
  shield: Shield,
  shirt: Shirt,
  shop: ShoppingBag,
  shopping: ShoppingBag,
  'shopping-bag': ShoppingBag,
  'shopping-cart': ShoppingCart,
  smartphone: Smartphone,
  ticket: Ticket,
  transport: Bus,
  'trending-up': TrendingUp,
  train: Train,
  truck: Truck,
  utilities: Zap,
  wallet: Wallet,
  wifi: Wifi,
  wrench: Wrench,
  zap: Zap,
};

const CATEGORY_ICON_PRESET_DEFINITIONS: LocalizedCategoryIconPreset[] = [
  { value: 'briefcase', type: 'income', labelKey: 'categories.icon_presets.salary.label', descriptionKey: 'categories.icon_presets.salary.description' },
  { value: 'trending-up', type: 'income', labelKey: 'categories.icon_presets.investments.label', descriptionKey: 'categories.icon_presets.investments.description' },
  { value: 'banknote', type: 'income', labelKey: 'categories.icon_presets.cash.label', descriptionKey: 'categories.icon_presets.cash.description' },
  { value: 'gift', type: 'income', labelKey: 'categories.icon_presets.gifts.label', descriptionKey: 'categories.icon_presets.gifts.description' },
  { value: 'landmark', type: 'income', labelKey: 'categories.icon_presets.bank.label', descriptionKey: 'categories.icon_presets.bank.description' },
  { value: 'wallet', type: 'income', labelKey: 'categories.icon_presets.wallet_income.label', descriptionKey: 'categories.icon_presets.wallet_income.description' },
  { value: 'coffee', type: 'expense', labelKey: 'categories.icon_presets.coffee.label', descriptionKey: 'categories.icon_presets.coffee.description' },
  { value: 'food', type: 'expense', labelKey: 'categories.icon_presets.food.label', descriptionKey: 'categories.icon_presets.food.description' },
  { value: 'shopping-bag', type: 'expense', labelKey: 'categories.icon_presets.shopping.label', descriptionKey: 'categories.icon_presets.shopping.description' },
  { value: 'bus', type: 'expense', labelKey: 'categories.icon_presets.transport.label', descriptionKey: 'categories.icon_presets.transport.description' },
  { value: 'home', type: 'expense', labelKey: 'categories.icon_presets.home.label', descriptionKey: 'categories.icon_presets.home.description' },
  { value: 'zap', type: 'expense', labelKey: 'categories.icon_presets.bills.label', descriptionKey: 'categories.icon_presets.bills.description' },
  { value: 'health', type: 'expense', labelKey: 'categories.icon_presets.health.label', descriptionKey: 'categories.icon_presets.health.description' },
  { value: 'book-open', type: 'expense', labelKey: 'categories.icon_presets.education.label', descriptionKey: 'categories.icon_presets.education.description' },
  { value: 'dumbbell', type: 'expense', labelKey: 'categories.icon_presets.sports.label', descriptionKey: 'categories.icon_presets.sports.description' },
  { value: 'plane', type: 'expense', labelKey: 'categories.icon_presets.travel.label', descriptionKey: 'categories.icon_presets.travel.description' },
];

const CATEGORY_ICON_LIBRARY_DEFINITIONS: LocalizedCategoryIconPreset[] = [
  ...CATEGORY_ICON_PRESET_DEFINITIONS,
  { value: 'credit-card', type: 'expense', labelKey: 'categories.icon_presets.credit_card.label', descriptionKey: 'categories.icon_presets.credit_card.description' },
  { value: 'receipt', type: 'expense', labelKey: 'categories.icon_presets.receipt.label', descriptionKey: 'categories.icon_presets.receipt.description' },
  { value: 'shopping-cart', type: 'expense', labelKey: 'categories.icon_presets.groceries.label', descriptionKey: 'categories.icon_presets.groceries.description' },
  { value: 'fuel', type: 'expense', labelKey: 'categories.icon_presets.fuel.label', descriptionKey: 'categories.icon_presets.fuel.description' },
  { value: 'car', type: 'expense', labelKey: 'categories.icon_presets.car.label', descriptionKey: 'categories.icon_presets.car.description' },
  { value: 'bike', type: 'expense', labelKey: 'categories.icon_presets.bike.label', descriptionKey: 'categories.icon_presets.bike.description' },
  { value: 'train', type: 'expense', labelKey: 'categories.icon_presets.train.label', descriptionKey: 'categories.icon_presets.train.description' },
  { value: 'shirt', type: 'expense', labelKey: 'categories.icon_presets.clothing.label', descriptionKey: 'categories.icon_presets.clothing.description' },
  { value: 'film', type: 'expense', labelKey: 'categories.icon_presets.movies.label', descriptionKey: 'categories.icon_presets.movies.description' },
  { value: 'music', type: 'expense', labelKey: 'categories.icon_presets.music.label', descriptionKey: 'categories.icon_presets.music.description' },
  { value: 'laptop', type: 'expense', labelKey: 'categories.icon_presets.technology.label', descriptionKey: 'categories.icon_presets.technology.description' },
  { value: 'phone', type: 'expense', labelKey: 'categories.icon_presets.phone.label', descriptionKey: 'categories.icon_presets.phone.description' },
  { value: 'wifi', type: 'expense', labelKey: 'categories.icon_presets.internet.label', descriptionKey: 'categories.icon_presets.internet.description' },
  { value: 'wrench', type: 'expense', labelKey: 'categories.icon_presets.repairs.label', descriptionKey: 'categories.icon_presets.repairs.description' },
  { value: 'shield', type: 'expense', labelKey: 'categories.icon_presets.insurance.label', descriptionKey: 'categories.icon_presets.insurance.description' },
  { value: 'calendar', type: 'expense', labelKey: 'categories.icon_presets.events.label', descriptionKey: 'categories.icon_presets.events.description' },
  { value: 'ticket', type: 'expense', labelKey: 'categories.icon_presets.tickets.label', descriptionKey: 'categories.icon_presets.tickets.description' },
  { value: 'map-pin', type: 'expense', labelKey: 'categories.icon_presets.travel_location.label', descriptionKey: 'categories.icon_presets.travel_location.description' },
  { value: 'building-2', type: 'income', labelKey: 'categories.icon_presets.business.label', descriptionKey: 'categories.icon_presets.business.description' },
  { value: 'wallet', type: 'income', labelKey: 'categories.icon_presets.wallet_cash.label', descriptionKey: 'categories.icon_presets.wallet_cash.description' },
  { value: 'calendar', type: 'income', labelKey: 'categories.icon_presets.recurring_income.label', descriptionKey: 'categories.icon_presets.recurring_income.description' },
  { value: 'clock', type: 'income', labelKey: 'categories.icon_presets.freelance.label', descriptionKey: 'categories.icon_presets.freelance.description' },
];

function getTranslationValue(language: Language, path: TranslationPath): string {
  const keys = path.split('.');
  let current: unknown = translations[language];

  for (const key of keys) {
    if (!current || typeof current !== 'object' || !(key in current)) {
      return path;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return typeof current === 'string' ? current : path;
}

function localizeIconPreset(preset: LocalizedCategoryIconPreset, language: Language): CategoryIconPreset {
  return {
    value: preset.value,
    type: preset.type,
    label: getTranslationValue(language, preset.labelKey),
    description: getTranslationValue(language, preset.descriptionKey),
  };
}

export function getCategoryIconPresets(language: Language): CategoryIconPreset[] {
  return CATEGORY_ICON_PRESET_DEFINITIONS.map((preset) => localizeIconPreset(preset, language));
}

export function getCategoryIconLibrary(language: Language): CategoryIconPreset[] {
  return CATEGORY_ICON_LIBRARY_DEFINITIONS.map((preset) => localizeIconPreset(preset, language));
}

export function getLocalizedCategoryDescription(
  icon: string | null | undefined,
  description: string | null | undefined,
  language: Language,
): string | null {
  if (!description) return null;

  const preset = CATEGORY_ICON_LIBRARY_DEFINITIONS.find(
    (item) =>
      item.value === icon &&
      (getTranslationValue('en', item.descriptionKey) === description ||
        getTranslationValue('vi', item.descriptionKey) === description),
  );
  if (!preset) return description;

  return getTranslationValue(language, preset.descriptionKey);
}

interface Props {
  icon?: string | null;
  name: string;
  type?: CategoryType;
  size?: number;
  className?: string;
}

export function getCategoryIconKey(icon?: string | null) {
  return icon?.trim().toLowerCase() ?? '';
}

export function CategoryIcon({ icon, name, type, size = 18, className }: Props) {
  const iconKey = getCategoryIconKey(icon);
  const Icon = ICONS[iconKey] ?? (type === 'income' ? CircleDollarSign : Receipt);

  if (icon && icon.trim().length > 0 && !/^[a-z0-9-_]+$/i.test(icon.trim())) {
    return <span className={className}>{icon}</span>;
  }

  if (!iconKey && !type) {
    return <span className={className}>{name.charAt(0).toUpperCase()}</span>;
  }

  return <Icon size={size} strokeWidth={2.2} className={className} />;
}
