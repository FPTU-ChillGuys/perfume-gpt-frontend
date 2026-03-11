import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Link,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Launch, Payments, PointOfSale, QrCodeScanner } from "@mui/icons-material";
import { MainLayout } from "@/layouts/MainLayout";
import { useToast } from "@/hooks/useToast";
import { orderService } from "@/services/orderService";
import type { PaymentMethod } from "@/types/checkout";
import type { OrderResponse } from "@/types/order";

const COUNTER_DISPLAY_ORDER_KEY = "counter:display:orderId";

const PAYMENT_CHOICES: { value: PaymentMethod; label: string }[] = [
  { value: "CashInStore", label: "Tiền mặt tại quầy" },
  { value: "VnPay", label: "VNPay" },
  { value: "Momo", label: "MoMo" },
  { value: "CashOnDelivery", label: "COD" },
];

const ONLINE_PAYMENT_METHODS: PaymentMethod[] = ["VnPay", "Momo"];

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat("vi-VN").format(Number(value ?? 0)) + "đ";

const isSupportedPaymentMethod = (value?: string | null): value is PaymentMethod =>
  PAYMENT_CHOICES.some((choice) => choice.value === value);

export const CounterCheckoutStaffPage = () => {
  const { showToast } = useToast();

  const [orderCodeInput, setOrderCodeInput] = useState("");
  const [loadedOrder, setLoadedOrder] = useState<OrderResponse | null>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);

  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>("CashInStore");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState("");

  const paymentId = useMemo(
    () => loadedOrder?.paymentTransactions?.[0]?.id || "",
    [loadedOrder],
  );

  const paymentStatus = loadedOrder?.paymentStatus || "Unpaid";
  const isPaid = paymentStatus === "Paid";
  const isOnlineMethod = ONLINE_PAYMENT_METHODS.includes(selectedPaymentMethod);

  const syncMethodFromOrder = (order: OrderResponse) => {
    const methodFromOrder = order.paymentTransactions?.[0]?.paymentMethod;
    if (isSupportedPaymentMethod(methodFromOrder)) {
      setSelectedPaymentMethod(methodFromOrder);
    }
  };

  const broadcastDisplayOrder = (orderId?: string) => {
    if (!orderId) return;
    window.localStorage.setItem(COUNTER_DISPLAY_ORDER_KEY, orderId);
  };

  const refreshLoadedOrder = async (orderId: string) => {
    const latest = await orderService.getOrderById(orderId);
    setLoadedOrder(latest);
    syncMethodFromOrder(latest);
    broadcastDisplayOrder(latest.id);
  };

  const handleLoadOrder = async () => {
    const trimmed = orderCodeInput.trim();
    if (!trimmed) {
      showToast("Vui lòng nhập mã đơn hàng", "warning");
      return;
    }

    try {
      setIsLoadingOrder(true);
      const order = await orderService.getOrderById(trimmed);
      setLoadedOrder(order);
      syncMethodFromOrder(order);
      broadcastDisplayOrder(order.id);
      showToast("Đã tải đơn hàng", "success");
    } catch (error) {
      setLoadedOrder(null);
      showToast(
        error instanceof Error ? error.message : "Không thể tải đơn hàng",
        "error",
      );
    } finally {
      setIsLoadingOrder(false);
    }
  };

  const handleProcessPayment = async () => {
    if (!loadedOrder?.id) {
      showToast("Vui lòng tải đơn hàng trước", "warning");
      return;
    }
    if (!paymentId) {
      showToast("Đơn hàng chưa có thông tin giao dịch thanh toán", "error");
      return;
    }
    if (isPaid) {
      showToast("Đơn hàng đã được thanh toán", "info");
      return;
    }

    try {
      setIsProcessingPayment(true);

      if (isOnlineMethod) {
        const response = await orderService.retryPayment(
          paymentId,
          selectedPaymentMethod,
        );
        if (!response.url) {
          throw new Error("Không lấy được URL thanh toán");
        }

        setPaymentUrl(response.url);
        setQrDialogOpen(true);
        showToast("Đã tạo mã QR thanh toán", "success");
        return;
      }

      await orderService.confirmPayment(paymentId, true);
      await refreshLoadedOrder(loadedOrder.id);
      showToast("Xác nhận thanh toán tiền mặt thành công", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Không thể xử lý thanh toán",
        "error",
      );
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const openCustomerScreen = () => {
    if (!loadedOrder?.id) {
      showToast("Chưa có đơn hàng để hiển thị", "warning");
      return;
    }
    broadcastDisplayOrder(loadedOrder.id);
    window.open(
      `/checkout/counter/display?orderId=${loadedOrder.id}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const qrImageUrl = paymentUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(
        paymentUrl,
      )}`
    : "";

  return (
    <MainLayout>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography variant="h4" fontWeight={700} mb={3}>
          Thanh toán tại quầy
        </Typography>

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={3}
          alignItems="flex-start"
        >
          <Box flex={1} width="100%">
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" fontWeight={600} mb={2}>
                Tải đơn hàng theo mã
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Mã đơn hàng"
                  value={orderCodeInput}
                  onChange={(e) => setOrderCodeInput(e.target.value)}
                  fullWidth
                />
                <Button
                  variant="contained"
                  startIcon={
                    isLoadingOrder ? <CircularProgress size={18} /> : <QrCodeScanner />
                  }
                  onClick={handleLoadOrder}
                  disabled={isLoadingOrder}
                >
                  Tải đơn
                </Button>
              </Stack>
            </Paper>

            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={600} mb={2}>
                Xử lý thanh toán
              </Typography>

              <Stack spacing={2}>
                <TextField
                  select
                  label="Phương thức thanh toán"
                  value={selectedPaymentMethod}
                  onChange={(e) =>
                    setSelectedPaymentMethod(e.target.value as PaymentMethod)
                  }
                  disabled={!loadedOrder?.id || isPaid}
                >
                  {PAYMENT_CHOICES.map((choice) => (
                    <MenuItem key={choice.value} value={choice.value}>
                      {choice.label}
                    </MenuItem>
                  ))}
                </TextField>

                <Alert severity={isOnlineMethod ? "info" : "warning"}>
                  {isOnlineMethod
                    ? "Thanh toán online: hệ thống sẽ hiển thị QR để khách quét."
                    : "Thanh toán tiền mặt/COD: nhân viên bấm xác nhận đã nhận tiền."}
                </Alert>

                <Button
                  variant="contained"
                  color={isOnlineMethod ? "primary" : "success"}
                  size="large"
                  startIcon={isOnlineMethod ? <Payments /> : <PointOfSale />}
                  onClick={handleProcessPayment}
                  disabled={!loadedOrder?.id || isProcessingPayment || isPaid}
                >
                  {isProcessingPayment ? (
                    <CircularProgress size={22} />
                  ) : isOnlineMethod ? (
                    "Hiển thị QR thanh toán"
                  ) : (
                    "Xác nhận đã thanh toán"
                  )}
                </Button>
              </Stack>
            </Paper>
          </Box>

          <Box flex={1} width="100%">
            <Paper sx={{ p: 3, position: "sticky", top: 88 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6" fontWeight={600}>
                  Thông tin đơn hàng
                </Typography>
                <Tooltip title="Mở màn hình cho khách">
                  <span>
                    <IconButton onClick={openCustomerScreen} disabled={!loadedOrder?.id}>
                      <Launch />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>

              <Divider sx={{ my: 2 }} />

              {loadedOrder ? (
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Typography variant="subtitle1" fontWeight={600}>
                      Mã đơn:
                    </Typography>
                    <Chip label={loadedOrder.id} size="small" />
                  </Stack>

                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography>Trạng thái thanh toán:</Typography>
                    <Chip
                      label={isPaid ? "Đã thanh toán" : "Chưa thanh toán"}
                      color={isPaid ? "success" : "warning"}
                      size="small"
                    />
                  </Stack>

                  <Typography>Mã khách: {loadedOrder.customerName || "Khách lẻ"}</Typography>
                  <Typography>Trạng thái đơn: {loadedOrder.status || "-"}</Typography>
                  <Typography>Voucher: {loadedOrder.voucherCode || "Không có"}</Typography>

                  <Divider />

                  <Stack spacing={1}>
                    {loadedOrder.orderDetails?.map((detail) => (
                      <Box key={detail.id} display="flex" justifyContent="space-between" gap={2}>
                        <Typography>{detail.variantName}</Typography>
                        <Typography>
                          x{detail.quantity} • {formatCurrency(detail.total)}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>

                  <Divider />

                  <Stack direction="row" justifyContent="space-between">
                    <Typography fontWeight={600}>Tổng cộng</Typography>
                    <Typography fontWeight={700} color="error">
                      {formatCurrency(loadedOrder.totalAmount)}
                    </Typography>
                  </Stack>
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Chưa có đơn hàng nào được tải. Hãy nhập mã đơn để bắt đầu thanh toán.
                </Typography>
              )}
            </Paper>
          </Box>
        </Stack>

        <Dialog
          open={qrDialogOpen}
          onClose={() => setQrDialogOpen(false)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>QR thanh toán</DialogTitle>
          <DialogContent>
            <Stack spacing={2} alignItems="center">
              {paymentUrl ? (
                <Box
                  component="img"
                  src={qrImageUrl}
                  alt="QR thanh toán"
                  sx={{
                    width: 280,
                    height: 280,
                    borderRadius: 1,
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                />
              ) : (
                <Typography color="text.secondary">Chưa có mã QR</Typography>
              )}

              {paymentUrl && (
                <Link
                  href={paymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="hover"
                >
                  Mở link thanh toán
                </Link>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setQrDialogOpen(false)}>Đóng</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </MainLayout>
  );
};
