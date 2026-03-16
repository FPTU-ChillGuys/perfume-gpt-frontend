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
  FormHelperText,
  IconButton,
  Link,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Delete,
  Launch,
  Payments,
  PointOfSale,
  QrCodeScanner,
} from "@mui/icons-material";
import { MainLayout } from "@/layouts/MainLayout";
import { useToast } from "@/hooks/useToast";
import { orderService } from "@/services/orderService";
import { productService } from "@/services/productService";
import type {
  CreateInStoreOrderRequest,
  PaymentMethod,
} from "@/types/checkout";
import type { OrderResponse } from "@/types/order";
import type { ProductVariant } from "@/types/product";

const COUNTER_DISPLAY_ORDER_KEY = "counter:display:orderId";
const COUNTER_DISPLAY_COMMAND_KEY = "counter:display:command";

const PAYMENT_CHOICES: { value: PaymentMethod; label: string }[] = [
  { value: "CashInStore", label: "Tiền mặt tại quầy" },
  { value: "VnPay", label: "VNPay" },
  { value: "Momo", label: "MoMo" },
];

const ONLINE_PAYMENT_METHODS: PaymentMethod[] = ["VnPay", "Momo"];

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat("vi-VN").format(Number(value ?? 0)) + "đ";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isSupportedPaymentMethod = (
  value?: string | null,
): value is PaymentMethod =>
  PAYMENT_CHOICES.some((choice) => choice.value === value);

const isUuid = (value: string) => UUID_REGEX.test(value.trim());

interface DraftOrderItem {
  variantId: string;
  variantName: string;
  productName?: string | null;
  unitPrice: number;
  quantity: number;
  thumbnail?: string;
}

export const CounterCheckoutStaffPage = () => {
  const { showToast } = useToast();

  const [orderCodeInput, setOrderCodeInput] = useState("");
  const [loadedOrder, setLoadedOrder] = useState<OrderResponse | null>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);

  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>("CashInStore");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const [variantIdInput, setVariantIdInput] = useState("");
  const [quantityInput, setQuantityInput] = useState(1);
  const [draftItems, setDraftItems] = useState<DraftOrderItem[]>([]);
  const [isAddingVariant, setIsAddingVariant] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [voucherCode, setVoucherCode] = useState("");

  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState("");

  const paymentId = useMemo(
    () => loadedOrder?.paymentTransactions?.[0]?.id || "",
    [loadedOrder],
  );

  const paymentStatus = loadedOrder?.paymentStatus || "Unpaid";
  const isPaid = paymentStatus === "Paid";
  const isOnlineMethod = ONLINE_PAYMENT_METHODS.includes(selectedPaymentMethod);
  const draftSubtotal = useMemo(
    () =>
      draftItems.reduce(
        (sum, item) =>
          sum + Number(item.unitPrice ?? 0) * Number(item.quantity ?? 0),
        0,
      ),
    [draftItems],
  );

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

  const clearDisplayOrder = () => {
    window.localStorage.setItem(
      COUNTER_DISPLAY_COMMAND_KEY,
      `clear:${Date.now()}`,
    );
  };

  const clearStaffState = () => {
    setLoadedOrder(null);
    setOrderCodeInput("");
    setPaymentUrl("");
    setQrDialogOpen(false);
    setVariantIdInput("");
    setQuantityInput(1);
    setDraftItems([]);
    setRecipientName("");
    setRecipientPhone("");
    setRecipientAddress("");
    setVoucherCode("");
    setSelectedPaymentMethod("CashInStore");
  };

  const refreshLoadedOrder = async (orderId: string) => {
    const latest = await orderService.getOrderById(orderId);
    setLoadedOrder(latest);
    syncMethodFromOrder(latest);
    broadcastDisplayOrder(latest.id);
  };

  const hydrateVariantInfo = (
    variant: ProductVariant,
    quantity: number,
  ): DraftOrderItem => {
    const label = variant.productName
      ? `${variant.productName}${variant.volumeMl ? ` ${variant.volumeMl}ml` : ""}`
      : variant.sku || variant.barcode || "Biến thể";

    return {
      variantId: variant.id ?? "",
      variantName: label,
      productName: variant.productName,
      unitPrice: Number(variant.basePrice ?? 0),
      quantity,
      thumbnail: variant.media?.[0]?.url || undefined,
    };
  };

  const handleAddVariant = async () => {
    const trimmed = variantIdInput.trim();
    if (!trimmed) {
      showToast("Vui lòng nhập mã biến thể", "warning");
      return;
    }
    if (!isUuid(trimmed)) {
      showToast("Mã biến thể phải đúng định dạng UUID", "warning");
      return;
    }
    if (quantityInput <= 0) {
      showToast("Số lượng phải lớn hơn 0", "warning");
      return;
    }

    try {
      setIsAddingVariant(true);
      const variant = await productService.getVariantById(trimmed);
      if (!variant.id) {
        throw new Error("Không tìm thấy mã biến thể hợp lệ");
      }

      setDraftItems((prev) => {
        const existingIndex = prev.findIndex(
          (item) => item.variantId === variant.id,
        );
        if (existingIndex !== -1) {
          const updated = [...prev];
          const existingItem = updated[existingIndex];
          if (!existingItem) return prev;
          updated[existingIndex] = {
            ...existingItem,
            quantity: Number(existingItem.quantity ?? 0) + quantityInput,
          };
          return updated;
        }

        return [...prev, hydrateVariantInfo(variant, quantityInput)];
      });

      setVariantIdInput("");
      setQuantityInput(1);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Không thể thêm sản phẩm",
        "error",
      );
    } finally {
      setIsAddingVariant(false);
    }
  };

  const removeDraftItem = (variantId: string) => {
    setDraftItems((prev) =>
      prev.filter((item) => item.variantId !== variantId),
    );
  };

  const updateQuantity = (variantId: string, quantity: number) => {
    if (quantity <= 0) return;
    setDraftItems((prev) =>
      prev.map((item) =>
        item.variantId === variantId
          ? {
              ...item,
              quantity,
            }
          : item,
      ),
    );
  };

  const handleCreateOrder = async () => {
    if (draftItems.length === 0) {
      showToast("Vui lòng thêm ít nhất 1 sản phẩm", "warning");
      return;
    }

    const validOrderDetails = draftItems
      .map((item) => ({
        variantId: (item.variantId || "").trim(),
        quantity: Number(item.quantity ?? 0),
      }))
      .filter((item) => item.variantId.length > 0 && item.quantity > 0);

    if (validOrderDetails.length === 0) {
      showToast("Không có sản phẩm hợp lệ", "error");
      return;
    }

    const payload: CreateInStoreOrderRequest = {
      voucherCode: voucherCode.trim() || null,
      isPickupInStore: true,
      orderDetails: validOrderDetails,
      recipient: {
        recipientName,
        recipientPhoneNumber: recipientPhone,
        districtId: 0,
        districtName: "",
        wardCode: "",
        wardName: "",
        provinceId: 0,
        provinceName: "",
        fullAddress: recipientAddress,
      },
      payment: {
        method: selectedPaymentMethod,
      },
    };

    try {
      setIsCreatingOrder(true);
      const result = await orderService.checkoutInStore(payload);
      const newOrderId = result.orderId;

      if (!newOrderId) {
        throw new Error("Không nhận được mã đơn hàng sau khi tạo đơn");
      }

      setOrderCodeInput(newOrderId);
      await refreshLoadedOrder(newOrderId);
      setDraftItems([]);
      setVoucherCode("");
      showToast("Tạo đơn tại quầy thành công", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Không thể tạo đơn tại quầy",
        "error",
      );
    } finally {
      setIsCreatingOrder(false);
    }
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
      clearDisplayOrder();
      clearStaffState();
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
                    isLoadingOrder ? (
                      <CircularProgress size={18} />
                    ) : (
                      <QrCodeScanner />
                    )
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
                Tạo đơn nhanh tại quầy
              </Typography>

              <Stack spacing={2}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    label="Mã biến thể"
                    value={variantIdInput}
                    onChange={(e) => setVariantIdInput(e.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="Số lượng"
                    type="number"
                    value={quantityInput}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      setQuantityInput(
                        Number.isFinite(next) && next > 0 ? next : 1,
                      );
                    }}
                    sx={{ width: { xs: "100%", sm: 140 } }}
                  />
                  <Button
                    variant="outlined"
                    onClick={handleAddVariant}
                    disabled={isAddingVariant}
                    sx={{ whiteSpace: "nowrap" }}
                  >
                    {isAddingVariant ? <CircularProgress size={18} /> : "Thêm"}
                  </Button>
                </Stack>

                {draftItems.length > 0 ? (
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Stack spacing={1.5}>
                      {draftItems.map((item) => (
                        <Box
                          key={item.variantId}
                          display="flex"
                          alignItems="center"
                          gap={1.5}
                        >
                          <Box flex={1} minWidth={0}>
                            <Typography fontWeight={600} noWrap>
                              {item.productName || item.variantName}
                            </Typography>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              noWrap
                            >
                              {item.variantId}
                            </Typography>
                          </Box>
                          <TextField
                            type="number"
                            value={item.quantity}
                            onChange={(e) => {
                              const next = Number(e.target.value);
                              updateQuantity(
                                item.variantId,
                                Number.isFinite(next) && next > 0
                                  ? next
                                  : item.quantity,
                              );
                            }}
                            sx={{ width: 84 }}
                          />
                          <Typography
                            fontWeight={600}
                            minWidth={100}
                            textAlign="right"
                          >
                            {formatCurrency(item.unitPrice * item.quantity)}
                          </Typography>
                          <IconButton
                            color="error"
                            onClick={() => removeDraftItem(item.variantId)}
                          >
                            <Delete />
                          </IconButton>
                        </Box>
                      ))}
                    </Stack>
                    <Divider sx={{ my: 2 }} />
                    <Stack direction="row" justifyContent="space-between">
                      <Typography>Tạm tính</Typography>
                      <Typography fontWeight={700}>
                        {formatCurrency(draftSubtotal)}
                      </Typography>
                    </Stack>
                  </Paper>
                ) : (
                  <FormHelperText>
                    Chưa có sản phẩm trong đơn nháp.
                  </FormHelperText>
                )}

                <TextField
                  label="Mã giảm giá"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value)}
                />

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    label="Tên khách (tuỳ chọn)"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="SĐT (tuỳ chọn)"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    fullWidth
                  />
                </Stack>

                <TextField
                  label="Địa chỉ/Ghi chú (tuỳ chọn)"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                />

                <Button
                  variant="contained"
                  color="error"
                  size="large"
                  onClick={handleCreateOrder}
                  disabled={isCreatingOrder}
                >
                  {isCreatingOrder ? (
                    <CircularProgress size={22} />
                  ) : (
                    "Tạo đơn tại quầy"
                  )}
                </Button>
              </Stack>
            </Paper>

            <Paper sx={{ p: 3, mt: 3 }}>
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
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="h6" fontWeight={600}>
                  Thông tin đơn hàng
                </Typography>
                <Tooltip title="Mở màn hình cho khách">
                  <span>
                    <IconButton
                      onClick={openCustomerScreen}
                      disabled={!loadedOrder?.id}
                    >
                      <Launch />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>

              <Divider sx={{ my: 2 }} />

              {loadedOrder ? (
                <Stack spacing={2}>
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    flexWrap="wrap"
                  >
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

                  <Typography>
                    Mã khách: {loadedOrder.customerName || "Khách lẻ"}
                  </Typography>
                  <Typography>
                    Trạng thái đơn: {loadedOrder.status || "-"}
                  </Typography>
                  <Typography>
                    Voucher: {loadedOrder.voucherCode || "Không có"}
                  </Typography>

                  <Divider />

                  <Stack spacing={1}>
                    {loadedOrder.orderDetails?.map((detail) => (
                      <Box
                        key={detail.id}
                        display="flex"
                        alignItems="center"
                        gap={1.5}
                      >
                        {detail.imageUrl ? (
                          <Box
                            component="img"
                            src={detail.imageUrl}
                            alt={detail.variantName || "Sản phẩm"}
                            sx={{
                              width: 44,
                              height: 44,
                              borderRadius: 1,
                              objectFit: "cover",
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: 44,
                              height: 44,
                              borderRadius: 1,
                              bgcolor: "grey.100",
                              color: "text.secondary",
                              fontSize: "0.65rem",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            No Image
                          </Box>
                        )}
                        <Box flex={1} minWidth={0}>
                          <Typography noWrap>{detail.variantName}</Typography>
                        </Box>
                        <Typography sx={{ whiteSpace: "nowrap" }}>
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
                  Chưa có đơn hàng nào được tải. Hãy nhập mã đơn để bắt đầu
                  thanh toán.
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
