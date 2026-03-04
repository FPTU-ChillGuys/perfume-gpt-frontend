import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Drawer,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  Close as CloseIcon,
  CloudUpload as CloudUploadIcon,
  Star as StarIcon,
  AutoAwesome as AutoAwesomeIcon,
} from "@mui/icons-material";
import type { Banner, BannerPayload } from "@/types/banner";
import type {
  MediaResponse,
  ProductFastLook,
  ProductInformation,
  ProductListItem,
  ProductListItemWithVariants,
  UpdateProductRequest,
} from "@/types/product";
import { AdminLayout } from "@/layouts/AdminLayout";
import { bannerService } from "@/services/bannerService";
import { productService } from "@/services/productService";
import { BannerFormDialog } from "@/components/banner/BannerFormDialog";
import { useToast } from "@/hooks/useToast";
import ConfirmDialog from "@/components/common/ConfirmDialog";

const FALLBACK_BANNER_IMAGE =
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=80";
const SEMANTIC_MIN_CHARS = 3;

type MinimalProduct = ProductListItem | ProductListItemWithVariants;

type ConfirmAction =
  | { type: "deleteProduct"; product: ProductListItem }
  | { type: "deleteBanner"; banner: Banner }
  | { type: "deleteImage"; mediaId: string; product: ProductListItem };

interface ConfirmState {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  action: ConfirmAction | null;
}

export const ContentManagementPage = () => {
  const { showToast } = useToast();

  // Banner state
  const [banners, setBanners] = useState<Banner[]>([]);
  const [bannersLoading, setBannersLoading] = useState(true);
  const [bannerDialogOpen, setBannerDialogOpen] = useState(false);
  const [bannerSaving, setBannerSaving] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  // Product state
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productError, setProductError] = useState<string | null>(null);
  const [productPage, setProductPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [totalProducts, setTotalProducts] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedProduct, setSelectedProduct] = useState<ProductListItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [productImages, setProductImages] = useState<MediaResponse[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [descriptionSaving, setDescriptionSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [promotingProduct, setPromotingProduct] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    open: false,
    title: "",
    action: null,
  });
  const [confirmLoading, setConfirmLoading] = useState(false);

  const composeUpdatePayload = useCallback(
    (
      product: ProductListItem,
      overrides?: Partial<UpdateProductRequest>,
    ): UpdateProductRequest => {
      if (!product.brandId || !product.categoryId) {
        throw new Error("Sản phẩm thiếu thông tin brand hoặc category");
      }

      const attributePayload = product.attributes
        ?.filter((attr) => attr.attributeId && attr.valueId)
        .map((attr) => ({
          attributeId: attr.attributeId!,
          valueId: attr.valueId!,
        })) || [];

      return {
        name: product.name || "",
        brandId: product.brandId,
        categoryId: product.categoryId,
        description: product.description ?? null,
        attributes: attributePayload,
        ...overrides,
      };
    },
    [],
  );
  const [bestSellers, setBestSellers] = useState<ProductListItem[]>([]);
  const [bestSellersLoading, setBestSellersLoading] = useState(false);
  const [semanticResults, setSemanticResults] = useState<
    ProductListItemWithVariants[]
  >([]);
  const [semanticLoading, setSemanticLoading] = useState(false);
  const [semanticActive, setSemanticActive] = useState(false);
  const [semanticError, setSemanticError] = useState<string | null>(null);
  const [productInformation, setProductInformation] =
    useState<ProductInformation | null>(null);
  const [productFastLook, setProductFastLook] =
    useState<ProductFastLook | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const currencyFormatter = useMemo(() => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    });
  }, []);

  const loadBanners = useCallback(async () => {
    try {
      setBannersLoading(true);
      const data = await bannerService.getBanners();
      setBanners(data);
    } catch (error) {
      console.error(error);
      showToast("Không thể tải banner", "error");
    } finally {
      setBannersLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadBanners();
  }, [loadBanners]);

  const loadBestSellers = useCallback(async () => {
    try {
      setBestSellersLoading(true);
      const response = await productService.getBestSellers();
      setBestSellers(response.items.slice(0, 6));
    } catch (error) {
      console.error(error);
      showToast("Không thể tải best seller", "error");
    } finally {
      setBestSellersLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadBestSellers();
  }, [loadBestSellers]);

  const handleOpenBannerDialog = (banner?: Banner) => {
    setEditingBanner(banner ?? null);
    setBannerDialogOpen(true);
  };

  const handleBannerSubmit = async (payload: BannerPayload) => {
    try {
      setBannerSaving(true);
      await bannerService.upsertBanner(payload);
      await loadBanners();
      showToast("Đã lưu banner", "success");
      setBannerDialogOpen(false);
      setEditingBanner(null);
    } catch (error) {
      console.error(error);
      showToast("Không thể lưu banner", "error");
    } finally {
      setBannerSaving(false);
    }
  };

  const openConfirmDialog = (
    action: ConfirmAction,
    options: { title: string; description?: string; confirmText?: string },
  ) => {
    setConfirmState({
      open: true,
      action,
      title: options.title,
      description: options.description,
      confirmText: options.confirmText,
    });
  };

  const closeConfirmDialog = (force = false) => {
    if (confirmLoading && !force) {
      return;
    }
    setConfirmState((prev) => ({ ...prev, open: false, action: null }));
  };

  const requestDeleteBanner = (banner: Banner) => {
    if (!banner.id) {
      return;
    }
    openConfirmDialog(
      { type: "deleteBanner", banner },
      {
        title: "Xóa banner",
        description: `Bạn có chắc chắn muốn xóa banner "${banner.name}"?`,
        confirmText: "Xóa",
      },
    );
  };

  const handleReorder = async (bannerId: string, direction: "up" | "down") => {
    const currentIndex = banners.findIndex((banner) => banner.id === bannerId);
    if (currentIndex === -1) {
      return;
    }
    const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= banners.length) {
      return;
    }
    try {
      const reordered = [...banners];
      const temp = reordered[currentIndex];
      reordered[currentIndex] = reordered[swapIndex];
      reordered[swapIndex] = temp;
      const orderedIds = reordered.map((banner) => banner.id);
      const persisted = await bannerService.reorder(orderedIds);
      setBanners(persisted);
    } catch (error) {
      console.error(error);
      showToast("Không thể thay đổi thứ tự", "error");
    }
  };

  const fetchProducts = useCallback(async () => {
    try {
      setProductsLoading(true);
      setProductError(null);
      const response = await productService.getProducts({
        PageNumber: productPage + 1,
        PageSize: rowsPerPage,
      });
      setProducts(response.items);
      setTotalProducts(response.totalCount);
    } catch (error: any) {
      console.error("Failed to fetch products", error);
      const message = error.message || "Không thể tải sản phẩm";
      setProductError(message);
      showToast(message, "error");
    } finally {
      setProductsLoading(false);
    }
  }, [productPage, rowsPerPage, showToast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) {
      return products;
    }
    const keyword = searchQuery.toLowerCase();
    return products.filter((product) =>
      [product.name, product.brandName, product.categoryName]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(keyword)),
    );
  }, [products, searchQuery]);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < SEMANTIC_MIN_CHARS) {
      setSemanticActive(false);
      setSemanticResults([]);
      setSemanticError(null);
      setSemanticLoading(false);
      return;
    }

    let ignore = false;
    setSemanticLoading(true);
    setSemanticError(null);

    const timeout = window.setTimeout(async () => {
      try {
        const response = await productService.searchProductsSemantic({
          searchText: trimmed,
          PageNumber: 1,
          PageSize: 20,
        });
        if (!ignore) {
          setSemanticResults(response.items);
          setSemanticActive(true);
        }
      } catch (error: any) {
        if (ignore) {
          return;
        }
        console.error("Semantic search failed", error);
        const message = error.message || "Không thể tìm kiếm sản phẩm";
        setSemanticError(message);
      } finally {
        if (!ignore) {
          setSemanticLoading(false);
        }
      }
    }, 350);

    return () => {
      ignore = true;
      clearTimeout(timeout);
    };
  }, [searchQuery]);

  const displayedProducts: MinimalProduct[] = semanticActive
    ? semanticResults
    : filteredProducts;
  const tableLoading = semanticActive ? semanticLoading : productsLoading;
  const emptyStateMessage = semanticActive
    ? "Không có kết quả phù hợp với semantic search"
    : "Không tìm thấy sản phẩm phù hợp";

  const handleChangePage = (_event: unknown, newPage: number) => {
    setProductPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setProductPage(0);
  };

  const handleSelectProduct = (product: ProductListItem) => {
    setSelectedProduct(product);
    setDescriptionDraft(product.description || "");
    setProductInformation(null);
    setProductFastLook(null);
    setDrawerOpen(true);
  };

  const productId = selectedProduct?.id;

  const refreshProductImages = useCallback(async () => {
    if (!productId) {
      return;
    }
    try {
      setImagesLoading(true);
      const images = await productService.getProductImages(productId);
      setProductImages(images.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)));
    } catch (error) {
      console.error(error);
      showToast("Không thể tải hình sản phẩm", "error");
    } finally {
      setImagesLoading(false);
    }
  }, [productId, showToast]);

  const loadProductInsights = useCallback(async () => {
    if (!productId) {
      return;
    }
    try {
      setInsightsLoading(true);
      const [info, fastLook] = await Promise.all([
        productService.getProductInformation(productId),
        productService.getProductFastLook(productId),
      ]);
      setProductInformation(info);
      setProductFastLook(fastLook);
    } catch (error) {
      console.error(error);
      showToast("Không thể tải thông tin sản phẩm", "error");
    } finally {
      setInsightsLoading(false);
    }
  }, [productId, showToast]);

  useEffect(() => {
    if (drawerOpen) {
      refreshProductImages();
      loadProductInsights();
    } else {
      setProductInformation(null);
      setProductFastLook(null);
    }
  }, [drawerOpen, loadProductInsights, refreshProductImages]);

  useEffect(() => {
    if (!drawerOpen) {
      setPromotingProduct(false);
    }
  }, [drawerOpen]);

  const handleSaveDescription = async () => {
    if (!selectedProduct?.id) {
      return;
    }
    try {
      setDescriptionSaving(true);
      const normalizedDescription = descriptionDraft.trim() || null;
      const payload = composeUpdatePayload(selectedProduct, {
        description: normalizedDescription,
      });
      await productService.updateProduct(selectedProduct.id, payload);
      setProducts((prev) =>
        prev.map((product) =>
          product.id === selectedProduct.id
            ? { ...product, description: descriptionDraft }
            : product,
        ),
      );
      setSelectedProduct((prev) =>
        prev && prev.id === selectedProduct.id
          ? { ...prev, description: descriptionDraft }
          : prev,
      );
      showToast("Đã lưu mô tả", "success");
    } catch (error: any) {
      console.error(error);
      showToast(error?.message || "Không thể lưu mô tả", "error");
    } finally {
      setDescriptionSaving(false);
    }
  };

  const handleUploadImages = async (files: FileList | null) => {
    if (!files || !selectedProduct?.id) {
      return;
    }
    try {
      setUploadingImages(true);
      const payload = Array.from(files).map((file, index) => ({
        file,
        displayOrder: (productImages?.length || 0) + index + 1,
        isPrimary: productImages.length === 0 && index === 0,
      }));
      const uploaded = await productService.uploadProductImages(payload);
      const tempIds = uploaded
        .map((item) => item.id)
        .filter((id): id is string => Boolean(id));
      if (tempIds.length) {
        const payload = composeUpdatePayload(selectedProduct, {
          temporaryMediaIdsToAdd: tempIds,
        });
        await productService.updateProduct(selectedProduct.id, payload);
        showToast("Đã tải hình mới", "success");
        await refreshProductImages();
      }
    } catch (error: any) {
      console.error(error);
      showToast(error?.message || "Không thể tải hình", "error");
    } finally {
      setUploadingImages(false);
    }
  };

  const handlePromoteProduct = async (productOverride?: ProductListItem) => {
    const targetProduct = productOverride ?? selectedProduct;
    if (!targetProduct) {
      return;
    }
    try {
      setPromotingProduct(true);
      const heroImage =
        (targetProduct.id === selectedProduct?.id
          ? productImages[0]?.url || selectedProduct?.primaryImage?.url
          : targetProduct.primaryImage?.url) ||
        FALLBACK_BANNER_IMAGE;
      const metadataNotes = [targetProduct.brandName, targetProduct.categoryName];

      if (targetProduct.id === selectedProduct?.id && productInformation) {
        metadataNotes.push(
          productInformation.scentGroup,
          productInformation.productCode,
          productInformation.releaseYear
            ? `Ra mắt ${productInformation.releaseYear}`
            : null,
        );
      }

      const existing = banners.find(
        (banner) => banner.productId === targetProduct.id,
      );
      const payload: BannerPayload = {
        id: existing?.id,
        name: targetProduct.name || "Best Seller Spotlight",
        tagline: (targetProduct.brandName || "BEST SELLER").toUpperCase(),
        description:
          targetProduct.description ||
          "Sản phẩm bán chạy nhất tuần này, được khách hàng yêu thích.",
        heroImageUrl: heroImage,
        mobileImageUrl: heroImage,
        ctaLabel: "Khám phá ngay",
        ctaHref: "/products",
        priority: existing?.priority ?? 1,
        status: "published",
        productId: targetProduct.id,
        isHomeFeatured: true,
        notes: metadataNotes
          .filter((text): text is string => Boolean(text))
          .map((text) => String(text)),
      };
      await bannerService.upsertBanner(payload);
      await loadBanners();
      showToast("Đã đẩy sản phẩm lên banner", "success");
    } catch (error) {
      console.error(error);
      showToast("Không thể cập nhật banner", "error");
    } finally {
      setPromotingProduct(false);
    }
  };

  const requestDeleteImage = (mediaId: string | undefined) => {
    if (!mediaId || !selectedProduct?.id) {
      return;
    }
    openConfirmDialog(
      { type: "deleteImage", mediaId, product: selectedProduct },
      {
        title: "Xóa hình ảnh",
        description: "Bạn có chắc chắn muốn xóa hình ảnh này?",
        confirmText: "Xóa",
      },
    );
  };

  const requestDeleteProduct = (product: ProductListItem) => {
    if (!product.id) {
      return;
    }
    openConfirmDialog(
      { type: "deleteProduct", product },
      {
        title: "Xóa sản phẩm",
        description:
          `Bạn có chắc chắn muốn xóa sản phẩm "${product.name || ""}"? Thao tác này không thể hoàn tác.`,
        confirmText: "Xóa",
      },
    );
  };

  const handleConfirmAction = async () => {
    if (!confirmState.action) {
      closeConfirmDialog(true);
      return;
    }
    try {
      setConfirmLoading(true);
      switch (confirmState.action.type) {
        case "deleteProduct": {
          const productId = confirmState.action.product.id;
          if (!productId) {
            throw new Error("Không tìm thấy sản phẩm để xóa");
          }
          await productService.deleteProduct(productId);
          showToast("Đã xóa sản phẩm", "success");
          if (selectedProduct?.id === productId) {
            setDrawerOpen(false);
            setSelectedProduct(null);
          }
          await fetchProducts();
          break;
        }
        case "deleteBanner": {
          const bannerId = confirmState.action.banner.id;
          if (!bannerId) {
            throw new Error("Không tìm thấy banner để xóa");
          }
          await bannerService.deleteBanner(bannerId);
          await loadBanners();
          showToast("Đã xóa banner", "success");
          break;
        }
        case "deleteImage": {
          const { mediaId, product } = confirmState.action;
          if (!product.id) {
            throw new Error("Không tìm thấy sản phẩm chứa hình này");
          }
          const payload = composeUpdatePayload(product, {
            mediaIdsToDelete: [mediaId],
          });
          await productService.updateProduct(product.id, payload);
          showToast("Đã xóa hình", "success");
          if (selectedProduct?.id === product.id) {
            await refreshProductImages();
          }
          break;
        }
        default:
          break;
      }
      closeConfirmDialog();
    } catch (error: any) {
      console.error(error);
      const fallbackMessage = (() => {
        switch (confirmState.action?.type) {
          case "deleteProduct":
            return "Không thể xóa sản phẩm";
          case "deleteBanner":
            return "Không thể xóa banner";
          case "deleteImage":
            return "Không thể xóa hình";
          default:
            return "Không thể thực hiện thao tác";
        }
      })();
      showToast(error?.message || fallbackMessage, "error");
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <AdminLayout>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Stack spacing={4}>
          <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Quản lý banner & sản phẩm
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Điều phối nội dung hero banner và tài sản hình ảnh sản phẩm trong cùng một bảng điều khiển.
            </Typography>
          </Box>

          {/* Banner Section */}
          <Paper sx={{ p: 3 }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              spacing={2}
              sx={{ mb: 3 }}
            >
              <Box>
                <Typography variant="h6">Banner hero</Typography>
                <Typography variant="body2" color="text.secondary">
                  Kiểm soát thứ tự hiển thị, trạng thái và nội dung CTA của các banner.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={loadBanners}
                >
                  Làm mới
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenBannerDialog()}
                >
                  Tạo banner
                </Button>
              </Stack>
            </Stack>

            {bannersLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                <CircularProgress />
              </Box>
            ) : banners.length === 0 ? (
              <Alert severity="info">Chưa có banner nào.</Alert>
            ) : (
              <Grid container spacing={2}>
                {banners.map((banner, index) => (
                  <Grid item xs={12} md={4} key={banner.id}>
                    <Paper
                      elevation={0}
                      sx={{
                        border: "1px solid",
                        borderColor: "grey.200",
                        borderRadius: 3,
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        height: "100%",
                      }}
                    >
                      <Box
                        sx={{
                          position: "relative",
                          pt: "60%",
                          backgroundImage: `linear-gradient(120deg, rgba(15,23,42,0.6), rgba(15,23,42,0.3)), url(${banner.heroImageUrl})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }}
                      >
                        <Chip
                          label={banner.status}
                          size="small"
                          sx={{
                            position: "absolute",
                            top: 12,
                            left: 12,
                            textTransform: "capitalize",
                          }}
                          color={
                            banner.status === "published"
                              ? "success"
                              : banner.status === "scheduled"
                                ? "warning"
                                : "default"
                          }
                        />
                        <Chip
                          label={`#${banner.priority}`}
                          size="small"
                          sx={{ position: "absolute", top: 12, right: 12 }}
                        />
                        {banner.isHomeFeatured && (
                          <Chip
                            label="Home banner"
                            size="small"
                            color="secondary"
                            sx={{ position: "absolute", bottom: 12, left: 12 }}
                          />
                        )}
                      </Box>
                      <Box sx={{ p: 2, flexGrow: 1, display: "flex", flexDirection: "column" }}>
                        <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>
                          {banner.tagline}
                        </Typography>
                        <Typography variant="h6">{banner.name}</Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ flexGrow: 1, mt: 1 }}
                        >
                          {banner.description}
                        </Typography>
                        {banner.notes && banner.notes.length > 0 && (
                          <Stack direction="row" flexWrap="wrap" spacing={1} sx={{ mt: 1 }}>
                            {banner.notes.map((note) => (
                              <Chip key={`${banner.id}-${note}`} label={note} size="small" variant="outlined" />
                            ))}
                          </Stack>
                        )}
                        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                          <Tooltip title="Di chuyển lên">
                            <span>
                              <IconButton
                                size="small"
                                disabled={index === 0}
                                onClick={() => handleReorder(banner.id, "up")}
                              >
                                <ArrowUpIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Di chuyển xuống">
                            <span>
                              <IconButton
                                size="small"
                                disabled={index === banners.length - 1}
                                onClick={() => handleReorder(banner.id, "down")}
                              >
                                <ArrowDownIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Box sx={{ flexGrow: 1 }} />
                          <Tooltip title="Chỉnh sửa">
                            <IconButton size="small" onClick={() => handleOpenBannerDialog(banner)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Xóa">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => requestDeleteBanner(banner)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>

          {/* Product Section */}
          <Paper sx={{ p: 3 }}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              justifyContent="space-between"
              spacing={2}
              sx={{ mb: 3 }}
            >
              <Box>
                <Typography variant="h6">Quản lý sản phẩm</Typography>
                <Typography variant="body2" color="text.secondary">
                  Tải hình, chỉnh sửa mô tả và loại bỏ các sản phẩm không còn kinh doanh.
                </Typography>
              </Box>
              <Stack spacing={1} sx={{ width: { xs: "100%", md: 360 } }}>
                <TextField
                  placeholder="Tìm theo tên, thương hiệu..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  size="small"
                />
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="caption" color="text.secondary">
                    Nhập tối thiểu {SEMANTIC_MIN_CHARS} ký tự để bật semantic search.
                  </Typography>
                  {semanticActive && (
                    <Chip
                      size="small"
                      color="secondary"
                      label="Semantic"
                      icon={<AutoAwesomeIcon fontSize="small" />}
                    />
                  )}
                </Stack>
              </Stack>
            </Stack>

            {productError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {productError}
              </Alert>
            )}

            {semanticError && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {semanticError}
              </Alert>
            )}

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell width={80}>Hình</TableCell>
                    <TableCell>Tên sản phẩm</TableCell>
                    <TableCell>Thương hiệu</TableCell>
                    <TableCell>Danh mục</TableCell>
                    <TableCell>Mô tả</TableCell>
                    <TableCell align="right">Thao tác</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tableLoading ? (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <LinearProgress />
                      </TableCell>
                    </TableRow>
                  ) : displayedProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                        <Typography variant="body2" color="text.secondary">
                          {emptyStateMessage}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedProducts.map((product) => (
                      <TableRow hover key={product.id}>
                        <TableCell>
                          {product.primaryImage?.url ? (
                            <Box
                              component="img"
                              src={product.primaryImage.url}
                              alt={product.name ?? "product"}
                              sx={{ width: 56, height: 56, objectFit: "cover", borderRadius: 1 }}
                            />
                          ) : (
                            <Box
                              sx={{
                                width: 56,
                                height: 56,
                                borderRadius: 1,
                                bgcolor: "grey.200",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "grey.500",
                                fontSize: 12,
                              }}
                            >
                              No img
                            </Box>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="subtitle2">{product.name}</Typography>
                        </TableCell>
                        <TableCell>{product.brandName}</TableCell>
                        <TableCell>{product.categoryName}</TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              maxWidth: 320,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {product.description || "—"}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<EditIcon fontSize="small" />}
                            sx={{ mr: 1, textTransform: "none" }}
                            onClick={() => handleSelectProduct(product)}
                          >
                            Chỉnh sửa
                          </Button>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => requestDeleteProduct(product)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            {!semanticActive ? (
              <TablePagination
                component="div"
                rowsPerPageOptions={[5, 8, 12, 20]}
                rowsPerPage={rowsPerPage}
                page={productPage}
                count={totalProducts}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            ) : (
              <Typography variant="caption" color="text.secondary">
                Đang hiển thị {semanticResults.length} kết quả semantic. Xóa ô tìm kiếm để quay lại danh sách chuẩn.
              </Typography>
            )}
            <Divider sx={{ my: 3 }} />
            <Box>
              <Stack
                direction={{ xs: "column", md: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", md: "center" }}
                spacing={1.5}
                sx={{ mb: 2 }}
              >
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Top best seller tuần này
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Sử dụng danh sách này để đẩy nhanh việc tạo banner.
                  </Typography>
                </Box>
                <Button
                  size="small"
                  startIcon={<RefreshIcon fontSize="small" />}
                  onClick={loadBestSellers}
                  disabled={bestSellersLoading}
                >
                  Làm mới danh sách
                </Button>
              </Stack>
              {bestSellersLoading ? (
                <LinearProgress sx={{ mb: 2 }} />
              ) : (
                <Grid container spacing={2}>
                  {bestSellers.map((product) => (
                    <Grid item xs={12} md={6} key={`best-${product.id}`}>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 2,
                          height: "100%",
                          display: "flex",
                          gap: 2,
                          alignItems: "center",
                        }}
                      >
                        {product.primaryImage?.url ? (
                          <Box
                            component="img"
                            src={product.primaryImage.url}
                            alt={product.name ?? "best seller"}
                            sx={{
                              width: 64,
                              height: 64,
                              borderRadius: 2,
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: 64,
                              height: 64,
                              borderRadius: 2,
                              bgcolor: "grey.200",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 12,
                              color: "grey.600",
                            }}
                          >
                            No img
                          </Box>
                        )}
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle2" fontWeight={600}>
                            {product.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {product.brandName} · {product.categoryName}
                          </Typography>
                          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => handleSelectProduct(product)}
                            >
                              Quản lý
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handlePromoteProduct(product)}
                              disabled={promotingProduct}
                            >
                              Đẩy banner
                            </Button>
                          </Stack>
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                  {bestSellers.length === 0 && (
                    <Grid item xs={12}>
                      <Alert severity="info">
                        Chưa có dữ liệu best seller từ API.
                      </Alert>
                    </Grid>
                  )}
                </Grid>
              )}
            </Box>
          </Paper>
        </Stack>
      </Container>

      <BannerFormDialog
        open={bannerDialogOpen}
        onClose={() => setBannerDialogOpen(false)}
        onSubmit={handleBannerSubmit}
        initialData={editingBanner ?? undefined}
        saving={bannerSaving}
      />

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: { xs: "100%", md: 480 } } }}
      >
        {selectedProduct ? (
          <Stack spacing={3} sx={{ p: 3, height: "100%" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="h6">{selectedProduct.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedProduct.brandName} · {selectedProduct.categoryName}
                </Typography>
              </Box>
              <IconButton onClick={() => setDrawerOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Stack>
            <Divider />
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Mô tả sản phẩm
              </Typography>
              <TextField
                value={descriptionDraft}
                onChange={(event) => setDescriptionDraft(event.target.value)}
                multiline
                minRows={4}
                fullWidth
              />
              <Button
                sx={{ mt: 1.5 }}
                variant="contained"
                onClick={handleSaveDescription}
                disabled={descriptionSaving}
              >
                {descriptionSaving ? "Đang lưu..." : "Lưu mô tả"}
              </Button>
            </Box>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Banner best seller
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Gắn sản phẩm này lên hero banner trang chủ và giữ trạng thái best seller.
              </Typography>
              <Button
                variant="outlined"
                startIcon={<StarIcon fontSize="small" />}
                onClick={handlePromoteProduct}
                disabled={promotingProduct}
              >
                {promotingProduct ? "Đang cập nhật..." : "Đẩy lên banner"}
              </Button>
            </Box>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Thông tin hương thơm
              </Typography>
              {insightsLoading ? (
                <LinearProgress sx={{ height: 4, borderRadius: 99 }} />
              ) : productInformation ? (
                <Stack spacing={0.75}>
                  {[
                    {
                      label: "Mã sản phẩm",
                      value: productInformation.productCode,
                    },
                    { label: "Xuất xứ", value: productInformation.origin },
                    {
                      label: "Năm ra mắt",
                      value: productInformation.releaseYear,
                    },
                    {
                      label: "Nhóm hương",
                      value: productInformation.scentGroup,
                    },
                    { label: "Phong cách", value: productInformation.style },
                  ]
                    .filter((item) => item.value)
                    .map((item) => (
                      <Stack
                        key={`${item.label}-${item.value}`}
                        direction="row"
                        justifyContent="space-between"
                      >
                        <Typography variant="body2" color="text.secondary">
                          {item.label}
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {item.value}
                        </Typography>
                      </Stack>
                    ))}
                  {([
                    {
                      label: "Tầng hương đầu",
                      value: productInformation.topNotes,
                    },
                    {
                      label: "Tầng hương giữa",
                      value: productInformation.middleNotes,
                    },
                    {
                      label: "Tầng hương cuối",
                      value: productInformation.baseNotes,
                    },
                  ] as const)
                    .filter((item) => item.value)
                    .map((item) => (
                      <Box key={item.label}>
                        <Typography variant="caption" color="text.secondary">
                          {item.label}
                        </Typography>
                        <Typography variant="body2">{item.value}</Typography>
                      </Box>
                    ))}
                  {productInformation.description && (
                    <Typography variant="body2" color="text.secondary">
                      {productInformation.description}
                    </Typography>
                  )}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Chưa có dữ liệu mô tả nâng cao.
                </Typography>
              )}
            </Box>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Biến thể & SKU
              </Typography>
              {insightsLoading ? (
                <LinearProgress sx={{ height: 4, borderRadius: 99 }} />
              ) : productFastLook?.variants && productFastLook.variants.length > 0 ? (
                <Stack spacing={1.5}>
                  {productFastLook.variants.map((variant) => (
                    <Paper key={variant.id} variant="outlined" sx={{ p: 1.5 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" fontWeight={600}>
                          {variant.sku}
                        </Typography>
                        {variant.status && (
                          <Chip label={variant.status} size="small" color="primary" />
                        )}
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {[variant.volumeMl ? `${variant.volumeMl}ml` : null, variant.concentrationName]
                          .filter(Boolean)
                          .join(" · ")}
                      </Typography>
                      {typeof variant.basePrice === "number" && (
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          {currencyFormatter.format(variant.basePrice)}
                        </Typography>
                      )}
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Chưa có biến thể nào.
                </Typography>
              )}
            </Box>
            <Divider />
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle2">Thư viện hình ảnh</Typography>
                <Button
                  size="small"
                  component="label"
                  startIcon={<CloudUploadIcon fontSize="small" />}
                  disabled={uploadingImages}
                >
                  {uploadingImages ? "Đang tải..." : "Tải hình"}
                  <input
                    hidden
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => handleUploadImages(event.target.files)}
                  />
                </Button>
              </Stack>
              {imagesLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                  <CircularProgress size={32} />
                </Box>
              ) : productImages.length === 0 ? (
                <Alert severity="info">Chưa có hình nào.</Alert>
              ) : (
                <Grid container spacing={2}>
                  {productImages.map((image) => (
                    <Grid item xs={6} key={image.id}>
                      <Box sx={{ position: "relative" }}>
                        <Box
                          component="img"
                          src={image.url || ""}
                          alt={image.altText || "product"}
                          sx={{
                            width: "100%",
                            borderRadius: 2,
                            objectFit: "cover",
                            height: 140,
                          }}
                        />
                        <Stack
                          direction="row"
                          spacing={0.5}
                          sx={{ position: "absolute", top: 8, left: 8 }}
                        >
                          {image.isPrimary && <Chip label="Primary" size="small" color="primary" />}
                          {typeof image.displayOrder === "number" && (
                            <Chip label={`#${image.displayOrder}`} size="small" />
                          )}
                        </Stack>
                        <IconButton
                          size="small"
                          color="error"
                          sx={{ position: "absolute", top: 8, right: 8, bgcolor: "rgba(0,0,0,0.4)", color: "white" }}
                          onClick={() => requestDeleteImage(image.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          </Stack>
        ) : (
          <Box sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Chọn một sản phẩm để chỉnh sửa.
            </Typography>
          </Box>
        )}
      </Drawer>

      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        confirmText={confirmState.confirmText}
        loading={confirmLoading}
        onClose={closeConfirmDialog}
        onConfirm={handleConfirmAction}
      />
    </AdminLayout>
  );
};
