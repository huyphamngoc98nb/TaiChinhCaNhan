import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeftRight,
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
import type { Language } from '@/shared/constants/translations';
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
  label: Record<Language, string>;
  description: Record<Language, string>;
}

const ICONS: Record<string, LucideIcon> = {
  'arrow-left-right': ArrowLeftRight,
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
  { value: 'briefcase', type: 'income', label: { en: 'Salary', vi: 'Luong' }, description: { en: 'Salary and main work income.', vi: 'Tien luong va thu nhap chinh tu cong viec.' } },
  { value: 'trending-up', type: 'income', label: { en: 'Investments', vi: 'Dau tu' }, description: { en: 'Investment gains, dividends, or financial returns.', vi: 'Lai dau tu, co tuc hoac loi nhuan tai chinh.' } },
  { value: 'banknote', type: 'income', label: { en: 'Cash', vi: 'Tien mat' }, description: { en: 'Cash received.', vi: 'Khoan tien mat nhan duoc.' } },
  { value: 'gift', type: 'income', label: { en: 'Gifts', vi: 'Qua tang' }, description: { en: 'Bonuses, gifts, or support payments.', vi: 'Tien thuong, qua tang hoac ho tro.' } },
  { value: 'landmark', type: 'income', label: { en: 'Bank', vi: 'Ngan hang' }, description: { en: 'Income related to bank accounts.', vi: 'Thu nhap lien quan den tai khoan ngan hang.' } },
  { value: 'wallet', type: 'income', label: { en: 'Wallet', vi: 'Vi' }, description: { en: 'Wallet top-ups or received money.', vi: 'Khoan nap hoac nhan tien vao vi.' } },
  { value: 'coffee', type: 'expense', label: { en: 'Coffee', vi: 'Cafe' }, description: { en: 'Drinks, coffee, and light snacks.', vi: 'Do uong, cafe va cac lan an nhe.' } },
  { value: 'food', type: 'expense', label: { en: 'Food', vi: 'An uong' }, description: { en: 'Daily meals, groceries, and food.', vi: 'Bua an hang ngay, di cho va thuc pham.' } },
  { value: 'shopping-bag', type: 'expense', label: { en: 'Shopping', vi: 'Mua sam' }, description: { en: 'Clothes, items, and personal shopping.', vi: 'Quan ao, do dung va mua sam ca nhan.' } },
  { value: 'bus', type: 'expense', label: { en: 'Transport', vi: 'Di chuyen' }, description: { en: 'Fuel, taxi, bus, and commuting.', vi: 'Xang xe, taxi, xe buyt va di lai.' } },
  { value: 'home', type: 'expense', label: { en: 'Home', vi: 'Nha cua' }, description: { en: 'Rent, repairs, and household items.', vi: 'Tien nha, sua chua va do dung gia dinh.' } },
  { value: 'zap', type: 'expense', label: { en: 'Bills', vi: 'Hoa don' }, description: { en: 'Electricity, water, internet, and recurring bills.', vi: 'Dien, nuoc, internet va cac hoa don dinh ky.' } },
  { value: 'health', type: 'expense', label: { en: 'Health', vi: 'Suc khoe' }, description: { en: 'Medical visits, medicine, and health care.', vi: 'Kham benh, thuoc va cham soc suc khoe.' } },
  { value: 'book-open', type: 'expense', label: { en: 'Education', vi: 'Hoc tap' }, description: { en: 'Tuition, books, and courses.', vi: 'Hoc phi, sach vo va khoa hoc.' } },
  { value: 'dumbbell', type: 'expense', label: { en: 'Sports', vi: 'The thao' }, description: { en: 'Gym, equipment, and sports activities.', vi: 'Phong tap, dung cu va hoat dong the thao.' } },
  { value: 'plane', type: 'expense', label: { en: 'Travel', vi: 'Du lich' }, description: { en: 'Flights, hotels, and trips.', vi: 'Ve may bay, khach san va chuyen di.' } },
];

const CATEGORY_ICON_LIBRARY_DEFINITIONS: LocalizedCategoryIconPreset[] = [
  ...CATEGORY_ICON_PRESET_DEFINITIONS,
  { value: 'credit-card', type: 'expense', label: { en: 'Credit card', vi: 'The tin dung' }, description: { en: 'Card payment, fees, or credit spending.', vi: 'Thanh toan the, phi hoac chi tieu tin dung.' } },
  { value: 'receipt', type: 'expense', label: { en: 'Receipt', vi: 'Bien lai' }, description: { en: 'Receipts, invoices, and purchase records.', vi: 'Bien lai, hoa don va chung tu mua hang.' } },
  { value: 'shopping-cart', type: 'expense', label: { en: 'Groceries', vi: 'Sieu thi' }, description: { en: 'Grocery shopping and household supplies.', vi: 'Di cho, sieu thi va hang tieu dung.' } },
  { value: 'fuel', type: 'expense', label: { en: 'Fuel', vi: 'Xang xe' }, description: { en: 'Fuel and vehicle running costs.', vi: 'Nhien lieu va chi phi van hanh xe.' } },
  { value: 'car', type: 'expense', label: { en: 'Car', vi: 'O to' }, description: { en: 'Car costs, maintenance, and parking.', vi: 'Chi phi xe hoi, bao duong va gui xe.' } },
  { value: 'bike', type: 'expense', label: { en: 'Bike', vi: 'Xe dap' }, description: { en: 'Bike commuting or bike maintenance.', vi: 'Di chuyen bang xe dap hoac bao duong xe.' } },
  { value: 'train', type: 'expense', label: { en: 'Train', vi: 'Tau' }, description: { en: 'Train tickets and public transport.', vi: 'Ve tau va phuong tien cong cong.' } },
  { value: 'shirt', type: 'expense', label: { en: 'Clothing', vi: 'Quan ao' }, description: { en: 'Clothes, shoes, and accessories.', vi: 'Quan ao, giay dep va phu kien.' } },
  { value: 'film', type: 'expense', label: { en: 'Movies', vi: 'Phim anh' }, description: { en: 'Cinema, streaming, and entertainment.', vi: 'Rap phim, streaming va giai tri.' } },
  { value: 'music', type: 'expense', label: { en: 'Music', vi: 'Am nhac' }, description: { en: 'Music subscriptions or events.', vi: 'Dang ky am nhac hoac su kien.' } },
  { value: 'laptop', type: 'expense', label: { en: 'Technology', vi: 'Cong nghe' }, description: { en: 'Devices, software, and technology services.', vi: 'Thiet bi, phan mem va dich vu cong nghe.' } },
  { value: 'phone', type: 'expense', label: { en: 'Phone', vi: 'Dien thoai' }, description: { en: 'Phone bills and mobile services.', vi: 'Cuoc dien thoai va dich vu di dong.' } },
  { value: 'wifi', type: 'expense', label: { en: 'Internet', vi: 'Internet' }, description: { en: 'Internet and connectivity bills.', vi: 'Hoa don internet va ket noi.' } },
  { value: 'wrench', type: 'expense', label: { en: 'Repairs', vi: 'Sua chua' }, description: { en: 'Maintenance and repair costs.', vi: 'Chi phi bao tri va sua chua.' } },
  { value: 'shield', type: 'expense', label: { en: 'Insurance', vi: 'Bao hiem' }, description: { en: 'Insurance and protection costs.', vi: 'Chi phi bao hiem va bao ve.' } },
  { value: 'calendar', type: 'expense', label: { en: 'Events', vi: 'Su kien' }, description: { en: 'Events and scheduled payments.', vi: 'Su kien va cac khoan thanh toan theo lich.' } },
  { value: 'ticket', type: 'expense', label: { en: 'Tickets', vi: 'Ve' }, description: { en: 'Tickets, passes, and admissions.', vi: 'Ve, the vao cong va phi tham du.' } },
  { value: 'map-pin', type: 'expense', label: { en: 'Travel', vi: 'Du lich' }, description: { en: 'Travel locations and trip spending.', vi: 'Dia diem du lich va chi phi chuyen di.' } },
  { value: 'building-2', type: 'income', label: { en: 'Business', vi: 'Kinh doanh' }, description: { en: 'Business income and client payments.', vi: 'Thu nhap kinh doanh va thanh toan tu khach hang.' } },
  { value: 'wallet', type: 'income', label: { en: 'Wallet', vi: 'Vi' }, description: { en: 'Wallet top-ups or received cash.', vi: 'Nap vi hoac tien mat nhan duoc.' } },
  { value: 'calendar', type: 'income', label: { en: 'Recurring income', vi: 'Thu dinh ky' }, description: { en: 'Recurring income and scheduled payments.', vi: 'Thu nhap dinh ky va cac khoan theo lich.' } },
  { value: 'clock', type: 'income', label: { en: 'Freelance', vi: 'Lam tu do' }, description: { en: 'Hourly work and freelance income.', vi: 'Cong viec theo gio va thu nhap freelance.' } },
];

export const CUSTOM_ICON_PRESETS: CategoryIconPreset[] = [
  { value: '🧾', label: 'Hoa don', type: 'all', description: 'Hoa don, bien lai hoac chung tu.' },
  { value: '🍜', label: 'Do an', type: 'expense', description: 'Quan an, bua an nhanh hoac do an ngoai.' },
  { value: '🛒', label: 'Sieu thi', type: 'expense', description: 'Di cho, sieu thi va hang tieu dung.' },
  { value: '💊', label: 'Thuoc', type: 'expense', description: 'Thuoc men va vat dung y te.' },
  { value: '🎮', label: 'Giai tri', type: 'expense', description: 'Tro choi, phim anh va giai tri.' },
  { value: '💻', label: 'Cong nghe', type: 'expense', description: 'Thiet bi, phan mem va dich vu cong nghe.' },
  { value: '💰', label: 'Tien', type: 'income', description: 'Khoan tien nhan duoc.' },
  { value: '🏦', label: 'Lai suat', type: 'income', description: 'Lai ngan hang hoac thu nhap tai chinh.' },
];

function localizeIconPreset(preset: LocalizedCategoryIconPreset, language: Language): CategoryIconPreset {
  return {
    value: preset.value,
    type: preset.type,
    label: preset.label[language],
    description: preset.description[language],
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
    (item) => item.value === icon && Object.values(item.description).includes(description),
  );
  if (!preset) return description;

  return preset.description[language];
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
