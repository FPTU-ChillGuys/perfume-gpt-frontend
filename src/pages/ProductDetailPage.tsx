import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  Grid,
  IconButton,
  Stack,
  Tab,
  Tabs,
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
import { productActivityLogService } from "@/services/ai/productActivityLogService";
import { productReviewService } from "@/services/reviewService";
import { orderService } from "@/services/orderService";
import { ReviewEditorDialog } from "@/components/review/ReviewEditorDialog";
import { ReviewSection } from "@/components/review/ReviewSection";
import {
  productDetailTabsContent,
  normalizeProductDetailTabContent,
} from "@/constants/productDetailTabsContent";
import type {
  MediaResponse,
  PublicProductDetail,
  ProductInformation,
} from "@/types/product";
import type {
  ReviewDialogTarget,
  ReviewResponse,
  ReviewStatisticsResponse,
} from "@/types/review";

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const getVariantRetailPrice = (variant: unknown) => {
  const retailPrice = (variant as { retailPrice?: unknown })?.retailPrice;
  return typeof retailPrice === "number" ? retailPrice : null;
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

const sortVariantMediaWithPrimaryFirst = (mediaList: MediaResponse[]) => {
  const isPrimary = (media?: MediaResponse | null) => {
    const meta = media as MediaResponse & {
      isPrimary?: boolean;
      isMain?: boolean;
    };
    return meta?.isPrimary === true || meta?.isMain === true;
  };

  return [...mediaList].sort((a, b) => {
    if (isPrimary(a) !== isPrimary(b)) {
      return isPrimary(a) ? -1 : 1;
    }

    return (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
  });
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
  const [productDetail, setProductDetail] =
    useState<PublicProductDetail | null>(null);
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
  const reviewSummaryCacheRef = useRef<Map<string, string>>(new Map());

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
  const [reviewStats, setReviewStats] =
    useState<ReviewStatisticsResponse | null>(null);
  const [shouldLoadReviewSummary, setShouldLoadReviewSummary] = useState(false);
  const [shouldRenderReviewSection, setShouldRenderReviewSection] =
    useState(false);
  const reviewSectionAnchorRef = useRef<HTMLDivElement | null>(null);
  const [infoTab, setInfoTab] = useState<"details" | "usage" | "shipping">(
    "details",
  );
  const [showStickyHeader, setShowStickyHeader] = useState(false);

  const fetchMyReviews = useCallback(async (): Promise<ReviewResponse[]> => {
    if (!isAuthenticated) {
      setMyReviews([]);
      return [];
    }

    setIsLoadingMyReviews(true);
    try {
      const data = await productReviewService.getMyReviews();
      setMyReviews(data);
      return data;
    } catch (error) {
      console.error("Error loading personal reviews:", error);
      return [];
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
      const applyDetail = (detailResponse: PublicProductDetail | null) => {
        if (!detailResponse) {
          return;
        }

        setProductDetail(detailResponse);

        const firstAvailableVariant = detailResponse.variants?.find(
          (variant) => {
            const stockQuantity = variant?.stockQuantity;
            return typeof stockQuantity !== "number" || stockQuantity > 0;
          },
        );

        setSelectedVariantId(
          (current) =>
            current ||
            firstAvailableVariant?.id ||
            detailResponse.variants?.[0]?.id ||
            null,
        );
      };

      try {
        const detailPromise = productService.getProductDetail(productId);
        const infoPromise = productService.getProductInformation(productId);

        const detailFirst = await detailPromise;

        if (!isMounted) {
          return;
        }

        applyDetail(detailFirst);
        setLoading(false);

        const infoResult = await Promise.allSettled([infoPromise]);

        if (!isMounted) {
          return;
        }

        if (infoResult[0]?.status === "fulfilled") {
          setInformation(infoResult[0].value);
        }

        setLoading(false);
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

  const displayVariants = useMemo(() => {
    return (productDetail?.variants || []).map((variant) => ({
      id: variant.id || "",
      displayName:
        [
          variant.concentrationName,
          variant.volumeMl ? `${variant.volumeMl} ml` : null,
        ]
          .filter(Boolean)
          .join(" - ") ||
        variant.sku ||
        "Size",
      price: variant.basePrice,
      retailPrice: getVariantRetailPrice(variant),
      stockQuantity: variant.stockQuantity,
      media: variant.media?.[0] || null,
      mediaList: variant.media || [],
      sku: variant.sku || null,
      campaignName: variant.campaignName || null,
      voucherCode: variant.voucherCode || null,
      discountedPrice:
        typeof variant.discountedPrice === "number"
          ? variant.discountedPrice
          : null,
    }));
  }, [productDetail]);

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
      const sorted = sortVariantMediaWithPrimaryFirst(variant.media || []);

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

    const sorted = sortVariantMediaWithPrimaryFirst(
      fallbackVariant.mediaList || [],
    );

    variantCacheRef.current.set(selectedVariantId, sorted);
    setVariantMediaList(sorted);
    setActiveSlide(0);
    setThumbnailOffset(0);
    setIsLoadingMedia(false);
  }, [selectedVariantId, productDetail, displayVariants]);

  // Effect: Fetch AI Review Summary
  useEffect(() => {
    if (!selectedVariantId || loading) {
      setReviewSummary(null);
      return;
    }

    if (!shouldLoadReviewSummary) {
      setReviewSummary(null);
      setReviewError(null);
      setIsReviewLoading(false);
      return;
    }

    const cachedSummary = reviewSummaryCacheRef.current.get(selectedVariantId);
    if (cachedSummary) {
      setReviewSummary(cachedSummary);
      setReviewError(null);
      setIsReviewLoading(false);
      return;
    }

    let isMounted = true;
    const timer = window.setTimeout(() => {
      setIsReviewLoading(true);
      setReviewError(null);
      setReviewSummary(null);

      reviewService
        .fetchReviewSummaryWithPolling(selectedVariantId)
        .then((summary) => {
          if (!isMounted) return;
          reviewSummaryCacheRef.current.set(selectedVariantId, summary);
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
    }, 500);

    return () => {
      isMounted = false;
      window.clearTimeout(timer);
    };
  }, [selectedVariantId, loading, shouldLoadReviewSummary]);

  useEffect(() => {
    setReviewActionError(null);
    setReviewStats(null);
    setShouldLoadReviewSummary(false);
  }, [selectedVariantId]);

  useEffect(() => {
    if (shouldRenderReviewSection) {
      return;
    }

    const anchor = reviewSectionAnchorRef.current;
    if (!anchor || typeof IntersectionObserver === "undefined") {
      setShouldRenderReviewSection(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          setShouldRenderReviewSection(true);
          observer.disconnect();
        }
      },
      { rootMargin: "240px 0px" },
    );

    observer.observe(anchor);
    return () => observer.disconnect();
  }, [shouldRenderReviewSection, selectedVariantId]);

  // Effect: Sticky header visibility - using scroll event for better responsiveness
  useEffect(() => {
    const handleScroll = () => {
      // Show sticky header when scrolled down more than 100px
      setShowStickyHeader(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Check initial state
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const isSelectedVariantOutOfStock = isVariantOutOfStock(selectedVariant);
  const isBackOfficeRole = user?.role === "admin" || user?.role === "staff";
  const selectedBasePrice = Number(selectedVariant?.price || 0);
  const selectedDiscountedPrice = Number(selectedVariant?.discountedPrice || 0);
  const hasCampaignDiscount =
    selectedDiscountedPrice > 0 &&
    selectedBasePrice > 0 &&
    selectedDiscountedPrice < selectedBasePrice;
  const campaignDisplayedPrice = hasCampaignDiscount
    ? selectedDiscountedPrice
    : selectedBasePrice;
  const mainDisplayedPrice = selectedBasePrice;
  const selectedRetailPrice = Number(selectedVariant?.retailPrice || 0);
  const campaignSavingAmount = hasCampaignDiscount
    ? selectedBasePrice - selectedDiscountedPrice
    : 0;
  const campaignSavingPercent =
    hasCampaignDiscount && selectedBasePrice > 0
      ? (campaignSavingAmount / selectedBasePrice) * 100
      : 0;
  const selectedCampaignName = selectedVariant?.campaignName?.trim() || "";
  const selectedVoucherCode = selectedVariant?.voucherCode?.trim() || "";
  const shouldShowCampaignCard =
    hasCampaignDiscount &&
    (Boolean(selectedCampaignName) || Boolean(selectedVoucherCode));
  const hasRetailPriceComparison =
    mainDisplayedPrice > 0 && selectedRetailPrice > mainDisplayedPrice;
  const savingAmount = hasRetailPriceComparison
    ? selectedRetailPrice - mainDisplayedPrice
    : 0;
  const savingPercent = hasRetailPriceComparison
    ? ((selectedRetailPrice - mainDisplayedPrice) / selectedRetailPrice) * 100
    : 0;
  const shouldShowSavings = savingAmount > 0;

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
      productActivityLogService
        .logProductView(productId, value)
        .catch((error) => {
          console.error("Failed to log variant click", error);
        });
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
              productDetail?.name ||
              undefined,
            productName: productDetail?.name || match.variantName || undefined,
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

    let currentReviews = myReviews;
    if (!currentReviews.length && !isLoadingMyReviews) {
      currentReviews = await fetchMyReviews();
    }

    const existingReview =
      currentReviews.find((review) => review.variantId === selectedVariantId) ||
      null;

    if (existingReview) {
      setReviewDialogMode("edit");
      setReviewDialogTarget({
        orderDetailId: existingReview.orderDetailId || "",
        variantId: existingReview.variantId || selectedVariantId,
        variantName:
          existingReview.variantName ||
          selectedVariant?.displayName ||
          productDetail?.name ||
          undefined,
        productName: productDetail?.name || existingReview.variantName,
        thumbnailUrl:
          existingReview.images?.[0]?.url || fallbackReviewThumbnail || null,
      });
      setSelectedReview(existingReview);
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

    setIsAdding(true);
    try {
      await cartService.addItem(selectedVariant.id, 1);
      await refreshCart();
      showToast("Đã thêm sản phẩm vào giỏ hàng", "success");

      if (redirectToCheckout) {
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
      showToast(err?.message || "Không thể thêm sản phẩm vào giỏ", "error");
    } finally {
      setIsAdding(false);
    }
  };
  const convertProductGenderToVietnamese = (gender: string) => {
    switch (gender) {
      case "Male":
        return "Nam";
      case "Female":
        return "Nữ";
      case "Unisex":
        return "Unisex";
      default:
        return gender;
    }
  };

  const productGender = useMemo(() => {
    const meta = information as Record<string, unknown> | null;
    return typeof meta?.gender === "string" ? meta.gender : "";
  }, [information]);

  const detailFields = useMemo(
    () => [
      {
        label: "Thương hiệu",
        value: information?.brandName || productDetail?.brandName || "",
      },
      { label: "Xuất xứ", value: information?.origin || "" },
      { label: "Năm phát hành", value: information?.releaseYear || "" },
      {
        label: "Giới tính",
        value: convertProductGenderToVietnamese(productGender),
      },
      { label: "Phong cách", value: information?.style || "" },
      { label: "Nhóm hương", value: information?.scentGroup || "" },
      { label: "Hương đầu", value: information?.topNotes || "" },
      { label: "Hương giữa", value: information?.heartNotes || "" },
      { label: "Hương cuối", value: information?.baseNotes || "" },
    ],
    [information, productDetail, productGender],
  );

  const description =
    information?.description || productDetail?.description || "";
  const sanitizedDescription = useMemo(
    () => (description ? sanitizeDescriptionHtml(description) : ""),
    [description],
  );

  const renderInformationTabs = () => {
    const usageContent = normalizeProductDetailTabContent(
      productDetailTabsContent.usageAndStorage,
    );
    const shippingContent = normalizeProductDetailTabContent(
      productDetailTabsContent.shippingAndReturn,
    );

    return (
      <Box mt={4}>
        <Tabs
          value={infoTab}
          onChange={(_, value: "details" | "usage" | "shipping") =>
            setInfoTab(value)
          }
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: "1px solid",
            borderColor: "divider",
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: 500,
            },
          }}
        >
          <Tab value="details" label="Chi tiết sản phẩm" />
          <Tab value="usage" label="Sử dụng và bảo quản" />
          <Tab value="shipping" label="Vận chuyển và đổi trả" />
        </Tabs>

        <Box sx={{ pt: 3 }}>
          {infoTab === "details" && (
            <Stack spacing={1.5}>
              {detailFields.map((field) => (
                <Box
                  key={field.label}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "180px 1fr" },
                    gap: 1,
                    py: 1,
                    borderBottom: "1px dashed",
                    borderColor: "divider",
                  }}
                >
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    fontWeight={600}
                  >
                    {field.label}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.primary"
                    sx={{ minHeight: 22 }}
                  >
                    {field.value || ""}
                  </Typography>
                </Box>
              ))}

              <Box mt={2}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Mô tả sản phẩm
                </Typography>
                {sanitizedDescription ? (
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
                ) : (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                  ></Typography>
                )}
              </Box>
            </Stack>
          )}

          {infoTab === "usage" && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ whiteSpace: "pre-line", lineHeight: 1.8 }}
            >
              {usageContent}
            </Typography>
          )}

          {infoTab === "shipping" && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ whiteSpace: "pre-line", lineHeight: 1.8 }}
            >
              {shippingContent}
            </Typography>
          )}
        </Box>
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
      ></Stack>
      {reviewActionError && (
        <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
          {reviewActionError}
        </Alert>
      )}
    </Box>
  );

  const renderReviewSummary = () => {
    if (!selectedVariantId) return null;

    if (!shouldLoadReviewSummary) {
      return (
        <Box mt={4}>
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => setShouldLoadReviewSummary(true)}
            sx={{ textTransform: "none", borderRadius: 999, px: 2.5 }}
          >
            Xem tóm tắt đánh giá bằng AI
          </Button>
        </Box>
      );
    }

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
          <Button variant="contained" component={RouterLink} to="/">
            Quay lại trang chủ
          </Button>
        </Box>
      );
    }

    if (!productDetail) {
      return (
        <Box py={6}>
          <Alert severity="info">
            Không tìm thấy thông tin sản phẩm. Vui lòng thử lại sau.
          </Alert>
        </Box>
      );
    }

    const productName = productDetail?.name || "Sản phẩm";
    const productBrand =
      information?.brandName || productDetail?.brandName || "";

    const fallbackImage =
      selectedVariantDetail?.media?.[0]?.url ||
      selectedVariant?.media?.url ||
      displayVariants[0]?.media?.url ||
      undefined;

    const activeImage = variantMediaList[activeSlide];
    const canPrevImage = activeSlide > 0;
    const canNextImage = activeSlide < variantMediaList.length - 1;
    const averageRating = reviewStats?.averageRating ?? 0;
    const totalReviews = reviewStats?.totalReviews ?? 0;

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
                bgcolor: "background.paper",
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
                  {variantMediaList.length > 1 && (
                    <>
                      <IconButton
                        onClick={() =>
                          setActiveSlide((prev) => Math.max(0, prev - 1))
                        }
                        disabled={!canPrevImage}
                        sx={{
                          position: "absolute",
                          left: 10,
                          top: "50%",
                          transform: "translateY(-50%)",
                          bgcolor: "grey.100",
                          border: "1px solid",
                          borderColor: "divider",
                          zIndex: 2,
                          "&:hover": { bgcolor: "grey.200" },
                        }}
                      >
                        <ChevronLeftIcon />
                      </IconButton>
                      <IconButton
                        onClick={() =>
                          setActiveSlide((prev) =>
                            Math.min(variantMediaList.length - 1, prev + 1),
                          )
                        }
                        disabled={!canNextImage}
                        sx={{
                          position: "absolute",
                          right: 10,
                          top: "50%",
                          transform: "translateY(-50%)",
                          bgcolor: "grey.100",
                          border: "1px solid",
                          borderColor: "divider",
                          zIndex: 2,
                          "&:hover": { bgcolor: "grey.200" },
                        }}
                      >
                        <ChevronRightIcon />
                      </IconButton>
                    </>
                  )}
                  <img
                    key={activeImage.id}
                    src={activeImage.url || ""}
                    alt={activeImage.altText || productName || "Product"}
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
                  alt={productName || "Product"}
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
            <Stack spacing={2.5}>
              <Typography variant="h4" fontWeight={700}>
                {productName}
              </Typography>
              <Stack spacing={1}>
                <Typography
                  sx={{ fontSize: "0.95rem", color: "text.secondary" }}
                >
                  Thương hiệu:{" "}
                  <Typography
                    component="span"
                    sx={{ fontSize: "0.95rem", fontWeight: 600 }}
                  >
                    {productBrand}
                  </Typography>
                </Typography>
                <Typography
                  sx={{ fontSize: "0.95rem", color: "text.secondary" }}
                >
                  Mã hàng:{" "}
                  <Typography
                    component="span"
                    sx={{ fontSize: "0.95rem", fontWeight: 600 }}
                  >
                    {selectedVariantDetail?.sku ||
                      selectedVariant?.sku ||
                      information?.productCode ||
                      "Đang cập nhật"}
                  </Typography>
                </Typography>
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center">
                <Rating value={averageRating} precision={0.1} readOnly />
                <Typography variant="body2" color="text.secondary">
                  {`${averageRating.toFixed(1)}/5 (${totalReviews} đánh giá)`}
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
              {shouldShowCampaignCard && (
                <Box
                  sx={{
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "error.main",
                    bgcolor: "#fff5f5",
                    p: 2,
                    display: "inline-flex",
                    flexDirection: "column",
                    gap: 1,
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                    flexWrap="wrap"
                  >
                    {selectedCampaignName && (
                      <Stack direction="row" spacing={1} alignItems="center">
                        {/* Campaign name badge */}
                        <Box
                          sx={{
                            px: 2,
                            py: 0.75,
                            borderRadius: 1.5,
                            bgcolor: "error.main",
                            display: "inline-flex",
                            alignItems: "center",
                          }}
                        >
                          <Typography
                            component="span"
                            sx={{
                              fontSize: "0.875rem",
                              fontWeight: 700,
                              color: "white",
                              textTransform: "uppercase",
                              letterSpacing: 0.5,
                            }}
                          >
                            {selectedCampaignName}
                          </Typography>
                        </Box>
                      </Stack>
                    )}
                    {campaignSavingPercent > 0 && (
                      <Typography
                        sx={{
                          fontSize: "0.9rem",
                          color: "error.main",
                          fontWeight: 700,
                        }}
                      >
                        Giảm {formatSavingPercent(campaignSavingPercent)}
                      </Typography>
                    )}
                  </Stack>
                  {selectedVoucherCode && (
                    <Box>
                      <Typography
                        component="span"
                        sx={{ fontSize: "0.875rem", color: "text.secondary" }}
                      >
                        Áp dụng mã {""}
                      </Typography>
                      <Typography
                        component="span"
                        sx={{
                          fontSize: "0.875rem",
                          fontWeight: 800,
                          color: "error.main",
                          px: 1.5,
                          py: 0.5,
                          bgcolor: "rgba(211, 47, 47, 0.08)",
                          borderRadius: 1,
                          border: "1px dashed",
                          borderColor: "error.main",
                        }}
                      >
                        {selectedVoucherCode}
                      </Typography>
                      <Typography
                        component="span"
                        sx={{ fontSize: "0.875rem", color: "text.secondary" }}
                      >
                        {""} để được giảm thêm
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
              {/* Price */}
              <Stack spacing={1}>
                {hasCampaignDiscount ? (
                  <>
                    {/* Hiển thị khi có campaign discount */}
                    <Stack
                      direction="row"
                      spacing={1.5}
                      alignItems="baseline"
                      flexWrap="wrap"
                    >
                      <Typography
                        sx={{
                          fontSize: { xs: "2rem", sm: "2.5rem" },
                          fontWeight: 700,
                          color: "error.main",
                          lineHeight: 1.2,
                        }}
                      >
                        {currencyFormatter.format(campaignDisplayedPrice)}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: { xs: "1.1rem", sm: "1.25rem" },
                          color: "text.disabled",
                          textDecoration: "line-through",
                          fontWeight: 400,
                        }}
                      >
                        {currencyFormatter.format(selectedBasePrice)}
                      </Typography>
                    </Stack>
                    <Typography
                      sx={{
                        fontSize: "0.875rem",
                        color: "text.secondary",
                      }}
                    >
                      Giá đã bao gồm VAT
                    </Typography>
                    {campaignSavingAmount > 0 && (
                      <Typography
                        sx={{
                          fontSize: "0.9rem",
                          color: "success.main",
                          fontWeight: 600,
                        }}
                      >
                        Tiết kiệm{" "}
                        {currencyFormatter.format(campaignSavingAmount)} (
                        {formatSavingPercent(campaignSavingPercent)})
                      </Typography>
                    )}
                  </>
                ) : (
                  <>
                    {/* Hiển thị khi không có campaign */}
                    <Stack
                      direction="row"
                      spacing={1.5}
                      alignItems="baseline"
                      flexWrap="wrap"
                    >
                      <Typography
                        sx={{
                          fontSize: { xs: "2rem", sm: "2.5rem" },
                          fontWeight: 700,
                          color: "error.main",
                          lineHeight: 1.2,
                        }}
                      >
                        {mainDisplayedPrice
                          ? currencyFormatter.format(mainDisplayedPrice)
                          : "Liên hệ"}
                      </Typography>
                      {hasRetailPriceComparison && (
                        <Typography
                          sx={{
                            fontSize: { xs: "1.1rem", sm: "1.25rem" },
                            color: "text.disabled",
                            textDecoration: "line-through",
                            fontWeight: 400,
                          }}
                        >
                          {currencyFormatter.format(selectedRetailPrice)}
                        </Typography>
                      )}
                    </Stack>
                    <Typography
                      sx={{
                        fontSize: "0.875rem",
                        color: "text.secondary",
                      }}
                    >
                      Giá đã bao gồm VAT
                    </Typography>
                    {hasRetailPriceComparison && shouldShowSavings && (
                      <Typography
                        sx={{
                          fontSize: "0.9rem",
                          color: "success.main",
                          fontWeight: 600,
                        }}
                      >
                        Tiết kiệm {currencyFormatter.format(savingAmount)} (
                        {formatSavingPercent(savingPercent)})
                      </Typography>
                    )}
                  </>
                )}
              </Stack>

              {isSelectedVariantOutOfStock && (
                <Alert
                  severity="error"
                  sx={{
                    borderRadius: 2,
                    bgcolor: "#fff5f5",
                    border: "1px solid",
                    borderColor: "error.light",
                    "& .MuiAlert-message": {
                      fontSize: "1rem",
                      fontWeight: 600,
                    },
                  }}
                >
                  Sản phẩm đã hết hàng
                </Alert>
              )}

              {/* Action buttons */}
              {!isSelectedVariantOutOfStock && !isBackOfficeRole && (
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

              {isBackOfficeRole && (
                <Alert
                  severity="info"
                  sx={{
                    borderRadius: 2,
                    "& .MuiAlert-message": {
                      fontSize: "0.875rem",
                    },
                  }}
                >
                  Tài khoản admin/staff chỉ có quyền xem sản phẩm, không hỗ trợ
                  mua hàng online.
                </Alert>
              )}
            </Stack>
          </Grid>
        </Grid>

        {renderInformationTabs()}
        {renderReviewSummary()}
        {renderReviewCallout()}
        <Box ref={reviewSectionAnchorRef} mt={2}>
          {shouldRenderReviewSection ? (
            <ReviewSection
              variantId={selectedVariantId}
              refreshToken={reviewRefreshToken}
              onStatisticsChange={setReviewStats}
            />
          ) : (
            <Box py={4} display="flex" justifyContent="center">
              <CircularProgress size={24} />
            </Box>
          )}
        </Box>
      </>
    );
  };

  return (
    <MainLayout stickyHeader={false}>
      {/* Sticky Header */}
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bgcolor: "white",
          borderBottom: "1px solid",
          borderColor: "divider",
          zIndex: 1100,
          transition: "transform 0.3s ease-in-out, opacity 0.3s ease-in-out",
          transform: showStickyHeader ? "translateY(0)" : "translateY(-100%)",
          opacity: showStickyHeader ? 1 : 0,
          boxShadow: showStickyHeader ? 2 : 0,
          pointerEvents: showStickyHeader ? "auto" : "none",
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              py: 1.5,
            }}
          >
            {/* Thumbnail */}
            <Box
              sx={{
                width: 60,
                height: 60,
                flexShrink: 0,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                overflow: "hidden",
                bgcolor: "grey.50",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {variantMediaList[0]?.url || selectedVariant?.media?.url ? (
                <img
                  src={
                    variantMediaList[0]?.url ||
                    selectedVariant?.media?.url ||
                    ""
                  }
                  alt={productDetail?.name || ""}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <Typography variant="caption" color="text.disabled">
                  No image
                </Typography>
              )}
            </Box>

            {/* Product Info */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  fontSize: "1rem",
                  lineHeight: 1.3,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {productDetail?.name || ""}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: "0.875rem" }}
              >
                {selectedVariant?.displayName?.split(" - ")[0] ||
                  "Eau De Parfum"}
              </Typography>
            </Box>

            {/* Size */}
            <Box
              sx={{
                display: { xs: "none", sm: "flex" },
                alignItems: "center",
                justifyContent: "center",
                width: 48,
                height: 48,
                borderRadius: "50%",
                border: "2px solid",
                borderColor: "error.main",
                flexShrink: 0,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: "error.main",
                  fontSize: "0.75rem",
                }}
              >
                {selectedVariant?.displayName?.match(/(\d+)\s*ml/i)?.[1] || "—"}
                ml
              </Typography>
            </Box>

            {/* Price */}
            <Box
              sx={{
                display: { xs: "none", md: "flex" },
                flexDirection: "column",
                alignItems: "flex-end",
                minWidth: 120,
              }}
            >
              {hasCampaignDiscount && selectedBasePrice > 0 && (
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.disabled",
                    textDecoration: "line-through",
                    fontSize: "0.75rem",
                  }}
                >
                  {currencyFormatter.format(selectedBasePrice)}
                </Typography>
              )}
              {!hasCampaignDiscount && hasRetailPriceComparison && (
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.disabled",
                    textDecoration: "line-through",
                    fontSize: "0.75rem",
                  }}
                >
                  {currencyFormatter.format(selectedRetailPrice)}
                </Typography>
              )}
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  color: "error.main",
                  fontSize: "1.25rem",
                  lineHeight: 1.2,
                }}
              >
                {mainDisplayedPrice
                  ? currencyFormatter.format(
                      hasCampaignDiscount
                        ? campaignDisplayedPrice
                        : mainDisplayedPrice,
                    )
                  : "Liên hệ"}
              </Typography>
            </Box>

            {/* Add to Cart Button */}
            {!isSelectedVariantOutOfStock && !isBackOfficeRole && (
              <Button
                variant="contained"
                color="error"
                onClick={() => handleAddToCart(false)}
                disabled={isAdding}
                sx={{
                  textTransform: "none",
                  fontWeight: 600,
                  px: 3,
                  py: 1,
                  whiteSpace: "nowrap",
                  minWidth: { xs: "auto", sm: 160 },
                }}
              >
                {isAdding ? "Đang thêm..." : "Thêm vào giỏ hàng"}
              </Button>
            )}
          </Box>
        </Container>
      </Box>

      <Box py={6}>
        <Container maxWidth="lg">{renderContent()}</Container>
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
