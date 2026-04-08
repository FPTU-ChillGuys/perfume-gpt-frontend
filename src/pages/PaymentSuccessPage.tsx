import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Divider,
  CircularProgress,
  Stack,
} from "@mui/material";
import { CheckCircle } from "@mui/icons-material";
import { MainLayout } from "@/layouts/MainLayout";
import { POS_HUB_URL, useSignalR } from "@/hooks/useSignalR";

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

const extractPosSessionIdFromOrderInfo = (orderInfo?: string | null) => {
  const decoded = decodeURIComponent(orderInfo || "").trim();
  if (!decoded) return "";

  const match = decoded.match(/PosSessionId\s*:\s*([A-Za-z0-9_-]+)/i);
  return match?.[1]?.trim() || "";
};

export const PaymentSuccessPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const isPaymentSignalSentRef = useRef(false);

  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const orderId = searchParams.get("orderId");
  const paymentId =
    searchParams.get("paymentId") || searchParams.get("vnp_TxnRef");
  const orderInfo = searchParams.get("vnp_OrderInfo");
  const posSessionIdFromOrderInfo = extractPosSessionIdFromOrderInfo(orderInfo);
  const posSessionId =
    searchParams.get("sessionId") ||
    searchParams.get("posSessionId") ||
    posSessionIdFromOrderInfo;
  const responseCode = searchParams.get("vnp_ResponseCode");
  const source = searchParams.get("source");
  const isCheckoutSuccess = source === "checkout";
  const amount = searchParams.get("vnp_Amount");
  const bankCode = searchParams.get("vnp_BankCode");
  const cardType = searchParams.get("vnp_CardType");
  const payDate = searchParams.get("vnp_PayDate");
  const transactionNo = searchParams.get("vnp_TransactionNo");

  const { isConnected, notifyPaymentSuccess } = useSignalR({
    hubUrl: POS_HUB_URL,
    sessionId: posSessionId,
  });

  useEffect(() => {
    const isSuccess = !responseCode || responseCode === "00";

    if (
      !isSuccess ||
      !posSessionId ||
      !orderId ||
      isPaymentSignalSentRef.current
    ) {
      return;
    }

    if (!isConnected) {
      return;
    }

    isPaymentSignalSentRef.current = true;

    void notifyPaymentSuccess({
      orderId,
      paymentId: paymentId || undefined,
      status: "Success",
      message: "Thanh toán thành công",
    }).catch(() => {
      isPaymentSignalSentRef.current = false;
    });
  }, [
    isConnected,
    notifyPaymentSuccess,
    orderId,
    paymentId,
    posSessionId,
    responseCode,
  ]);

  if (isLoading) {
    return (
      <MainLayout>
        <Container maxWidth="lg" sx={{ py: { xs: 2, md: 3 } }}>
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="60vh"
          >
            <CircularProgress />
          </Box>
        </Container>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Container
        maxWidth="lg"
        sx={{
          py: { xs: 2, md: 3 },
          minHeight: { md: "calc(100vh - 104px)" },
          display: "flex",
          alignItems: { md: "flex-start" },
          justifyContent: "center",
        }}
      >
        <Paper
          sx={{
            p: { xs: 2, sm: 3 },
            textAlign: "left",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            width: "100%",
            maxWidth: 760,
          }}
        >
          <Stack spacing={2} alignItems="stretch">
            <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  bgcolor: "success.main",
                  flexShrink: 0,
                  position: "relative",
                  animation: "successPop 520ms ease-out",
                  "@keyframes successPop": {
                    "0%": {
                      transform: "scale(0.5)",
                      opacity: 0,
                    },
                    "65%": {
                      transform: "scale(1.08)",
                      opacity: 1,
                    },
                    "100%": {
                      transform: "scale(1)",
                    },
                  },
                  "&::after": {
                    content: '""',
                    position: "absolute",
                    inset: -6,
                    borderRadius: "50%",
                    border: "2px solid",
                    borderColor: "success.light",
                    opacity: 0,
                    animation: "successPulse 900ms ease-out 220ms",
                  },
                  "@keyframes successPulse": {
                    "0%": {
                      transform: "scale(0.75)",
                      opacity: 0.6,
                    },
                    "100%": {
                      transform: "scale(1.35)",
                      opacity: 0,
                    },
                  },
                }}
              >
                <CheckCircle sx={{ fontSize: 32, color: "white" }} />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={700} color="success.main">
                  {isCheckoutSuccess
                    ? "Đặt hàng thành công"
                    : "Thanh toán thành công"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Đơn hàng đã được ghi nhận và đang được xử lý.
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ mb: 2 }} />

            <Typography variant="subtitle1" fontWeight={700} mb={1.5}>
              {isCheckoutSuccess
                ? "Thông tin đơn hàng"
                : "Thông tin thanh toán"}
            </Typography>

            {orderId && (
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography color="text.secondary">Mã đơn hàng:</Typography>
                <Typography fontWeight={600}>{orderId}</Typography>
              </Box>
            )}

            {amount && (
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography color="text.secondary">Số tiền:</Typography>
                <Typography fontWeight={700} color="error">
                  {formatCurrency(amount)}
                </Typography>
              </Box>
            )}

            {payDate && (
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography color="text.secondary">Thời gian:</Typography>
                <Typography fontWeight={600}>
                  {formatDateTime(payDate)}
                </Typography>
              </Box>
            )}

            {bankCode && (
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography color="text.secondary">Ngân hàng:</Typography>
                <Typography fontWeight={600}>{bankCode}</Typography>
              </Box>
            )}

            {cardType && (
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography color="text.secondary">Loại thẻ:</Typography>
                <Typography fontWeight={600}>{cardType}</Typography>
              </Box>
            )}

            {transactionNo && (
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography color="text.secondary">Mã giao dịch:</Typography>
                <Typography fontWeight={600}>{transactionNo}</Typography>
              </Box>
            )}

            {orderInfo && (
              <Box display="flex" mb={1} gap={1.5}>
                <Typography
                  color="text.secondary"
                  sx={{
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                  }}
                >
                  Nội dung:
                </Typography>
                <Typography
                  fontWeight={600}
                  sx={{
                    wordBreak: "break-word",
                    whiteSpace: "normal",
                    textAlign: "right",
                    flex: 1,
                    fontSize: 14,
                  }}
                >
                  {decodeURIComponent(orderInfo)}
                </Typography>
              </Box>
            )}

            <Box
              sx={{
                p: 2,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                bgcolor: "grey.50",
                mb: 2,
              }}
            >
              <Typography variant="subtitle2" fontWeight={700} mb={0.75}>
                Xác nhận thành công
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Vui lòng theo dõi trạng thái đơn hàng tại trang đơn mua để cập
                nhật tiến trình giao hàng.
              </Typography>
            </Box>

            <Stack spacing={1.25}>
              <Button
                variant="contained"
                color="error"
                size="large"
                onClick={() => navigate("/")}
                fullWidth
                sx={{ minHeight: 44 }}
              >
                Tiếp tục mua sắm
              </Button>
              <Button
                variant="outlined"
                color="primary"
                size="large"
                onClick={() =>
                  navigate(orderId ? `/my-orders/${orderId}` : "/my-orders")
                }
                fullWidth
                sx={{ minHeight: 44 }}
              >
                Xem chi tiết đơn hàng
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Container>
    </MainLayout>
  );
};
