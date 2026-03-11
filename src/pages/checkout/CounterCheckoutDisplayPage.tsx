import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  Divider,
  CircularProgress,
  Alert,
  Chip,
} from "@mui/material";
import { useSearchParams } from "react-router-dom";
import type { ChipProps } from "@mui/material/Chip";
import { MainLayout } from "@/layouts/MainLayout";
import { orderService } from "@/services/orderService";
import type { OrderResponse } from "@/types/order";

const AUTO_REFRESH_INTERVAL_MS = 3000;
const COUNTER_DISPLAY_ORDER_KEY = "counter:display:orderId";
const COUNTER_DISPLAY_COMMAND_KEY = "counter:display:command";

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat("vi-VN").format(Number(value ?? 0)) + "đ";

const resolveStatusColor = (status?: string): ChipProps["color"] => {
  switch (status) {
    case "Delivered":
      return "success";
    case "Processing":
    case "Delivering":
      return "info";
    case "Canceled":
    case "Returned":
      return "error";
    default:
      return "warning";
  }
};

export const CounterCheckoutDisplayPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentOrderId = searchParams.get("orderId") || "";

  const [orderIdInput, setOrderIdInput] = useState(currentOrderId);
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const orderSubtotal = useMemo(
    () =>
      order?.orderDetails?.reduce(
        (sum, item) => sum + Number(item.total ?? 0),
        0,
      ) ?? 0,
    [order],
  );

  const loadOrder = useCallback(
    async (
      orderId: string,
      options?: { silent?: boolean; syncQuery?: boolean },
    ) => {
      const silent = options?.silent ?? false;
      const syncQuery = options?.syncQuery ?? true;

      if (!orderId) {
        setOrder(null);
        setError("Vui lòng nhập mã đơn hàng");
        return;
      }

      try {
        if (!silent) {
          setIsLoading(true);
        }

        const data = await orderService.getOrderById(orderId);
        setOrder(data);

        if (syncQuery) {
          setSearchParams(orderId ? { orderId } : {});
        }

        setError(null);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Không thể tải thông tin đơn hàng";
        setError(message);

        // Keep currently displayed order during silent refresh errors.
        if (!silent) {
          setOrder(null);
        }
      } finally {
        if (!silent) {
          setIsLoading(false);
        }
      }
    },
    [setSearchParams],
  );

  useEffect(() => {
    if (currentOrderId) {
      void loadOrder(currentOrderId, { syncQuery: false });
    } else {
      setOrder(null);
    }
  }, [currentOrderId, loadOrder]);

  useEffect(() => {
    if (!currentOrderId) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadOrder(currentOrderId, { silent: true, syncQuery: false });
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [currentOrderId, loadOrder]);

  useEffect(() => {
    const handleStorageSync = (event: StorageEvent) => {
      if (event.key === COUNTER_DISPLAY_COMMAND_KEY && event.newValue?.startsWith("clear:")) {
        setOrder(null);
        setError(null);
        setOrderIdInput("");
        setSearchParams({});
        return;
      }

      if (event.key !== COUNTER_DISPLAY_ORDER_KEY || !event.newValue) {
        return;
      }

      if (event.newValue === currentOrderId) {
        return;
      }

      setOrderIdInput(event.newValue);
      setSearchParams({ orderId: event.newValue });
      void loadOrder(event.newValue, { syncQuery: false });
    };

    window.addEventListener("storage", handleStorageSync);

    return () => {
      window.removeEventListener("storage", handleStorageSync);
    };
  }, [currentOrderId, loadOrder, setSearchParams]);

  useEffect(() => {
    setOrderIdInput(currentOrderId);
  }, [currentOrderId]);

  const handleSubmit = () => {
    const trimmed = orderIdInput.trim();
    void loadOrder(trimmed, { syncQuery: true });
  };

  return (
    <MainLayout>
      <Box
        sx={{
          py: 6,
          minHeight: "100vh",
          background:
            "radial-gradient(circle at top, rgba(255,198,198,0.25), transparent 60%), #fff8f8",
        }}
      >
        <Container maxWidth="md">
          <Paper
            elevation={3}
            sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, backdropFilter: "blur(6px)" }}
          >
            <Stack spacing={3}>
              <Box>
                <Typography variant="h4" fontWeight={700} mb={1}>
                  Màn hình khách
                </Typography>
                <Typography color="text.secondary">
                  Nhập mã đơn hàng để hiển thị chi tiết. Nhân viên có thể quét hoặc sao chép
                  mã từ hệ thống quản trị.
                </Typography>
              </Box>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Mã đơn hàng"
                  value={orderIdInput}
                  onChange={(e) => setOrderIdInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  fullWidth
                />
                <Button
                  variant="contained"
                  color="error"
                  onClick={handleSubmit}
                  disabled={isLoading}
                  sx={{ minWidth: { sm: 160 } }}
                >
                  {isLoading ? <CircularProgress size={20} /> : "Hiển thị"}
                </Button>
              </Stack>

              {error && <Alert severity="error">{error}</Alert>}

              {isLoading && !order && (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress />
                </Box>
              )}

              {!order && !isLoading && (
                <Box textAlign="center" py={6}>
                  <Typography variant="h6" fontWeight={600} mb={1}>
                    Chưa có đơn hàng
                  </Typography>
                  <Typography color="text.secondary">
                    Vui lòng nhập hoặc quét mã đơn để bắt đầu.
                  </Typography>
                </Box>
              )}

              {order && (
                <Stack spacing={3}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="overline" color="text.secondary">
                        MÃ ĐƠN
                      </Typography>
                      <Typography variant="h5" fontWeight={700}>
                        {order.id}
                      </Typography>
                    </Box>
                    <Chip
                      label={order.status}
                      color={resolveStatusColor(order.status)}
                      sx={{ fontWeight: 600 }}
                    />
                  </Stack>

                  <Divider />

                  <Stack spacing={2}>
                    {order.orderDetails?.map((item) => (
                      <Box
                        key={item.id}
                        display="flex"
                        alignItems="center"
                        gap={2}
                        sx={{
                          borderRadius: 3,
                          border: "1px solid",
                          borderColor: "rgba(0,0,0,0.05)",
                          p: 2,
                        }}
                      >
                        {item.imageUrl ? (
                          <Box
                            component="img"
                            src={item.imageUrl}
                            alt={item.variantName}
                            sx={{ width: 72, height: 72, borderRadius: 2, objectFit: "cover" }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: 72,
                              height: 72,
                              borderRadius: 2,
                              bgcolor: "grey.100",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "0.7rem",
                              color: "text.secondary",
                            }}
                          >
                            No Image
                          </Box>
                        )}
                        <Box flex={1}>
                          <Typography variant="subtitle1" fontWeight={600}>
                            {item.variantName || item.variantId}
                          </Typography>
                          <Typography color="text.secondary">
                            x{item.quantity}
                          </Typography>
                        </Box>
                        <Typography fontWeight={700}>
                          {formatCurrency(item.total || 0)}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>

                  <Divider />

                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography color="text.secondary">Tạm tính</Typography>
                      <Typography fontWeight={600}>
                        {formatCurrency(orderSubtotal)}
                      </Typography>
                    </Stack>
                    {order.shippingInfo && (
                      <Stack direction="row" justifyContent="space-between">
                        <Typography color="text.secondary">Phí vận chuyển</Typography>
                        <Typography fontWeight={600}>
                          {formatCurrency(order.shippingInfo.shippingFee)}
                        </Typography>
                      </Stack>
                    )}
                    {order.voucherCode && (
                      <Stack direction="row" justifyContent="space-between">
                        <Typography color="text.secondary">Mã giảm giá</Typography>
                        <Typography fontWeight={600} color="success.main">
                          {order.voucherCode}
                        </Typography>
                      </Stack>
                    )}
                    <Stack direction="row" justifyContent="space-between" mt={1}>
                      <Typography variant="h5" fontWeight={700}>
                        Tổng cộng
                      </Typography>
                      <Typography variant="h5" fontWeight={700} color="error">
                        {formatCurrency(order.totalAmount)}
                      </Typography>
                    </Stack>
                  </Stack>

                  <Divider />

                  <Stack spacing={0.5}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Khách hàng
                    </Typography>
                    <Typography fontWeight={600}>
                      {order.recipientInfo?.fullName || order.customerName || "Khách hàng"}
                    </Typography>
                    <Typography color="text.secondary">
                      {order.recipientInfo?.fullAddress || "Nhận tại quầy"}
                    </Typography>
                  </Stack>
                </Stack>
              )}
            </Stack>
          </Paper>
        </Container>
      </Box>
    </MainLayout>
  );
};
