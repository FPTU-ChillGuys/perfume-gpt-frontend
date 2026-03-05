import { useState, useEffect, useCallback } from "react";
import type { ChangeEvent } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  Add as AddIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Image as ImageIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  Edit as EditIcon,
  Star as StarIcon,
} from "@mui/icons-material";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { attributeService } from "@/services/attributeService";
import { productService } from "@/services/productService";
import { useToast } from "@/hooks/useToast";
import type {
  AttributeLookupItem,
  AttributeValueLookupItem,
  CreateVariantRequest,
  MediaResponse,
  ProductInformation,
  ProductListItem,
  ProductVariant,
  UpdateVariantRequest,
  VariantStatus,
  VariantType,
} from "@/types/product";

interface ManageProductVariantsDialogProps {
  open: boolean;
  product: ProductListItem | null;
  onClose: () => void;
}

interface AttributeSelection {
  attribute: AttributeLookupItem | null;
  value: AttributeValueLookupItem | null;
  valueOptions: AttributeValueLookupItem[];
  loadingValues: boolean;
}

interface UploadedVariantImage {
  temporaryMediaId: string;
  previewUrl: string;
  altText: string;
  isPrimary: boolean;
}

const VARIANT_TYPES: { value: VariantType; label: string }[] = [
  { value: "FullBox", label: "Full box" },
  { value: "Tester", label: "Tester" },
  { value: "Mini", label: "Mini" },
];

const VARIANT_STATUS: { value: VariantStatus; label: string }[] = [
  { value: "Active", label: "Đang bán" },
  { value: "Inactive", label: "Tạm dừng" },
  { value: "Discontinued", label: "Ngừng bán" },
  { value: "out_of_stock", label: "Hết hàng" },
];

const createEmptyAttributeSelection = (): AttributeSelection => ({
  attribute: null,
  value: null,
  valueOptions: [],
  loadingValues: false,
});

const formatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const normalizeSkuSeed = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase();

const extractDigits = (text: string) => text.replace(/\D/g, "");

const deriveSkuSeed = (
  info: ProductInformation | null | undefined,
  product: ProductListItem | null,
) => {
  if (info?.productCode) {
    return normalizeSkuSeed(info.productCode);
  }
  if (product?.name) {
    return normalizeSkuSeed(product.name);
  }
  if (product?.id) {
    return normalizeSkuSeed(product.id.slice(0, 8));
  }
  return "";
};

const buildSuggestedSku = (seed: string, nextIndex: number) => {
  if (!seed) {
    return "";
  }
  return `${seed}-${String(nextIndex).padStart(2, "0")}`;
};

const deriveBarcodeSeed = (
  info: ProductInformation | null | undefined,
  product: ProductListItem | null,
) => {
  const fromProductCode = info?.productCode ? extractDigits(info.productCode) : "";
  if (fromProductCode) {
    return fromProductCode;
  }
  const fromName = product?.name ? extractDigits(product.name) : "";
  if (fromName) {
    return fromName;
  }
  const fromId = product?.id ? extractDigits(product.id) : "";
  if (fromId) {
    return fromId;
  }
  return extractDigits(Date.now().toString());
};

const buildSuggestedBarcode = (seed: string, nextIndex: number) => {
  if (!seed) {
    return "";
  }
  const raw = `${seed}${nextIndex}`;
  if (raw.length >= 13) {
    return raw.slice(0, 13);
  }
  return raw.padEnd(13, "0");
};

const selectVariantPreviewMedia = (
  variant: ProductVariant,
  fallback?: MediaResponse | null,
): MediaResponse | null => {
  const variantMedia = variant.media ?? [];
  const primaryFromVariant = variantMedia.find(
    (media) => Boolean(media?.url) && media?.isPrimary,
  );
  if (primaryFromVariant) {
    return primaryFromVariant;
  }
  const fallbackFromVariant = variantMedia.find((media) => Boolean(media?.url));
  if (fallbackFromVariant) {
    return fallbackFromVariant;
  }
  if (fallback?.url) {
    return fallback;
  }
  return null;
};

const createInitialFormValues = () => ({
  sku: "",
  barCode: "",
  volumeMl: "",
  concentrationId: "",
  basePrice: "",
  type: VARIANT_TYPES[0]?.value ?? "FullBox",
  status: VARIANT_STATUS[0]?.value ?? "Active",
});

export default function ManageProductVariantsDialog({
  open,
  product,
  onClose,
}: ManageProductVariantsDialogProps) {
  const { showToast } = useToast();
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableAttributes, setAvailableAttributes] = useState<
    AttributeLookupItem[]
  >([]);
  const [attributeSelections, setAttributeSelections] = useState<
    AttributeSelection[]
  >([createEmptyAttributeSelection()]);
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedVariantImage[]>(
    [],
  );
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formValues, setFormValues] = useState(createInitialFormValues());
  const [skuSeed, setSkuSeed] = useState("");
  const [isSkuDirty, setIsSkuDirty] = useState(false);
  const [barcodeSeed, setBarcodeSeed] = useState("");
  const [isBarcodeDirty, setIsBarcodeDirty] = useState(false);
  const [, setLoadingProductInfo] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [existingVariantMedia, setExistingVariantMedia] = useState<MediaResponse[]>([]);
  const [mediaIdsToDelete, setMediaIdsToDelete] = useState<string[]>([]);
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    variant: null as ProductVariant | null,
  });
  const [deletingVariantId, setDeletingVariantId] = useState<string | null>(null);
  const isEditMode = Boolean(editingVariant?.id);

  const revokePreviewUrls = useCallback((images: UploadedVariantImage[]) => {
    images.forEach((image) => {
      URL.revokeObjectURL(image.previewUrl);
    });
  }, []);

  const resetFormToCreateMode = useCallback(() => {
    setEditingVariant(null);
    setExistingVariantMedia([]);
    setMediaIdsToDelete([]);
    setAttributeSelections([createEmptyAttributeSelection()]);
    setFormValues(createInitialFormValues());
    setIsSkuDirty(false);
    setIsBarcodeDirty(false);
    setUploadedImages((prev) => {
      revokePreviewUrls(prev);
      return [];
    });
  }, [revokePreviewUrls]);

  const resetState = useCallback(() => {
    setVariants([]);
    setError(null);
    setAvailableAttributes([]);
    setSkuSeed("");
    setIsSkuDirty(false);
    setBarcodeSeed("");
    setIsBarcodeDirty(false);
    setDeleteDialog({ open: false, variant: null });
    setDeletingVariantId(null);
    resetFormToCreateMode();
  }, [resetFormToCreateMode]);

  const fetchVariants = useCallback(async () => {
    if (!product?.id) {
      return;
    }

    try {
      setLoadingVariants(true);
      const data = await productService.getProductVariants(product.id);
      setVariants(data);
    } catch (err: any) {
      console.error("Error fetching variants:", err);
      setError(err.message || "Không thể tải danh sách variant");
    } finally {
      setLoadingVariants(false);
    }
  }, [product?.id]);

  const fetchAttributes = useCallback(async () => {
    try {
      setLoadingAttributes(true);
      const attrs = await attributeService.getAttributes();
      setAvailableAttributes(attrs);
    } catch (err: any) {
      console.error("Error fetching attributes:", err);
      setError(err.message || "Không thể tải danh sách thuộc tính");
    } finally {
      setLoadingAttributes(false);
    }
  }, []);

  const fetchProductInfo = useCallback(async () => {
    if (!product?.id) {
      setSkuSeed("");
      return;
    }

    try {
      setLoadingProductInfo(true);
      const info = await productService.getProductInformation(product.id);
      setSkuSeed(deriveSkuSeed(info, product));
      setBarcodeSeed(deriveBarcodeSeed(info, product));
    } catch (err) {
      console.error("Error fetching product information:", err);
      setSkuSeed(deriveSkuSeed(null, product));
      setBarcodeSeed(deriveBarcodeSeed(null, product));
    } finally {
      setLoadingProductInfo(false);
    }
  }, [product]);

  const hydrateAttributeSelectionsFromVariant = useCallback(
    async (variant: ProductVariant) => {
      const variantAttributes = variant.attributes || [];
      if (!variantAttributes.length) {
        setAttributeSelections([createEmptyAttributeSelection()]);
        return;
      }

      const selections = await Promise.all(
        variantAttributes.map(async (attr) => {
          if (!attr?.attributeId) {
            return createEmptyAttributeSelection();
          }

          let valueOptions: AttributeValueLookupItem[] = [];
          try {
            valueOptions = await attributeService.getAttributeValues(attr.attributeId);
          } catch (err) {
            console.error("Error hydrating attribute values:", err);
          }

          if (!valueOptions.length && attr.valueId && attr.value) {
            valueOptions = [{ id: attr.valueId, value: attr.value }];
          }

          const attributeOption =
            availableAttributes.find((item) => item.id === attr.attributeId) ||
            (attr.attributeId
              ? {
                  id: attr.attributeId,
                  name: attr.attribute || `Thuộc tính #${attr.attributeId}`,
                  description: attr.description,
                  isVariantLevel: true,
                }
              : null);

          const valueOption =
            valueOptions.find((option) => option.id === attr.valueId) || null;

          return {
            attribute: attributeOption,
            value: valueOption,
            valueOptions,
            loadingValues: false,
          } as AttributeSelection;
        }),
      );

      setAttributeSelections(
        selections.length ? selections : [createEmptyAttributeSelection()],
      );
    },
    [availableAttributes],
  );

  const initializeDialog = useCallback(async () => {
    if (!product?.id) {
      return;
    }

    setError(null);
    await Promise.all([fetchVariants(), fetchAttributes(), fetchProductInfo()]);
  }, [product?.id, fetchVariants, fetchAttributes, fetchProductInfo]);

  const handleEditVariant = useCallback(
    async (variant: ProductVariant) => {
      if (!variant?.id) {
        return;
      }

      setEditingVariant(variant);
      setExistingVariantMedia(variant.media ?? []);
      setMediaIdsToDelete([]);
      setIsSkuDirty(true);
      setIsBarcodeDirty(true);
      setFormValues({
        sku: variant.sku || "",
        barCode:
          (variant as unknown as { barCode?: string })?.barCode ||
          (variant as unknown as { barcode?: string })?.barcode ||
          "",
        volumeMl: variant.volumeMl ? String(variant.volumeMl) : "",
        concentrationId: variant.concentrationId
          ? String(variant.concentrationId)
          : "",
        basePrice: variant.basePrice ? String(variant.basePrice) : "",
        type: (variant.type as VariantType) || (VARIANT_TYPES[0]?.value ?? "FullBox"),
        status:
          (variant.status as VariantStatus) || (VARIANT_STATUS[0]?.value ?? "Active"),
      });
      await hydrateAttributeSelectionsFromVariant(variant);
      setUploadedImages((prev) => {
        revokePreviewUrls(prev);
        return [];
      });
    },
    [hydrateAttributeSelectionsFromVariant, revokePreviewUrls],
  );

  const handleToggleExistingMedia = (mediaId?: string) => {
    if (!mediaId) {
      return;
    }
    setMediaIdsToDelete((prev) =>
      prev.includes(mediaId)
        ? prev.filter((id) => id !== mediaId)
        : [...prev, mediaId],
    );
  };

  const handleRequestDeleteVariant = (variant: ProductVariant) => {
    if (!variant?.id) {
      return;
    }
    setDeleteDialog({ open: true, variant });
  };

  const handleCloseDeleteDialog = () => {
    if (deletingVariantId) {
      return;
    }
    setDeleteDialog({ open: false, variant: null });
  };

  const handleConfirmDeleteVariant = async () => {
    const targetId = deleteDialog.variant?.id;
    if (!targetId) {
      handleCloseDeleteDialog();
      return;
    }

    try {
      setDeletingVariantId(targetId);
      setError(null);
      await productService.deleteProductVariant(targetId);
      showToast("Đã xoá variant", "success");
      if (editingVariant?.id === targetId) {
        resetFormToCreateMode();
      }
      await fetchVariants();
      handleCloseDeleteDialog();
    } catch (err: any) {
      console.error("Error deleting variant:", err);
      const message = err.message || "Không thể xoá variant";
      setError(message);
      showToast(message, "error");
    } finally {
      setDeletingVariantId(null);
    }
  };

  useEffect(() => () => revokePreviewUrls(uploadedImages), [uploadedImages]);

  useEffect(() => {
    if (open && product?.id) {
      initializeDialog();
    } else if (!open) {
      resetState();
    }
  }, [open, product?.id, initializeDialog, resetState]);

  useEffect(() => {
    if (!skuSeed || isSkuDirty) {
      return;
    }
    const suggestion = buildSuggestedSku(skuSeed, variants.length + 1);
    if (!suggestion) {
      return;
    }
    setFormValues((prev) =>
      prev.sku === suggestion ? prev : { ...prev, sku: suggestion },
    );
  }, [skuSeed, variants.length, isSkuDirty]);

  useEffect(() => {
    if (!barcodeSeed || isBarcodeDirty) {
      return;
    }
    const suggestion = buildSuggestedBarcode(barcodeSeed, variants.length + 1);
    if (!suggestion) {
      return;
    }
    setFormValues((prev) =>
      prev.barCode === suggestion ? prev : { ...prev, barCode: suggestion },
    );
  }, [barcodeSeed, variants.length, isBarcodeDirty]);

  const handleClose = () => {
    if (saving || uploadingImage || deletingVariantId) {
      return;
    }
    onClose();
  };

  const handleCancelEdit = () => {
    if (saving || uploadingImage) {
      return;
    }
    resetFormToCreateMode();
  };

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    if (name === "sku") {
      setIsSkuDirty(true);
    } else if (name === "barCode") {
      setIsBarcodeDirty(true);
    }
    setFormValues((prev) => ({ ...prev, [name]: value }));
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
              ...current,
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
            updated[index] = { ...current, loadingValues: false };
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
        updated[index] = { ...current, value };
      }
      return updated;
    });
  };

  const handleAddAttribute = () => {
    setAttributeSelections((prev) => [...prev, createEmptyAttributeSelection()]);
  };

  const handleRemoveAttribute = (index: number) => {
    setAttributeSelections((prev) => {
      const updated = prev.filter((_, idx) => idx !== index);
      return updated.length ? updated : [createEmptyAttributeSelection()];
    });
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const payload = [
        {
          file,
          altText: file.name,
          displayOrder: uploadedImages.length,
          isPrimary: uploadedImages.length === 0,
        },
      ];

      const uploadedMedia = await productService.uploadVariantImages(payload);
      if (!uploadedMedia.length || !uploadedMedia[0]?.id) {
        throw new Error("Không nhận được ID ảnh");
      }

      const previewUrl = URL.createObjectURL(file);
      const newImage: UploadedVariantImage = {
        temporaryMediaId: uploadedMedia[0].id,
        previewUrl,
        altText: file.name,
        isPrimary: uploadedImages.length === 0,
      };

      setUploadedImages((prev) => [...prev, newImage]);
      showToast("Đã tải ảnh biến thể", "success");
    } catch (err: any) {
      console.error("Error uploading variant image:", err);
      const message = err.message || "Không thể tải ảnh variant";
      setError(message);
      showToast(message, "error");
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  };

  const handleRemoveImage = (temporaryMediaId: string) => {
    setUploadedImages((prev) => {
      const removedImage = prev.find((img) => img.temporaryMediaId === temporaryMediaId);
      if (removedImage) {
        URL.revokeObjectURL(removedImage.previewUrl);
      }
      const remaining = prev.filter((img) => img.temporaryMediaId !== temporaryMediaId);
      if (remaining.length && !remaining.some((img) => img.isPrimary)) {
        const [first, ...rest] = remaining;
        return [{ ...first, isPrimary: true }, ...rest];
      }
      return remaining;
    });
  };

  const handleSetPrimaryImage = (temporaryMediaId: string) => {
    setUploadedImages((prev) =>
      prev.map((img) => ({ ...img, isPrimary: img.temporaryMediaId === temporaryMediaId })),
    );
  };

  const getValidationError = () => {
    if (!product?.id) {
      return "Không xác định được sản phẩm";
    }
    if (!formValues.sku.trim()) {
      return "SKU là bắt buộc";
    }
    if (!isEditMode && !formValues.barCode.trim()) {
      return "Barcode là bắt buộc";
    }
    if (!formValues.volumeMl || Number(formValues.volumeMl) <= 0) {
      return "Dung tích phải lớn hơn 0";
    }
    if (!formValues.concentrationId) {
      return "Vui lòng nhập ID nồng độ";
    }
    if (!formValues.basePrice || Number(formValues.basePrice) <= 0) {
      return "Giá cơ bản phải lớn hơn 0";
    }
    return null;
  };

  const buildAttributePayload = () =>
    attributeSelections
      .filter((sel) => sel.attribute?.id && sel.value?.id)
      .map((sel) => ({
        attributeId: sel.attribute!.id!,
        valueId: sel.value!.id!,
      }));

  const buildOrderedTemporaryMediaIds = () =>
    [...uploadedImages]
      .sort((a, b) => (a.isPrimary === b.isPrimary ? 0 : a.isPrimary ? -1 : 1))
      .map((img) => img.temporaryMediaId);

  const handleCreateVariant = async () => {
    if (!product?.id) {
      setError("Không xác định được sản phẩm");
      return;
    }

    const payload: CreateVariantRequest & { barcode: string } = {
      productId: product.id,
      sku: formValues.sku.trim(),
      barcode: formValues.barCode.trim(),
      volumeMl: Number(formValues.volumeMl),
      concentrationId: Number(formValues.concentrationId),
      type: formValues.type as VariantType,
      basePrice: Number(formValues.basePrice),
      status: formValues.status as VariantStatus,
      temporaryMediaIds: buildOrderedTemporaryMediaIds(),
      attributes: buildAttributePayload(),
    };

    try {
      setSaving(true);
      await productService.createProductVariant(payload);
      showToast("Đã thêm variant mới", "success");
      await fetchVariants();
      resetFormToCreateMode();
    } catch (err: any) {
      console.error("Error creating variant:", err);
      const message = err.message || "Không thể tạo variant";
      setError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateVariant = async () => {
    if (!editingVariant?.id) {
      return;
    }

    const trimmedBarcode = formValues.barCode.trim();
    const payload: UpdateVariantRequest & {
      barcode?: string;
      mediaIdsToDelete?: string[] | null;
      temporaryMediaIdsToAdd?: string[] | null;
    } = {
      sku: formValues.sku.trim(),
      ...(trimmedBarcode ? { barcode: trimmedBarcode } : {}),
      volumeMl: Number(formValues.volumeMl),
      concentrationId: Number(formValues.concentrationId),
      type: formValues.type as VariantType,
      basePrice: Number(formValues.basePrice),
      status: formValues.status as VariantStatus,
      mediaIdsToDelete: mediaIdsToDelete.length ? mediaIdsToDelete : null,
      temporaryMediaIdsToAdd: (() => {
        const ids = buildOrderedTemporaryMediaIds();
        return ids.length ? ids : null;
      })(),
      attributes: buildAttributePayload(),
    };

    try {
      setSaving(true);
      await productService.updateProductVariant(editingVariant.id, payload);
      showToast("Đã cập nhật variant", "success");
      await fetchVariants();
      resetFormToCreateMode();
    } catch (err: any) {
      console.error("Error updating variant:", err);
      const message = err.message || "Không thể cập nhật variant";
      setError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    const validationError = getValidationError();
    if (validationError) {
      setError(validationError);
      showToast(validationError, "error");
      return;
    }
    setError(null);

    if (isEditMode) {
      await handleUpdateVariant();
    } else {
      await handleCreateVariant();
    }
  };

  const renderVariantList = () => {
    if (loadingVariants) {
      return (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress size={28} />
        </Box>
      );
    }

    if (!variants.length) {
      return (
        <Box py={4} textAlign="center">
          <Typography color="text.secondary">
            Chưa có variant nào cho sản phẩm này
          </Typography>
        </Box>
      );
    }

    return (
      <Stack spacing={1.5}>
        {variants.map((variant) => {
          const previewMedia = selectVariantPreviewMedia(
            variant,
            product?.primaryImage,
          );
          const previewUrl = previewMedia?.url;
          const detailText =
            [
              variant.volumeMl ? `${variant.volumeMl}ml` : null,
              variant.concentrationName,
            ]
              .filter(Boolean)
              .join(" · ") || "Không có thông tin dung tích";
          const isActive = editingVariant?.id === variant.id;

          return (
            <Paper
              key={variant.id}
              variant="outlined"
              sx={{
                p: 2,
                display: "flex",
                flexWrap: "wrap",
                gap: 2,
                alignItems: "center",
                borderColor: isActive ? "primary.main" : "grey.200",
                boxShadow: isActive ? 3 : undefined,
              }}
            >
              <Box
                sx={{
                  width: 88,
                  height: 88,
                  borderRadius: 2,
                  border: 1,
                  borderColor: "grey.200",
                  bgcolor: "grey.50",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                {previewUrl ? (
                  <Box
                    component="img"
                    src={previewUrl}
                    alt={
                      previewMedia?.altText ||
                      variant.sku ||
                      variant.productName ||
                      product?.name ||
                      "Variant preview"
                    }
                    sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "text.secondary",
                      fontSize: 12,
                      px: 1,
                      textAlign: "center",
                    }}
                  >
                    No Image
                  </Box>
                )}
              </Box>

              <Box flex={1} minWidth={220}>
                <Typography fontWeight={600}>{variant.sku}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {detailText}
                </Typography>
                {variant.productName && (
                  <Typography variant="caption" color="text.secondary">
                    {variant.productName}
                  </Typography>
                )}
              </Box>

              <Stack
                direction="row"
                spacing={1}
                flexWrap="wrap"
                justifyContent={{ xs: "flex-start", sm: "flex-end" }}
                sx={{ flex: { xs: "1 1 100%", sm: "0 0 auto" }, minWidth: { sm: 220 } }}
              >
                <Chip
                  label={variant.type || "Không xác định"}
                  color="info"
                  variant="outlined"
                  size="small"
                />
                <Chip
                  label={formatter.format(Number(variant.basePrice || 0))}
                  color="default"
                  variant="outlined"
                  size="small"
                />
                <Chip
                  label={
                    VARIANT_STATUS.find((item) => item.value === variant.status)?.label ||
                    variant.status ||
                    "Unknown"
                  }
                  color={variant.status === "Active" ? "success" : "warning"}
                  size="small"
                />
              </Stack>

              <Box
                sx={{
                  flexBasis: "100%",
                  display: "flex",
                  justifyContent: "flex-end",
                  mt: 1,
                }}
              >
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant={isActive ? "contained" : "outlined"}
                    color={isActive ? "primary" : "inherit"}
                    startIcon={<EditIcon fontSize="small" />}
                    onClick={() => {
                      void handleEditVariant(variant);
                    }}
                    disabled={saving || uploadingImage || Boolean(deletingVariantId)}
                    sx={{ minWidth: 160, fontWeight: 600, textTransform: "none" }}
                  >
                    {isActive ? "Đang chỉnh sửa" : "Chỉnh sửa variant"}
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon fontSize="small" />}
                    onClick={() => handleRequestDeleteVariant(variant)}
                    disabled={saving || uploadingImage || Boolean(deletingVariantId)}
                    sx={{ minWidth: 130, fontWeight: 600, textTransform: "none" }}
                  >
                    Xoá variant
                  </Button>
                </Stack>
              </Box>
            </Paper>
          );
        })}
      </Stack>
    );
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        <Typography variant="h6" fontWeight={600} component="span">
          Quản lý variant
        </Typography>
        {product?.name && (
          <Typography variant="subtitle2" color="text.secondary" ml={1} component="span">
            · {product.name}
          </Typography>
        )}
        <IconButton
          onClick={handleClose}
          size="small"
          sx={{ position: "absolute", right: 16, top: 16 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ py: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {!product ? (
          <Typography color="text.secondary">
            Vui lòng chọn sản phẩm để quản lý variant
          </Typography>
        ) : (
          <Stack spacing={3}>
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Danh sách variant
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tổng cộng {variants.length} biến thể
                  </Typography>
                  <Typography variant="caption" color="primary.main">
                    Chọn biến thể và bấm "Chỉnh sửa variant" để bắt đầu chỉnh sửa
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={fetchVariants}
                  disabled={loadingVariants}
                >
                  Làm mới
                </Button>
              </Box>
              {renderVariantList()}
            </Paper>

            <Paper variant="outlined" sx={{ p: 3 }}>
              <Box
                mb={2}
                display="flex"
                justifyContent="space-between"
                alignItems={{ xs: "stretch", sm: "center" }}
                flexWrap="wrap"
                gap={1}
              >
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {isEditMode ? "Chỉnh sửa variant" : "Thêm variant mới"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {isEditMode
                      ? `Đang chỉnh: ${editingVariant?.sku || editingVariant?.id || ""}`
                      : "Điền thông tin chi tiết và tải ảnh (tuỳ chọn)"}
                  </Typography>
                </Box>
                {isEditMode && (
                  <Button
                    size="small"
                    color="inherit"
                    onClick={handleCancelEdit}
                    disabled={saving || uploadingImage}
                  >
                    Hủy chỉnh sửa
                  </Button>
                )}
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="SKU"
                    name="sku"
                    value={formValues.sku}
                    onChange={handleInputChange}
                    fullWidth
                    required
                    disabled={saving}
                    helperText={
                      skuSeed
                        ? `Tự động gợi ý từ mã: ${skuSeed}`
                        : "SKU sẽ được gợi ý theo sản phẩm chính"
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Barcode"
                    name="barCode"
                    value={formValues.barCode}
                    onChange={handleInputChange}
                    fullWidth
                    required
                    disabled={saving}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    label="Dung tích (ml)"
                    name="volumeMl"
                    type="number"
                    value={formValues.volumeMl}
                    onChange={handleInputChange}
                    fullWidth
                    required
                    disabled={saving}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    label="ID nồng độ"
                    name="concentrationId"
                    type="number"
                    helperText="Ví dụ: 1 = Eau de Parfum"
                    value={formValues.concentrationId}
                    onChange={handleInputChange}
                    fullWidth
                    required
                    disabled={saving}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Giá cơ bản (VND)"
                    name="basePrice"
                    type="number"
                    value={formValues.basePrice}
                    onChange={handleInputChange}
                    fullWidth
                    required
                    disabled={saving}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Loại variant"
                    name="type"
                    select
                    value={formValues.type}
                    onChange={handleInputChange}
                    fullWidth
                    disabled={saving}
                  >
                    {VARIANT_TYPES.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Trạng thái"
                    name="status"
                    select
                    value={formValues.status}
                    onChange={handleInputChange}
                    fullWidth
                    disabled={saving}
                  >
                    {VARIANT_STATUS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Box mb={2}>
                <Typography variant="subtitle2" fontWeight={600}>
                  Ảnh variant
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Ảnh đầu tiên sẽ được đặt làm hình đại diện
                </Typography>
              </Box>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={uploadingImage ? <CircularProgress size={18} /> : <ImageIcon />}
                  disabled={saving || uploadingImage}
                >
                  {uploadingImage ? "Đang tải ảnh..." : "Tải ảnh"}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleImageUpload}
                    disabled={saving || uploadingImage}
                  />
                </Button>
                {!!uploadedImages.length && (
                  <Chip
                    icon={<StarIcon fontSize="small" />}
                    label={`${uploadedImages.length} ảnh tạm`}
                    color="primary"
                    variant="outlined"
                  />
                )}
              </Stack>

              {isEditMode && existingVariantMedia.length > 0 && (
                <Grid container spacing={2} mt={1}>
                  {existingVariantMedia.map((media) => {
                    const mediaId = media.id;
                    if (!mediaId) {
                      return null;
                    }
                    const marked = mediaIdsToDelete.includes(mediaId);
                    return (
                      <Grid item xs={12} sm={6} md={4} key={mediaId}>
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 2,
                            borderColor: marked ? "error.main" : "grey.200",
                            display: "flex",
                            flexDirection: "column",
                            gap: 1,
                          }}
                        >
                          <Box>
                            {media.url ? (
                              <Box
                                component="img"
                                src={media.url}
                                alt={media.altText || mediaId}
                                sx={{
                                  width: "100%",
                                  height: 140,
                                  objectFit: "cover",
                                  borderRadius: 1,
                                }}
                              />
                            ) : (
                              <Box
                                sx={{
                                  width: "100%",
                                  height: 140,
                                  borderRadius: 1,
                                  bgcolor: "grey.100",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "text.secondary",
                                }}
                              >
                                Không có ảnh
                              </Box>
                            )}
                          </Box>
                          <Typography variant="body2" noWrap>
                            {media.altText || mediaId}
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Button
                              size="small"
                              variant={marked ? "contained" : "outlined"}
                              color={marked ? "error" : "inherit"}
                              onClick={() => handleToggleExistingMedia(mediaId)}
                            >
                              {marked ? "Bỏ xoá" : "Xoá ảnh"}
                            </Button>
                            {media.isPrimary && (
                              <Chip label="Primary" size="small" color="primary" variant="outlined" />
                            )}
                          </Stack>
                          {marked && (
                            <Typography variant="caption" color="error.main">
                              Ảnh sẽ bị xoá sau khi lưu
                            </Typography>
                          )}
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>
              )}

              {uploadedImages.length > 0 && (
                <Grid container spacing={2} mt={1}>
                  {uploadedImages.map((img) => (
                    <Grid item xs={12} sm={6} md={4} key={img.temporaryMediaId}>
                      <Paper
                        variant="outlined"
                        sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1 }}
                      >
                        <Box
                          component="img"
                          src={img.previewUrl}
                          alt={img.altText}
                          sx={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 1 }}
                        />
                        <Typography variant="body2" noWrap>
                          {img.altText}
                        </Typography>
                        <Stack direction="row" spacing={1}>
                          {!img.isPrimary && (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleSetPrimaryImage(img.temporaryMediaId)}
                            >
                              Đặt làm chính
                            </Button>
                          )}
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemoveImage(img.temporaryMediaId)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              )}

              <Divider sx={{ my: 3 }} />

              <Box mb={1} display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle2" fontWeight={600}>
                  Thuộc tính (tuỳ chọn)
                </Typography>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={handleAddAttribute}
                  disabled={loadingAttributes || saving}
                >
                  Thêm thuộc tính
                </Button>
              </Box>

              <Stack spacing={2}>
                {attributeSelections.map((selection, index) => (
                  <Paper key={`attr-${index}`} variant="outlined" sx={{ p: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={5}>
                        <Autocomplete
                          options={availableAttributes}
                          getOptionLabel={(option) => option.name || ""}
                          value={selection.attribute}
                          onChange={(_, newValue) => handleAttributeChange(index, newValue)}
                          loading={loadingAttributes}
                          isOptionEqualToValue={(option, value) =>
                            option?.id === value?.id
                          }
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Thuộc tính"
                              InputProps={{
                                ...params.InputProps,
                                endAdornment: (
                                  <>
                                    {selection.loadingValues && <CircularProgress size={18} />}
                                    {params.InputProps.endAdornment}
                                  </>
                                ),
                              }}
                            />
                          )}
                        />
                      </Grid>
                      <Grid item xs={12} sm={5}>
                        <Autocomplete
                          options={selection.valueOptions}
                          getOptionLabel={(option) => option.value || ""}
                          value={selection.value}
                          onChange={(_, newValue) => handleValueChange(index, newValue)}
                          loading={selection.loadingValues}
                          isOptionEqualToValue={(option, value) =>
                            option?.id === value?.id
                          }
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Giá trị"
                              InputProps={{
                                ...params.InputProps,
                                endAdornment: (
                                  <>
                                    {selection.loadingValues && <CircularProgress size={18} />}
                                    {params.InputProps.endAdornment}
                                  </>
                                ),
                              }}
                            />
                          )}
                        />
                      </Grid>
                      <Grid item xs={12} sm={2}>
                        <IconButton
                          color="error"
                          onClick={() => handleRemoveAttribute(index)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </Paper>
                ))}
              </Stack>

              <Box mt={3} display="flex" justifyContent="flex-end" gap={2}>
                <Button onClick={handleClose} disabled={saving}>
                  Huỷ
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  startIcon={
                    saving ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : isEditMode ? (
                      <SaveIcon />
                    ) : (
                      <AddIcon />
                    )
                  }
                  disabled={saving}
                >
                  {isEditMode ? "Lưu thay đổi" : "Thêm variant"}
                </Button>
              </Box>
            </Paper>
          </Stack>
        )}
      </DialogContent>

      <ConfirmDialog
        open={deleteDialog.open}
        title="Xoá variant"
        description={
          deleteDialog.variant
            ? `Bạn có chắc chắn muốn xoá variant "${
                deleteDialog.variant.sku || deleteDialog.variant.id || ""
              }"? Hành động này không thể hoàn tác.`
            : undefined
        }
        confirmText="Xoá"
        loading={Boolean(deletingVariantId)}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleConfirmDeleteVariant}
      />

      <DialogActions>
        <Button onClick={handleClose} disabled={saving || uploadingImage || Boolean(deletingVariantId)}>
          Đóng
        </Button>
      </DialogActions>
    </Dialog>
  );
}
