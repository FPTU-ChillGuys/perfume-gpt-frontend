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

  useEffect(() => {
    if (fastLook?.variants?.length) {
      setSelectedVariantId(fastLook.variants[0]?.id || null);
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

  const heroImage =
    selectedVariant?.media?.url ||
    fastLook?.variants?.[0]?.media?.url ||
    undefined;

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
            <Stack direction="row" spacing={1} alignItems="center" mb={1}>
              {information?.style && (
                <Chip
                  label={information.style.toUpperCase()}
                  color="info"
                  size="small"
                />
              )}
              {information?.scentGroup && (
                <Chip
                  label={information.scentGroup}
                  size="small"
                  color="secondary"
                />
              )}
            </Stack>
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
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {fastLook.description ||
                information?.description ||
                "Đang cập nhật mô tả"}
            </Typography>

            <Stack direction="row" spacing={1} alignItems="center" mt={1}>
              <Rating
                value={fastLook.rating ?? 0}
                precision={0.5}
                readOnly
                size="small"
              />
              <Typography variant="body2" color="text.secondary">
                {fastLook.rating ?? 0}/5 ({fastLook.reviewCount ?? 0} đánh giá)
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
              {(fastLook.variants || []).map((variant) => (
                <ToggleButton
                  key={variant.id}
                  value={variant.id}
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
                  <Box component="span" sx={{ whiteSpace: "nowrap" }}>
                    {variant.displayName || "Size"}
                  </Box>
                </ToggleButton>
              ))}
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
