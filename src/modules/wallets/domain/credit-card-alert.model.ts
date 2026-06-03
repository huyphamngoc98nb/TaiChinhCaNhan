export type CreditCardAlertType = 'overdue' | 'due_soon' | 'over_limit';

export interface CreditCardAlert {
  type: CreditCardAlertType;
  walletId: string;
  walletName: string;
  /** Số tiền còn nợ (overdue/due_soon) hoặc số tiền đã dùng (over_limit) */
  amount: number;
  /** dueAt timestamp — chỉ có với overdue và due_soon */
  dueAt?: number;
  /** Số ngày còn lại đến hạn — chỉ có với due_soon */
  daysLeft?: number;
  /** % đã dùng hạn mức — chỉ có với over_limit */
  usagePercent?: number;
}
