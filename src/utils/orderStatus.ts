import type { OrderStatus, PaymentStatus, OrderType } from "@/types/order";

// Vietnamese labels for order status
export const orderStatusLabels: Record<OrderStatus, string> = {
  Pending: "Chờ xử lý",
  Processing: "Đang xử lý",
  Delivering: "Đang giao hàng",
  Delivered: "Đã giao hàng",
  Canceled: "Đã hủy",
  Returned: "Đã trả hàng",
};

// Vietnamese labels for payment status
export const paymentStatusLabels: Record<PaymentStatus, string> = {
  Unpaid: "Chưa thanh toán",
  Paid: "Đã thanh toán",
  Refunded: "Đã hoàn tiền",
};

// Vietnamese labels for order type
export const orderTypeLabels: Record<OrderType, string> = {
  Online: "Online",
  Offline: "In-Store",
  Shoppe: "Shopee",
};

// Colors for order status
export const orderStatusColors: Record<
  OrderStatus,
  "default" | "primary" | "secondary" | "error" | "warning" | "info" | "success"
> = {
  Pending: "warning", // 🟠 Cam - Chờ xử lý
  Processing: "secondary", // ⚪ Xám/Tím nhạt - Đang xử lý tại kho
  Delivering: "info", // 🔵 Xanh dương - Đang giao hàng (VẬN CHUYỂN)
  Delivered: "success", // 🟢 Xanh lá - Đã giao hàng
  Canceled: "error", // 🔴 Đỏ - Đã hủy
  Returned: "default", // Hồng sẽ được áp qua sx để đồng nhất mọi màn hình
};

export const getOrderStatusChipSx = (status?: OrderStatus) => {
  if (status !== "Returned") return undefined;

  return {
    bgcolor: "#fce7f3",
    color: "#be185d",
    borderColor: "#f9a8d4",
    "& .MuiChip-label": {
      fontWeight: 600,
    },
  };
};

// Colors for payment status
export const paymentStatusColors: Record<
  PaymentStatus,
  "default" | "primary" | "secondary" | "error" | "warning" | "info" | "success"
> = {
  Unpaid: "warning", // 🟠 Cam - Chưa thanh toán (thay vì đỏ)
  Paid: "success", // 🟢 Xanh lá - Đã thanh toán
  Refunded: "info", // 🔵 Xanh dương nhạt - Đã hoàn tiền
};

// Colors for order type
export const orderTypeColors: Record<
  OrderType,
  "success" | "info" | "secondary"
> = {
  Online: "success", // xanh lá
  Offline: "info", // màu khác (xanh dương nhạt)
  Shoppe: "secondary",
};
