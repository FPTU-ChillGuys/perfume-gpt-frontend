import { Box, Stack, Typography, Paper, Chip, Alert } from "@mui/material";
import { Visibility } from "@mui/icons-material";

interface RefundInfoSectionProps {
  isRefundRequired: boolean;
  refundAmount?: number;
  vnpTransactionNo?: string | null;
  refundBankName?: string | null;
  refundAccountName?: string | null;
  refundAccountNumber?: string | null;
  isRefunded?: boolean;
  status?: string;
  /** Số tiền cọc đã thanh toán của đơn (dùng để hiển thị cảnh báo mất cọc khi hủy) */
  paidDepositAmount?: number;
}

const fmt = (value?: number | null) => {
  if (!value) return "0 đ";
  return `${new Intl.NumberFormat("vi-VN").format(value)} đ`;
};

export const RefundInfoSection = ({
  isRefundRequired,
  refundAmount,
  vnpTransactionNo,
  refundBankName,
  refundAccountName,
  refundAccountNumber,
  isRefunded,
  status,
  paidDepositAmount = 0,
}: RefundInfoSectionProps) => {
  const getRefundStatusChip = () => {
    if (!isRefundRequired) return null;

    if (isRefunded) {
      return (
        <Chip
          label="Đã hoàn tiền"
          color="success"
          variant="filled"
          size="small"
          sx={{ height: 28 }}
        />
      );
    }

    if (status === "Approved") {
      return (
        <Chip
          label="Đang chờ xử lý"
          color="warning"
          variant="filled"
          size="small"
          sx={{ height: 28 }}
        />
      );
    }

    return null;
  };

  // Case 1: Không cần hoàn tiền
  if (!isRefundRequired) {
    const hasDepositForfeited = (paidDepositAmount ?? 0) > 0;
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          borderRadius: 2,
          bgcolor: hasDepositForfeited ? "#fff8e1" : "grey.50",
          border: "1px solid",
          borderColor: hasDepositForfeited ? "warning.light" : "grey.200",
        }}
      >
        <Typography
          variant="subtitle2"
          fontWeight={700}
          mb={1.5}
          color={hasDepositForfeited ? "warning.dark" : "text.secondary"}
        >
          Thông tin Hoàn tiền
        </Typography>

        {hasDepositForfeited ? (
          <>
            <Typography variant="body2" color="warning.dark" fontWeight={600} mb={0.5}>
              Tiền cọc bị khấu trừ theo chính sách hủy đơn
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Đơn hàng đã được xuất kho và đóng gói. Theo chính sách của PerfumeGPT, khoản tiền cọc{" "}
              <b>{fmt(paidDepositAmount)}</b> sẽ được giữ lại làm phí bồi thường vật tư đóng gói và xử lý đơn hàng. Không phát sinh hoàn tiền thêm.
            </Typography>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Đơn hàng chưa thanh toán. Không phát sinh hoàn tiền.
          </Typography>
        )}
      </Paper>
    );
  }

  // Case 2: Hoàn qua cổng thanh toán (VNPay/MoMo)
  if (vnpTransactionNo) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          borderRadius: 2,
          bgcolor: "grey.50",
          border: "1px solid",
          borderColor: "grey.200",
        }}
      >
        <Stack spacing={1.5}>
          <Typography
            variant="subtitle2"
            fontWeight={700}
            color="text.secondary"
          >
            Thông tin Hoàn tiền
          </Typography>

          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="body2" color="text.secondary">
              Số tiền hoàn:
            </Typography>
            <Typography
              variant="subtitle2"
              fontWeight={700}
              color="error.main"
              sx={{ whiteSpace: "nowrap", ml: 1 }}
            >
              {fmt(refundAmount)}
            </Typography>
          </Box>

          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="body2" color="text.secondary">
              Phương thức:
            </Typography>
            <Typography
              variant="body2"
              fontWeight={600}
              sx={{ whiteSpace: "nowrap", ml: 1 }}
            >
              Hoàn trả tự động qua{" "}
              {vnpTransactionNo?.startsWith("VNP") ? "VNPay" : "MoMo"}
            </Typography>
          </Box>

          {getRefundStatusChip() && (
            <Box display="flex" justifyContent="flex-end">
              {getRefundStatusChip()}
            </Box>
          )}
        </Stack>
      </Paper>
    );
  }

  // Case 3: Hoàn thủ công qua ngân hàng
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: "grey.50",
        border: "1px solid",
        borderColor: "grey.200",
      }}
    >
      <Stack spacing={1.5}>
        <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
          Thông tin Hoàn tiền
        </Typography>

        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="text.secondary">
            Số tiền hoàn:
          </Typography>
          <Typography
            variant="subtitle2"
            fontWeight={700}
            color="error.main"
            sx={{ whiteSpace: "nowrap", ml: 1 }}
          >
            {fmt(refundAmount)}
          </Typography>
        </Box>

        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="text.secondary">
            Phương thức:
          </Typography>
          <Typography
            variant="body2"
            fontWeight={600}
            sx={{ whiteSpace: "nowrap", ml: 1 }}
          >
            Chuyển khoản ngân hàng
          </Typography>
        </Box>

        <Box
          sx={{
            p: 1.5,
            bgcolor: "background.paper",
            borderRadius: 1,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Stack spacing={0.75}>
            <Box display="flex" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary">
                Ngân hàng:
              </Typography>
              <Typography variant="caption" fontWeight={600}>
                {refundBankName || "N/A"}
              </Typography>
            </Box>
            <Box display="flex" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary">
                STK:
              </Typography>
              <Typography
                variant="caption"
                fontWeight={600}
                sx={{ fontFamily: "monospace" }}
              >
                {refundAccountNumber || "N/A"}
              </Typography>
            </Box>
            <Box display="flex" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary">
                Chủ TK:
              </Typography>
              <Typography variant="caption" fontWeight={600}>
                {refundAccountName || "N/A"}
              </Typography>
            </Box>
          </Stack>
        </Box>

        {getRefundStatusChip() && (
          <Box display="flex" justifyContent="flex-end">
            {getRefundStatusChip()}
          </Box>
        )}
      </Stack>
    </Paper>
  );
};
