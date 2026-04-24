import { Box, Divider, Stack, Typography } from "@mui/material";
import type { OrderInvoice } from "@/services/orderService";
import { forwardRef } from "react";
import { formatDateTimeCompactVN } from "@/utils/dateTime";

const formatCurrency = (value?: number | null) =>
  `${new Intl.NumberFormat("vi-VN").format(Number(value ?? 0))} đ`;

const formatDate = (value?: string | null) => formatDateTimeCompactVN(value);

const toVietnameseCommonText = (value?: string | null) => {
  const raw = (value || "").trim();
  if (!raw) return "-";
  return raw.toLowerCase() === "n/a" ? "Không có" : raw;
};

const getValidPhone = (recipientPhone?: string | null, guestPhone?: string | null) => {
  // Ưu tiên guestPhone nếu có giá trị hợp lệ
  if (guestPhone && guestPhone.trim() && guestPhone.toLowerCase() !== "n/a") {
    return guestPhone.trim();
  }
  // Fallback recipientPhone nếu có giá trị hợp lệ
  if (recipientPhone && recipientPhone.trim() && recipientPhone.toLowerCase() !== "n/a") {
    return recipientPhone.trim();
  }
  return null;
};

const toVietnameseOrderStatus = (value?: string | null) => {
  const normalized = (value || "").trim().toLowerCase();
  const statusMap: Record<string, string> = {
    pending: "Chờ xử lý",
    preparing: "Đang chuẩn bị",
    readytopick: "Chờ lấy hàng",
    delivering: "Đang giao hàng",
    delivered: "Đã giao hàng",
    cancelled: "Đã hủy",
    returning: "Đang trả hàng",
    returned: "Đã trả hàng",
    partial_returned: "Trả một phần",
  };
  return statusMap[normalized] || value || "-";
};

const toVietnamesePaymentMethod = (value?: string | null) => {
  const normalized = (value || "").trim().toLowerCase();
  const methodMap: Record<string, string> = {
    cashondelivery: "COD",
    cashinstore: "Tiền mặt",
    vnpay: "VNPay",
    momo: "MoMo",
    externalbanktransfer: "Chuyển khoản",
    payos: "PayOS",
  };
  return methodMap[normalized] || value || "-";
};

const toVietnameseCustomerName = (value?: string | null) => {
  const raw = (value || "").trim();
  return !raw || raw.toLowerCase() === "guest customer" ? "Khách lẻ" : raw;
};

const toVietnameseInvoiceNote = (value?: string | null) => {
  if (!value) return "-";
  return value.trim().toLowerCase() === "physical in-store invoice."
    ? "Hóa đơn bán tại cửa hàng"
    : value;
};

interface ReceiptTemplateProps {
  invoice: OrderInvoice | null;
  guestPhone?: string | null;
}

export const ReceiptTemplate = forwardRef<HTMLDivElement, ReceiptTemplateProps>(
  ({ invoice, guestPhone }, ref) => {
    if (!invoice) return null;

    const validPhone = getValidPhone(invoice.recipientPhone, guestPhone);

    return (
      <Box
        ref={ref}
        sx={{
          display: "none",
          "@media print": {
            display: "block",
            width: "72mm", // Cố định chiều rộng tương thích máy in K80
            margin: "0 auto",
            padding: "2mm",
            color: "#000",
            bgcolor: "#fff",
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: "12px",
            lineHeight: 1.4,
            "@page": { margin: 0 },
          },
        }}
      >
        {/* HEADER HÓA ĐƠN */}
        <Stack spacing={0.5} mb={2} alignItems="center">
          <Typography fontWeight={800} fontSize="18px">
            PERFUMEGPT
          </Typography>
          <Typography fontWeight={700} fontSize="14px">
            HÓA ĐƠN BÁN HÀNG
          </Typography>
          <Typography fontSize="12px">Mã ĐH: {invoice.code || "-"}</Typography>
          <Typography fontSize="12px">
            Ngày: {formatDate(invoice.orderDate)}
          </Typography>
        </Stack>

        <Divider sx={{ mb: 1, borderStyle: "dashed", borderColor: "#000" }} />

        {/* THÔNG TIN KHÁCH/NHÂN VIÊN */}
        <Stack spacing={0.5} mb={1.5} sx={{ fontSize: "12px" }}>
          <Box>
            <b>Trạng thái:</b> {toVietnameseOrderStatus(invoice.orderStatus)}
          </Box>
          <Box>
            <b>Thu ngân:</b> {toVietnameseCommonText(invoice.staffName)}
          </Box>
          <Box>
            <b>Khách hàng:</b> {toVietnameseCustomerName(invoice.customerName)}
          </Box>
          {validPhone && (
            <Box>
              <b>SĐT:</b> {validPhone}
            </Box>
          )}
          {invoice.recipientAddress && (
            <Box>
              <b>Địa chỉ:</b> {toVietnameseCommonText(invoice.recipientAddress)}
            </Box>
          )}
        </Stack>

        <Divider sx={{ mb: 1.5, borderStyle: "dashed", borderColor: "#000" }} />

        {/* DANH SÁCH SẢN PHẨM */}
        <Box sx={{ mb: 2, fontSize: "12px" }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              fontWeight: 700,
              borderBottom: "1px solid #000",
              pb: 0.5,
              mb: 1,
            }}
          >
            <Box>Sản phẩm</Box>
            <Box>Thành tiền</Box>
          </Box>

          {(invoice.items || []).map((item, index) => (
            <Box
              key={`${item.productName}-${item.variantInfo}-${index}`}
              sx={{
                mb: 1,
                pb: 1,
                borderBottom:
                  index === (invoice.items?.length || 0) - 1
                    ? "none"
                    : "1px dotted #888",
              }}
            >
              {/* Dòng 1: Tên + Phân loại */}
              <Box sx={{ fontWeight: 600, mb: 0.5 }}>
                {item.productName || "-"}{" "}
                {item.variantInfo ? `(${item.variantInfo})` : ""}
              </Box>
              {/* Dòng 2: SL x Đơn giá = Tạm tính */}
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Box>
                  {item.quantity ?? 0} x {formatCurrency(item.unitPrice)}
                </Box>
                <Box fontWeight={600}>{formatCurrency(item.subtotal)}</Box>
              </Box>
            </Box>
          ))}
        </Box>

        {/* TỔNG TIỀN */}
        <Stack spacing={0.5} sx={{ mb: 2, fontSize: "12px" }}>
          <Stack direction="row" justifyContent="space-between">
            <Box>Tạm tính</Box>
            <Box>{formatCurrency(invoice.subtotal)}</Box>
          </Stack>
          {(invoice.shippingFee ?? 0) > 0 && (
            <Stack direction="row" justifyContent="space-between">
              <Box>Phí vận chuyển</Box>
              <Box>{formatCurrency(invoice.shippingFee)}</Box>
            </Stack>
          )}
          <Stack direction="row" justifyContent="space-between">
            <Box>Giảm giá</Box>
            <Box>{formatCurrency(invoice.discount)}</Box>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Box>Thuế</Box>
            <Box>{formatCurrency(invoice.tax)}</Box>
          </Stack>

          <Divider
            sx={{ my: 0.5, borderStyle: "dashed", borderColor: "#000" }}
          />

          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            mt={0.5}
          >
            <Typography fontSize="14px" fontWeight={800}>
              TỔNG CỘNG
            </Typography>
            <Typography fontSize="16px" fontWeight={800}>
              {formatCurrency(invoice.total)}
            </Typography>
          </Stack>

          {/* THÔNG TIN ĐẶT CỌC — chỉ hiện khi có đặt cọc */}
          {(invoice.remainingAmount ?? 0) > 0 && (
            <>
              <Divider
                sx={{ my: 0.5, borderStyle: "dashed", borderColor: "#000" }}
              />

              <Stack direction="row" justifyContent="space-between">
                <Box>Đã đặt cọc</Box>
                <Box sx={{ color: "#000" }}>
                  - {formatCurrency(invoice.depositeAmount)}
                </Box>
              </Stack>

              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{
                  mt: 0.5,
                  pt: 0.5,
                  borderTop: "2px solid #000",
                }}
              >
                <Typography fontSize="13px" fontWeight={800}>
                  CÒN LẠI
                </Typography>
                <Typography fontSize="16px" fontWeight={800}>
                  {formatCurrency(invoice.remainingAmount)}
                </Typography>
              </Stack>
            </>
          )}
        </Stack>

        <Divider sx={{ mb: 1.5, borderStyle: "dashed", borderColor: "#000" }} />

        {/* FOOTER & GHI CHÚ */}
        <Stack spacing={0.5} sx={{ fontSize: "12px", textAlign: "center" }}>
          <Box>
            <b>Thanh toán:</b>{" "}
            {toVietnamesePaymentMethod(invoice.paymentMethod)}
          </Box>
          <Box>Ghi chú: {toVietnameseInvoiceNote(invoice.note)}</Box>
          <Box sx={{ mt: 1.5, fontWeight: 600, fontStyle: "italic" }}>
            Cảm ơn quý khách & Hẹn gặp lại!
          </Box>
        </Stack>
      </Box>
    );
  },
);

ReceiptTemplate.displayName = "ReceiptTemplate";
