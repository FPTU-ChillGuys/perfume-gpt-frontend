import { forwardRef } from "react";
import { Box, Divider, Stack, Typography } from "@mui/material";
import type { OrderInvoice } from "@/services/orderService";
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

  if (normalized === "cashondelivery") return "Thanh toán khi nhận hàng";
  if (normalized === "cashinstore") return "Thanh toán tiền mặt tại quầy";
  if (normalized === "vnpay") return "Thanh toán qua VNPay";
  if (normalized === "momo") return "Thanh toán qua MoMo";
  if (normalized === "externalbanktransfer") return "Chuyển khoản ngân hàng";
  if (normalized === "payos") return "Thanh toán qua PayOS";

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

interface OrderInvoicePrintProps {
  invoice: OrderInvoice | null;
}

export const OrderInvoicePrint = forwardRef<
  HTMLDivElement,
  OrderInvoicePrintProps
>(function OrderInvoicePrint({ invoice }, ref) {
  if (!invoice) {
    return null;
  }

  return (
    <Box
      ref={ref}
      sx={{
        display: "none",
        "@media print": {
          display: "block",
          color: "#111827",
          p: 3,
          bgcolor: "#ffffff",
          fontFamily: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
        },
      }}
    >
      <Box
        sx={{
          "@media print": {
            maxWidth: "190mm",
            mx: "auto",
          },
        }}
      >
        <Stack spacing={0.5} mb={2}>
          <Typography variant="h5" fontWeight={800}>
            HÓA ĐƠN BÁN HÀNG
          </Typography>
          <Typography variant="body2">Mã đơn: {invoice.code || "-"}</Typography>
          <Typography variant="body2">
            Ngày đặt: {formatDate(invoice.orderDate) || "-"}
          </Typography>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 1.5,
            mb: 2,
          }}
        >
          <Typography variant="body2">
            <b>Trạng thái:</b> {toVietnameseOrderStatus(invoice.orderStatus)}
          </Typography>
          <Typography variant="body2">
            <b>Nhân viên:</b> {toVietnameseCommonText(invoice.staffName)}
          </Typography>
          <Typography variant="body2">
            <b>Khách hàng:</b> {toVietnameseCustomerName(invoice.customerName)}
          </Typography>
          <Typography variant="body2">
            <b>Số điện thoại:</b>{" "}
            {toVietnameseCommonText(invoice.recipientPhone)}
          </Typography>
          <Typography variant="body2" sx={{ gridColumn: "1 / -1" }}>
            <b>Địa chỉ:</b> {toVietnameseCommonText(invoice.recipientAddress)}
          </Typography>
        </Box>

        <Box
          sx={{
            border: "1px solid #d1d5db",
            borderRadius: 1,
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "2.2fr 1.5fr 0.8fr 1.2fr 1.2fr",
              px: 1.5,
              py: 1,
              bgcolor: "#f3f4f6",
              borderBottom: "1px solid #d1d5db",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            <Box>Sản phẩm</Box>
            <Box>Phân loại</Box>
            <Box textAlign="center">SL</Box>
            <Box textAlign="right">Đơn giá</Box>
            <Box textAlign="right">Tạm tính</Box>
          </Box>

          {(invoice.items || []).map((item, index) => (
            <Box
              key={`${item.productName}-${item.variantInfo}-${index}`}
              sx={{
                display: "grid",
                gridTemplateColumns: "2.2fr 1.5fr 0.8fr 1.2fr 1.2fr",
                px: 1.5,
                py: 1,
                borderBottom:
                  index === (invoice.items?.length || 0) - 1
                    ? "none"
                    : "1px solid #e5e7eb",
                fontSize: 13,
              }}
            >
              <Box>{item.productName || "-"}</Box>
              <Box>{item.variantInfo || "-"}</Box>
              <Box textAlign="center">{item.quantity ?? 0}</Box>
              <Box textAlign="right">{formatCurrency(item.unitPrice)}</Box>
              <Box textAlign="right">{formatCurrency(item.subtotal)}</Box>
            </Box>
          ))}
        </Box>

        <Box sx={{ mt: 2, ml: "auto", width: "min(100%, 320px)" }}>
          <Stack spacing={0.75}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2">Tạm tính</Typography>
              <Typography variant="body2" fontWeight={600}>
                {formatCurrency(invoice.subtotal)}
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2">Giảm giá</Typography>
              <Typography variant="body2" fontWeight={600}>
                {formatCurrency(invoice.discount)}
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2">Thuế</Typography>
              <Typography variant="body2" fontWeight={600}>
                {formatCurrency(invoice.tax)}
              </Typography>
            </Stack>
            <Divider />
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="subtitle1" fontWeight={800}>
                Tổng cộng
              </Typography>
              <Typography variant="subtitle1" fontWeight={800}>
                {formatCurrency(invoice.total)}
              </Typography>
            </Stack>
          </Stack>
        </Box>

        <Stack spacing={0.5} mt={2}>
          <Typography variant="body2">
            <b>Thanh toán:</b>{" "}
            {toVietnamesePaymentMethod(invoice.paymentMethod)}
          </Typography>
          <Typography variant="body2">
            <b>Ghi chú:</b> {toVietnameseInvoiceNote(invoice.note)}
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
});
