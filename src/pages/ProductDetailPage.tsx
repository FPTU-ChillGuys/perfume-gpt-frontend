import { useEffect, useMemo, useRef, useState } from "react";
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
  IconButton,
  Link,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import Rating from "@mui/material/Rating";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { MainLayout } from "@/layouts/MainLayout";
import { productService } from "@/services/productService";
import { cartService } from "@/services/cartService";
import { useToast } from "@/hooks/useToast";
import { useCart } from "@/hooks/useCart";
import { reviewService } from "@/services/ai/reviewService";
import type {
  MediaResponse,
  ProductFastLook,
  ProductInformation,
} from "@/types/product";

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
  const [variantMediaList, setVariantMediaList] = useState<MediaResponse[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [thumbnailOffset, setThumbnailOffset] = useState(0);
  const variantCacheRef = useRef<Map<string, MediaResponse[]>>(new Map());

  // States: AI Review Summary
  const [reviewSummary, setReviewSummary] = useState<string | null>(null);
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const THUMB_VISIBLE = 5;
  const THUMB_SIZE = 72;
  const THUMB_GAP = 8;

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

  useEffect(() => {
    if (!selectedVariantId) {
      setVariantMediaList([]);
      return;
    }

    // Cache hit: swap instantly with no loading state
    const cached = variantCacheRef.current.get(selectedVariantId);
    if (cached) {
      setVariantMediaList(cached);
      setActiveSlide(0);
      setThumbnailOffset(0);
      return;
    }

    let isMounted = true;
    setIsLoadingMedia(true);
    // Keep existing variantMediaList visible while fetching (no blank flash)

    productService
      .getVariantById(selectedVariantId)
      .then((variant) => {
        if (!isMounted) return;
        const sorted = [...(variant.media || [])].sort(
          (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
        );
        variantCacheRef.current.set(selectedVariantId, sorted);
        setVariantMediaList(sorted);
        setActiveSlide(0);
        setThumbnailOffset(0);
      })
      .catch(() => {
        if (isMounted) setVariantMediaList([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingMedia(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedVariantId]);

  // Effect: Fetch AI Review Summary
  useEffect(() => {
    if (!selectedVariantId) {
      setReviewSummary(null);
      return;
    }

    let isMounted = true;
    setIsReviewLoading(true);
    setReviewError(null);
    setReviewSummary(null);

    reviewService
      .fetchReviewSummaryWithPolling(selectedVariantId)
      .then((summary) => {
        if (!isMounted) return;
        setReviewSummary(summary);
      })
      .catch((err) => {
        if (!isMounted) return;
        setReviewError(err.message || "Không thể tải tóm tắt đánh giá hiện tại.");
      })
      .finally(() => {
        if (isMounted) setIsReviewLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedVariantId]);

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
          <Grid size={{ xs: 6, md: 3 }} key={key}>
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
            <Grid size={{ xs: 12, md: 4 }} key={note.label}>
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

  const renderReviewSummary = () => {
    if (!selectedVariantId) return null;

    if (isReviewLoading) {
      return (
        <Box mt={4} p={3} borderRadius={2} bgcolor="grey.50" border="1px solid" borderColor="divider">
          <Stack direction="row" spacing={2} alignItems="center" mb={2}>
            <CircularProgress size={24} color="secondary" />
            <Typography variant="h6" fontWeight={600} color="secondary.main">
              AI đang tổng hợp hàng nghìn đánh giá...
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Quá trình này có thể mất vài giây. Vui lòng giữ mạng ổn định.
          </Typography>
        </Box>
      );
    }

    if (reviewError) {
      return (
        <Box mt={4}>
          <Alert severity="warning" variant="outlined">
            {reviewError}
          </Alert>
        </Box>
      );
    }

    if (reviewSummary) {
      return (
        <Box mt={4} p={3} borderRadius={2} bgcolor="success.lighter" color="success.darker" border="1px solid" borderColor="success.light">
          <Typography variant="h6" fontWeight={600} gutterBottom>
            ✨ Tóm tắt các đánh giá bằng AI
          </Typography>
          <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.7, color: "text.primary" }}>
            {reviewSummary}
          </Typography>
        </Box>
      );
    }

    return null;
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

    const fallbackImage =
      selectedVariant?.media?.url ||
      fastLook.variants?.[0]?.media?.url ||
      undefined;

    const activeImage = variantMediaList[activeSlide];

    return (
      <>
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 6 }} sx={{ minWidth: 0 }}>
            {/* Main image — fixed height so no-image placeholder is same size */}
            <Box
              sx={{
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "grey.50",
                height: 420,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {activeImage ? (
                <>
                  <img
                    key={activeImage.id}
                    src={activeImage.url || ""}
                    alt={activeImage.altText || fastLook.name || "Product"}
                    style={{
                      maxHeight: 380,
                      maxWidth: "90%",
                      objectFit: "contain",
                    }}
                  />
                  {isLoadingMedia && (
                    <Box
                      sx={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: "rgba(255,255,255,0.65)",
                        borderRadius: 3,
                      }}
                    >
                      <CircularProgress size={36} />
                    </Box>
                  )}
                </>
              ) : isLoadingMedia ? (
                <CircularProgress />
              ) : fallbackImage ? (
                <img
                  src={fallbackImage}
                  alt={fastLook.name || "Product"}
                  style={{
                    maxHeight: 380,
                    maxWidth: "90%",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 2,
                    color: "text.disabled",
                  }}
                >
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: "50%",
                      bgcolor: "grey.200",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Typography fontSize={32}>📷</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Chưa có hình ảnh
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Thumbnail strip — auto width, max THUMB_VISIBLE items, slide nav */}
            {variantMediaList.length > 1 &&
              (() => {
                const canPrev = thumbnailOffset > 0;
                const canNext =
                  thumbnailOffset + THUMB_VISIBLE < variantMediaList.length;
                const needsNav = variantMediaList.length > THUMB_VISIBLE;
                const visibleThumbs = variantMediaList.slice(
                  thumbnailOffset,
                  thumbnailOffset + THUMB_VISIBLE,
                );
                return (
                  <Box
                    sx={{
                      mt: 2,
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      justifyContent: "center",
                    }}
                  >
                    {needsNav && (
                      <IconButton
                        size="small"
                        onClick={() =>
                          setThumbnailOffset((p) => Math.max(0, p - 1))
                        }
                        disabled={!canPrev}
                        sx={{ flexShrink: 0 }}
                      >
                        <ChevronLeftIcon fontSize="small" />
                      </IconButton>
                    )}

                    <Box
                      sx={{
                        display: "flex",
                        gap: `${THUMB_GAP}px`,
                        flexShrink: 0,
                      }}
                    >
                      {visibleThumbs.map((media) => {
                        const realIndex = variantMediaList.indexOf(media);
                        return (
                          <Box
                            key={media.id}
                            onClick={() => setActiveSlide(realIndex)}
                            sx={{
                              width: THUMB_SIZE,
                              height: THUMB_SIZE,
                              borderRadius: 1,
                              border: "2px solid",
                              borderColor:
                                activeSlide === realIndex
                                  ? "error.main"
                                  : "divider",
                              overflow: "hidden",
                              cursor: "pointer",
                              flexShrink: 0,
                              transition: "border-color 0.2s",
                              "&:hover": { borderColor: "error.light" },
                            }}
                          >
                            <img
                              src={media.url || ""}
                              alt={media.altText || `Ảnh ${realIndex + 1}`}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          </Box>
                        );
                      })}
                    </Box>

                    {needsNav && (
                      <IconButton
                        size="small"
                        onClick={() =>
                          setThumbnailOffset((p) =>
                            Math.min(
                              p + 1,
                              variantMediaList.length - THUMB_VISIBLE,
                            ),
                          )
                        }
                        disabled={!canNext}
                        sx={{ flexShrink: 0 }}
                      >
                        <ChevronRightIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                );
              })()}
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
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

              {/* Size selector */}
              <Box>
                <Typography variant="subtitle1" fontWeight={600} mb={1}>
                  Lựa chọn size
                </Typography>
                <ToggleButtonGroup
                  exclusive
                  value={selectedVariantId}
                  onChange={handleVariantChange}
                  size="small"
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
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
                      value={variant.id || ""}
                      sx={{
                        textTransform: "none",
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        px: 1.5,
                        py: 0.75,
                      }}
                    >
                      {variant.media?.url && (
                        <Box
                          component="img"
                          src={variant.media.url}
                          alt={variant.displayName || ""}
                          sx={{
                            width: 36,
                            height: 36,
                            objectFit: "cover",
                            borderRadius: 0.5,
                            flexShrink: 0,
                          }}
                        />
                      )}
                      {variant.displayName || "Size"}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>

              {/* Price */}
              <Stack direction="row" spacing={1} alignItems="baseline">
                <Typography variant="h4" fontWeight={700} color="error">
                  {selectedVariant?.price
                    ? currencyFormatter.format(Number(selectedVariant.price))
                    : "Liên hệ"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Giá đã bao gồm VAT
                </Typography>
              </Stack>

              {/* Action buttons */}
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
        {renderReviewSummary()}
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
