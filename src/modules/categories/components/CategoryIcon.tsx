import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeftRight,
  Banknote,
  BookOpen,
  Briefcase,
  Bus,
  CircleDollarSign,
  Coffee,
  Dumbbell,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  Landmark,
  Plane,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  Stethoscope,
  TrendingUp,
  Truck,
  Utensils,
  Wallet,
  Zap,
} from 'lucide-react';
import type { CategoryType } from '../domain/category.model';

export interface CategoryIconPreset {
  value: string;
  label: string;
  type: CategoryType | 'all';
  description: string;
}

const ICONS: Record<string, LucideIcon> = {
  'arrow-left-right': ArrowLeftRight,
  banknote: Banknote,
  book: BookOpen,
  'book-open': BookOpen,
  briefcase: Briefcase,
  bus: Bus,
  coffee: Coffee,
  dining: Utensils,
  education: GraduationCap,
  fitness: Dumbbell,
  food: Utensils,
  gift: Gift,
  health: HeartPulse,
  home: Home,
  investment: TrendingUp,
  investments: TrendingUp,
  landmark: Landmark,
  medical: Stethoscope,
  plane: Plane,
  receipt: Receipt,
  salary: Briefcase,
  shop: ShoppingBag,
  shopping: ShoppingBag,
  'shopping-bag': ShoppingBag,
  'shopping-cart': ShoppingCart,
  transport: Bus,
  'trending-up': TrendingUp,
  truck: Truck,
  utilities: Zap,
  wallet: Wallet,
  zap: Zap,
};

export const CATEGORY_ICON_PRESETS: CategoryIconPreset[] = [
  { value: 'briefcase', label: 'Luong', type: 'income', description: 'Tien luong va thu nhap chinh tu cong viec.' },
  { value: 'trending-up', label: 'Dau tu', type: 'income', description: 'Lai dau tu, co tuc hoac loi nhuan tai chinh.' },
  { value: 'banknote', label: 'Tien mat', type: 'income', description: 'Khoan tien mat nhan duoc.' },
  { value: 'gift', label: 'Qua tang', type: 'income', description: 'Tien thuong, qua tang hoac ho tro.' },
  { value: 'landmark', label: 'Ngan hang', type: 'income', description: 'Thu nhap lien quan den tai khoan ngan hang.' },
  { value: 'wallet', label: 'Vi', type: 'income', description: 'Khoan nap hoac nhan tien vao vi.' },
  { value: 'coffee', label: 'Cafe', type: 'expense', description: 'Do uong, cafe va cac lan an nhe.' },
  { value: 'food', label: 'An uong', type: 'expense', description: 'Bua an hang ngay, di cho va thuc pham.' },
  { value: 'shopping-bag', label: 'Mua sam', type: 'expense', description: 'Quan ao, do dung va mua sam ca nhan.' },
  { value: 'bus', label: 'Di chuyen', type: 'expense', description: 'Xang xe, taxi, xe buyt va di lai.' },
  { value: 'home', label: 'Nha cua', type: 'expense', description: 'Tien nha, sua chua va do dung gia dinh.' },
  { value: 'zap', label: 'Hoa don', type: 'expense', description: 'Dien, nuoc, internet va cac hoa don dinh ky.' },
  { value: 'health', label: 'Suc khoe', type: 'expense', description: 'Kham benh, thuoc va cham soc suc khoe.' },
  { value: 'book-open', label: 'Hoc tap', type: 'expense', description: 'Hoc phi, sach vo va khoa hoc.' },
  { value: 'dumbbell', label: 'The thao', type: 'expense', description: 'Phong tap, dung cu va hoat dong the thao.' },
  { value: 'plane', label: 'Du lich', type: 'expense', description: 'Ve may bay, khach san va chuyen di.' },
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
