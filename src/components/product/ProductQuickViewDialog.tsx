import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import CloseIcon from "@mui/icons-material/Close";
import InfoIcon from "@mui/icons-material/Info";
import { useNavigate } from "react-router-dom";
import Rating from "@mui/material/Rating";
import { cartService } from "@/services/cartService";
import { useToast } from "@/hooks/useToast";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { aiAcceptanceService } from "@/services/ai/aiAcceptanceService";
import type { ProductFastLook } from "@/types/product";

interface ProductQuickViewDialogProps {
  open: boolean;
  productId: string | null;
  aiAcceptanceId?: string;
  loading: boolean;
  error: string | null;
  fastLook: ProductFastLook | null;
  onClose: () => void;
}

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const toPositiveNumber = (value: unknown) => {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[,_\s]/g, ""));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
};

const getVariantPrice = (variant: unknown) => {
  const source = variant as {
    price?: unknown;
    Price?: unknown;
    basePrice?: unknown;
    BasePrice?: unknown;
  };

  return (
    toPositiveNumber(source?.price) ??
    toPositiveNumber(source?.Price) ??
    toPositiveNumber(source?.basePrice) ??
    toPositiveNumber(source?.BasePrice)
  );
};

const getVariantRetailPrice = (variant: unknown) => {
  const source = variant as {
    retailPrice?: unknown;
    RetailPrice?: unknown;
    marketPrice?: unknown;
    MarketPrice?: unknown;
  };

  return (
    toPositiveNumber(source?.retailPrice) ??
    toPositiveNumber(source?.RetailPrice) ??
    toPositiveNumber(source?.marketPrice) ??
    toPositiveNumber(source?.MarketPrice)
  );
};

const formatSavingPercent = (percent: number) => {
  if (percent >= 1) {
    return `${Math.round(percent)}%`;
  }
  if (percent >= 0.1) {
    return `${percent.toFixed(1)}%`;
  }
  if (percent > 0) {
    return `${percent.toFixed(2)}%`;
  }
  return "0%";
};

const sanitizeDescriptionHtml = (html: string) => {
  const container = document.createElement("div");
  container.innerHTML = html;

  container
    .querySelectorAll("script,style,iframe,object,embed,link,meta")
    .forEach((node) => node.remove());

  container.querySelectorAll("*").forEach((node) => {
    Array.from(node.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();
      if (
        name.startsWith("on") ||
        ((name === "href" || name === "src") && value.startsWith("javascript:"))
      ) {
        node.removeAttribute(attr.name);
      }
    });
  });

  return container.innerHTML;
};

const ProductQuickViewDialog = ({
  open,
  productId,
  aiAcceptanceId,
  loading,
  error,
  fastLook,
  onClose,
}: ProductQuickViewDialogProps) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { refreshCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    null,
  );
  const [isAdding, setIsAdding] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [cartQtyForVariant, setCartQtyForVariant] = useState(0);
  const isBackOfficeRole = user?.role === "admin" || user?.role === "staff";

  type FastLookVariant = NonNullable<ProductFastLook["variants"]>[number];

  const getVariantStockQuantity = (variant?: FastLookVariant | null) => {
    return typeof variant?.stockQuantity === "number"
      ? variant.stockQuantity
      : null;
  };

  const isVariantOutOfStock = (variant?: FastLookVariant | null) => {
    const stockQuantity = getVariantStockQuantity(variant);
    return stockQuantity !== null && stockQuantity <= 0;
  };

  useEffect(() => {
    if (fastLook?.variants?.length) {
      const firstAvailableVariant = fastLook.variants.find((variant) => {
        const stockQuantity = variant?.stockQuantity;
        return typeof stockQuantity !== "number" || stockQuantity > 0;
      });
      setSelectedVariantId(
        firstAvailableVariant?.id || fastLook.variants[0]?.id || null,
      );
    } else {
      setSelectedVariantId(null);
    }
    // Reset quantity when product changes
    setQuantity(1);
    setCartQtyForVariant(0);
  }, [fastLook]);

  // Fetch cart quantity for selected variant whenever variant changes
  useEffect(() => {
    if (!selectedVariantId || !isAuthenticated) {
      setCartQtyForVariant(0);
      setQuantity(1);
      return;
    }
    let cancelled = false;
    cartService.getItems().then((items) => {
      if (cancelled) return;
      const existing = items.find((item) => item.variantId === selectedVariantId);
      const qty = existing?.quantity ?? 0;
      setCartQtyForVariant(qty);
      setQuantity(1); // reset to 1 each time variant switches
    }).catch(() => {
      if (!cancelled) setCartQtyForVariant(0);
    });
    return () => { cancelled = true; };
  }, [selectedVariantId, isAuthenticated]);

  const selectedVariant = useMemo(
    () =>
      fastLook?.variants?.find((variant) => variant.id === selectedVariantId) ||
      null,
    [fastLook, selectedVariantId],
  );

  const selectedVariantPrice = getVariantPrice(selectedVariant) || 0;
  const selectedVariantRetailPrice =
    getVariantRetailPrice(selectedVariant) || 0;
  const hasRetailPriceComparison =
    selectedVariantPrice > 0 &&
    selectedVariantRetailPrice > selectedVariantPrice;
  const savingAmount = hasRetailPriceComparison
    ? selectedVariantRetailPrice - selectedVariantPrice
    : 0;
  const savingPercent = hasRetailPriceComparison
    ? ((selectedVariantRetailPrice - selectedVariantPrice) /
        selectedVariantRetailPrice) *
      100
    : 0;

  const isSelectedVariantOutOfStock = isVariantOutOfStock(selectedVariant);

  const descriptionHtml = useMemo(() => {
    const description = fastLook?.description || "Đang cập nhật mô tả";
    return sanitizeDescriptionHtml(description);
  }, [fastLook?.description]);

  const heroImage =
    selectedVariant?.media?.url ||
    fastLook?.variants?.[0]?.media?.url ||
    undefined;

  const normalizedRating = useMemo(() => {
    if (!fastLook) {
      return 0;
    }

    const source = fastLook as ProductFastLook & {
      averageRating?: number | string | null;
      avgRating?: number | string | null;
      AverageRating?: number | string | null;
      Rating?: number | string | null;
    };

    const rawRating =
      source.rating ??
      source.averageRating ??
      source.avgRating ??
      source.AverageRating ??
      source.Rating;

    const parsedRating = Number(rawRating);
    if (!Number.isFinite(parsedRating)) {
      return 0;
    }

    return Math.max(0, Math.min(5, parsedRating));
  }, [fastLook]);

  const normalizedReviewCount = useMemo(() => {
    if (!fastLook) {
      return 0;
    }

    const source = fastLook as ProductFastLook & {
      reviewsCount?: number | string | null;
      ReviewsCount?: number | string | null;
      totalReviews?: number | string | null;
      TotalReviews?: number | string | null;
      reviewCount?: number | string | null;
      ReviewCount?: number | string | null;
    };

    const rawCount =
      source.reviewCount ??
      source.reviewsCount ??
      source.ReviewCount ??
      source.ReviewsCount ??
      source.totalReviews ??
      source.TotalReviews;

    const parsedCount = Number(rawCount);
    if (!Number.isFinite(parsedCount) || parsedCount < 0) {
      return 0;
    }

    return Math.floor(parsedCount);
  }, [fastLook]);

  const handleClose = () => {
    if (isAdding) {
      return;
    }
    onClose();
  };

  const handleVariantChange = (_: unknown, value: string | null) => {
    if (value) {
      setSelectedVariantId(value);
    }
  };

  const stockQuantity =
    typeof selectedVariant?.stockQuantity === "number"
      ? selectedVariant.stockQuantity
      : null;

  // Max the user can add = stock remaining after what's already in cart
  const maxAddable =
    stockQuantity !== null ? Math.max(0, stockQuantity - cartQtyForVariant) : 99;

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => Math.min(maxAddable, Math.max(1, prev + delta)));
  };

  const handleQuantityInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!Number.isNaN(val)) {
      setQuantity(Math.min(maxAddable, Math.max(1, val)));
    }
  };

  const handleAddToCart = async (navigateAfterAdd = false) => {
    if (!isAuthenticated) {
      showToast("Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng", "warning");
      onClose();
      return;
    }

    if (isBackOfficeRole) {
      showToast(
        "Tài khoản admin/staff không thể thêm giỏ hàng hoặc thanh toán online",
        "info",
      );
      return;
    }

    if (!selectedVariant?.id) {
      showToast("Vui lòng chọn size để mua", "warning");
      return;
    }

    if (isSelectedVariantOutOfStock) {
      showToast("Size này đã hết hàng", "warning");
      return;
    }

    if (quantity < 1) {
      showToast("Số lượng phải ít nhất là 1", "warning");
      return;
    }

    if (maxAddable <= 0) {
      showToast(
        cartQtyForVariant > 0
          ? `Bạn đã có ${cartQtyForVariant} sản phẩm này trong giỏ và không thể thêm nữa.`
          : "Sản phẩm đã hết hàng",
        "warning",
      );
      return;
    }

    setIsAdding(true);
    try {
      await cartService.addItem(selectedVariant.id, quantity);
      await refreshCart();
      showToast("Đã thêm vào giỏ hàng", "success");

      // Mark as accepted if inside an AI recommendation context
      if (aiAcceptanceId) {
        try {
          await aiAcceptanceService.clickAIAcceptance(aiAcceptanceId);
        } catch (error) {
          console.error("Failed to mark AI acceptance on quick view cart add:", error);
        }
      }

      if (navigateAfterAdd) {
        onClose();

        // Get updated cart to find the newly added item
        const cartItems = await cartService.getItems();
        const addedItem = cartItems.find(
          (item) => item.variantId === selectedVariant.id,
        );

        if (addedItem?.cartItemId) {
          // Navigate with only the newly added item selected
          navigate("/checkout", {
            state: {
              selectedCartItemIds: [addedItem.cartItemId],
            },
          });
        } else {
          navigate("/checkout");
        }
      }
    } catch (err: any) {
      showToast(
        err?.message || "Không thể thêm sản phẩm vào giỏ. Vui lòng thử lại.",
        "error",
      );
    } finally {
      setIsAdding(false);
    }
  };

  const handleViewDetail = () => {
    if (!productId) {
      return;
    }
    onClose();
    const queryParams = new URLSearchParams();
    if (aiAcceptanceId) {
      queryParams.set("aiAcceptanceId", aiAcceptanceId);
    }
    const queryString = queryParams.toString();
    navigate(`/products/${productId}${queryString ? `?${queryString}` : ""}`);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight={240}
        >
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return <Alert severity="error">{error}</Alert>;
    }

    if (!fastLook) {
      return (
        <Alert severity="info">
          Không tìm thấy thông tin sản phẩm. Vui lòng thử lại sau.
        </Alert>
      );
    }

    return (
      <Stack spacing={3}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
          <Box flex={{ xs: "none", md: "0 0 320px" }}>
            <Box
              sx={{
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                p: 3,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: 320,
                bgcolor: "background.paper",
              }}
            >
              {heroImage ? (
                <img
                  src={heroImage}
                  alt={fastLook.name || "Product"}
                  style={{ maxHeight: 280, objectFit: "contain" }}
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Chưa có hình ảnh
                </Typography>
              )}
            </Box>
          </Box>

          <Box flex={1} minWidth={0}>
            <Typography variant="h5" fontWeight={600} gutterBottom>
              {fastLook.name}
            </Typography>
            <Typography color="text.secondary" fontWeight={500} gutterBottom>
              Thương hiệu: {fastLook.brandName || "Đang cập nhật"}
            </Typography>
            <Typography
              component="div"
              variant="body2"
              color="text.secondary"
              gutterBottom
              sx={{
                "& p": { m: 0, mb: 1 },
                "& p:last-child": { mb: 0 },
              }}
              dangerouslySetInnerHTML={{ __html: descriptionHtml }}
            />

            <Stack direction="row" spacing={1} alignItems="center" mt={1}>
              <Rating
                value={normalizedRating}
                precision={0.5}
                readOnly
                size="small"
              />
              <Typography variant="body2" color="text.secondary">
                {normalizedRating.toFixed(1)}/5 ({normalizedReviewCount} đánh
                giá)
              </Typography>
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Lựa chọn size
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={selectedVariantId}
              onChange={handleVariantChange}
              size="small"
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 1,
                "& .MuiToggleButtonGroup-grouped": {
                  border: "1px solid rgba(0, 0, 0, 0.12) !important",
                  borderRadius: "8px !important",
                  marginLeft: "0 !important",
                },
                "& .MuiToggleButtonGroup-grouped.Mui-selected": {
                  borderColor: "primary.main !important",
                },
              }}
            >
              {(fastLook.variants || []).map((variant, index) =>
                (() => {
                  const outOfStock = isVariantOutOfStock(variant);

                  return (
                    <ToggleButton
                      key={variant.id ?? `variant-${index}`}
                      value={variant.id || ""}
                      sx={{
                        textTransform: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-start",
                        gap: 1,
                        px: 2,
                        py: 1,
                        whiteSpace: "nowrap",
                        minWidth: 0,
                        fontSize: "0.8rem",
                        position: "relative",
                        opacity: outOfStock ? 0.75 : 1,
                      }}
                    >
                      {variant.media?.url && (
                        <Box
                          component="img"
                          src={variant.media.url}
                          alt={variant.displayName || ""}
                          sx={{
                            width: 32,
                            height: 32,
                            objectFit: "cover",
                            borderRadius: 0.5,
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <Box
                        component="span"
                        sx={{
                          whiteSpace: "nowrap",
                          textDecoration: outOfStock ? "line-through" : "none",
                          textDecorationColor: outOfStock
                            ? "error.main"
                            : "inherit",
                        }}
                      >
                        {variant.displayName || "Size"}
                      </Box>
                    </ToggleButton>
                  );
                })(),
              )}
            </ToggleButtonGroup>

            {/* Quantity selector */}
            {!isSelectedVariantOutOfStock && !isBackOfficeRole && (
              <Box mt={2}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Số lượng
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <IconButton
                    size="small"
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1,
                      p: 0.5,
                    }}
                  >
                    <RemoveIcon fontSize="small" />
                  </IconButton>
                  <TextField
                    size="small"
                    value={quantity}
                    onChange={handleQuantityInput}
                    inputProps={{
                      min: 1,
                      max: maxAddable,
                      style: { textAlign: "center", width: 48 },
                    }}
                    sx={{ width: 72 }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= maxAddable}
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1,
                      p: 0.5,
                    }}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                  {stockQuantity !== null && (
                    <Typography variant="caption" color="text.secondary">
                      {cartQtyForVariant > 0
                        ? `Còn thể thêm tối đa ${maxAddable} (đã có ${cartQtyForVariant} trong giỏ)`
                        : `Kho khả dụng: ${stockQuantity}`}
                    </Typography>
                  )}
                </Stack>
              </Box>
            )}

            <Stack direction="column" spacing={1} mt={3}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="baseline"
                flexWrap="wrap"
              >
                <Typography variant="h4" fontWeight={700} color="error">
                  {selectedVariantPrice
                    ? currencyFormatter.format(selectedVariantPrice)
                    : "Liên hệ"}
                </Typography>
                {hasRetailPriceComparison && (
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ textDecoration: "line-through" }}
                  >
                    {currencyFormatter.format(selectedVariantRetailPrice)}
                  </Typography>
                )}
              </Stack>
              {hasRetailPriceComparison && savingAmount > 0 && (
                <Typography
                  variant="body2"
                  color="success.main"
                  fontWeight={600}
                >
                  {`Tiết kiệm ${currencyFormatter.format(savingAmount)} (${formatSavingPercent(savingPercent)})`}
                </Typography>
              )}
              <Button
                startIcon={<InfoIcon />}
                variant="text"
                size="small"
                sx={{
                  textTransform: "none",
                  p: 0,
                  minWidth: 0,
                  alignSelf: "flex-start",
                }}
                onClick={handleViewDetail}
              >
                Xem chi tiết sản phẩm
              </Button>
            </Stack>

            {isBackOfficeRole ? (
              <Typography variant="body2" color="text.secondary" mt={3}>
                Tài khoản admin/staff chỉ có quyền xem sản phẩm, không hỗ trợ
                mua hàng online.
              </Typography>
            ) : isSelectedVariantOutOfStock ? (
              <Typography variant="h4" color="error" fontWeight={700} mt={3}>
                Hết hàng
              </Typography>
            ) : (
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mt={3}>
                <Button
                  variant="outlined"
                  onClick={() => handleAddToCart(false)}
                  disabled={isAdding}
                  fullWidth
                >
                  {isAdding ? "Đang thêm..." : "Thêm vào giỏ hàng"}
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  onClick={() => handleAddToCart(true)}
                  disabled={isAdding}
                  fullWidth
                >
                  {isAdding ? "Đang xử lý..." : "Mua ngay"}
                </Button>
              </Stack>
            )}
          </Box>
        </Stack>
      </Stack>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { maxWidth: 960 } }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
        }}
      >
        <IconButton onClick={handleClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>{renderContent()}</DialogContent>
    </Dialog>
  );
};

export default ProductQuickViewDialog;
