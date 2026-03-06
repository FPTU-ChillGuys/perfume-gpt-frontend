import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
} from "@mui/material";
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Delete as DeleteIcon,
  ArrowBack,
  ShoppingCart,
} from "@mui/icons-material";
import { MainLayout } from "@/layouts/MainLayout";
import { cartService } from "@/services/cartService";
import type { CartItem, CartTotals } from "@/types/cart";
import { useToast } from "@/hooks/useToast";
import { useCart } from "@/hooks/useCart";

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

  const loadCart = useCallback(
    async (withLoader: boolean = false) => {
      if (withLoader) {
        setIsLoading(true);
      }

      try {
        const { items: fetchedItems, totals: fetchedTotals } =
          await cartService.getCartWithTotals();

        setItems(fetchedItems);
        setTotals(fetchedTotals);

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
    [showToast],
  );

  // Initial load - chỉ chạy một lần khi component mount
  useEffect(() => {
    void loadCart(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      showToast("Đã cập nhật số lượng", "success");
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

    setUpdatingItemId(cartItemId);
    try {
      await cartService.removeCartItem(cartItemId);
      await loadCart();
      await refreshCart();
      showToast("Đã xóa sản phẩm khỏi giỏ hàng", "success");
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

  const handleClearCart = async () => {
    if (items.length === 0) {
      return;
    }

    setIsClearing(true);
    try {
      await cartService.clearCart();
      await loadCart();
      await refreshCart();
      showToast("Đã xóa toàn bộ giỏ hàng", "success");
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
            onClick={() => navigate("/")}
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
              onClick={() => navigate("/")}
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
              <Box display="flex" flexDirection="column" gap={3}>
                {items.map((item, index) => {
                  const itemKey =
                    item.cartItemId ?? `${item.variantId}-${index}`;
                  const quantity = Math.max(1, item.quantity ?? 1);
                  const lineTotal = item.subTotal
                    ? Number(item.subTotal)
                    : Number(item.variantPrice ?? 0) * quantity;

                  return (
                    <Card key={itemKey} elevation={2}>
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
                            <Typography
                              variant="h6"
                              fontWeight={600}
                              gutterBottom
                            >
                              {item.variantName ?? "Sản phẩm chưa đặt tên"}
                            </Typography>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              mb={2}
                            >
                              {item.volumeMl ? `${item.volumeMl} ml` : ""}
                              {item.volumeMl && item.variantPrice ? " • " : ""}
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
                                  onClick={() =>
                                    handleQuantityChange(item.cartItemId, 1)
                                  }
                                  disabled={updatingItemId === item.cartItemId}
                                >
                                  <AddIcon fontSize="small" />
                                </IconButton>
                              </Box>
                              <Typography
                                variant="h6"
                                color="error"
                                fontWeight={600}
                              >
                                {formatCurrency(lineTotal)}
                              </Typography>
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
                  );
                })}
              </Box>
            </Box>

            <Box>
              <Paper sx={{ p: 3, position: "sticky", top: 80 }} elevation={3}>
                <Typography variant="h6" fontWeight={600} mb={2}>
                  Tóm tắt đơn hàng
                </Typography>
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
                  onClick={() => navigate("/checkout")}
                  sx={{ py: 1.5, mt: 2 }}
                >
                  Thanh toán
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
    </MainLayout>
  );
};
