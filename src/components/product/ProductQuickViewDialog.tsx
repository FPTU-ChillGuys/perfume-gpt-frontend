import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import InfoIcon from "@mui/icons-material/Info";
import { useNavigate } from "react-router-dom";
import Rating from "@mui/material/Rating";
import { cartService } from "@/services/cartService";
import { useToast } from "@/hooks/useToast";
import { useCart } from "@/hooks/useCart";
import type { ProductFastLook, ProductInformation } from "@/types/product";

interface ProductQuickViewDialogProps {
  open: boolean;
  productId: string | null;
  loading: boolean;
  error: string | null;
  fastLook: ProductFastLook | null;
  information: ProductInformation | null;
  onClose: () => void;
}

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

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
  loading,
  error,
  fastLook,
  information,
  onClose,
}: ProductQuickViewDialogProps) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { refreshCart } = useCart();
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    null,
  );
  const [isAdding, setIsAdding] = useState(false);

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
  }, [fastLook]);

  const selectedVariant = useMemo(
    () =>
      fastLook?.variants?.find((variant) => variant.id === selectedVariantId) ||
      null,
    [fastLook, selectedVariantId],
  );

  const isSelectedVariantOutOfStock = isVariantOutOfStock(selectedVariant);

  const descriptionHtml = useMemo(() => {
    const description =
      fastLook?.description ||
      information?.description ||
      "Đang cập nhật mô tả";
    return sanitizeDescriptionHtml(description);
  }, [fastLook?.description, information?.description]);

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

  const handleAddToCart = async (navigateAfterAdd = false) => {
    if (!selectedVariant?.id) {
      showToast("Vui lòng chọn size để mua", "warning");
      return;
    }

    if (isSelectedVariantOutOfStock) {
      showToast("Size này đã hết hàng", "warning");
      return;
    }

    setIsAdding(true);
    try {
      await cartService.addItem(selectedVariant.id, 1);
      await refreshCart();
      showToast("Đã thêm vào giỏ hàng", "success");
      if (navigateAfterAdd) {
        onClose();
        navigate("/checkout");
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
    navigate(`/products/${productId}`);
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
                bgcolor: "grey.50",
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
              Thương hiệu:{" "}
              {information?.brandName || fastLook.brandName || "Đang cập nhật"}
            </Typography>
            {information?.productCode && (
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Mã hàng: {information.productCode}
              </Typography>
            )}
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

            <Stack direction="column" spacing={1} mt={3}>
              <Typography variant="h4" fontWeight={700} color="error">
                {selectedVariant?.price
                  ? currencyFormatter.format(Number(selectedVariant.price))
                  : "Liên hệ"}
              </Typography>
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

            {isSelectedVariantOutOfStock ? (
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
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        Xem nhanh sản phẩm
        <IconButton onClick={handleClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>{renderContent()}</DialogContent>
    </Dialog>
  );
};

export default ProductQuickViewDialog;
