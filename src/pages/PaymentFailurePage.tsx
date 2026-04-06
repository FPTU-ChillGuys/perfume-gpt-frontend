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
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel,
  Stack,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { Cancel } from "@mui/icons-material";
import { MainLayout } from "@/layouts/MainLayout";
import { orderService } from "@/services/orderService";
import type { PaymentMethod } from "@/types/checkout";
import { useToast } from "@/hooks/useToast";
import codIcon from "@/assets/cod.png";
import storeIcon from "@/assets/store.png";
import vnpayIcon from "@/assets/vnpay.jpg";
import momoIcon from "@/assets/momo.png";

type DeliveryMethod = "Delivery" | "PickupInStore";

const normalizePaymentMethod = (
  value?: string | null,
): PaymentMethod | null => {
  switch ((value || "").toLowerCase()) {
    case "cashondelivery":
    case "cod":
      return "CashOnDelivery";
    case "cashinstore":
    case "store":
      return "CashInStore";
    case "vnpay":
      return "VnPay";
    case "momo":
      return "Momo";
    default:
      return null;
  }
};

const inferGatewayPaymentMethod = (
  params: URLSearchParams,
): PaymentMethod | null => {
  if (
    params.has("vnp_ResponseCode") ||
    params.has("vnp_TransactionNo") ||
    params.has("vnp_TxnRef")
  ) {
    return "VnPay";
  }

  if (
    params.has("partnerCode") ||
    params.has("resultCode") ||
    params.has("transId")
  ) {
    return "Momo";
  }

  return null;
};

const resolveInitialPaymentMethod = (
  params: URLSearchParams,
  deliveryMethod: DeliveryMethod,
): PaymentMethod => {
  const queryMethod =
    normalizePaymentMethod(params.get("paymentMethod")) ||
    normalizePaymentMethod(params.get("method")) ||
    normalizePaymentMethod(params.get("originalPaymentMethod")) ||
    normalizePaymentMethod(params.get("originalMethod"));

  if (queryMethod) {
    return queryMethod;
  }

  const inferredMethod = inferGatewayPaymentMethod(params);
  if (inferredMethod) {
    return inferredMethod;
  }

  return deliveryMethod === "PickupInStore" ? "CashInStore" : "CashOnDelivery";
};

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

const PAYMENT_METHODS: {
  value: PaymentMethod;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    value: "CashOnDelivery",
    label: "Thanh toán khi nhận hàng",
    description: "Thanh toán bằng tiền mặt khi nhận hàng",
    icon: codIcon,
  },
  {
    value: "CashInStore",
    label: "Thanh toán tại cửa hàng",
    description: "Thanh toán trực tiếp tại cửa hàng",
    icon: storeIcon,
  },
  {
    value: "VnPay",
    label: "VNPay",
    description: "Thanh toán qua VNPay",
    icon: vnpayIcon,
  },
  {
    value: "Momo",
    label: "MoMo",
    description: "Thanh toán qua MoMo",
    icon: momoIcon,
  },
];

export const PaymentFailurePage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [deliveryMethod, setDeliveryMethod] =
    useState<DeliveryMethod>("Delivery");
  const [originalPaymentMethod, setOriginalPaymentMethod] =
    useState<PaymentMethod>("CashOnDelivery");
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("CashOnDelivery");
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const allowedPaymentMethods = PAYMENT_METHODS.filter((method) =>
    deliveryMethod === "PickupInStore"
      ? method.value !== "CashOnDelivery"
      : method.value !== "CashInStore",
  );

  useEffect(() => {
    const deliveryMethodParam = searchParams.get("deliveryMethod");
    const resolvedDeliveryMethod: DeliveryMethod =
      deliveryMethodParam === "PickupInStore" ||
      deliveryMethodParam === "Delivery"
        ? deliveryMethodParam
        : "Delivery";

    setDeliveryMethod(resolvedDeliveryMethod);

    const initialMethod = resolveInitialPaymentMethod(
      searchParams,
      resolvedDeliveryMethod,
    );

    setOriginalPaymentMethod(initialMethod);
    setPaymentMethod(initialMethod);

    // Simulate loading state
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchParams]);

  useEffect(() => {
    const allowedValues = allowedPaymentMethods.map((m) => m.value);
    if (!allowedValues.includes(originalPaymentMethod)) {
      setOriginalPaymentMethod(allowedValues[0] ?? "VnPay");
    }
    if (!allowedValues.includes(paymentMethod)) {
      setPaymentMethod(allowedValues[0] ?? "VnPay");
    }
  }, [allowedPaymentMethods, originalPaymentMethod, paymentMethod]);

  const orderId = searchParams.get("orderId") || searchParams.get("orderId");
  const paymentId = searchParams.get("paymentId"); // Get paymentId from URL params
  const amount = searchParams.get("vnp_Amount");
  const bankCode = searchParams.get("vnp_BankCode");
  const payDate = searchParams.get("vnp_PayDate");
  const responseCode = searchParams.get("vnp_ResponseCode");
  const transactionNo = searchParams.get("vnp_TransactionNo");
  const orderInfo = searchParams.get("vnp_OrderInfo");

  const errorMessage = getErrorMessage(responseCode);

  const getPaymentMethodLabel = (method: PaymentMethod) =>
    PAYMENT_METHODS.find((item) => item.value === method)?.label || method;

  const processRetryPayment = async () => {
    if (!paymentId) {
      showToast("Không tìm thấy thông tin thanh toán", "error");
      return;
    }

    try {
      setIsRetrying(true);
      const response = await orderService.retryPayment(
        paymentId,
        paymentMethod,
      );

      // Handle payment redirect
      if (paymentMethod === "VnPay" || paymentMethod === "Momo") {
        if (response.url) {
          window.location.href = response.url;
        } else {
          showToast("Không thể chuyển đến trang thanh toán", "error");
        }
      } else {
        showToast("Đơn hàng đã được xác nhận!", "success");
        navigate("/");
      }
    } catch (error) {
      showToast(
        error instanceof Error
          ? "Đơn hàng đã hết hạn chờ thanh toán hoặc đã được xử lí thanh toán. Vui lòng đặt hàng mới."
          : (error as { message?: string }).message ||
              "Đơn hàng đã hết hạn chờ thanh toán hoặc đã được xử lí thanh toán. Vui lòng đặt hàng mới.",
        "error",
      );
    } finally {
      setIsRetrying(false);
    }
  };

  const handleRetryPayment = async () => {
    const isSameAsOriginal = paymentMethod === originalPaymentMethod;

    if (isSameAsOriginal) {
      await processRetryPayment();
      return;
    }

    setIsConfirmModalOpen(true);
  };

  const handleConfirmSwitchMethod = async () => {
    setIsConfirmModalOpen(false);
    await processRetryPayment();
  };

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
          minHeight: { md: "calc(100vh - 112px)" },
          display: "flex",
          alignItems: { md: "center" },
        }}
      >
        <Paper
          sx={{
            p: { xs: 2, sm: 3 },
            textAlign: "left",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            width: "100%",
          }}
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={{ xs: 2, md: 3 }}
            alignItems={{ xs: "stretch", md: "flex-start" }}
          >
            <Box sx={{ flex: 1.05 }}>
              <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    bgcolor: "error.main",
                    flexShrink: 0,
                  }}
                >
                  <Cancel sx={{ fontSize: 32, color: "white" }} />
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight={700} color="error.main">
                    Thanh toán thất bại
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {errorMessage}
                  </Typography>
                </Box>
              </Box>

              <Chip
                size="small"
                color="error"
                variant="outlined"
                label={`Mã lỗi: ${responseCode || "Không xác định"}`}
                sx={{ mb: 1.5 }}
              />

              <Alert severity="error" sx={{ mb: 2, textAlign: "left" }}>
                <Typography variant="body2">
                  Đơn hàng chưa được thanh toán. Vui lòng thử lại hoặc đổi
                  phương thức thanh toán.
                </Typography>
              </Alert>

              <Divider sx={{ mb: 2 }} />

              <Typography variant="subtitle1" fontWeight={700} mb={1.5}>
                Thông tin giao dịch
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
            </Box>

            <Box sx={{ flex: 0.95 }}>
              {paymentId && (
                <Box
                  sx={{
                    p: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    mb: 2,
                  }}
                >
                  <FormControl component="fieldset" fullWidth>
                    <FormLabel
                      component="legend"
                      sx={{ mb: 1, fontWeight: 700 }}
                    >
                      Chọn phương thức thanh toán mới
                    </FormLabel>
                    <RadioGroup
                      value={paymentMethod}
                      onChange={(e) =>
                        setPaymentMethod(e.target.value as PaymentMethod)
                      }
                    >
                      {allowedPaymentMethods.map((method) => (
                        <FormControlLabel
                          key={method.value}
                          value={method.value}
                          control={<Radio size="small" />}
                          label={
                            <Box
                              display="flex"
                              alignItems="center"
                              gap={1.5}
                              py={0.5}
                            >
                              <Box
                                component="img"
                                src={method.icon}
                                alt={method.label}
                                sx={{
                                  width: 36,
                                  height: 36,
                                  objectFit: "contain",
                                  borderRadius: 1,
                                  border: "1px solid",
                                  borderColor: "divider",
                                  bgcolor: "#fff",
                                  p: 0.5,
                                  flexShrink: 0,
                                }}
                              ></Box>
                              <Box>
                                <Typography variant="body2" fontWeight={600}>
                                  {method.label}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {method.description}
                                </Typography>
                              </Box>
                            </Box>
                          }
                          sx={{
                            mb: 0.75,
                            border: 1,
                            borderColor: "divider",
                            borderRadius: 1,
                            px: 1.25,
                            py: 0.25,
                            mx: 0,
                            "&:hover": {
                              bgcolor: "action.hover",
                            },
                          }}
                        />
                      ))}
                    </RadioGroup>
                  </FormControl>
                </Box>
              )}

              <Stack spacing={1.25}>
                {paymentId ? (
                  <Button
                    variant="contained"
                    color="error"
                    size="large"
                    onClick={handleRetryPayment}
                    disabled={isRetrying}
                    sx={{ minHeight: 44 }}
                  >
                    {isRetrying ? <CircularProgress size={24} /> : "Thử lại"}
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    color="error"
                    size="large"
                    onClick={() => navigate("/checkout")}
                    sx={{ minHeight: 44 }}
                  >
                    Về trang thanh toán
                  </Button>
                )}
                <Button
                  variant="outlined"
                  color="primary"
                  size="large"
                  onClick={() => navigate("/")}
                  sx={{ minHeight: 44 }}
                >
                  Về trang chủ
                </Button>
              </Stack>

              <Box mt={2} p={1.5} bgcolor="grey.50" borderRadius={1.5}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                >
                  Cần hỗ trợ?
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Liên hệ hotline hoặc email để được hỗ trợ thanh toán nhanh.
                </Typography>
              </Box>
            </Box>
          </Stack>
        </Paper>
      </Container>

      <Dialog
        open={isConfirmModalOpen}
        onClose={() => {
          if (!isRetrying) {
            setIsConfirmModalOpen(false);
          }
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Xác nhận đổi phương thức thanh toán</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Bạn đang đổi phương thức thanh toán từ{" "}
            <Typography component="span" fontWeight={700} color="text.primary">
              {getPaymentMethodLabel(originalPaymentMethod)}
            </Typography>{" "}
            sang{" "}
            <Typography component="span" fontWeight={700} color="text.primary">
              {getPaymentMethodLabel(paymentMethod)}
            </Typography>
            . Bạn có chắc chắn muốn tiếp tục?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setIsConfirmModalOpen(false)}
            disabled={isRetrying}
          >
            Hủy
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmSwitchMethod}
            disabled={isRetrying}
          >
            Xác nhận
          </Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
};
