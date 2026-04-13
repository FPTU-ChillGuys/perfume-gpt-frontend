import { Box, Divider, Stack, Typography } from "@mui/material";
import type { OrderInvoice } from "@/services/orderService";
import { forwardRef } from "react";
import { formatDateTimeCompactVN } from "@/utils/dateTime";

const formatCurrency = (value?: number | null) =>
  `${new Intl.NumberFormat("vi-VN").format(Number(value ?? 0))} đ`;

const formatDate = (value?: string | null) => formatDateTimeCompactVN(value);

const toVietnameseCommonText = (value?: string | null) => {
  const raw = (value || "").trim();
  if (!raw) {
    return "-";
  }

  const normalized = raw.toLowerCase();
  if (normalized === "n/a") {
    return "Không có";
  }

  return raw;
};

const toVietnameseOrderStatus = (value?: string | null) => {
  const normalized = (value || "").trim().toLowerCase();
  if (!normalized) {
    return "-";
  }

  if (normalized === "pending") return "Chờ xử lý";
  if (normalized === "preparing") return "Đang chuẩn bị";
  if (normalized === "readytopick") return "Chờ lấy hàng";
  if (normalized === "delivering") return "Đang giao hàng";
  if (normalized === "delivered") return "Đã giao hàng";
  if (normalized === "cancelled") return "Đã hủy";
  if (normalized === "returning") return "Đang trả hàng";
  if (normalized === "returned") return "Đã trả hàng";
  if (normalized === "partial_returned") return "Trả một phần";

  return value || "-";
};

const toVietnamesePaymentMethod = (value?: string | null) => {
  const normalized = (value || "").trim().toLowerCase();
  if (!normalized) {
    return "-";
  }

  if (normalized === "cashondelivery") return "COD";
  if (normalized === "cashinstore") return "Tiền mặt";
  if (normalized === "vnpay") return "VNPay";
  if (normalized === "momo") return "MoMo";
  if (normalized === "externalbanktransfer") return "Chuyển khoản";
  if (normalized === "payos") return "PayOS";

  return value || "-";
};

const toVietnameseCustomerName = (value?: string | null) => {
  const raw = (value || "").trim();
  if (!raw) {
    return "-";
  }

  if (raw.toLowerCase() === "guest customer") {
    return "Khách lẻ";
  }

  return raw;
};

const toVietnameseInvoiceNote = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "physical in-store invoice.") {
    return "Hóa đơn bán tại cửa hàng";
  }

  return value;
};

interface ReceiptTemplateProps {
  invoice: OrderInvoice | null;
}

export const ReceiptTemplate = forwardRef<HTMLDivElement, ReceiptTemplateProps>(
  ({ invoice }, ref) => {
    if (!invoice) return null;

    return (
      <Box
        ref={ref}
        sx={{
          width: "80mm",
          p: 2,
          fontFamily: "monospace",
          fontSize: "11px",
          bgcolor: "white",
          color: "black",
          lineHeight: 1.4,
        }}
      >
        <Stack spacing={0.75}>
          {/* Header */}
          <Box textAlign="center">
            <Typography variant="h6" fontWeight={800} fontSize={16}>
              PERFUME GPT BOUTIQUE
            </Typography>
          </Box>

          <Divider sx={{ borderStyle: "dashed" }} />

          {/* Order Info */}
          <Box>
            <Typography variant="body2" fontWeight={700} fontSize={13} mb={0.5}>
              HÓA ĐƠN BÁN HÀNG
            </Typography>
            <Typography variant="caption" display="block" fontSize={11}>
              Mã đơn: {invoice.code || "-"}
            </Typography>
            <Typography variant="caption" display="block" fontSize={11}>
              Ngày: {formatDate(invoice.orderDate) || "-"}
            </Typography>
            <Typography variant="caption" display="block" fontSize={11}>
              Trạng thái: {toVietnameseOrderStatus(invoice.orderStatus)}
            </Typography>
            <Typography variant="caption" display="block" fontSize={11}>
              Nhân viên: {toVietnameseCommonText(invoice.staffName)}
            </Typography>
            <Typography variant="caption" display="block" fontSize={11}>
              Khách hàng: {toVietnameseCustomerName(invoice.customerName)}
            </Typography>
            <Typography variant="caption" display="block" fontSize={11}>
              SĐT: {toVietnameseCommonText(invoice.recipientPhone)}
            </Typography>
            {invoice.recipientAddress && (
              <Typography variant="caption" display="block" fontSize={11}>
                Địa chỉ: {toVietnameseCommonText(invoice.recipientAddress)}
              </Typography>
            )}
          </Box>

          <Divider sx={{ borderStyle: "dashed" }} />

          {/* Items */}
          <Box>
            <Typography
              variant="caption"
              fontWeight={700}
              fontSize={11}
              mb={0.5}
            >
              CHI TIẾT SẢN PHẨM
            </Typography>
            {invoice.items?.map((item, index) => (
              <Box
                key={`${item.productName}-${item.variantInfo}-${index}`}
                mb={0.75}
                pb={0.75}
                sx={{
                  borderBottom:
                    index === (invoice.items?.length || 0) - 1
                      ? "none"
                      : "1px dotted #d1d5db",
                }}
              >
                <Typography variant="caption" fontWeight={700} fontSize={11}>
                  {item.productName || "-"}
                </Typography>
                {item.variantInfo && (
                  <Typography
                    variant="caption"
                    display="block"
                    fontSize={10}
                    color="text.secondary"
                  >
                    Phân loại: {item.variantInfo}
                  </Typography>
                )}
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  spacing={1}
                  mt={0.25}
                >
                  <Typography variant="caption" fontSize={11}>
                    {item.quantity ?? 0} x {formatCurrency(item.unitPrice)}
                  </Typography>
                  <Typography variant="caption" fontWeight={700} fontSize={11}>
                    {formatCurrency(item.subtotal)}
                  </Typography>
                </Stack>
              </Box>
            ))}
          </Box>

          <Divider sx={{ borderStyle: "dashed" }} />

          {/* Totals */}
          <Box>
            <Stack direction="row" justifyContent="space-between" mb={0.5}>
              <Typography variant="caption" fontSize={11}>
                Tạm tính
              </Typography>
              <Typography variant="caption" fontWeight={600} fontSize={11}>
                {formatCurrency(invoice.subtotal)}
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" mb={0.5}>
              <Typography variant="caption" fontSize={11}>
                Giảm giá
              </Typography>
              <Typography variant="caption" fontWeight={600} fontSize={11}>
                {formatCurrency(invoice.discount)}
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption" fontSize={11}>
                Thuế
              </Typography>
              <Typography variant="caption" fontWeight={600} fontSize={11}>
                {formatCurrency(invoice.tax)}
              </Typography>
            </Stack>
          </Box>

          <Divider />

          <Stack direction="row" justifyContent="space-between">
            <Typography variant="subtitle1" fontWeight={800} fontSize={13}>
              TỔNG CỘNG
            </Typography>
            <Typography variant="subtitle1" fontWeight={800} fontSize={13}>
              {formatCurrency(invoice.total)}
            </Typography>
          </Stack>

          <Divider sx={{ borderStyle: "dashed" }} />

          {/* Payment Info */}
          <Box>
            <Typography variant="caption" display="block" fontSize={11}>
              <b>Thanh toán:</b>{" "}
              {toVietnamesePaymentMethod(invoice.paymentMethod)}
            </Typography>
            <Typography variant="caption" display="block" fontSize={11}>
              <b>Ghi chú:</b> {toVietnameseInvoiceNote(invoice.note)}
            </Typography>
          </Box>

          <Divider sx={{ borderStyle: "dashed" }} />

          {/* Footer */}
          <Box textAlign="center">
            <Typography variant="caption" display="block" fontSize={11}>
              Cảm ơn quý khách!
            </Typography>
            <Typography variant="caption" display="block" fontSize={11}>
              Hẹn gặp lại!
            </Typography>
          </Box>
        </Stack>
      </Box>
    );
  },
);

ReceiptTemplate.displayName = "ReceiptTemplate";
