import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Divider,
  CircularProgress,
} from "@mui/material";
import { CheckCircle } from "@mui/icons-material";
import { MainLayout } from "@/layouts/MainLayout";

const formatCurrency = (value?: string | number) => {
  const numValue =
    typeof value === "string" ? parseInt(value) / 100 : Number(value ?? 0);
  return new Intl.NumberFormat("vi-VN").format(numValue) + "đ";
};

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return "";
  // VnPay format: yyyyMMddHHmmss
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  const hour = dateStr.substring(8, 10);
  const minute = dateStr.substring(10, 12);
  const second = dateStr.substring(12, 14);
  return `${day}/${month}/${year} ${hour}:${minute}:${second}`;
};

export const PaymentSuccessPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const orderId = searchParams.get("vnp_TxnRef") || searchParams.get("orderId");
  const amount = searchParams.get("vnp_Amount");
  const bankCode = searchParams.get("vnp_BankCode");
  const cardType = searchParams.get("vnp_CardType");
  const payDate = searchParams.get("vnp_PayDate");
  const transactionNo = searchParams.get("vnp_TransactionNo");
  const orderInfo = searchParams.get("vnp_OrderInfo");

  if (isLoading) {
    return (
      <MainLayout>
        <Container maxWidth="md" sx={{ py: 8 }}>
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="50vh"
          >
            <CircularProgress />
          </Box>
        </Container>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Paper
          sx={{
            p: 4,
            textAlign: "center",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          }}
        >
          {/* Success Icon */}
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 80,
              height: 80,
              borderRadius: "50%",
              bgcolor: "success.main",
              mb: 3,
            }}
          >
            <CheckCircle sx={{ fontSize: 50, color: "white" }} />
          </Box>

          {/* Success Message */}
          <Typography variant="h4" fontWeight={700} color="success.main" mb={1}>
            Thanh toán thành công!
          </Typography>
          <Typography variant="body1" color="text.secondary" mb={4}>
            Cảm ơn bạn đã đặt hàng. Đơn hàng của bạn đã được xử lý thành công.
          </Typography>

          <Divider sx={{ my: 3 }} />

          {/* Payment Details */}
          <Box sx={{ textAlign: "left", maxWidth: 500, mx: "auto" }}>
            <Typography variant="h6" fontWeight={600} mb={2}>
              Thông tin thanh toán
            </Typography>

            {orderId && (
              <Box display="flex" justifyContent="space-between" mb={1.5}>
                <Typography color="text.secondary">Mã đơn hàng:</Typography>
                <Typography fontWeight={600}>{orderId}</Typography>
              </Box>
            )}

            {amount && (
              <Box display="flex" justifyContent="space-between" mb={1.5}>
                <Typography color="text.secondary">Số tiền:</Typography>
                <Typography fontWeight={600} color="error">
                  {formatCurrency(amount)}
                </Typography>
              </Box>
            )}

            {payDate && (
              <Box display="flex" justifyContent="space-between" mb={1.5}>
                <Typography color="text.secondary">Thời gian:</Typography>
                <Typography fontWeight={600}>
                  {formatDateTime(payDate)}
                </Typography>
              </Box>
            )}

            {bankCode && (
              <Box display="flex" justifyContent="space-between" mb={1.5}>
                <Typography color="text.secondary">Ngân hàng:</Typography>
                <Typography fontWeight={600}>{bankCode}</Typography>
              </Box>
            )}

            {cardType && (
              <Box display="flex" justifyContent="space-between" mb={1.5}>
                <Typography color="text.secondary">Loại thẻ:</Typography>
                <Typography fontWeight={600}>{cardType}</Typography>
              </Box>
            )}

            {transactionNo && (
              <Box display="flex" justifyContent="space-between" mb={1.5}>
                <Typography color="text.secondary">Mã giao dịch:</Typography>
                <Typography fontWeight={600}>{transactionNo}</Typography>
              </Box>
            )}

            {orderInfo && (
              <Box display="flex" justifyContent="space-between" mb={1.5}>
                <Typography color="text.secondary">Nội dung:</Typography>
                <Typography fontWeight={600}>{orderInfo}</Typography>
              </Box>
            )}
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Action Buttons */}
          <Box display="flex" gap={2} justifyContent="center" flexWrap="wrap">
            <Button
              variant="contained"
              color="error"
              size="large"
              onClick={() => navigate("/")}
              sx={{ minWidth: 180 }}
            >
              Về trang chủ
            </Button>
            <Button
              variant="outlined"
              color="primary"
              size="large"
              onClick={() => navigate("/profile")}
              sx={{ minWidth: 180 }}
            >
              Xem đơn hàng
            </Button>
          </Box>

          {/* Additional Info */}
          <Box mt={4} p={2} bgcolor="grey.50" borderRadius={1}>
            <Typography variant="body2" color="text.secondary">
              Chúng tôi đã gửi email xác nhận đến địa chỉ email của bạn.
              <br />
              Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ với chúng tôi.
            </Typography>
          </Box>
        </Paper>
      </Container>
    </MainLayout>
  );
};
