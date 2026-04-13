import type { OrderStatus, PaymentStatus, OrderType } from "@/types/order";

// Vietnamese labels for order status
export const orderStatusLabels: Record<OrderStatus, string> = {
  Pending: "Chờ xử lý",
  Preparing: "Đang chuẩn bị",
  ReadyToPick: "Chờ lấy hàng",
  Delivering: "Đang giao hàng",
  Delivered: "Đã giao hàng",
  Returning: "Đang hoàn trả",
  Cancelled: "Đã hủy",
  Partial_Returned: "Trả hàng một phần/Hoàn tiền một phần",
  Returned: "Đã trả hàng/Hoàn tiền",
};

// Vietnamese labels for payment status
export const paymentStatusLabels: Record<PaymentStatus, string> = {
  Unpaid: "Chưa thanh toán",
  Paid: "Đã thanh toán",
  Partial_Refunded: "Hoàn tiền một phần",
  Refunded: "Đã hoàn tiền",
};

// Vietnamese labels for order type
export const orderTypeLabels: Record<OrderType, string> = {
  Online: "Online",
  Offline: "In-Store",
};

// Colors for order status
export const orderStatusColors: Record<
  OrderStatus,
  "default" | "primary" | "secondary" | "error" | "warning" | "info" | "success"
> = {
  Pending: "warning", // 🟠 Cam - Chờ xử lý
  Preparing: "secondary", // ⚪ Xám/Tím nhạt - Đang chuẩn bị tại kho
  ReadyToPick: "info", // 🔵 Xanh dương - Sẵn sàng bàn giao cho ĐVVC
  Delivering: "info", // 🔵 Xanh dương - Đang giao hàng (VẬN CHUYỂN)
  Delivered: "success", // 🟢 Xanh lá - Đã giao hàng
  Returning: "warning", // 🟠 Cam - Đang trong quy trình hoàn trả
  Cancelled: "error", // 🔴 Đỏ - Đã hủy
  Partial_Returned: "default", // Hồng sẽ được áp qua sx để đồng nhất mọi màn hình
  Returned: "default", // Hồng sẽ được áp qua sx để đồng nhất mọi màn hình
};

export const getOrderStatusChipSx = (status?: OrderStatus) => {
  if (status !== "Returned" && status !== "Partial_Returned") return undefined;

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
  Partial_Refunded: "secondary", // 🟣 Tím nhạt - Hoàn tiền một phần
  Refunded: "info", // 🔵 Xanh dương nhạt - Đã hoàn tiền
};

// Colors for order type
export const orderTypeColors: Record<
  OrderType,
  "success" | "info" | "secondary"
> = {
  Online: "success", // xanh lá
  Offline: "info", // màu khác (xanh dương nhạt)
};
