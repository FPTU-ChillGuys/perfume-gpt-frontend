import { useCallback, useEffect, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import {
  Box,
  Container,
  Button,
  Typography,
  Paper,
  IconButton,
  CircularProgress,
  Divider,
  Card,
  CardContent,
  Checkbox,
  Alert,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  Stack,
} from "@mui/material";
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Delete as DeleteIcon,
  ArrowBack,
  ShoppingCart,
  CheckCircle,
  RadioButtonUnchecked,
  LocalOffer,
  Close as CloseIcon,
} from "@mui/icons-material";
import { MainLayout } from "@/layouts/MainLayout";
import { cartService } from "@/services/cartService";
import type { CartItem, CartTotals, ApplyVoucherResponse } from "@/types/cart";
import { useToast } from "@/hooks/useToast";
import { useCart } from "@/hooks/useCart";
import {
  voucherService,
  type ApplicableVoucherCartItemRequest,
} from "@/services/voucherService";
import { VoucherPickerDialog } from "@/components/common/VoucherPickerDialog";

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat("vi-VN").format(Number(value ?? 0)) + "đ";

export const CartPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { refreshCart } = useCart();
  const [items, setItems] = useState<CartItem[]>([]);
  const [totals, setTotals] = useState<CartTotals>({
    subtotal: 0,
    shippingFee: 0,
    discount: 0,
    totalPrice: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [selectedCartItemIds, setSelectedCartItemIds] = useState<string[]>([]);
  const [hasInitializedSelection, setHasInitializedSelection] = useState(false);
  const [totalsWarningMessage, setTotalsWarningMessage] = useState<
    string | null
  >(null);
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] =
    useState<ApplyVoucherResponse | null>(null);
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [voucherPickerOpen, setVoucherPickerOpen] = useState(false);
  const [loadingMyVouchers, setLoadingMyVouchers] = useState(false);

  const roundCheckboxSx = {
    p: 0.5,
    color: "grey.500",
    "&.Mui-checked": {
      color: "error.main",
    },
  };

  const getSelectableItemIds = useCallback(
    () => items.map((item) => item.cartItemId).filter(Boolean) as string[],
    [items],
  );

  const shouldQuerySelectedItems = useCallback(
    (ids: string[]) => {
      const allIds = getSelectableItemIds();
      return ids.length > 0 && ids.length < allIds.length;
    },
    [getSelectableItemIds],
  );

  const loadTotals = useCallback(
    async (selectedIds: string[], voucherCodeOverride?: string | null) => {
      try {
        const allIds = getSelectableItemIds();
        if (!allIds.length || selectedIds.length === 0) {
          setTotals({
            subtotal: 0,
            shippingFee: 0,
            discount: 0,
            totalPrice: 0,
          });
          setTotalsWarningMessage(null);
          return null;
        }

        const activeVoucher =
          voucherCodeOverride !== undefined
            ? voucherCodeOverride || undefined
            : appliedVoucher?.voucherCode || undefined;

        const totalsData = shouldQuerySelectedItems(selectedIds)
          ? await cartService.getTotals(activeVoucher, selectedIds)
          : await cartService.getTotals(activeVoucher);

        setTotals(totalsData);
        setTotalsWarningMessage(totalsData.warningMessage || null);
        return totalsData;
      } catch (error) {
        console.error("Error loading cart totals:", error);
        setTotalsWarningMessage(null);
        // Đối với voucher error, throw lại để preserve message từ server
        if (voucherCodeOverride) {
          throw error;
        }
        return null;
      }
    },
    [getSelectableItemIds, shouldQuerySelectedItems, appliedVoucher],
  );

  const loadCart = useCallback(
    async (withLoader: boolean = false) => {
      if (withLoader) {
        setIsLoading(true);
      }

      try {
        const fetchedItems = await cartService.getItems();

        setItems(fetchedItems);
        const fetchedItemIds = fetchedItems
          .map((item) => item.cartItemId)
          .filter(Boolean) as string[];

        setSelectedCartItemIds((prev) => {
          if (!hasInitializedSelection) {
            return fetchedItemIds;
          }

          const filteredPrev = prev.filter((id) => fetchedItemIds.includes(id));
          if (filteredPrev.length === 0 && fetchedItemIds.length > 0) {
            return fetchedItemIds;
          }
          return filteredPrev;
        });

        if (!hasInitializedSelection) {
          setHasInitializedSelection(true);
        }

        return true;
      } catch (error) {
        console.error("Error in loadCart:", error);
        showToast(
          error instanceof Error
            ? error.message
            : "Không thể tải giỏ hàng. Vui lòng thử lại.",
          "error",
        );
        return false;
      } finally {
        if (withLoader) {
          setIsLoading(false);
        }
      }
    },
    [hasInitializedSelection, showToast],
  );

  // Initial load - chỉ chạy một lần khi component mount
  useEffect(() => {
    void loadCart(true);
    // Load voucher from sessionStorage if exists
    const savedVoucher = sessionStorage.getItem("appliedVoucherCode");
    if (savedVoucher) {
      setVoucherCode(savedVoucher);
    }

    // Cleanup: Remove voucher when leaving cart (unless going to checkout)
    return () => {
      // Small delay to check where we're navigating
      setTimeout(() => {
        const currentPath = window.location.pathname;
        // Only keep voucher if navigating to checkout
        if (!currentPath.includes("/checkout")) {
          sessionStorage.removeItem("appliedVoucherCode");
        }
      }, 100);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-apply voucher after items loaded
  useEffect(() => {
    if (!hasInitializedSelection || !voucherCode || appliedVoucher) {
      return;
    }
    const savedVoucher = sessionStorage.getItem("appliedVoucherCode");
    if (savedVoucher && savedVoucher === voucherCode && items.length > 0) {
      // Auto apply voucher from session
      setTimeout(() => {
        void applyVoucher(voucherCode);
      }, 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasInitializedSelection, items.length]);

  useEffect(() => {
    if (!hasInitializedSelection) {
      return;
    }
    void loadTotals(selectedCartItemIds);
  }, [hasInitializedSelection, loadTotals, selectedCartItemIds]);

  const getCartItemsForVoucher = (): ApplicableVoucherCartItemRequest[] => {
    return items
      .filter((item) => selectedCartItemIds.includes(item.cartItemId!))
      .map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
        price: item.finalTotal && item.quantity
          ? Math.round(Number(item.finalTotal) / item.quantity)
          : item.variantPrice,
      }));
  };

  const applyVoucher = async (code: string) => {
    const normalizedVoucher = code.trim();

    if (!normalizedVoucher) {
      return;
    }

    if (
      appliedVoucher &&
      appliedVoucher.voucherCode.toLowerCase() ===
        normalizedVoucher.toLowerCase()
    ) {
      return;
    }

    setVoucherError(null);
    setIsApplyingVoucher(true);
    try {
      const updatedTotals = await loadTotals(
        selectedCartItemIds,
        normalizedVoucher,
      );

      if (!updatedTotals) {
        setAppliedVoucher(null);
        setVoucherError("Mã giảm giá không khả dụng. Vui lòng thử lại.");
        return;
      }

      setAppliedVoucher({
        voucherCode: normalizedVoucher,
        discountAmount: updatedTotals?.discount ?? 0,
        finalAmount: updatedTotals?.totalPrice ?? 0,
        message: "", // No message to avoid display
      });
      setVoucherCode(normalizedVoucher);
      // Save to sessionStorage for sync with checkout
      sessionStorage.setItem("appliedVoucherCode", normalizedVoucher);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Mã giảm giá không hợp lệ";
      setVoucherError(msg || "Mã giảm giá không khả dụng. Vui lòng thử lại.");
    } finally {
      setIsApplyingVoucher(false);
    }
  };

  const removeVoucher = async () => {
    setIsApplyingVoucher(true);
    try {
      setAppliedVoucher(null);
      setVoucherCode("");
      setVoucherError(null);
      // Remove from sessionStorage when user manually removes voucher
      sessionStorage.removeItem("appliedVoucherCode");
      await loadTotals(selectedCartItemIds, null);
    } catch (error) {
      // Silent error
    } finally {
      setIsApplyingVoucher(false);
    }
  };

  const handleToggleItem = (cartItemId?: string) => {
    if (!cartItemId) {
      return;
    }

    setSelectedCartItemIds((prev) =>
      prev.includes(cartItemId)
        ? prev.filter((id) => id !== cartItemId)
        : [...prev, cartItemId],
    );
  };

  const handleToggleSelectAll = (checked: boolean) => {
    const allIds = getSelectableItemIds();
    setSelectedCartItemIds(checked ? allIds : []);
  };

  const handleQuantityChange = async (
    cartItemId: string | undefined,
    delta: number,
  ) => {
    if (!cartItemId) {
      return;
    }

    const currentItem = items.find((item) => item.cartItemId === cartItemId);
    if (!currentItem) {
      return;
    }

    const currentQuantity = currentItem.quantity ?? 1;
    const nextQuantity = Math.max(1, currentQuantity + delta);
    if (nextQuantity === currentQuantity) {
      return;
    }

    setUpdatingItemId(cartItemId);
    try {
      await cartService.updateCartItem(cartItemId, nextQuantity);
      await loadCart();
      await refreshCart();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Không thể cập nhật số lượng",
        "error",
      );
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleRemoveItem = async (cartItemId: string | undefined) => {
    if (!cartItemId) {
      return;
    }

    setConfirmDeleteId(cartItemId);
  };

  const doRemoveItem = async (cartItemId: string) => {
    setConfirmDeleteId(null);
    setUpdatingItemId(cartItemId);
    try {
      await cartService.removeCartItem(cartItemId);
      await loadCart();
      await refreshCart();
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Không thể xóa sản phẩm. Vui lòng thử lại.",
        "error",
      );
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleClearCart = () => {
    if (items.length === 0) return;
    setConfirmClearOpen(true);
  };

  const doClearCart = async () => {
    setConfirmClearOpen(false);
    setIsClearing(true);
    try {
      await cartService.clearCart();
      await loadCart();
      setSelectedCartItemIds([]);
      setHasInitializedSelection(false);
      await refreshCart();
      setAppliedVoucher(null);
      setVoucherCode("");
      setVoucherError(null);
      // Remove from sessionStorage when clearing cart
      sessionStorage.removeItem("appliedVoucherCode");
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Không thể xóa giỏ hàng. Vui lòng thử lại.",
        "error",
      );
    } finally {
      setIsClearing(false);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <Container maxWidth="lg" sx={{ py: 4 }}>
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
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" alignItems="center" gap={2} mb={4}>
          <Button
            startIcon={<ArrowBack />}
            component={RouterLink}
            to="/"
            variant="outlined"
            sx={{ minWidth: "auto" }}
          >
            Tiếp tục mua hàng
          </Button>
          <Box flex={1}>
            <Typography variant="h4" fontWeight="bold">
              Giỏ hàng của bạn
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ({items.length} sản phẩm)
            </Typography>
          </Box>
        </Box>

        {items.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: "center" }}>
            <ShoppingCart
              sx={{ fontSize: 64, color: "text.disabled", mb: 2 }}
            />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Giỏ hàng đang trống
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Khám phá các bộ sưu tập mới nhất của chúng tôi.
            </Typography>
            <Button
              variant="contained"
              color="error"
              component={RouterLink}
              to="/"
            >
              Khám phá ngay
            </Button>
          </Paper>
        ) : (
          <Box
            display="grid"
            gridTemplateColumns={{ xs: "1fr", md: "2fr 1fr" }}
            gap={4}
          >
            <Box
              sx={{
                maxHeight: "calc(100vh - 250px)",
                overflowY: "auto",
                pr: 1,
              }}
            >
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                mb={2}
              >
                <Box display="flex" alignItems="center" gap={1}>
                  <Checkbox
                    checked={
                      getSelectableItemIds().length > 0 &&
                      selectedCartItemIds.length ===
                        getSelectableItemIds().length
                    }
                    onChange={(e) => handleToggleSelectAll(e.target.checked)}
                    icon={<RadioButtonUnchecked fontSize="small" />}
                    checkedIcon={<CheckCircle fontSize="small" />}
                    sx={roundCheckboxSx}
                  />
                  <Typography variant="body2" fontWeight={500}>
                    Chọn tất cả
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Đã chọn {selectedCartItemIds.length}/
                  {getSelectableItemIds().length}
                </Typography>
              </Box>

              <Box display="flex" flexDirection="column" gap={3}>
                {items.map((item, index) => {
                  const itemKey =
                    item.cartItemId ?? `${item.variantId}-${index}`;
                  const quantity = Math.max(1, item.quantity ?? 1);
                  // Strict check: only true if discount exists AND is greater than 0
                  const hasDiscount = !!(
                    item.discount &&
                    Number(item.discount) > 0 &&
                    item.subTotal &&
                    Number(item.subTotal) > 0
                  );
                  const percentage = hasDiscount
                    ? Math.round(
                        (Number(item.discount) / Number(item.subTotal)) * 100,
                      )
                    : 0;
                  const lineTotal = item.finalTotal
                    ? Number(item.finalTotal)
                    : item.subTotal
                      ? Number(item.subTotal)
                      : Number(item.variantPrice ?? 0) * quantity;

                  return (
                    <Box
                      key={itemKey}
                      display="flex"
                      alignItems={{ xs: "flex-start", sm: "center" }}
                      gap={1.5}
                    >
                      <Checkbox
                        checked={
                          item.cartItemId
                            ? selectedCartItemIds.includes(item.cartItemId)
                            : false
                        }
                        onChange={() => handleToggleItem(item.cartItemId)}
                        disabled={!item.cartItemId}
                        icon={<RadioButtonUnchecked fontSize="small" />}
                        checkedIcon={<CheckCircle fontSize="small" />}
                        sx={roundCheckboxSx}
                      />
                      <Card elevation={2} sx={{ flex: 1 }}>
                        <CardContent>
                          <Box
                            display="flex"
                            flexDirection={{ xs: "column", sm: "row" }}
                            gap={3}
                          >
                            <Box
                              sx={{
                                width: { xs: "100%", sm: 120 },
                                height: 120,
                                bgcolor: "grey.100",
                                borderRadius: 2,
                                overflow: "hidden",
                              }}
                            >
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt={item.variantName ?? "Sản phẩm"}
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                />
                              ) : (
                                <Box
                                  display="flex"
                                  alignItems="center"
                                  justifyContent="center"
                                  height="100%"
                                >
                                  <Typography
                                    variant="caption"
                                    color="text.disabled"
                                  >
                                    Chưa có ảnh
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                            <Box flex={1}>
                              <Box
                                display="flex"
                                alignItems="flex-start"
                                gap={1}
                                mb={1}
                              >
                                <Typography
                                  variant="h6"
                                  fontWeight={600}
                                  flex={1}
                                >
                                  {item.variantName ?? "Sản phẩm chưa đặt tên"}
                                </Typography>
                                {hasDiscount && (
                                  <Chip
                                    icon={<LocalOffer fontSize="small" />}
                                    label={`-${percentage}%`}
                                    color="error"
                                    size="small"
                                    sx={{ fontWeight: 600 }}
                                  />
                                )}
                              </Box>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                mb={2}
                              >
                                {item.volumeMl ? `${item.volumeMl} ml` : ""}
                                {item.volumeMl && item.variantPrice
                                  ? " • "
                                  : ""}
                                {item.variantPrice
                                  ? formatCurrency(item.variantPrice)
                                  : ""}
                              </Typography>
                              <Box
                                display="flex"
                                alignItems="center"
                                justifyContent="space-between"
                                flexWrap="wrap"
                                gap={2}
                                pt={2}
                                borderTop={1}
                                borderColor="divider"
                              >
                                <Box
                                  display="flex"
                                  alignItems="center"
                                  gap={1}
                                  border={1}
                                  borderColor="divider"
                                  borderRadius={"24px"}
                                  px={2}
                                  py={0.5}
                                >
                                  <IconButton
                                    size="small"
                                    aria-label="Giảm số lượng"
                                    onClick={() =>
                                      handleQuantityChange(item.cartItemId, -1)
                                    }
                                    disabled={
                                      quantity <= 1 ||
                                      updatingItemId === item.cartItemId
                                    }
                                  >
                                    <RemoveIcon fontSize="small" />
                                  </IconButton>
                                  <Typography
                                    variant="body2"
                                    fontWeight={600}
                                    minWidth="2ch"
                                    textAlign="center"
                                  >
                                    {quantity}
                                  </Typography>
                                  <IconButton
                                    size="small"
                                    aria-label="Tăng số lượng"
                                    onClick={() =>
                                      handleQuantityChange(item.cartItemId, 1)
                                    }
                                    disabled={
                                      updatingItemId === item.cartItemId
                                    }
                                  >
                                    <AddIcon fontSize="small" />
                                  </IconButton>
                                </Box>
                                <Box
                                  display="flex"
                                  flexDirection="column"
                                  alignItems="flex-end"
                                  gap={0.5}
                                >
                                  {hasDiscount && item.subTotal && (
                                    <Typography
                                      variant="body2"
                                      color="text.secondary"
                                      sx={{ textDecoration: "line-through" }}
                                    >
                                      {formatCurrency(item.subTotal)}
                                    </Typography>
                                  )}
                                  <Typography
                                    variant="h6"
                                    color="error"
                                    fontWeight={600}
                                  >
                                    {formatCurrency(lineTotal)}
                                  </Typography>
                                </Box>
                                <Button
                                  size="small"
                                  color="error"
                                  startIcon={<DeleteIcon />}
                                  onClick={() =>
                                    handleRemoveItem(item.cartItemId)
                                  }
                                  disabled={updatingItemId === item.cartItemId}
                                >
                                  Xóa
                                </Button>
                              </Box>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Box>
                  );
                })}
              </Box>
            </Box>

            <Box>
              <Paper sx={{ p: 3, position: "sticky", top: 80 }} elevation={3}>
                <Typography variant="h6" fontWeight={600} mb={2}>
                  Tóm tắt đơn hàng
                </Typography>

                {/* Voucher */}
                <Box mb={2}>
                  <Box display="flex" gap={1} alignItems="stretch">
                    <TextField
                      size="small"
                      placeholder="Mã giảm giá"
                      value={voucherCode}
                      onChange={(e) => {
                        setVoucherCode(e.target.value);
                        if (voucherError) setVoucherError(null);
                      }}
                      disabled={!!appliedVoucher || isApplyingVoucher}
                      error={!!voucherError}
                      fullWidth
                    />
                    {!appliedVoucher && (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => applyVoucher(voucherCode)}
                        disabled={isApplyingVoucher || !voucherCode.trim()}
                        sx={{
                          minWidth: 110,
                          whiteSpace: "nowrap",
                          px: 2,
                        }}
                      >
                        {isApplyingVoucher ? "Xử lý..." : "Áp dụng"}
                      </Button>
                    )}
                  </Box>
                  {!appliedVoucher && (
                    <Button
                      variant="outlined"
                      size="small"
                      fullWidth
                      startIcon={<LocalOffer />}
                      onClick={async () => {
                        setVoucherPickerOpen(true);
                        setLoadingMyVouchers(true);
                      }}
                      disabled={isApplyingVoucher}
                      sx={{ mt: 1 }}
                    >
                      Chọn voucher
                    </Button>
                  )}
                  {voucherError && (
                    <Typography
                      variant="caption"
                      color="error"
                      sx={{ mt: 0.5, display: "block" }}
                    >
                      {voucherError}
                    </Typography>
                  )}
                  {appliedVoucher && (
                    <Box
                      sx={{
                        mt: 1,
                        p: 1.5,
                        bgcolor: "success.lighter",
                        borderRadius: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography
                          variant="body2"
                          color="success.main"
                          fontWeight={600}
                        >
                          ✓ {appliedVoucher.voucherCode}
                        </Typography>
                        {totals.discount > 0 && (
                          <Typography variant="caption" color="success.main">
                            -{formatCurrency(totals.discount)}
                          </Typography>
                        )}
                      </Box>
                      <Button
                        size="small"
                        color="error"
                        onClick={removeVoucher}
                        disabled={isApplyingVoucher}
                        sx={{ minWidth: 50, fontSize: "0.75rem" }}
                      >
                        Xóa
                      </Button>
                    </Box>
                  )}
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="text.secondary">
                    Tạm tính
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formatCurrency(totals.subtotal)}
                  </Typography>
                </Box>
                {totals.discount > 0 && (
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" color="success.main">
                      Giảm giá
                    </Typography>
                    <Typography
                      variant="body2"
                      color="success.main"
                      fontWeight={600}
                    >
                      -{formatCurrency(totals.discount)}
                    </Typography>
                  </Box>
                )}
                <Divider sx={{ my: 2 }} />
                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Typography variant="h6" fontWeight={600}>
                    Tổng
                  </Typography>
                  <Typography variant="h6" fontWeight={700} color="error">
                    {formatCurrency(totals.totalPrice || totals.subtotal)}
                  </Typography>
                </Box>

                <Button
                  fullWidth
                  variant="contained"
                  color="error"
                  size="large"
                  onClick={() => {
                    // Ensure voucher is saved before navigation
                    if (appliedVoucher?.voucherCode) {
                      sessionStorage.setItem(
                        "appliedVoucherCode",
                        appliedVoucher.voucherCode,
                      );
                    }
                    navigate("/checkout", {
                      state: {
                        selectedCartItemIds,
                        voucherCode: appliedVoucher?.voucherCode,
                      },
                    });
                  }}
                  disabled={selectedCartItemIds.length === 0}
                  sx={{ py: 1.5, mt: 2 }}
                >
                  Thanh toán ({selectedCartItemIds.length})
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  color="error"
                  size="medium"
                  onClick={handleClearCart}
                  disabled={isClearing || items.length === 0}
                  sx={{ mt: 1.5 }}
                >
                  {isClearing ? <CircularProgress size={20} /> : "Xóa giỏ hàng"}
                </Button>
              </Paper>
            </Box>
          </Box>
        )}
      </Container>

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Xóa sản phẩm"
        description="Bạn có chắc muốn xóa sản phẩm này khỏi giỏ hàng?"
        confirmText="Xóa"
        loading={updatingItemId === confirmDeleteId}
        onConfirm={() => confirmDeleteId && void doRemoveItem(confirmDeleteId)}
        onClose={() => setConfirmDeleteId(null)}
      />

      <ConfirmDialog
        open={confirmClearOpen}
        title="Xóa toàn bộ giỏ hàng"
        description="Toàn bộ sản phẩm trong giỏ hàng sẽ bị xóa. Bạn có chắc chắn không?"
        confirmText="Xóa hết"
        loading={isClearing}
        onConfirm={() => void doClearCart()}
        onClose={() => setConfirmClearOpen(false)}
      />

      {/* Voucher picker dialog */}
      <VoucherPickerDialog
        open={voucherPickerOpen}
        onClose={() => setVoucherPickerOpen(false)}
        onApplyVoucher={applyVoucher}
        cartItems={getCartItemsForVoucher()}
        isApplying={isApplyingVoucher}
      />
    </MainLayout>
  );
};
