import { useState, useEffect, useCallback } from "react";
import type { ChangeEvent } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  IconButton,
  Typography,
  Alert,
  Autocomplete,
  CircularProgress,
  Card,
  CardMedia,
  Chip,
} from "@mui/material";
import {
  X,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Upload,
  ImageIcon,
  RefreshCw,
} from "lucide-react";
import { attributeService } from "@/services/attributeService";
import { productService } from "@/services/productService";
import { brandService } from "@/services/brandService";
import type { BrandLookupItem } from "@/services/brandService";
import { categoryService } from "@/services/categoryService";
import type { CategoryLookupItem } from "@/services/categoryService";
import { useToast } from "@/hooks/useToast";
import type {
  AttributeLookupItem,
  AttributeValueLookupItem,
  ProductImageUploadPayload,
  UpdateProductRequest,
} from "@/types/product";

interface AttributeSelection {
  attribute: AttributeLookupItem | null | undefined;
  value: AttributeValueLookupItem | null | undefined;
  valueOptions: AttributeValueLookupItem[];
  loadingValues: boolean;
}

interface UnifiedImage {
  id?: string; // mediaId for existing images
  temporaryMediaId?: string; // for newly uploaded images
  url?: string; // for existing images from server
  previewUrl?: string; // for newly uploaded images (object URL)
  file?: File; // for newly uploaded images
  altText: string;
  displayOrder?: number;
  isPrimary: boolean;
  isExisting: boolean; // true for existing images from server
  markedForDeletion?: boolean;
}

interface EditProductDialogProps {
  open: boolean;
  productId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

const createEmptyAttributeSelection = (): AttributeSelection => ({
  attribute: null,
  value: null,
  valueOptions: [],
  loadingValues: false,
});

export default function EditProductDialog({
  open,
  productId,
  onClose,
  onSuccess,
}: EditProductDialogProps) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<BrandLookupItem | null>(
    null,
  );
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryLookupItem | null>(null);
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<UnifiedImage[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [attributeSelections, setAttributeSelections] = useState<
    AttributeSelection[]
  >([createEmptyAttributeSelection()]);

  const [brands, setBrands] = useState<BrandLookupItem[]>([]);
  const [categories, setCategories] = useState<CategoryLookupItem[]>([]);
  const [availableAttributes, setAvailableAttributes] = useState<
    AttributeLookupItem[]
  >([]);

  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const resetState = useCallback(() => {
    setName("");
    setSelectedBrand(null);
    setSelectedCategory(null);
    setDescription("");

    // Clean up image preview URLs using functional update to avoid dependency
    setImages((prevImages) => {
      prevImages.forEach((img) => {
        if (img.previewUrl) {
          URL.revokeObjectURL(img.previewUrl);
        }
      });
      return [];
    });
    setCurrentImageIndex(0);

    setAttributeSelections([createEmptyAttributeSelection()]);
    setAvailableAttributes([]);
    setError(null);
    setInitialized(false);
  }, []);

  const initializeDialog = useCallback(async () => {
    if (!productId) {
      return;
    }

    setInitializing(true);
    setLoadingAttributes(true);
    setError(null);

    try {
      const [
        attributeLookup,
        productDetail,
        productImages,
        brandsList,
        categoriesList,
      ] = await Promise.all([
        attributeService.getAttributes(),
        productService.getProductDetail(productId),
        productService.getProductImages(productId),
        brandService.getBrandsLookup(),
        categoryService.getCategoriesLookup(),
      ]);

      if (!productDetail) {
        throw new Error("Không tìm thấy sản phẩm");
      }

      setName(productDetail.name || "");
      setBrands(brandsList);
      setCategories(categoriesList);

      // Find and set selected brand
      const brand = brandsList.find((b) => b.id === productDetail.brandId);
      setSelectedBrand(brand || null);

      // Find and set selected category
      const category = categoriesList.find(
        (c) => c.id === productDetail.categoryId,
      );
      setSelectedCategory(category || null);

      setDescription(productDetail.description || "");

      // Convert existing images to unified format
      const sortedImages = (productImages || [])
        .slice()
        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
        .map(
          (image): UnifiedImage => ({
            id: image.id,
            url: image.url,
            altText: image.altText || "",
            displayOrder: image.displayOrder,
            isPrimary: image.isPrimary || false,
            isExisting: true,
            markedForDeletion: false,
          }),
        );
      setImages(sortedImages);
      setCurrentImageIndex(0);

      const productAttributes = productDetail.attributes || [];
      const fallbackAttributes: AttributeLookupItem[] = [];

      const selections = productAttributes.length
        ? await Promise.all(
            productAttributes.map(async (attr: any) => {
              let attributeOption =
                attributeLookup.find((item) => item.id === attr.attributeId) ||
                null;

              if (!attributeOption && typeof attr.attributeId === "number") {
                attributeOption = {
                  id: attr.attributeId,
                  name: attr.attribute || `Attribute ${attr.attributeId}`,
                  description: attr.description || undefined,
                };
                if (
                  !fallbackAttributes.some(
                    (item) => item.id === attributeOption!.id,
                  )
                ) {
                  fallbackAttributes.push(attributeOption);
                }
              }

              let valueOptions: AttributeValueLookupItem[] = [];
              if (attributeOption?.id) {
                try {
                  valueOptions = await attributeService.getAttributeValues(
                    attributeOption.id,
                  );
                } catch (valueError) {
                  console.error("Error fetching attribute values:", valueError);
                }
              }

              const fallbackValue =
                typeof attr.valueId === "number"
                  ? { id: attr.valueId, value: attr.value || "" }
                  : null;

              if (
                fallbackValue &&
                !valueOptions.some((option) => option.id === fallbackValue.id)
              ) {
                valueOptions = [...valueOptions, fallbackValue];
              }

              return {
                attribute: attributeOption,
                value:
                  valueOptions.find((option) => option.id === attr.valueId) ||
                  fallbackValue,
                valueOptions,
                loadingValues: false,
              };
            }),
          )
        : [createEmptyAttributeSelection()];

      const normalizedAttributes = [
        ...attributeLookup,
        ...fallbackAttributes.filter(
          (fallback) =>
            !attributeLookup.some((attr) => attr.id === fallback.id),
        ),
      ];

      setAttributeSelections(
        selections.length ? selections : [createEmptyAttributeSelection()],
      );
      setAvailableAttributes(normalizedAttributes);
      setInitialized(true);
    } catch (err: any) {
      console.error("Error loading product for edit:", err);
      const errorMessage = err.message || "Không thể tải dữ liệu sản phẩm";
      setError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setInitializing(false);
      setLoadingAttributes(false);
    }
  }, [productId, showToast]);

  useEffect(() => {
    if (open && productId && !initialized) {
      initializeDialog();
    } else if (!open) {
      resetState();
    }
  }, [open, productId, initialized, initializeDialog, resetState]);

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      setError(null);

      // Prepare payload for upload
      const payload: ProductImageUploadPayload[] = [
        {
          file,
          altText: file.name,
          displayOrder: images.length,
          isPrimary: images.length === 0, // First image is primary
        },
      ];

      // Upload to temporary storage
      const uploadedMedia = await productService.uploadProductImages(payload);

      if (uploadedMedia.length === 0 || !uploadedMedia[0]?.id) {
        throw new Error("Không nhận được ID ảnh từ server");
      }

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);

      // Add to images list
      const newImage: UnifiedImage = {
        temporaryMediaId: uploadedMedia[0].id,
        file,
        previewUrl,
        altText: file.name,
        displayOrder: images.length,
        isPrimary: images.length === 0,
        isExisting: false,
      };

      setImages((prev) => {
        const updated = [...prev, newImage];
        setCurrentImageIndex(updated.length - 1); // Navigate to newly uploaded image
        return updated;
      });
      showToast("Đã tải ảnh lên thành công", "success");
    } catch (err: any) {
      console.error("Error uploading image:", err);
      const errorMessage = err.message || "Không thể tải ảnh lên";
      setError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setUploadingImage(false);
      event.target.value = ""; // Reset input
    }
  };

  const handleRemoveImage = (imageIndex: number) => {
    const imageToRemove = images[imageIndex];
    if (!imageToRemove) return;

    if (imageToRemove.isExisting) {
      // Toggle marked for deletion for existing images
      if (imageToRemove.markedForDeletion) {
        // Unmark
        setImages((prev) =>
          prev.map((img, idx) =>
            idx === imageIndex ? { ...img, markedForDeletion: false } : img,
          ),
        );
        showToast("Đã hoàn tác đánh dấu xóa", "info");
      } else {
        // Mark for deletion
        setImages((prev) =>
          prev.map((img, idx) =>
            idx === imageIndex ? { ...img, markedForDeletion: true } : img,
          ),
        );
        showToast("Đã đánh dấu ảnh để xóa", "info");
      }
    } else {
      // Remove newly uploaded image immediately
      if (imageToRemove.previewUrl) {
        URL.revokeObjectURL(imageToRemove.previewUrl);
      }
      setImages((prev) => prev.filter((_, idx) => idx !== imageIndex));
      showToast("Đã xóa ảnh", "info");

      // Adjust current index after removal
      if (currentImageIndex >= images.length - 1 && images.length > 1) {
        setCurrentImageIndex(images.length - 2);
      } else if (images.length === 1) {
        setCurrentImageIndex(0);
      }
    }
  };

  const handleSetPrimaryImage = async (imageIndex: number) => {
    const imageToSetPrimary = images[imageIndex];
    if (!imageToSetPrimary) return;

    // If it's an existing image, call API to set primary
    if (imageToSetPrimary.isExisting && imageToSetPrimary.id) {
      try {
        await productService.setPrimaryProductImage(imageToSetPrimary.id);
        showToast("Đã đặt làm hình chính", "success");
      } catch (err: any) {
        console.error("Error setting primary image:", err);
        const errorMessage = err.message || "Không thể đặt hình chính";
        setError(errorMessage);
        showToast(errorMessage, "error");
        return;
      }
    }

    // Update local state
    setImages((prev) =>
      prev.map((img, idx) => ({
        ...img,
        isPrimary: idx === imageIndex,
      })),
    );
  };

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  const handleAddAttribute = () => {
    setAttributeSelections((prev) => [
      ...prev,
      createEmptyAttributeSelection(),
    ]);
  };

  const handleRemoveAttribute = (index: number) => {
    if (attributeSelections.length === 1) {
      return;
    }
    setAttributeSelections((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAttributeChange = async (
    index: number,
    attribute: AttributeLookupItem | null,
  ) => {
    setAttributeSelections((prev) => {
      const updated = [...prev];
      updated[index] = {
        attribute,
        value: null,
        valueOptions: [],
        loadingValues: !!attribute,
      };
      return updated;
    });

    if (attribute?.id) {
      try {
        const values = await attributeService.getAttributeValues(attribute.id);
        setAttributeSelections((prev) => {
          const updated = [...prev];
          const current = updated[index];
          if (current) {
            updated[index] = {
              attribute: current.attribute,
              value: current.value,
              valueOptions: values,
              loadingValues: false,
            };
          }
          return updated;
        });
      } catch (err) {
        console.error("Error fetching attribute values:", err);
        setAttributeSelections((prev) => {
          const updated = [...prev];
          const current = updated[index];
          if (current) {
            updated[index] = {
              attribute: current.attribute,
              value: current.value,
              valueOptions: current.valueOptions,
              loadingValues: false,
            };
          }
          return updated;
        });
      }
    }
  };

  const handleValueChange = (
    index: number,
    value: AttributeValueLookupItem | null,
  ) => {
    setAttributeSelections((prev) => {
      const updated = [...prev];
      const current = updated[index];
      if (current) {
        updated[index] = {
          attribute: current.attribute,
          value,
          valueOptions: current.valueOptions,
          loadingValues: current.loadingValues,
        };
      }
      return updated;
    });
  };

  const validateForm = () => {
    if (!name.trim()) {
      setError("Tên sản phẩm là bắt buộc");
      return false;
    }
    if (!selectedBrand?.id) {
      setError("Vui lòng chọn thương hiệu");
      return false;
    }
    if (!selectedCategory?.id) {
      setError("Vui lòng chọn danh mục");
      return false;
    }
    if (!productId) {
      setError("Không xác định được sản phẩm để cập nhật");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !productId) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Get newly uploaded images (not existing ones)
      const temporaryMediaIdsToAdd = images
        .filter((img) => !img.isExisting && img.temporaryMediaId)
        .map((img) => img.temporaryMediaId!)
        .filter((id) => id && id.trim() !== ""); // Filter out empty strings

      // Get existing images marked for deletion
      const mediaIdsToDelete = images
        .filter((img) => img.isExisting && img.markedForDeletion && img.id)
        .map((img) => img.id!)
        .filter((id) => id && id.trim() !== ""); // Filter out empty strings

      // Normalize description
      const normalizedDescription = description.trim().replace(/\s+/g, " ");

      const payload: UpdateProductRequest = {
        name: name.trim(),
        brandId: selectedBrand!.id,
        categoryId: selectedCategory!.id,
        description: normalizedDescription || null,
        temporaryMediaIdsToAdd:
          temporaryMediaIdsToAdd.length > 0 ? temporaryMediaIdsToAdd : [],
        mediaIdsToDelete: mediaIdsToDelete.length > 0 ? mediaIdsToDelete : [],
        attributes: attributeSelections
          .filter((sel) => sel.attribute?.id && sel.value?.id)
          .map((sel) => ({
            attributeId: sel.attribute!.id,
            valueId: sel.value!.id,
          })),
      };

      await productService.updateProduct(productId, payload);
      showToast("Đã cập nhật sản phẩm thành công", "success");
      onSuccess();
      resetState();
      onClose();
    } catch (err: any) {
      console.error("Error updating product:", err);
      const errorMessage = err.message || "Có lỗi xảy ra khi cập nhật sản phẩm";
      setError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDialogClose = () => {
    if (saving || initializing) {
      return;
    }
    resetState();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleDialogClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" fontWeight={600}>
            Chỉnh Sửa Sản Phẩm
          </Typography>
          <IconButton
            onClick={handleDialogClose}
            disabled={saving || initializing}
            size="small"
          >
            <X className="w-5 h-5" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        {!productId ? (
          <Typography variant="body2">
            Vui lòng chọn sản phẩm để chỉnh sửa.
          </Typography>
        ) : initializing ? (
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            py={6}
          >
            <CircularProgress size={24} />
            <Typography variant="body2" ml={2}>
              Đang tải dữ liệu sản phẩm...
            </Typography>
          </Box>
        ) : (
          <Box>
            {error && (
              <Alert
                severity="error"
                onClose={() => setError(null)}
                sx={{ mb: 3 }}
              >
                {error}
              </Alert>
            )}

            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                gap: 3,
              }}
            >
              {/* Left side - Images */}
              <Box sx={{ flex: { xs: "1", md: "0 0 40%" } }}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={600} mb={2}>
                    Ảnh sản phẩm
                  </Typography>

                  {/* Upload button */}
                  <Button
                    variant="outlined"
                    component="label"
                    fullWidth
                    startIcon={
                      uploadingImage ? (
                        <CircularProgress size={20} />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )
                    }
                    disabled={saving || uploadingImage}
                    sx={{ mb: 2, py: 1.5 }}
                  >
                    {uploadingImage ? "Đang tải lên..." : "Thêm ảnh"}
                    <input
                      hidden
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={saving || uploadingImage}
                    />
                  </Button>

                  {/* Image Carousel */}
                  <Box>
                    {images.length === 0 ? (
                      <Box
                        sx={{
                          border: "2px dashed",
                          borderColor: "divider",
                          borderRadius: 1,
                          p: 4,
                          textAlign: "center",
                          minHeight: 300,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Box>
                          <ImageIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                          <Typography variant="body2" color="text.secondary">
                            Chưa có ảnh nào
                          </Typography>
                        </Box>
                      </Box>
                    ) : (
                      <Box>
                        {/* Main image display */}
                        <Card sx={{ position: "relative", mb: 2 }}>
                          <CardMedia
                            component="img"
                            height="300"
                            image={
                              images[currentImageIndex]?.url ||
                              images[currentImageIndex]?.previewUrl
                            }
                            alt={images[currentImageIndex]?.altText}
                            sx={{
                              objectFit: "cover",
                              opacity: images[currentImageIndex]
                                ?.markedForDeletion
                                ? 0.4
                                : 1,
                              filter: images[currentImageIndex]
                                ?.markedForDeletion
                                ? "grayscale(80%)"
                                : "none",
                            }}
                          />

                          {/* Navigation arrows */}
                          {images.length > 1 && (
                            <>
                              <IconButton
                                onClick={handlePrevImage}
                                disabled={saving}
                                sx={{
                                  position: "absolute",
                                  left: 8,
                                  top: "50%",
                                  transform: "translateY(-50%)",
                                  bgcolor: "rgba(255, 255, 255, 0.9)",
                                  "&:hover": {
                                    bgcolor: "rgba(255, 255, 255, 1)",
                                  },
                                }}
                              >
                                <ChevronLeft />
                              </IconButton>
                              <IconButton
                                onClick={handleNextImage}
                                disabled={saving}
                                sx={{
                                  position: "absolute",
                                  right: 8,
                                  top: "50%",
                                  transform: "translateY(-50%)",
                                  bgcolor: "rgba(255, 255, 255, 0.9)",
                                  "&:hover": {
                                    bgcolor: "rgba(255, 255, 255, 1)",
                                  },
                                }}
                              >
                                <ChevronRight />
                              </IconButton>
                            </>
                          )}

                          {/* Image counter */}
                          <Chip
                            label={`${currentImageIndex + 1} / ${images.length}`}
                            size="small"
                            sx={{
                              position: "absolute",
                              top: 8,
                              right: 8,
                              bgcolor: "rgba(0, 0, 0, 0.6)",
                              color: "white",
                            }}
                          />

                          {/* Marked for deletion badge */}
                          {images[currentImageIndex]?.markedForDeletion ? (
                            <Chip
                              label="Sẽ xóa"
                              color="error"
                              size="small"
                              sx={{ position: "absolute", top: 8, left: 8 }}
                            />
                          ) : images[currentImageIndex]?.isPrimary ? (
                            <Chip
                              label="Hình chính"
                              color="primary"
                              size="small"
                              sx={{ position: "absolute", top: 8, left: 8 }}
                            />
                          ) : null}
                        </Card>

                        {/* Image controls */}
                        <Box
                          sx={{
                            p: 2,
                            border: 1,
                            borderColor: "divider",
                            borderRadius: 1,
                          }}
                        >
                          <Box
                            display="flex"
                            alignItems="center"
                            justifyContent="space-between"
                            mb={1.5}
                          >
                            <Typography variant="body2" fontWeight={600}>
                              Ảnh {currentImageIndex + 1}
                              {images[currentImageIndex]?.isExisting
                                ? " (Hiện tại)"
                                : " (Mới)"}
                            </Typography>
                            <Box>
                              {!images[currentImageIndex]?.isPrimary &&
                                !images[currentImageIndex]
                                  ?.markedForDeletion && (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<Upload className="w-3 h-3" />}
                                    onClick={() =>
                                      handleSetPrimaryImage(currentImageIndex)
                                    }
                                    disabled={saving}
                                    sx={{ mr: 1 }}
                                  >
                                    Đặt làm chính
                                  </Button>
                                )}
                              <Button
                                size="small"
                                variant={
                                  images[currentImageIndex]?.markedForDeletion
                                    ? "contained"
                                    : "outlined"
                                }
                                color="error"
                                startIcon={
                                  images[currentImageIndex]
                                    ?.markedForDeletion ? (
                                    <RefreshCw className="w-3 h-3" />
                                  ) : (
                                    <Trash2 className="w-3 h-3" />
                                  )
                                }
                                onClick={() =>
                                  handleRemoveImage(currentImageIndex)
                                }
                                disabled={saving}
                              >
                                {images[currentImageIndex]?.markedForDeletion
                                  ? "Hoàn tác"
                                  : images[currentImageIndex]?.isExisting
                                    ? "Đánh dấu xóa"
                                    : "Xóa"}
                              </Button>
                            </Box>
                          </Box>
                        </Box>

                        {/* Thumbnail navigation */}
                        {images.length > 1 && (
                          <Box
                            sx={{
                              mt: 2,
                              display: "flex",
                              gap: 1,
                              overflowX: "auto",
                              pb: 1,
                            }}
                          >
                            {images.map((img, idx) => (
                              <Box
                                key={img.id || img.temporaryMediaId || idx}
                                onClick={() => setCurrentImageIndex(idx)}
                                sx={{
                                  width: 60,
                                  height: 60,
                                  flexShrink: 0,
                                  cursor: "pointer",
                                  border: 2,
                                  borderColor:
                                    currentImageIndex === idx
                                      ? "primary.main"
                                      : "divider",
                                  borderRadius: 1,
                                  overflow: "hidden",
                                  position: "relative",
                                  opacity: img.markedForDeletion
                                    ? 0.3
                                    : currentImageIndex === idx
                                      ? 1
                                      : 0.6,
                                  transition: "all 0.2s",
                                  "&:hover": {
                                    opacity: img.markedForDeletion ? 0.5 : 1,
                                  },
                                  filter: img.markedForDeletion
                                    ? "grayscale(80%)"
                                    : "none",
                                }}
                              >
                                <Box
                                  component="img"
                                  src={img.url || img.previewUrl}
                                  alt={img.altText}
                                  sx={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                />
                                {img.isPrimary && (
                                  <Box
                                    sx={{
                                      position: "absolute",
                                      top: 2,
                                      right: 2,
                                      width: 8,
                                      height: 8,
                                      borderRadius: "50%",
                                      bgcolor: "primary.main",
                                    }}
                                  />
                                )}
                              </Box>
                            ))}
                          </Box>
                        )}
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>

              {/* Right side - Product info */}
              <Box sx={{ flex: 1 }}>
                <Box display="flex" flexDirection="column" gap={2.5}>
                  <TextField
                    label="Tên sản phẩm"
                    fullWidth
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={saving}
                  />

                  <Autocomplete
                    options={brands}
                    getOptionLabel={(option) => option.name || ""}
                    value={selectedBrand}
                    onChange={(_, newValue) => setSelectedBrand(newValue)}
                    disabled={saving || loadingBrands}
                    loading={loadingBrands}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Thương hiệu"
                        required
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {loadingBrands ? (
                                <CircularProgress size={20} />
                              ) : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />

                  <Autocomplete
                    options={categories}
                    getOptionLabel={(option) => option.name || ""}
                    value={selectedCategory}
                    onChange={(_, newValue) => setSelectedCategory(newValue)}
                    disabled={saving || loadingCategories}
                    loading={loadingCategories}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Danh mục"
                        required
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {loadingCategories ? (
                                <CircularProgress size={20} />
                              ) : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />

                  <TextField
                    label="Mô tả"
                    fullWidth
                    multiline
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={saving}
                  />

                  {/* Attributes section */}
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
                      Attributes
                    </Typography>

                    {loadingAttributes ? (
                      <Box
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        py={3}
                      >
                        <CircularProgress size={24} />
                        <Typography ml={2} variant="body2">
                          Đang tải attributes...
                        </Typography>
                      </Box>
                    ) : (
                      <>
                        {attributeSelections.map((selection, index) => (
                          <Box
                            key={index}
                            mb={2}
                            p={2}
                            border={1}
                            borderColor="divider"
                            borderRadius={1}
                          >
                            <Box display="flex" gap={1.5}>
                              <Box
                                flex={1}
                                display="flex"
                                flexDirection="column"
                                gap={1.5}
                              >
                                <Autocomplete
                                  options={availableAttributes}
                                  getOptionLabel={(option) =>
                                    `${option.name}${option.description ? ` (${option.description})` : ""}`
                                  }
                                  value={selection.attribute}
                                  onChange={(_, newValue) =>
                                    handleAttributeChange(index, newValue)
                                  }
                                  disabled={saving}
                                  renderInput={(params) => (
                                    <TextField
                                      {...params}
                                      label="Attribute"
                                      size="small"
                                      required
                                    />
                                  )}
                                />
                                <Autocomplete
                                  options={selection.valueOptions}
                                  getOptionLabel={(option) =>
                                    option.value || ""
                                  }
                                  value={selection.value}
                                  onChange={(_, newValue) =>
                                    handleValueChange(index, newValue)
                                  }
                                  disabled={
                                    saving ||
                                    !selection.attribute ||
                                    selection.loadingValues
                                  }
                                  loading={selection.loadingValues}
                                  renderInput={(params) => (
                                    <TextField
                                      {...params}
                                      label="Value"
                                      size="small"
                                      required
                                      InputProps={{
                                        ...params.InputProps,
                                        endAdornment: (
                                          <>
                                            {selection.loadingValues ? (
                                              <CircularProgress size={20} />
                                            ) : null}
                                            {params.InputProps.endAdornment}
                                          </>
                                        ),
                                      }}
                                    />
                                  )}
                                />
                              </Box>
                              <IconButton
                                onClick={() => handleRemoveAttribute(index)}
                                disabled={
                                  saving || attributeSelections.length === 1
                                }
                                size="small"
                                color="error"
                              >
                                <Trash2 className="w-4 h-4" />
                              </IconButton>
                            </Box>
                          </Box>
                        ))}
                        <Button
                          startIcon={<Plus className="w-4 h-4" />}
                          onClick={handleAddAttribute}
                          disabled={saving || loadingAttributes}
                          size="small"
                          variant="outlined"
                        >
                          Thêm Attribute
                        </Button>
                      </>
                    )}
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleDialogClose} disabled={saving || initializing}>
          Hủy
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={saving || initializing || !productId}
          startIcon={saving ? <CircularProgress size={20} /> : null}
        >
          {saving ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
