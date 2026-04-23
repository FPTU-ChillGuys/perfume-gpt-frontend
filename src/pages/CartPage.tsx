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
  const [voucherCode, setVoucherCode] = useState(
    () => sessionStorage.getItem("appliedVoucherCode") ?? "",
  );
  const [appliedVoucher, setAppliedVoucher] =
    useState<ApplyVoucherResponse | null>(null);
  // Start as true if there's a saved voucher to auto-apply, so the input is
  // never shown before the auto-apply completes.
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(
    () => !!sessionStorage.getItem("appliedVoucherCode"),
  );
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [voucherPickerOpen, setVoucherPickerOpen] = useState(false);
  const [loadingMyVouchers, setLoadingMyVouchers] = useState(false);
  // Local draft quantities for the inline text inputs (keyed by cartItemId)
  const [inputQuantities, setInputQuantities] = useState<Record<string, string>>({});

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

        // Sync local draft quantities with the freshly-fetched data
        setInputQuantities((prev) => {
          const next: Record<string, string> = { ...prev };
          fetchedItems.forEach((item) => {
            if (item.cartItemId) {
              next[item.cartItemId] = String(Math.max(1, item.quantity ?? 1));
            }
          });
          return next;
        });

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
      void applyVoucher(voucherCode);
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
        price:
          item.finalTotal && item.quantity
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

  const clearVoucherOnCartChange = () => {
    if (appliedVoucher) {
      setAppliedVoucher(null);
      setVoucherCode("");
      setVoucherError(null);
      sessionStorage.removeItem("appliedVoucherCode");
      showToast("Mã giảm giá đã bị xóa do thay đổi giỏ hàng.", "info");
    }
  };

  const handleToggleItem = (cartItemId?: string) => {
    if (!cartItemId) {
      return;
    }

    const isDeselecting = selectedCartItemIds.includes(cartItemId);
    if (isDeselecting) {
      clearVoucherOnCartChange();
    }

    setSelectedCartItemIds((prev) =>
      isDeselecting
        ? prev.filter((id) => id !== cartItemId)
        : [...prev, cartItemId],
    );
  };

  const handleToggleSelectAll = (checked: boolean) => {
    if (!checked) {
      clearVoucherOnCartChange();
    }
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

    // Optimistically update the draft input so it feels instant
    setInputQuantities((prev) => ({ ...prev, [cartItemId]: String(nextQuantity) }));

    setUpdatingItemId(cartItemId);

    // Removing quantity may invalidate voucher conditions — clear it proactively
    if (delta < 0) {
      clearVoucherOnCartChange();
    }

    try {
      await cartService.updateCartItem(cartItemId, nextQuantity);
      await loadCart();
      await refreshCart();
    } catch (error) {
      // Revert optimistic update on error
      setInputQuantities((prev) => ({ ...prev, [cartItemId]: String(currentQuantity) }));
      showToast(
        error instanceof Error ? error.message : "Không thể cập nhật số lượng",
        "error",
      );
    } finally {
      setUpdatingItemId(null);
    }
  };

  /**
   * Called when the user types directly into the quantity TextField.
   * Only updates the local draft — no API call yet.
   */
  const handleQuantityInputChange = (cartItemId: string, value: string) => {
    // Allow empty string while typing; clamp on commit
    if (/^\d*$/.test(value)) {
      setInputQuantities((prev) => ({ ...prev, [cartItemId]: value }));
    }
  };

  /**
   * Commits the draft quantity to the API when the user leaves the field
   * or presses Enter.
   */
  const handleQuantityInputCommit = async (cartItemId: string) => {
    const currentItem = items.find((item) => item.cartItemId === cartItemId);
    if (!currentItem) return;

    const draft = inputQuantities[cartItemId] ?? "";
    const parsed = parseInt(draft, 10);
    const currentQuantity = currentItem.quantity ?? 1;

    // Reject invalid / zero values — revert to current
    if (!Number.isFinite(parsed) || parsed < 1) {
      setInputQuantities((prev) => ({ ...prev, [cartItemId]: String(currentQuantity) }));
      return;
    }

    if (parsed === currentQuantity) {
      return; // Nothing changed
    }

    setUpdatingItemId(cartItemId);

    if (parsed < currentQuantity) {
      clearVoucherOnCartChange();
    }

    try {
      await cartService.updateCartItem(cartItemId, parsed);
      await loadCart();
      await refreshCart();
    } catch (error) {
      // Revert to the last confirmed quantity on error
      setInputQuantities((prev) => ({ ...prev, [cartItemId]: String(currentQuantity) }));
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

    // Removing an item may invalidate voucher conditions — clear it proactively
    clearVoucherOnCartChange();

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
          <Box flex={1}>
            <Typography variant="h4" fontWeight="bold">
              Giỏ hàng của bạn
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ({items.length} sản phẩm)
            </Typography>
          </Box>
          <Button
            startIcon={<ArrowBack />}
            component={RouterLink}
            to="/"
            variant="outlined"
            sx={{ minWidth: "auto" }}
          >
            Tiếp tục mua hàng
          </Button>
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

                  // Promotional breakdown
                  const promoQty = Math.max(0, item.promotionalQuantity ?? 0);
                  const regularQty = Math.max(0, item.regularQuantity ?? 0);
                  const baseUnitPrice = Number(item.variantPrice ?? 0);
                  // Promo unit price = (finalTotal - regularQty * baseUnitPrice) / promoQty
                  const promoUnitPrice =
                    promoQty > 0 && item.finalTotal != null && baseUnitPrice > 0
                      ? (Number(item.finalTotal) - regularQty * baseUnitPrice) / promoQty
                      : null;
                  const showPromoBreakdown = promoQty > 0;

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
                                mb={showPromoBreakdown ? 1 : 2}
                              >
                                {item.volumeMl ? `${item.volumeMl} ml` : ""}
                                {item.volumeMl && item.variantPrice
                                  ? " \u2022 "
                                  : ""}
                                {item.variantPrice
                                  ? formatCurrency(item.variantPrice)
                                  : ""}
                              </Typography>

                              {/* Promotional quantity breakdown */}
                              {showPromoBreakdown && (
                                <Box
                                  display="flex"
                                  flexWrap="wrap"
                                  gap={1}
                                  mb={2}
                                  alignItems="center"
                                >
                                  {/* Promo items */}
                                  <Box
                                    sx={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 0.5,
                                      px: 1.25,
                                      py: 0.5,
                                      borderRadius: "20px",
                                      bgcolor: "error.50",
                                      border: "1px solid",
                                      borderColor: "error.200",
                                    }}
                                  >
                                    <Typography
                                      variant="caption"
                                      fontWeight={600}
                                      color="error.main"
                                    >
                                      {promoQty} SP khuyến mãi
                                      {promoUnitPrice !== null &&
                                        promoUnitPrice > 0 &&
                                        ` \u00d7 ${formatCurrency(promoUnitPrice)}`}
                                    </Typography>
                                  </Box>

                                  {/* Regular items */}
                                  {regularQty > 0 && (
                                    <Box
                                      sx={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 0.5,
                                        px: 1.25,
                                        py: 0.5,
                                        borderRadius: "20px",
                                        bgcolor: "grey.100",
                                        border: "1px solid",
                                        borderColor: "grey.300",
                                      }}
                                    >
                                      <Typography
                                        variant="caption"
                                        fontWeight={600}
                                        color="text.secondary"
                                      >
                                        {regularQty} SP giá thường
                                        {baseUnitPrice > 0 &&
                                          ` \u00d7 ${formatCurrency(baseUnitPrice)}`}
                                      </Typography>
                                    </Box>
                                  )}
                                </Box>
                              )}
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
                                  gap={0.5}
                                  border={1}
                                  borderColor="divider"
                                  borderRadius={"24px"}
                                  px={1}
                                  py={0.25}
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
                                  <TextField
                                    size="small"
                                    value={
                                      item.cartItemId
                                        ? (inputQuantities[item.cartItemId] ?? String(quantity))
                                        : String(quantity)
                                    }
                                    onChange={(e) =>
                                      item.cartItemId &&
                                      handleQuantityInputChange(
                                        item.cartItemId,
                                        e.target.value,
                                      )
                                    }
                                    onBlur={() =>
                                      item.cartItemId &&
                                      void handleQuantityInputCommit(item.cartItemId)
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" && item.cartItemId) {
                                        void handleQuantityInputCommit(item.cartItemId);
                                        (e.target as HTMLInputElement).blur();
                                      }
                                    }}
                                    disabled={updatingItemId === item.cartItemId}
                                    inputProps={{
                                      min: 1,
                                      style: {
                                        textAlign: "center",
                                        width: 32,
                                        padding: "2px 4px",
                                        fontWeight: 600,
                                        fontSize: "0.875rem",
                                      },
                                    }}
                                    sx={{
                                      "& .MuiOutlinedInput-root": {
                                        borderRadius: "8px",
                                        "& fieldset": { border: "none" },
                                      },
                                      width: 52,
                                    }}
                                  />
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
                  {/* Code input row — always visible, disabled when voucher applied */}
                  <Box display="flex" gap={1} alignItems="stretch" mb={1}>
                    <TextField
                      size="small"
                      placeholder="Nhập mã giảm giá"
                      value={voucherCode}
                      onChange={(e) => {
                        setVoucherCode(e.target.value);
                        if (voucherError) setVoucherError(null);
                      }}
                      disabled={!!appliedVoucher || isApplyingVoucher}
                      error={!!voucherError}
                      fullWidth
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && voucherCode.trim()) {
                          void applyVoucher(voucherCode);
                        }
                      }}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: "8px",
                        },
                      }}
                    />
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => applyVoucher(voucherCode)}
                      disabled={
                      !!appliedVoucher ||
                      isApplyingVoucher ||
                      !voucherCode.trim()
                    }
                      sx={{
                        minWidth: 90,
                        whiteSpace: "nowrap",
                        borderRadius: "8px",
                        fontWeight: 600,
                      }}
                    >
                      {isApplyingVoucher ? "Xử lý..." : "Áp dụng"}
                    </Button>
                  </Box>

                  {voucherError && (
                    <Typography
                      variant="caption"
                      color="error"
                      sx={{ mb: 1, display: "block" }}
                    >
                      {voucherError}
                    </Typography>
                  )}

                  {/* Applied voucher */}
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
                        mb: 1,
                      }}
                    >
                      <Box display="flex" flexDirection="column" gap={0.5}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography
                            sx={{
                              fontSize: "0.65rem",
                              fontWeight: 600,
                              color: "success.main",
                              lineHeight: 1.4,
                            }}
                          >
                            ✓ {appliedVoucher.voucherCode}
                          </Typography>
                          {totals.discount > 0 && (
                            <Typography
                              sx={{
                                fontSize: "0.77rem",
                                fontWeight: 600,
                                color: "success.main",
                              }}
                            >
                              -{formatCurrency(totals.discount)}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      <Button
                        size="small"
                        color="error"
                        onClick={removeVoucher}
                        disabled={isApplyingVoucher}
                        sx={{
                          minWidth: 48,
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          px: 1,
                          py: 0.4,
                          borderRadius: "8px",
                          flexShrink: 0,
                        }}
                      >
                        Xóa
                      </Button>
                    </Box>
                  )}

                  {/* Choose voucher button */}
                  <Button
                    variant="outlined"
                    size="small"
                    fullWidth
                    onClick={() => {
                      setVoucherPickerOpen(true);
                      setLoadingMyVouchers(true);
                    }}
                    disabled={isApplyingVoucher}
                    sx={{
                      borderRadius: "8px",
                      borderStyle: "dashed",
                      borderColor: "error.300",
                      color: "error.main",
                      fontWeight: 600,
                      fontSize: "0.8rem",
                      py: 0.75,
                      "&:hover": {
                        borderStyle: "dashed",
                        bgcolor: "error.50",
                        borderColor: "error.main",
                      },
                    }}
                  >
                    {appliedVoucher ? "Đổi voucher khác" : "Chọn voucher"}
                  </Button>
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
