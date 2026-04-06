import type { components } from "@/types/api/v1";

export type CancelOrderReason = components["schemas"]["CancelOrderReason"];

export const CANCEL_ORDER_REASON_OPTIONS: {
  value: CancelOrderReason;
  label: string;
}[] = [
  { value: "ChangedMind", label: "Tôi không còn nhu cầu mua nữa" },
  { value: "FoundBetterPrice", label: "Tôi tìm được giá tốt hơn" },
  {
    value: "WrongShippingInformation",
    label: "Tôi muốn cập nhật thông tin/địa chỉ nhận hàng",
  },
  { value: "PaymentIssue", label: "Tôi gặp vấn đề khi thanh toán" },
  { value: "DeliveryTooLate", label: "Thời gian giao hàng quá lâu" },
  { value: "InsufficientStock", label: "Sản phẩm không đủ số lượng" },
];

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

export const mapCancelReasonInputToEnum = (
  value: string,
): CancelOrderReason | null => {
  const normalized = normalize(value);
  if (!normalized) {
    return null;
  }

  if (normalized.includes("gia") && normalized.includes("tot")) {
    return "FoundBetterPrice";
  }

  if (
    normalized.includes("dia chi") ||
    normalized.includes("thong tin giao") ||
    normalized.includes("shipping")
  ) {
    return "WrongShippingInformation";
  }

  if (
    normalized.includes("thanh toan") ||
    normalized.includes("payment") ||
    normalized.includes("vnpay") ||
    normalized.includes("momo")
  ) {
    return "PaymentIssue";
  }

  if (
    normalized.includes("giao") &&
    (normalized.includes("cham") ||
      normalized.includes("lau") ||
      normalized.includes("muon"))
  ) {
    return "DeliveryTooLate";
  }

  if (
    normalized.includes("het hang") ||
    normalized.includes("khong du") ||
    normalized.includes("ton kho")
  ) {
    return "InsufficientStock";
  }

  if (
    normalized.includes("doi y") ||
    normalized.includes("nham") ||
    normalized.includes("khong con nhu cau")
  ) {
    return "ChangedMind";
  }

  return "ChangedMind";
};
