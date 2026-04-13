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
  { value: "CustomerRequested", label: "Khách hàng yêu cầu hủy" },
  { value: "SuspectedFraud", label: "Nghi ngờ đơn hàng giả mạo/gian lận" },
  {
    value: "UnreachableCustomer",
    label: "Không thể liên lạc được với khách hàng",
  },
  { value: "PaymentTimeout", label: "Quá hạn thanh toán" },
  {
    value: "PricingOrSystemError",
    label: "Lỗi hệ thống hoặc sai giá sản phẩm",
  },
  {
    value: "DamagedOrDefectiveStock",
    label: "Hàng kiểm tra trước khi giao bị lỗi/vỡ",
  },
  { value: "OutOfServiceArea", label: "Khu vực không hỗ trợ giao hàng" },
  { value: "Other", label: "Lý do khác" },
];

export const CUSTOMER_CANCEL_ORDER_REASON_OPTIONS =
  CANCEL_ORDER_REASON_OPTIONS.filter(
    (option) =>
      option.value === "ChangedMind" ||
      option.value === "FoundBetterPrice" ||
      option.value === "WrongShippingInformation" ||
      option.value === "PaymentIssue" ||
      option.value === "DeliveryTooLate" ||
      option.value === "InsufficientStock",
  );

export const STAFF_CANCEL_ORDER_REASON_OPTIONS =
  CANCEL_ORDER_REASON_OPTIONS.filter(
    (option) =>
      option.value === "InsufficientStock" ||
      option.value === "CustomerRequested" ||
      option.value === "SuspectedFraud" ||
      option.value === "UnreachableCustomer" ||
      option.value === "PaymentTimeout" ||
      option.value === "PricingOrSystemError" ||
      option.value === "DamagedOrDefectiveStock" ||
      option.value === "OutOfServiceArea" ||
      option.value === "Other",
  );

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
