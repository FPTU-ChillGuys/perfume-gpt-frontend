import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  Link,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import Rating from "@mui/material/Rating";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import { MainLayout } from "@/layouts/MainLayout";
import { productService } from "@/services/productService";
import { cartService } from "@/services/cartService";
import { useToast } from "@/hooks/useToast";
import { useCart } from "@/hooks/useCart";
import type { ProductFastLook, ProductInformation } from "@/types/product";

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const ProductDetailPage = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { refreshCart } = useCart();

  const [information, setInformation] = useState<ProductInformation | null>(
    null,
  );
  const [fastLook, setFastLook] = useState<ProductFastLook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    null,
  );
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!productId) {
      setError("Không tìm thấy sản phẩm");
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        const [info, fastLookResponse] = await Promise.all([
          productService.getProductInformation(productId),
          productService.getProductFastLook(productId),
        ]);

        if (!isMounted) {
          return;
        }

        setInformation(info);
        setFastLook(fastLookResponse);
        setSelectedVariantId(fastLookResponse?.variants?.[0]?.id || null);
      } catch (err: any) {
        if (!isMounted) {
          return;
        }
        setError(err?.message || "Không thể tải thông tin sản phẩm");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchData();

    return () => {
      isMounted = false;
    };
  }, [productId]);

  const selectedVariant = useMemo(
    () =>
      fastLook?.variants?.find((variant) => variant.id === selectedVariantId) ||
      null,
    [fastLook, selectedVariantId],
  );

  const handleVariantChange = (_: unknown, value: string | null) => {
    if (value) {
      setSelectedVariantId(value);
    }
  };

  const handleAddToCart = async (redirectToCheckout = false) => {
    if (!selectedVariant?.id) {
      showToast("Vui lòng chọn size để mua", "warning");
      return;
    }
    setIsAdding(true);
    try {
      await cartService.addItem(selectedVariant.id, 1);
      await refreshCart();
      showToast("Đã thêm sản phẩm vào giỏ hàng", "success");
      if (redirectToCheckout) {
        navigate("/checkout");
      }
    } catch (err: any) {
      showToast(err?.message || "Không thể thêm sản phẩm vào giỏ", "error");
    } finally {
      setIsAdding(false);
    }
  };

  const renderHighlights = () => (
    <Grid container spacing={2} mt={2}>
      {["origin", "releaseYear", "scentGroup", "style"].map((key) => {
        const value = (information as any)?.[key];
        if (!value) {
          return null;
        }
        const labels: Record<string, string> = {
          origin: "Xuất xứ",
          releaseYear: "Năm ra mắt",
          scentGroup: "Nhóm hương",
          style: "Phong cách",
        };
        return (
          <Grid item xs={6} md={3} key={key}>
            <Typography variant="caption" color="text.secondary">
              {labels[key]}
            </Typography>
            <Typography variant="subtitle2" fontWeight={600}>
              {value}
            </Typography>
          </Grid>
        );
      })}
    </Grid>
  );

  const renderFragranceNotes = () => {
    const notes = [
      { label: "Top Notes", value: information?.topNotes },
      { label: "Middle Notes", value: information?.middleNotes },
      { label: "Base Notes", value: information?.baseNotes },
    ].filter((note) => note.value);

    if (!notes.length) {
      return null;
    }

    return (
      <Box mt={4}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Hương thơm đặc trưng
        </Typography>
        <Grid container spacing={2}>
          {notes.map((note) => (
            <Grid item xs={12} md={4} key={note.label}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  minHeight: 120,
                }}
              >
                <Typography variant="subtitle2" color="text.secondary">
                  {note.label}
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {note.value}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };

  const renderDescription = () => {
    const description = information?.description || fastLook?.description;
    if (!description) {
      return null;
    }
    return (
      <Box mt={4}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Mô tả sản phẩm
        </Typography>
        <Typography color="text.secondary" lineHeight={1.8}>
          {description}
        </Typography>
      </Box>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <Box py={12} display="flex" justifyContent="center">
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Box py={6}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
          <Button variant="contained" onClick={() => navigate("/")}>
            Quay lại trang chủ
          </Button>
        </Box>
      );
    }

    if (!fastLook) {
      return (
        <Box py={6}>
          <Alert severity="info">
            Không tìm thấy thông tin sản phẩm. Vui lòng thử lại sau.
          </Alert>
        </Box>
      );
    }

    const heroImage =
      selectedVariant?.media?.url ||
      fastLook.variants?.[0]?.media?.url ||
      undefined;

    return (
      <>
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                p: 4,
                bgcolor: "grey.50",
                minHeight: 420,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {heroImage ? (
                <img
                  src={heroImage}
                  alt={fastLook.name || "Product"}
                  style={{ maxHeight: 360, objectFit: "contain" }}
                />
              ) : (
                <Typography color="text.secondary">Chưa có hình ảnh</Typography>
              )}
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Stack spacing={2}>
              <Breadcrumbs separator="/">
                <Link
                  underline="hover"
                  color="inherit"
                  component="button"
                  onClick={() => navigate("/")}
                  sx={{ cursor: "pointer" }}
                >
                  Trang chủ
                </Link>
                <Typography color="text.primary">{fastLook.name}</Typography>
              </Breadcrumbs>

              <Typography variant="h4" fontWeight={700}>
                {fastLook.name}
              </Typography>
              <Typography color="text.secondary">
                Thương hiệu: {information?.brandName || fastLook.brandName}
              </Typography>
              {information?.productCode && (
                <Typography color="text.secondary">
                  Mã hàng: {information.productCode}
                </Typography>
              )}

              <Stack direction="row" spacing={1} alignItems="center">
                <Rating value={fastLook.rating ?? 0} precision={0.5} readOnly />
                <Typography variant="body2" color="text.secondary">
                  {fastLook.rating ?? 0}/5 ({fastLook.reviewCount ?? 0} đánh
                  giá)
                </Typography>
              </Stack>

              <Divider />

              <Typography variant="subtitle1" fontWeight={600}>
                Lựa chọn size
              </Typography>
              <ToggleButtonGroup
                exclusive
                value={selectedVariantId}
                onChange={handleVariantChange}
                sx={{ flexWrap: "wrap", gap: 1 }}
                size="small"
              >
                {(fastLook.variants || []).map((variant) => (
                  <ToggleButton
                    key={variant.id}
                    value={variant.id}
                    sx={{ textTransform: "none", borderRadius: 2 }}
                  >
                    {variant.displayName || "Size"}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>

              <Stack direction="row" spacing={2} alignItems="baseline">
                <Typography variant="h3" fontWeight={700} color="error">
                  {selectedVariant?.price
                    ? currencyFormatter.format(Number(selectedVariant.price))
                    : "Liên hệ"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Giá đã bao gồm VAT
                </Typography>
              </Stack>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Button
                  variant="outlined"
                  onClick={() => handleAddToCart(false)}
                  disabled={isAdding}
                >
                  {isAdding ? "Đang thêm..." : "Thêm vào giỏ"}
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  onClick={() => handleAddToCart(true)}
                  disabled={isAdding}
                >
                  {isAdding ? "Đang xử lý..." : "Mua ngay"}
                </Button>
              </Stack>
            </Stack>
          </Grid>
        </Grid>

        {renderHighlights()}
        {renderFragranceNotes()}
        {renderDescription()}
      </>
    );
  };

  return (
    <MainLayout>
      <Box py={6}>
        <Container maxWidth="lg">
          <Stack direction="row" alignItems="center" spacing={1} mb={3}>
            <Chip label="BEST CHOICE" color="error" size="small" />
            <Typography fontWeight={600}>
              Sản phẩm uy tín - Cam kết chính hãng 100%
            </Typography>
          </Stack>
          {renderContent()}
        </Container>
      </Box>
    </MainLayout>
  );
};

export default ProductDetailPage;
