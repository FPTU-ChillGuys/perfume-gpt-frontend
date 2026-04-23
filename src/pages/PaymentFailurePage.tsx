import { useEffect, useMemo, useState } from "react";
import {
  Link as RouterLink,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Paper,
  Stack,
  Typography,
  Alert,
} from "@mui/material";
import { Cancel } from "@mui/icons-material";
import { MainLayout } from "@/layouts/MainLayout";
import { orderService } from "@/services/orderService";
import type { PaymentMethod } from "@/types/checkout";
import type { OrderType } from "@/types/order";
import { useToast } from "@/hooks/useToast";
import codIcon from "@/assets/cod.png";
import storeIcon from "@/assets/store.png";
import vnpayIcon from "@/assets/vnpay.jpg";
import momoIcon from "@/assets/momo.png";
import payosIcon from "@/assets/payos.png";

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
    case "payos":
      return "PayOs";
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
  {
    value: "PayOs",
    label: "PayOS",
    description: "Thanh toán qua PayOS",
    icon: payosIcon,
  },
];

const GATEWAY_METHODS: NonNullable<PaymentMethod>[] = ["VnPay", "Momo", "PayOs"];
const CASH_METHODS: NonNullable<PaymentMethod>[] = ["CashOnDelivery", "CashInStore"];

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
  // depositGateway: chỉ dùng khi paymentMethod là COD/CashInStore
  const [depositGateway, setDepositGateway] = useState<PaymentMethod>("VnPay");
  const [orderType, setOrderType] = useState<OrderType | null>(null);
  // isDepositOrder: true khi đơn COD/CashInStore có yêu cầu cọc và giao dịch lỗi là gateway cọc
  const [isDepositOrder, setIsDepositOrder] = useState(false);

  // isDepositFailure: true khi:
  // 1. PTTT gốc là COD/CashInStore (trước khi có fetch order)
  // 2. Hoặc order detect là deposit order (gateway VnPay/Momo/PayOs dùng để cọc)
  const isDepositFailure =
    isDepositOrder ||
    originalPaymentMethod === "CashOnDelivery" ||
    originalPaymentMethod === "CashInStore";

  const allowedPaymentMethods = useMemo(
    () =>
      PAYMENT_METHODS.filter((method) => {
        if (deliveryMethod === "PickupInStore")
          return method.value !== "CashOnDelivery";
        return method.value !== "CashInStore";
      }),
    [deliveryMethod],
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryMethod]);

  const orderCode = searchParams.get("orderCode");
  const orderId =  searchParams.get("orderId") || searchParams.get("orderId");
  const paymentId = searchParams.get("paymentId"); // Get paymentId from URL params
  const amount = searchParams.get("vnp_Amount");
  const bankCode = searchParams.get("vnp_BankCode");
  const payDate = searchParams.get("vnp_PayDate");
  const responseCode = searchParams.get("vnp_ResponseCode");
  const transactionNo = searchParams.get("vnp_TransactionNo");
  const orderInfo = searchParams.get("vnp_OrderInfo");

  const decodedOrderInfo = decodeURIComponent(orderInfo || "");
  const hasPosSessionInOrderInfo = /PosSessionId\s*:/i.test(decodedOrderInfo);
  const isPickupInStore = Boolean(deliveryMethod === "PickupInStore");
  const isInStoreByUrl = isPickupInStore || hasPosSessionInOrderInfo;
  const isInStoreOrder = orderType === "Offline" || isInStoreByUrl;

  useEffect(() => {
    let isCancelled = false;

    const resolveOrderType = async () => {
      if (!orderId) return;

      try {
        const order = await orderService.getOrderById(orderId);
        if (isCancelled) return;

        setOrderType(order.type || null);

        // Detect deposit flow: đơn có tiền cọc yêu cầu và chưa thanh toán xong
        const hasDeposit = (order.requiredDepositAmount ?? 0) > 0;
        const notFullyPaid = order.paymentStatus !== "Paid";
        const gatewayFailed = GATEWAY_METHODS.includes(
          originalPaymentMethod as NonNullable<PaymentMethod>,
        );

        if (hasDeposit && notFullyPaid && gatewayFailed) {
          // Đây là thất bại cọ gateway dùng làm cổng cọc
          setIsDepositOrder(true);

          // PTTT chính của đơn: Offline = CashInStore, Online = CashOnDelivery
          const primaryMethod: NonNullable<PaymentMethod> =
            order.type === "Offline" ? "CashInStore" : "CashOnDelivery";

          // Đặt paymentMethod = PTTT chính (COD/CashInStore)
          setPaymentMethod(primaryMethod);

          // Đặt depositGateway = gateway đã dùng cọc (VnPay/Momo/PayOs)
          if (originalPaymentMethod) {
            setDepositGateway(originalPaymentMethod);
          }
        }
      } catch {
        if (!isCancelled) {
          setOrderType(null);
        }
      }
    };

    void resolveOrderType();

    return () => {
      isCancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const errorMessage = getErrorMessage(responseCode);

  const getPaymentMethodLabel = (method: PaymentMethod) =>
    PAYMENT_METHODS.find((item) => item.value === method)?.label || method;

  const processRetryPayment = async () => {
    if (isInStoreOrder) {
      showToast(
        "Đơn tại quầy sẽ do nhân viên xử lý thanh toán lại trên màn hình POS.",
        "info",
      );
      return;
    }

    if (!paymentId) {
      showToast("Không tìm thấy thông tin thanh toán", "error");
      return;
    }

    const isCashMethod =
      paymentMethod === "CashOnDelivery" || paymentMethod === "CashInStore";

    // newDepositMethod chỉ truyền khi PTTT chính là COD/CashInStore (cần cọc qua gateway)
    // Khi chọn thanh toán toàn bộ online (VnPay/Momo/PayOs) → newDepositMethod = null
    const newDepositMethod = isCashMethod ? depositGateway : null;

    try {
      setIsRetrying(true);
      const response = await orderService.retryPayment(
        paymentId,
        paymentMethod,       // newPaymentMethod
        newDepositMethod,    // newDepositMethod
      );

      // Cần redirect nếu: thanh toán online hoặc cọc qua gateway
      const isOnlineMethod =
        paymentMethod === "VnPay" ||
        paymentMethod === "Momo" ||
        paymentMethod === "PayOs";
      const isDepositWithGateway = isCashMethod && newDepositMethod;

      if (isOnlineMethod || isDepositWithGateway) {
        if (response.url) {
          window.location.href = response.url;
        } else {
          showToast("Không thể chuyển đến trang thanh toán", "error");
        }
      } else {
        // COD/CashInStore không cọc (đơn không yêu cầu cọc)
        showToast("Đơn hàng đã được xác nhận!", "success");
        navigate(`/payment/success?orderId=${orderId}&source=checkout`);
      }
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : (error as { message?: string }).message ||
              "Đơn hàng đã hết hạn chờ thanh toán hoặc đã được xử lí thanh toán. Vui lòng đặt hàng mới.",
        "error",
      );
    } finally {
      setIsRetrying(false);
    }
  };

  // With the new card-pick UI, user explicitly selects — no confirm modal needed
  const handleRetryPayment = async () => {
    await processRetryPayment();
  };

  const handleViewOrderDetail = () => {
    if (!orderId) {
      showToast("Không tìm thấy mã đơn hàng", "error");
      return;
    }

    navigate(`/my-orders/${orderId}`);
  };

  if (isLoading) {
    const loadingContent = (
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
    );

    return isInStoreOrder ? (
      loadingContent
    ) : (
      <MainLayout>{loadingContent}</MainLayout>
    );
  }

  const pageContent = (
    <>
      <Container
        maxWidth="lg"
        sx={{
          py: { xs: 2, md: 3 },
          minHeight: isInStoreOrder ? "100vh" : { md: "calc(100vh - 112px)" },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isInStoreOrder ? (
          // Single column layout for POS orders
          <Paper
            sx={{
              p: { xs: 2, sm: 3 },
              textAlign: "left",
              boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
              width: "100%",
            }}
          >
            <Stack spacing={2}>
              <Box>
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
                    <Typography
                      variant="h5"
                      fontWeight={700}
                      color="error.main"
                    >
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

                {orderCode && (
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography color="text.secondary">Mã đơn hàng:</Typography>
                    <Typography fontWeight={600}>{orderCode}</Typography>
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
                    <Typography color="text.secondary">
                      Mã giao dịch:
                    </Typography>
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

              <Box>
                <Alert severity="info" sx={{ mb: 2, textAlign: "left" }}>
                  Đơn hàng tại quầy sẽ được nhân viên xử lý retry thanh toán
                  trên màn hình POS. Vui lòng chờ nhân viên hỗ trợ.
                </Alert>

                <Stack spacing={1.25}>
                  <Button
                    variant="outlined"
                    color="primary"
                    size="large"
                    component={RouterLink}
                    to="/"
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
        ) : (
          // Two-column layout for online orders
          <Box
            sx={{
              width: "100%",
              display: "flex",
              gap: 3,
              flexDirection: { xs: "column", md: "row" },
            }}
          >
            {/* Left Column - Error Information and Transaction Details */}
            <Paper
              sx={{
                p: { xs: 2, sm: 3 },
                textAlign: "left",
                boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                flex: { md: 2 },
              }}
            >
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

              {orderCode && (
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography color="text.secondary">Mã đơn hàng:</Typography>
                  <Typography fontWeight={600}>{orderCode}</Typography>
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
            </Paper>

            {/* Right Column - Payment Methods and Actions */}
            <Paper
              sx={{
                p: { xs: 2, sm: 3 },
                textAlign: "left",
                boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                flex: { md: 1 },
                height: "fit-content",
              }}
            >
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
                  {/* ── Scenario A: Deposit failure (COD / CashInStore) ── */}
                  {isDepositFailure ? (
                    <>
                      {/* Section 1: Retry with different deposit gateway */}
                      <Typography
                        variant="caption"
                        fontWeight={700}
                        color="text.secondary"
                        display="block"
                        mb={1}
                        sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
                      >
                        Chọn cổng thanh toán tiền cọc
                      </Typography>

                      <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                        {GATEWAY_METHODS.map((gw) => {
                          const info = PAYMENT_METHODS.find(
                            (m) => m.value === gw,
                          );
                          if (!info) return null;
                          const isSel =
                            paymentMethod ===
                              (originalPaymentMethod ?? "CashOnDelivery") &&
                            depositGateway === gw;
                          return (
                            <Box
                              key={gw}
                              onClick={() => {
                                setPaymentMethod(originalPaymentMethod);
                                setDepositGateway(gw);
                              }}
                              sx={{
                                flex: "1 1 70px",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: 0.5,
                                py: 1,
                                px: 1,
                                borderRadius: 1.5,
                                border: "2px solid",
                                borderColor: isSel ? "error.main" : "divider",
                                bgcolor: isSel ? "error.50" : "background.paper",
                                cursor: "pointer",
                                transition: "all 0.15s",
                                "&:hover": { borderColor: "error.light" },
                              }}
                            >
                              <Box
                                component="img"
                                src={info.icon}
                                alt={info.label}
                                sx={{
                                  width: 32,
                                  height: 32,
                                  objectFit: "contain",
                                  borderRadius: 0.5,
                                }}
                              />
                              <Typography
                                variant="caption"
                                fontWeight={isSel ? 700 : 400}
                                color={isSel ? "error.main" : "text.secondary"}
                              >
                                {info.label}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Box>

                      <Divider sx={{ mb: 1.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          hoặc thanh toán toàn bộ ngay
                        </Typography>
                      </Divider>

                      {/* Section 2: Pay full amount online */}
                      <Typography
                        variant="caption"
                        fontWeight={700}
                        color="text.secondary"
                        display="block"
                        mb={1}
                        sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
                      >
                        Thanh toán toàn bộ đơn hàng
                      </Typography>

                      <Box display="flex" gap={1} flexWrap="wrap">
                        {GATEWAY_METHODS.map((gw) => {
                          const info = PAYMENT_METHODS.find(
                            (m) => m.value === gw,
                          );
                          if (!info) return null;
                          const isSel =
                            paymentMethod === gw &&
                            !CASH_METHODS.includes(paymentMethod);
                          return (
                            <Box
                              key={gw}
                              onClick={() => setPaymentMethod(gw)}
                              sx={{
                                flex: "1 1 70px",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: 0.5,
                                py: 1,
                                px: 1,
                                borderRadius: 1.5,
                                border: "2px solid",
                                borderColor: isSel ? "primary.main" : "divider",
                                bgcolor: isSel
                                  ? "primary.50"
                                  : "background.paper",
                                cursor: "pointer",
                                transition: "all 0.15s",
                                "&:hover": { borderColor: "primary.light" },
                              }}
                            >
                              <Box
                                component="img"
                                src={info.icon}
                                alt={info.label}
                                sx={{
                                  width: 32,
                                  height: 32,
                                  objectFit: "contain",
                                  borderRadius: 0.5,
                                }}
                              />
                              <Typography
                                variant="caption"
                                fontWeight={isSel ? 700 : 400}
                                color={isSel ? "primary.main" : "text.secondary"}
                              >
                                {info.label}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Box>
                    </>
                  ) : (
                    /* ── Scenario B: Online payment failure ── */
                    <>
                      {/* Section 1: Retry with another online gateway */}
                      <Typography
                        variant="caption"
                        fontWeight={700}
                        color="text.secondary"
                        display="block"
                        mb={1}
                        sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
                      >
                        Thử lại với cổng khác
                      </Typography>

                      <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                        {GATEWAY_METHODS.map((gw) => {
                          const info = PAYMENT_METHODS.find(
                            (m) => m.value === gw,
                          );
                          if (!info) return null;
                          const isSel =
                            paymentMethod === gw &&
                            GATEWAY_METHODS.includes(paymentMethod);
                          return (
                            <Box
                              key={gw}
                              onClick={() => setPaymentMethod(gw)}
                              sx={{
                                flex: "1 1 70px",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: 0.5,
                                py: 1,
                                px: 1,
                                borderRadius: 1.5,
                                border: "2px solid",
                                borderColor: isSel ? "error.main" : "divider",
                                bgcolor: isSel ? "error.50" : "background.paper",
                                cursor: "pointer",
                                transition: "all 0.15s",
                                "&:hover": { borderColor: "error.light" },
                              }}
                            >
                              <Box
                                component="img"
                                src={info.icon}
                                alt={info.label}
                                sx={{
                                  width: 32,
                                  height: 32,
                                  objectFit: "contain",
                                  borderRadius: 0.5,
                                }}
                              />
                              <Typography
                                variant="caption"
                                fontWeight={isSel ? 700 : 400}
                                color={isSel ? "error.main" : "text.secondary"}
                              >
                                {info.label}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Box>

                      <Divider sx={{ mb: 1.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          hoặc đổi phương thức
                        </Typography>
                      </Divider>

                      {/* Section 2: Switch to COD/CashInStore with deposit gateway */}
                      <Typography
                        variant="caption"
                        fontWeight={700}
                        color="text.secondary"
                        display="block"
                        mb={1}
                        sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
                      >
                        {deliveryMethod === "PickupInStore"
                          ? "Nhận tại cửa hàng"
                          : "Thanh toán khi nhận hàng (COD)"}
                      </Typography>

                      {/* COD / CashInStore card */}
                      {(() => {
                        const cashMethod =
                          deliveryMethod === "PickupInStore"
                            ? "CashInStore"
                            : "CashOnDelivery";
                        const info = PAYMENT_METHODS.find(
                          (m) => m.value === cashMethod,
                        );
                        const isCashSelected =
                          paymentMethod === cashMethod;
                        return (
                          <Box
                            onClick={() => setPaymentMethod(cashMethod)}
                            display="flex"
                            alignItems="center"
                            gap={1.5}
                            sx={{
                              p: 1.25,
                              borderRadius: 1.5,
                              border: "2px solid",
                              borderColor: isCashSelected
                                ? "warning.main"
                                : "divider",
                              bgcolor: isCashSelected
                                ? "warning.50"
                                : "background.paper",
                              cursor: "pointer",
                              mb: isCashSelected ? 1.5 : 0,
                              transition: "all 0.15s",
                              "&:hover": { borderColor: "warning.light" },
                            }}
                          >
                            <Box
                              component="img"
                              src={info?.icon}
                              alt={info?.label}
                              sx={{
                                width: 36,
                                height: 36,
                                objectFit: "contain",
                                borderRadius: 1,
                                border: "1px solid",
                                borderColor: "divider",
                                p: 0.5,
                              }}
                            />
                            <Box flex={1}>
                              <Typography variant="body2" fontWeight={600}>
                                {info?.label}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {info?.description}
                              </Typography>
                            </Box>
                            {isCashSelected && (
                              <Chip
                                label="Đã chọn"
                                size="small"
                                color="warning"
                                sx={{ fontWeight: 700 }}
                              />
                            )}
                          </Box>
                        );
                      })()}

                      {/* Deposit gateway sub-selector */}
                      {(paymentMethod === "CashOnDelivery" ||
                        paymentMethod === "CashInStore") && (
                        <Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                            mb={0.75}
                          >
                            Chọn cổng thanh toán tiền cọc:
                          </Typography>
                          <Box display="flex" gap={1}>
                            {GATEWAY_METHODS.map((gw) => {
                              const info = PAYMENT_METHODS.find(
                                (m) => m.value === gw,
                              );
                              if (!info) return null;
                              const isSel = depositGateway === gw;
                              return (
                                <Box
                                  key={gw}
                                  onClick={() => setDepositGateway(gw)}
                                  sx={{
                                    flex: "1 1 60px",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: 0.5,
                                    py: 0.75,
                                    borderRadius: 1.5,
                                    border: "2px solid",
                                    borderColor: isSel
                                      ? "warning.dark"
                                      : "divider",
                                    bgcolor: isSel
                                      ? "warning.50"
                                      : "background.paper",
                                    cursor: "pointer",
                                    transition: "all 0.15s",
                                    "&:hover": {
                                      borderColor: "warning.main",
                                    },
                                  }}
                                >
                                  <Box
                                    component="img"
                                    src={info.icon}
                                    alt={info.label}
                                    sx={{
                                      width: 28,
                                      height: 28,
                                      objectFit: "contain",
                                    }}
                                  />
                                  <Typography
                                    variant="caption"
                                    fontWeight={isSel ? 700 : 400}
                                    fontSize={10}
                                    color={
                                      isSel ? "warning.dark" : "text.secondary"
                                    }
                                  >
                                    {info.label}
                                  </Typography>
                                </Box>
                              );
                            })}
                          </Box>
                        </Box>
                      )}
                    </>
                  )}
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
                    component={RouterLink}
                    to="/checkout"
                    sx={{ minHeight: 44 }}
                  >
                    Về trang thanh toán
                  </Button>
                )}
                {orderId && (
                  <Button
                    variant="outlined"
                    color="info"
                    size="large"
                    onClick={handleViewOrderDetail}
                    sx={{ minHeight: 44 }}
                  >
                    Xem chi tiết đơn hàng
                  </Button>
                )}
                <Button
                  variant="outlined"
                  color="primary"
                  size="large"
                  component={RouterLink}
                  to="/"
                  sx={{ minHeight: 44 }}
                >
                  Về trang chủ
                </Button>
              </Stack>
            </Paper>
          </Box>
        )}
      </Container>
    </>
  );

  return isInStoreOrder ? pageContent : <MainLayout>{pageContent}</MainLayout>;
};
