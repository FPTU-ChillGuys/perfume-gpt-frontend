import type {
  DiscountType,
  PromotionType,
  VoucherType,
} from "@/services/campaignService";

// ─── Voucher draft ──────────────────────────────────────────────────
export type CampaignVoucherDraft = {
  key: string;
  code: string;
  discountValueInput: string;
  discountType: DiscountType;
  applyType: VoucherType;
  targetItemType: PromotionType | "";
  maxDiscountAmountInput: string;
  minOrderValueInput: string;
  totalQuantityInput: string;
  maxUsagePerUserInput: string;
  isMemberOnly: boolean;
};

export const createEmptyVoucherDraft = (): CampaignVoucherDraft => ({
  key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  code: "",
  discountValueInput: "",
  discountType: "Percentage",
  applyType: "Product",
  targetItemType: "Regular",
  maxDiscountAmountInput: "",
  minOrderValueInput: "0",
  totalQuantityInput: "",
  maxUsagePerUserInput: "1",
  isMemberOnly: true,
});
