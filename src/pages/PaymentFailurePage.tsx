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
  Alert,
} from "@mui/material";
import { Cancel } from "@mui/icons-material";
import { MainLayout } from "@/layouts/MainLayout";

const formatCurrency = (value?: string | number) => {
  const numValue =
    typeof value === "string" ? parseInt(value) / 100 : Number(value ?? 0);
  return new Intl.NumberFormat("vi-VN").format(numValue) + "đ";
};

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return "";
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  const hour = dateStr.substring(8, 10);
  const minute = dateStr.substring(10, 12);
  const second = dateStr.substring(12, 14);
  return `${day}/${month}/${year} ${hour}:${minute}:${second}`;
};

const getErrorMessage = (responseCode?: string | null) => {
  const errorMessages: Record<string, string> = {
    "07": "Giao dịch bị nghi ngờ gian lận",
    "09": "Thẻ chưa đăng ký dịch vụ Internet Banking",
    "10": "Xác thực thông tin thẻ không chính xác quá số lần quy định",
    "11": "Đã hết hạn chờ thanh toán",
    "12": "Thẻ bị khóa",
    "13": "Sai mật khẩu xác thực giao dịch",
    "24": "Khách hàng hủy giao dịch",
    "51": "Tài khoản không đủ số dư",
    "65": "Tài khoản đã vượt quá hạn mức giao dịch trong ngày",
    "75": "Ngân hàng thanh toán đang bảo trì",
    "79": "Giao dịch vượt quá số lần thanh toán cho phép",
  };

  return (
    errorMessages[responseCode || ""] ||
    "Giao dịch không thành công. Vui lòng thử lại sau."
  );
};

export const PaymentFailurePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const orderId = searchParams.get("vnp_TxnRef") || searchParams.get("orderId");
  const amount = searchParams.get("vnp_Amount");
  const bankCode = searchParams.get("vnp_BankCode");
  const payDate = searchParams.get("vnp_PayDate");
  const responseCode = searchParams.get("vnp_ResponseCode");
  const transactionNo = searchParams.get("vnp_TransactionNo");
  const orderInfo = searchParams.get("vnp_OrderInfo");

  const errorMessage = getErrorMessage(responseCode);

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
          {/* Error Icon */}
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 80,
              height: 80,
              borderRadius: "50%",
              bgcolor: "error.main",
              mb: 3,
            }}
          >
            <Cancel sx={{ fontSize: 50, color: "white" }} />
          </Box>

          {/* Error Message */}
          <Typography variant="h4" fontWeight={700} color="error.main" mb={1}>
            Thanh toán thất bại
          </Typography>
          <Typography variant="body1" color="text.secondary" mb={2}>
            {errorMessage}
          </Typography>

          {/* Error Alert */}
          <Alert severity="error" sx={{ mb: 4, textAlign: "left" }}>
            <Typography variant="body2" fontWeight={500}>
              Mã lỗi: {responseCode || "Không xác định"}
            </Typography>
            <Typography variant="body2" mt={1}>
              Đơn hàng của bạn chưa được thanh toán. Vui lòng thử lại hoặc chọn
              phương thức thanh toán khác.
            </Typography>
          </Alert>

          <Divider sx={{ my: 3 }} />

          {/* Payment Details */}
          <Box sx={{ textAlign: "left", maxWidth: 500, mx: "auto" }}>
            <Typography variant="h6" fontWeight={600} mb={2}>
              Thông tin giao dịch
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
              onClick={() => navigate("/checkout")}
              sx={{ minWidth: 180 }}
            >
              Thử lại
            </Button>
            <Button
              variant="outlined"
              color="primary"
              size="large"
              onClick={() => navigate("/")}
              sx={{ minWidth: 180 }}
            >
              Về trang chủ
            </Button>
          </Box>

          {/* Support Info */}
          <Box mt={4} p={2} bgcolor="grey.50" borderRadius={1}>
            <Typography
              variant="body2"
              color="text.secondary"
              fontWeight={500}
              mb={1}
            >
              Cần hỗ trợ?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Nếu bạn gặp vấn đề trong quá trình thanh toán, vui lòng liên hệ
              với chúng tôi qua hotline hoặc email để được hỗ trợ.
            </Typography>
          </Box>
        </Paper>
      </Container>
    </MainLayout>
  );
};
