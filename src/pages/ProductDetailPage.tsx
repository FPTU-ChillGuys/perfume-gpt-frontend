import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useAuth } from "@/hooks/useAuth";
import { reviewService } from "@/services/ai/reviewService";
import { productReviewService } from "@/services/reviewService";
import { orderService } from "@/services/orderService";
import { ReviewEditorDialog } from "@/components/review/ReviewEditorDialog";
import { ReviewSection } from "@/components/review/ReviewSection";
import type {
  MediaResponse,
  ProductDetail,
  ProductFastLook,
  ProductInformation,
} from "@/types/product";
import type { ReviewDialogTarget, ReviewResponse } from "@/types/review";

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const sanitizeDescriptionHtml = (html: string) => {
  const container = document.createElement("div");
  container.innerHTML = html;

  // Remove unsafe elements.
  container
    .querySelectorAll("script,style,iframe,object,embed,link,meta")
    .forEach((node) => node.remove());

  // Remove inline event handlers and javascript: URLs.
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

const ProductDetailPage = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { refreshCart } = useCart();
  const { user, isAuthenticated } = useAuth();

  const [information, setInformation] = useState<ProductInformation | null>(
    null,
  );
  const [productDetail, setProductDetail] = useState<ProductDetail | null>(
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
  const reviewTargetCacheRef = useRef<Record<string, ReviewDialogTarget>>({});

  // States: AI Review Summary
  const [reviewSummary, setReviewSummary] = useState<string | null>(null);
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [myReviews, setMyReviews] = useState<ReviewResponse[]>([]);
  const [isLoadingMyReviews, setIsLoadingMyReviews] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewDialogMode, setReviewDialogMode] = useState<"create" | "edit">(
    "create",
  );
  const [reviewDialogTarget, setReviewDialogTarget] =
    useState<ReviewDialogTarget | null>(null);
  const [selectedReview, setSelectedReview] = useState<ReviewResponse | null>(
    null,
  );
  const [isFindingReviewTarget, setIsFindingReviewTarget] = useState(false);
  const [reviewActionError, setReviewActionError] = useState<string | null>(
    null,
  );
  const [reviewRefreshToken, setReviewRefreshToken] = useState(0);

  const fetchMyReviews = useCallback(async () => {
    if (!isAuthenticated) {
      setMyReviews([]);
      return;
    }

    setIsLoadingMyReviews(true);
    try {
      const data = await productReviewService.getMyReviews();
      setMyReviews(data);
    } catch (error) {
      console.error("Error loading personal reviews:", error);
    } finally {
      setIsLoadingMyReviews(false);
    }
  }, [isAuthenticated]);

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
        const [info, fastLookResponse, detailResponse] = await Promise.all([
          productService.getProductInformation(productId),
          productService.getProductFastLook(productId),
          productService.getProductDetail(productId),
        ]);

        if (!isMounted) {
          return;
        }

        setInformation(info);
        setFastLook(fastLookResponse);
        setProductDetail(detailResponse);

        const firstAvailableVariant = detailResponse?.variants?.find(
          (variant) => {
            const stockQuantity = variant?.stockQuantity;
            return typeof stockQuantity !== "number" || stockQuantity > 0;
          },
        );

        setSelectedVariantId(
          firstAvailableVariant?.id ||
            detailResponse?.variants?.[0]?.id ||
            fastLookResponse?.variants?.[0]?.id ||
            null,
        );
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

  const fastLookDisplayNameById = useMemo(() => {
    const map = new Map<string, string>();
    (fastLook?.variants || []).forEach((variant) => {
      if (variant.id && variant.displayName) {
        map.set(variant.id, variant.displayName);
      }
    });
    return map;
  }, [fastLook]);

  const displayVariants = useMemo(() => {
    if (productDetail?.variants?.length) {
      return productDetail.variants.map((variant) => ({
        id: variant.id || "",
        displayName:
          (variant.id ? fastLookDisplayNameById.get(variant.id) : undefined) ||
          [
            variant.concentrationName,
            variant.volumeMl ? `${variant.volumeMl} ml` : null,
          ]
            .filter(Boolean)
            .join(" - ") ||
          variant.sku ||
          "Size",
        price: variant.basePrice,
        stockQuantity: variant.stockQuantity,
        media: variant.media?.[0] || null,
        mediaList: variant.media || [],
        sku: variant.sku || null,
      }));
    }

    return (fastLook?.variants || []).map((variant) => ({
      id: variant.id || "",
      displayName: variant.displayName || "Size",
      price: variant.price,
      stockQuantity: variant.stockQuantity,
      media: variant.media || null,
      mediaList: variant.media ? [variant.media] : [],
      sku: null,
    }));
  }, [productDetail, fastLook, fastLookDisplayNameById]);

  useEffect(() => {
    if (!selectedVariantId) {
      setVariantMediaList([]);
      setIsLoadingMedia(false);
      return;
    }

    const cached = variantCacheRef.current.get(selectedVariantId);
    if (cached) {
      setVariantMediaList(cached);
      setActiveSlide(0);
      setThumbnailOffset(0);
      setIsLoadingMedia(false);
      return;
    }

    const variant = productDetail?.variants?.find(
      (item) => item.id === selectedVariantId,
    );

    if (variant) {
      const sorted = [...(variant.media || [])].sort(
        (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
      );

      variantCacheRef.current.set(selectedVariantId, sorted);
      setVariantMediaList(sorted);
      setActiveSlide(0);
      setThumbnailOffset(0);
      setIsLoadingMedia(false);
      return;
    }

    const fallbackVariant = displayVariants.find(
      (item) => item.id === selectedVariantId,
    );

    if (!fallbackVariant) {
      setVariantMediaList([]);
      setIsLoadingMedia(false);
      return;
    }

    const sorted = [...(fallbackVariant.mediaList || [])].sort(
      (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
    );

    variantCacheRef.current.set(selectedVariantId, sorted);
    setVariantMediaList(sorted);
    setActiveSlide(0);
    setThumbnailOffset(0);
    setIsLoadingMedia(false);
  }, [selectedVariantId, productDetail, displayVariants]);

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
        setReviewError(
          err.message || "Không thể tải tóm tắt đánh giá hiện tại.",
        );
      })
      .finally(() => {
        if (isMounted) setIsReviewLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedVariantId]);

  useEffect(() => {
    void fetchMyReviews();
  }, [fetchMyReviews]);

  useEffect(() => {
    setReviewActionError(null);
  }, [selectedVariantId]);

  const selectedVariant = useMemo(
    () =>
      displayVariants.find((variant) => variant.id === selectedVariantId) ||
      null,
    [displayVariants, selectedVariantId],
  );

  const selectedVariantDetail = useMemo(
    () =>
      productDetail?.variants?.find(
        (variant) => variant.id === selectedVariantId,
      ) || null,
    [productDetail, selectedVariantId],
  );

  type DisplayVariant = (typeof displayVariants)[number];

  const getVariantStockQuantity = (variant?: DisplayVariant | null) => {
    const rawStock = variant?.stockQuantity;
    return typeof rawStock === "number" ? rawStock : null;
  };

  const isVariantOutOfStock = (variant?: DisplayVariant | null) => {
    const stockQuantity = getVariantStockQuantity(variant);
    return stockQuantity !== null && stockQuantity <= 0;
  };

  const selectedVariantStockQuantity = getVariantStockQuantity(selectedVariant);
  const isSelectedVariantOutOfStock = isVariantOutOfStock(selectedVariant);

  const fallbackReviewThumbnail = useMemo(
    () =>
      selectedVariant?.media?.url ||
      variantMediaList[0]?.url ||
      displayVariants[0]?.media?.url ||
      null,
    [selectedVariant, variantMediaList, displayVariants],
  );

  const existingReviewForVariant = useMemo(
    () =>
      myReviews.find((review) => review.variantId === selectedVariantId) ||
      null,
    [myReviews, selectedVariantId],
  );

  const handleVariantChange = (_: unknown, value: string | null) => {
    if (value) {
      setSelectedVariantId(value);
    }
  };

  const resolveReviewTargetForVariant = async (
    variantId: string,
  ): Promise<ReviewDialogTarget | null> => {
    if (reviewTargetCacheRef.current[variantId]) {
      return reviewTargetCacheRef.current[variantId];
    }

    const PAGE_SIZE = 10;
    let currentPage = 1;
    let hasMore = true;

    // Lazily scan delivered orders to find the corresponding order detail ID
    // required by the reviews API. We only run this when the customer
    // explicitly requests to write a review to avoid unnecessary network cost.
    while (hasMore) {
      const { items, totalCount } = await orderService.getMyOrders({
        Status: "Delivered",
        PageNumber: currentPage,
        PageSize: PAGE_SIZE,
        SortBy: "CreatedAt",
        SortOrder: "desc",
      });

      if (!items.length) {
        break;
      }

      for (const order of items) {
        if (!order.id) {
          continue;
        }
        const detail = await orderService.getMyOrderById(order.id);
        const match = detail.orderDetails?.find(
          (item) => item.variantId === variantId,
        );
        if (match?.id) {
          const target: ReviewDialogTarget = {
            orderDetailId: match.id,
            variantId,
            variantName:
              match.variantName ||
              selectedVariant?.displayName ||
              fastLook?.name,
            productName: fastLook?.name || match.variantName || undefined,
            thumbnailUrl: match.imageUrl || fallbackReviewThumbnail || null,
          };
          reviewTargetCacheRef.current[variantId] = target;
          return target;
        }
      }

      const totalPages =
        typeof totalCount === "number" && totalCount > 0
          ? Math.ceil(totalCount / PAGE_SIZE)
          : currentPage;
      currentPage += 1;
      hasMore = currentPage <= totalPages;
    }

    return null;
  };

  const handleOpenReviewDialog = async () => {
    if (!isAuthenticated) {
      showToast("Vui lòng đăng nhập để đánh giá sản phẩm", "info");
      navigate("/login");
      return;
    }

    if (!selectedVariantId) {
      showToast("Vui lòng chọn phiên bản để đánh giá", "warning");
      return;
    }

    if (existingReviewForVariant) {
      setReviewDialogMode("edit");
      setReviewDialogTarget({
        orderDetailId: existingReviewForVariant.orderDetailId || "",
        variantId: existingReviewForVariant.variantId || selectedVariantId,
        variantName:
          existingReviewForVariant.variantName ||
          selectedVariant?.displayName ||
          fastLook?.name,
        productName: fastLook?.name || existingReviewForVariant.variantName,
        thumbnailUrl:
          existingReviewForVariant.images?.[0]?.url ||
          fallbackReviewThumbnail ||
          null,
      });
      setSelectedReview(existingReviewForVariant);
      setIsReviewDialogOpen(true);
      setReviewActionError(null);
      return;
    }

    try {
      setIsFindingReviewTarget(true);
      const target = await resolveReviewTargetForVariant(selectedVariantId);
      if (!target) {
        setReviewActionError(
          "Bạn chỉ có thể đánh giá sau khi đơn hàng được giao thành công.",
        );
        showToast(
          "Chỉ những đơn đã giao thành công mới có thể viết đánh giá.",
          "info",
        );
        return;
      }
      setReviewDialogMode("create");
      setReviewDialogTarget(target);
      setSelectedReview(null);
      setIsReviewDialogOpen(true);
      setReviewActionError(null);
    } catch (error: any) {
      const message =
        error?.message || "Không thể kiểm tra điều kiện đánh giá lúc này.";
      setReviewActionError(message);
      showToast(message, "error");
    } finally {
      setIsFindingReviewTarget(false);
    }
  };

  const handleReviewDialogClose = () => {
    setIsReviewDialogOpen(false);
    setReviewDialogTarget(null);
    setSelectedReview(null);
  };

  const handleReviewSuccess = async () => {
    await fetchMyReviews();
    setReviewRefreshToken((prev) => prev + 1);
    setReviewActionError(null);
  };

  const handleAddToCart = async (redirectToCheckout = false) => {
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

    const sanitizedDescription = sanitizeDescriptionHtml(description);

    return (
      <Box mt={4}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Mô tả sản phẩm
        </Typography>
        <Typography
          component="div"
          color="text.secondary"
          lineHeight={1.8}
          sx={{
            "& p": { m: 0, mb: 1.5 },
            "& p:last-child": { mb: 0 },
          }}
          dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
        />
      </Box>
    );
  };

  const renderReviewCallout = () => (
    <Box mt={6}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Chia sẻ cảm nhận của bạn
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {existingReviewForVariant
              ? "Bạn đã từng đánh giá phiên bản này. Có thể cập nhật nếu trải nghiệm thay đổi."
              : "Đơn hàng đã được giao? Hãy để lại đánh giá để cộng đồng có thêm thông tin."}
          </Typography>
        </Box>
        <Button
          variant={existingReviewForVariant ? "outlined" : "contained"}
          color="secondary"
          onClick={handleOpenReviewDialog}
          disabled={!selectedVariantId || isFindingReviewTarget}
        >
          {isFindingReviewTarget
            ? "Đang kiểm tra..."
            : existingReviewForVariant
              ? "Cập nhật đánh giá"
              : "Viết đánh giá"}
        </Button>
      </Stack>
      {reviewActionError && (
        <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
          {reviewActionError}
        </Alert>
      )}
    </Box>
  );

  const renderReviewSummary = () => {
    if (!selectedVariantId) return null;

    if (isReviewLoading) {
      return (
        <Box
          mt={4}
          p={3}
          borderRadius={2}
          bgcolor="grey.50"
          border="1px solid"
          borderColor="divider"
        >
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
        <Box
          mt={4}
          p={3}
          borderRadius={2}
          bgcolor="success.lighter"
          color="success.darker"
          border="1px solid"
          borderColor="success.light"
        >
          <Typography variant="h6" fontWeight={600} gutterBottom>
            ✨ Tóm tắt các đánh giá bằng AI
          </Typography>
          <Typography
            variant="body1"
            sx={{
              whiteSpace: "pre-wrap",
              lineHeight: 1.7,
              color: "text.primary",
            }}
          >
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
      selectedVariantDetail?.media?.[0]?.url ||
      selectedVariant?.media?.url ||
      displayVariants[0]?.media?.url ||
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
              <Typography color="text.secondary">
                Mã hàng:{" "}
                {selectedVariantDetail?.sku ||
                  selectedVariant?.sku ||
                  information?.productCode ||
                  "Đang cập nhật"}
              </Typography>

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
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 1,
                    "& .MuiToggleButtonGroup-grouped": {
                      border: "1px solid rgba(0, 0, 0, 0.12) !important",
                      borderRadius: "8px !important",
                      marginLeft: "0 !important",
                      width: "100%",
                      minHeight: 40,
                    },
                    "& .MuiToggleButtonGroup-grouped.Mui-selected": {
                      borderColor: "primary.main !important",
                    },
                  }}
                >
                  {displayVariants.map((variant) => {
                    const outOfStock = isVariantOutOfStock(variant);

                    return (
                      <ToggleButton
                        key={variant.id}
                        value={variant.id || ""}
                        sx={{
                          textTransform: "none",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 0.5,
                          px: 0.5,
                          py: 0.25,
                          position: "relative",
                          opacity: outOfStock ? 0.75 : 1,
                          minWidth: 0,
                        }}
                      >
                        {variant.media?.url && (
                          <Box
                            component="img"
                            src={variant.media.url}
                            alt={variant.displayName || ""}
                            sx={{
                              width: 22,
                              height: 22,
                              objectFit: "cover",
                              borderRadius: 0.5,
                              flexShrink: 0,
                            }}
                          />
                        )}
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                            fontSize: { xs: "0.72rem", sm: "0.78rem" },
                            lineHeight: 1.1,
                            textAlign: "center",
                            textDecoration: outOfStock
                              ? "line-through"
                              : "none",
                            textDecorationColor: outOfStock
                              ? "error.main"
                              : "inherit",
                          }}
                        >
                          {variant.displayName || "Size"}
                        </Typography>
                      </ToggleButton>
                    );
                  })}
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

              {selectedVariantStockQuantity !== null &&
                (isSelectedVariantOutOfStock ? (
                  <Typography variant="h4" color="error.main" fontWeight={700}>
                    Hết hàng
                  </Typography>
                ) : (
                  <Typography variant="body2" color="success.main" fontWeight={600}>
                    {`Còn ${selectedVariantStockQuantity} sản phẩm`}
                  </Typography>
                ))}

              {/* Action buttons */}
              {!isSelectedVariantOutOfStock && (
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
              )}
            </Stack>
          </Grid>
        </Grid>

        {renderHighlights()}
        {renderFragranceNotes()}
        {renderDescription()}
        {renderReviewSummary()}
        {renderReviewCallout()}
        <ReviewSection
          variantId={selectedVariantId}
          refreshToken={reviewRefreshToken}
        />
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

      <ReviewEditorDialog
        open={isReviewDialogOpen}
        mode={reviewDialogMode}
        target={reviewDialogTarget}
        initialReview={selectedReview}
        onClose={handleReviewDialogClose}
        onSuccess={handleReviewSuccess}
      />
    </MainLayout>
  );
};

export default ProductDetailPage;
