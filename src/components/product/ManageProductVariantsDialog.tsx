import { useState, useEffect, useCallback } from "react";
import type { ChangeEvent } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardMedia,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
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
  Star as StarIcon,
  ChevronLeft,
  ChevronRight,
} from "@mui/icons-material";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { attributeService } from "@/services/attributeService";
import { productService } from "@/services/productService";
import { concentrationService } from "@/services/concentrationService";
import type { ConcentrationLookupItem } from "@/services/concentrationService";
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
  values: AttributeValueLookupItem[];
  valueOptions: AttributeValueLookupItem[];
  loadingValues: boolean;
}

interface UploadedVariantImage {
  temporaryMediaId: string;
  previewUrl: string;
  altText: string;
  isPrimary: boolean;
}

type VariantFormMode = "create" | "edit";

const VARIANT_TYPES: { value: VariantType; label: string }[] = [
  { value: "Standard", label: "Standard" },
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
  values: [],
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

const STOP_WORDS = new Set([
  "de",
  "du",
  "la",
  "le",
  "les",
  "et",
  "the",
  "a",
  "of",
  "au",
  "aux",
  "pour",
  "par",
  "en",
  "and",
]);

const CONC_WORDS = new Set([
  "eau",
  "parfum",
  "toilette",
  "cologne",
  "extrait",
  "fraiche",
  "chypre",
  "aromatic",
  "fougere",
]);

const abbreviateProductName = (name: string): string => {
  const words = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w && !STOP_WORDS.has(w) && !CONC_WORDS.has(w));
  if (!words.length) return "";
  const [first, ...rest] = words;
  const parts = [first!.slice(0, 3).toUpperCase()];
  for (const w of rest.slice(0, 3)) {
    parts.push(w.slice(0, 2).toUpperCase());
  }
  return parts.join("");
};

const CONCENTRATION_ABBR: Record<string, string> = {
  "extrait de parfum": "EXT",
  "eau de parfum": "EDP",
  "eau de toilette": "EDT",
  "eau de cologne": "EDC",
  "eau fraiche": "EF",
  parfum: "PAR",
  cologne: "COL",
};

const abbreviateConcentration = (name: string): string => {
  if (!name) return "";
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  for (const [key, abbr] of Object.entries(CONCENTRATION_ABBR)) {
    if (normalized.includes(key)) return abbr;
  }
  return normalized
    .split(/\s+/)
    .filter((w) => w && !STOP_WORDS.has(w))
    .map((w) => w[0]!.toUpperCase())
    .join("");
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const deriveSkuSeed = (
  info: ProductInformation | null | undefined,
  product: ProductListItem | null,
) => {
  // Always prefer human-readable product name
  if (product?.name) {
    return abbreviateProductName(product.name);
  }
  // Use productCode only if it is not a raw UUID
  if (info?.productCode && !UUID_RE.test(info.productCode.trim())) {
    return normalizeSkuSeed(info.productCode);
  }
  if (product?.id) {
    return normalizeSkuSeed(product.id.slice(0, 8));
  }
  return "";
};

const buildSuggestedSku = (
  seed: string,
  volumeMl: string,
  concentrationName: string,
) => {
  if (!seed) return "";
  const volPart = volumeMl ? Math.round(parseFloat(volumeMl)).toString() : "";
  const concPart = abbreviateConcentration(concentrationName);
  return [seed, volPart, concPart].filter(Boolean).join("-");
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
  basePrice: "",
  lowStockThreshold: "",
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
  const [concentrations, setConcentrations] = useState<
    ConcentrationLookupItem[]
  >([]);
  const [selectedConcentration, setSelectedConcentration] =
    useState<ConcentrationLookupItem | null>(null);
  const [loadingConcentrations, setLoadingConcentrations] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedVariantImage[]>(
    [],
  );
  const [uploadingImage, setUploadingImage] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [formValues, setFormValues] = useState(createInitialFormValues());
  const [skuSeed, setSkuSeed] = useState("");
  const [isSkuDirty, setIsSkuDirty] = useState(false);
  const [, setLoadingProductInfo] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(
    null,
  );
  const [variantFormMode, setVariantFormMode] =
    useState<VariantFormMode | null>(null);
  const [existingVariantMedia, setExistingVariantMedia] = useState<
    MediaResponse[]
  >([]);
  const [mediaIdsToDelete, setMediaIdsToDelete] = useState<string[]>([]);
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    variant: null as ProductVariant | null,
  });
  const [deletingVariantId, setDeletingVariantId] = useState<string | null>(
    null,
  );
  const isEditMode = Boolean(editingVariant?.id);
  const isFormVisible = variantFormMode !== null;

  const revokePreviewUrls = useCallback((images: UploadedVariantImage[]) => {
    images.forEach((image) => {
      URL.revokeObjectURL(image.previewUrl);
    });
  }, []);

  const resetFormToCreateMode = useCallback(() => {
    setEditingVariant(null);
    setVariantFormMode(null);
    setExistingVariantMedia([]);
    setMediaIdsToDelete([]);
    setAttributeSelections([createEmptyAttributeSelection()]);
    setSelectedConcentration(null);
    setFormValues(createInitialFormValues());
    setIsSkuDirty(false);
    setUploadedImages((prev) => {
      revokePreviewUrls(prev);
      return [];
    });
  }, [revokePreviewUrls]);

  const resetState = useCallback(() => {
    setVariants([]);
    setError(null);
    setAvailableAttributes([]);
    setConcentrations([]);
    setSkuSeed("");
    setIsSkuDirty(false);
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
      const productDetail = await productService.getProductDetail(product.id);
      setVariants(productDetail?.variants || []);
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

  const fetchConcentrations = useCallback(async () => {
    try {
      setLoadingConcentrations(true);
      const concentrationsList =
        await concentrationService.getConcentrationsLookup();
      setConcentrations(concentrationsList);
    } catch (err: any) {
      console.error("Failed to fetch concentrations:", err);
      showToast("Không thể tải danh sách nồng độ", "error");
    } finally {
      setLoadingConcentrations(false);
    }
  }, [showToast]);

  const fetchProductInfo = useCallback(async () => {
    if (!product?.id) {
      setSkuSeed("");
      return;
    }

    try {
      setLoadingProductInfo(true);
      const info = await productService.getProductInformation(product.id);
      setSkuSeed(deriveSkuSeed(info, product));
    } catch (err) {
      console.error("Error fetching product information:", err);
      setSkuSeed(deriveSkuSeed(null, product));
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

      // Group attributes by attributeId
      const groupedAttributes = variantAttributes.reduce(
        (acc: any, attr: any) => {
          const attrId = attr.attributeId;
          if (!acc[attrId]) acc[attrId] = [];
          acc[attrId].push(attr);
          return acc;
        },
        {},
      );

      const selections = await Promise.all(
        Object.values(groupedAttributes).map(async (attrs: any) => {
          const firstAttr = attrs[0];
          if (!firstAttr?.attributeId) {
            return createEmptyAttributeSelection();
          }

          let valueOptions: AttributeValueLookupItem[] = [];
          try {
            valueOptions = await attributeService.getAttributeValues(
              firstAttr.attributeId,
            );
          } catch (err) {
            console.error("Error hydrating attribute values:", err);
          }

          const attributeOption =
            availableAttributes.find(
              (item) => item.id === firstAttr.attributeId,
            ) ||
            (firstAttr.attributeId
              ? {
                  id: firstAttr.attributeId,
                  name:
                    firstAttr.attribute ||
                    `Thuộc tính #${firstAttr.attributeId}`,
                  description: firstAttr.description,
                  isVariantLevel: true,
                }
              : null);

          const selectedValues = attrs
            .map((attr: any) =>
              valueOptions.find((opt) => opt.id === attr.valueId),
            )
            .filter(Boolean);

          return {
            attribute: attributeOption,
            values: selectedValues,
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
    await Promise.all([
      fetchVariants(),
      fetchAttributes(),
      fetchConcentrations(),
      fetchProductInfo(),
    ]);
  }, [
    product?.id,
    fetchVariants,
    fetchAttributes,
    fetchConcentrations,
    fetchProductInfo,
  ]);

  const handleEditVariant = useCallback(
    async (variant: ProductVariant) => {
      if (!variant?.id) {
        return;
      }

      setEditingVariant(variant);
      setVariantFormMode("edit");
      setExistingVariantMedia(variant.media ?? []);
      setMediaIdsToDelete([]);
      setIsSkuDirty(true);
      // Find and set concentration
      const concentration = concentrations.find(
        (c) => c.id === variant.concentrationId,
      );
      setSelectedConcentration(concentration || null);

      setFormValues({
        sku: variant.sku || "",
        barCode:
          (variant as unknown as { barCode?: string })?.barCode ||
          (variant as unknown as { barcode?: string })?.barcode ||
          "",
        volumeMl: variant.volumeMl ? String(variant.volumeMl) : "",
        basePrice: variant.basePrice ? String(variant.basePrice) : "",
        lowStockThreshold:
          typeof (variant as { lowStockThreshold?: number })
            .lowStockThreshold === "number"
            ? String(
                (variant as { lowStockThreshold?: number }).lowStockThreshold,
              )
            : "",
        type:
          (variant.type as VariantType) ||
          (VARIANT_TYPES[0]?.value ?? "FullBox"),
        status:
          (variant.status as VariantStatus) ||
          (VARIANT_STATUS[0]?.value ?? "Active"),
      });
      await hydrateAttributeSelectionsFromVariant(variant);
      setUploadedImages((prev) => {
        revokePreviewUrls(prev);
        return [];
      });
    },
    [hydrateAttributeSelectionsFromVariant, revokePreviewUrls, concentrations],
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

  // Cleanup preview URLs when component unmounts or uploadedImages changes
  useEffect(
    () => () => revokePreviewUrls(uploadedImages),
    [uploadedImages, revokePreviewUrls],
  );

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
    const suggestion = buildSuggestedSku(
      skuSeed,
      formValues.volumeMl,
      selectedConcentration?.name ?? "",
    );
    if (!suggestion) {
      return;
    }
    setFormValues((prev) =>
      prev.sku === suggestion ? prev : { ...prev, sku: suggestion },
    );
  }, [skuSeed, isSkuDirty, formValues.volumeMl, selectedConcentration]);

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

  const handleStartCreateVariant = () => {
    if (saving || uploadingImage || Boolean(deletingVariantId)) {
      return;
    }
    setVariantFormMode("create");
    setEditingVariant(null);
    setExistingVariantMedia([]);
    setMediaIdsToDelete([]);
    setSelectedConcentration(null);
    setAttributeSelections([createEmptyAttributeSelection()]);
    setIsSkuDirty(false);
    setFormValues(createInitialFormValues());
    setUploadedImages((prev) => {
      revokePreviewUrls(prev);
      return [];
    });
    setCurrentImageIndex(0);
    setError(null);
  };

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    if (name === "sku") {
      setIsSkuDirty(true);
    }

    // For basePrice, remove non-digits to store clean number
    if (name === "basePrice") {
      const cleanValue = value.replace(/\D/g, "");
      setFormValues((prev) => ({ ...prev, [name]: cleanValue }));
    } else if (name === "volumeMl") {
      // For volumeMl, allow only digits and decimal point
      const cleanValue = value.replace(/[^\d.]/g, "");
      setFormValues((prev) => ({ ...prev, [name]: cleanValue }));
    } else if (name === "lowStockThreshold") {
      const cleanValue = value.replace(/\D/g, "");
      setFormValues((prev) => ({ ...prev, [name]: cleanValue }));
    } else {
      setFormValues((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAttributeChange = async (
    index: number,
    attribute: AttributeLookupItem | null,
  ) => {
    setAttributeSelections((prev) => {
      const updated = [...prev];
      updated[index] = {
        attribute,
        values: [],
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
    values: AttributeValueLookupItem[],
  ) => {
    setAttributeSelections((prev) => {
      const updated = [...prev];
      const current = updated[index];
      if (current) {
        updated[index] = { ...current, values };
      }
      return updated;
    });
  };

  const handleAddAttribute = () => {
    setAttributeSelections((prev) => [
      ...prev,
      createEmptyAttributeSelection(),
    ]);
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

    const filesToUpload = Array.from(files);

    try {
      setUploadingImage(true);
      const isFirstImage =
        existingVariantMedia.length === 0 && uploadedImages.length === 0;
      const payload = filesToUpload.map((file, index) => ({
        file,
        altText: file.name,
        displayOrder: uploadedImages.length + index,
        isPrimary: isFirstImage && index === 0,
      }));

      const uploadedMedia = await productService.uploadVariantImages(payload);
      if (!uploadedMedia.length) {
        throw new Error("Không nhận được ID ảnh");
      }

      const newImages: UploadedVariantImage[] = uploadedMedia
        .map((media, index) => {
          const file = filesToUpload[index];
          if (!media?.id || !file) {
            return null;
          }

          return {
            temporaryMediaId: media.id,
            previewUrl: URL.createObjectURL(file),
            altText: file.name,
            isPrimary: isFirstImage && index === 0,
          };
        })
        .filter((item): item is UploadedVariantImage => Boolean(item));

      if (newImages.length === 0) {
        throw new Error("Không nhận được ID ảnh hợp lệ");
      }

      setUploadedImages((prev) => {
        const updated = [...prev, ...newImages];
        setCurrentImageIndex(updated.length - newImages.length);
        return updated;
      });
      showToast(`Đã tải ${newImages.length} ảnh biến thể`, "success");
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
      const removedImage = prev.find(
        (img) => img.temporaryMediaId === temporaryMediaId,
      );
      if (removedImage) {
        URL.revokeObjectURL(removedImage.previewUrl);
      }
      const remaining = prev.filter(
        (img) => img.temporaryMediaId !== temporaryMediaId,
      );
      if (remaining.length && !remaining.some((img) => img.isPrimary)) {
        const [first, ...rest] = remaining;
        if (!first) return remaining;
        return [
          {
            temporaryMediaId: first.temporaryMediaId,
            previewUrl: first.previewUrl,
            altText: first.altText,
            isPrimary: true,
          },
          ...rest,
        ];
      }
      return remaining;
    });
  };

  const handleSetPrimaryImage = (temporaryMediaId: string) => {
    setUploadedImages((prev) =>
      prev.map(
        (img): UploadedVariantImage => ({
          temporaryMediaId: img.temporaryMediaId,
          previewUrl: img.previewUrl,
          altText: img.altText,
          isPrimary: img.temporaryMediaId === temporaryMediaId,
        }),
      ),
    );
  };

  const handleSetPrimaryExistingImage = async (mediaId: string) => {
    try {
      setSaving(true);
      await productService.setVariantImagePrimary(mediaId);
      setExistingVariantMedia((prev) =>
        prev.map((m) => ({ ...m, isPrimary: m.id === mediaId })),
      );
      showToast("Đã đặt ảnh làm chính", "success");
    } catch (err: any) {
      const message = err.message || "Không thể đặt ảnh chính";
      setError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const getValidationError = () => {
    if (!product?.id) {
      return "Không xác định được sản phẩm";
    }
    if (!formValues.sku.trim()) {
      return "SKU là bắt buộc";
    }
    if (!formValues.barCode.trim()) {
      return "Barcode là bắt buộc";
    }
    if (!formValues.volumeMl || Number(formValues.volumeMl) <= 0) {
      return "Dung tích phải lớn hơn 0";
    }
    if (!selectedConcentration?.id) {
      return "Vui lòng chọn nồng độ";
    }
    if (!formValues.basePrice || Number(formValues.basePrice) <= 0) {
      return "Giá cơ bản phải lớn hơn 0";
    }
    if (!isEditMode && !formValues.lowStockThreshold) {
      return "Mức cảnh báo tồn kho phải lớn hơn 0";
    }
    if (
      formValues.lowStockThreshold &&
      Number(formValues.lowStockThreshold) <= 0
    ) {
      return "Mức cảnh báo tồn kho phải lớn hơn 0";
    }
    return null;
  };

  const buildAttributePayload = () =>
    attributeSelections
      .filter((sel) => sel.attribute?.id && sel.values.length > 0)
      .flatMap((sel) =>
        sel.values.map((value) => ({
          attributeId: sel.attribute!.id!,
          valueId: value.id!,
        })),
      );

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
      concentrationId: selectedConcentration!.id,
      type: formValues.type as VariantType,
      basePrice: Number(formValues.basePrice),
      status: formValues.status as VariantStatus,
      lowStockThreshold: Number(formValues.lowStockThreshold),
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
      lowStockThreshold?: number;
    } = {
      sku: formValues.sku.trim(),
      ...(trimmedBarcode ? { barcode: trimmedBarcode } : {}),
      volumeMl: Number(formValues.volumeMl),
      concentrationId: selectedConcentration!.id,
      type: formValues.type as VariantType,
      basePrice: Number(formValues.basePrice),
      status: formValues.status as VariantStatus,
      ...(formValues.lowStockThreshold
        ? { lowStockThreshold: Number(formValues.lowStockThreshold) }
        : {}),
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
          const previewMedia = selectVariantPreviewMedia(variant, null);
          const previewUrl = previewMedia?.url;
          const detailText =
            [
              variant.volumeMl ? `${variant.volumeMl}ml` : null,
              variant.concentrationName,
            ]
              .filter(Boolean)
              .join(" · ") || "Không có thông tin dung tích";
          const isActive =
            variantFormMode === "edit" && editingVariant?.id === variant.id;

          return (
            <Paper
              key={variant.id}
              variant="outlined"
              onClick={() => {
                void handleEditVariant(variant);
              }}
              sx={{
                p: 2,
                display: "flex",
                flexWrap: "wrap",
                gap: 2,
                alignItems: "center",
                borderColor: isActive ? "primary.main" : "grey.200",
                boxShadow: isActive ? 3 : undefined,
                cursor: "pointer",
                transition: "all 0.15s ease",
                "&:hover": {
                  borderColor: "primary.light",
                },
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
                sx={{
                  flex: { xs: "1 1 100%", sm: "0 0 auto" },
                  minWidth: { sm: 220 },
                }}
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
                    VARIANT_STATUS.find((item) => item.value === variant.status)
                      ?.label ||
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
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon fontSize="small" />}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleRequestDeleteVariant(variant);
                    }}
                    disabled={
                      saving || uploadingImage || Boolean(deletingVariantId)
                    }
                    sx={{
                      minWidth: 130,
                      fontWeight: 600,
                      textTransform: "none",
                    }}
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
          <Typography
            variant="subtitle2"
            color="text.secondary"
            ml={1}
            component="span"
          >
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
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
              >
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Danh sách variant
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tổng cộng {variants.length} biến thể
                  </Typography>
                  <Typography variant="caption" color="primary.main">
                    Chọn trực tiếp một variant để chỉnh sửa
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={handleStartCreateVariant}
                    disabled={
                      saving || uploadingImage || Boolean(deletingVariantId)
                    }
                  >
                    Thêm variant
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={fetchVariants}
                    disabled={loadingVariants}
                  >
                    Làm mới
                  </Button>
                </Stack>
              </Box>
              {renderVariantList()}
            </Paper>

            {isFormVisible ? (
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
                        : "Điền thông tin chi tiết và tải ảnh"}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    color="inherit"
                    onClick={handleCancelEdit}
                    disabled={saving || uploadingImage}
                  >
                    Đóng chi tiết
                  </Button>
                </Box>

                {/* Two column layout: Images on left, Form inputs on right */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      md: "400px 1fr",
                    },
                    gap: 3,
                  }}
                >
                  {/* Left column: Image upload and carousel */}
                  <Box>
                    <Box mb={2}>
                      <Typography variant="subtitle2" fontWeight={600}>
                        Ảnh variant
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Thêm ảnh cho variant này
                      </Typography>
                    </Box>

                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={2}
                      mb={2}
                    >
                      <Button
                        variant="outlined"
                        component="label"
                        startIcon={
                          uploadingImage ? (
                            <CircularProgress size={18} />
                          ) : (
                            <AddIcon />
                          )
                        }
                        disabled={saving || uploadingImage}
                      >
                        {uploadingImage ? "Đang tải ảnh..." : "Tải ảnh"}
                        <input
                          type="file"
                          accept="image/*"
                          multiple
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

                    {/* Unified Image Carousel: existing + newly uploaded */}
                    {(() => {
                      type CarouselItem =
                        | { kind: "existing"; media: MediaResponse }
                        | { kind: "uploaded"; image: UploadedVariantImage };

                      const allItems: CarouselItem[] = [
                        ...existingVariantMedia.map(
                          (m): CarouselItem => ({ kind: "existing", media: m }),
                        ),
                        ...uploadedImages.map(
                          (i): CarouselItem => ({ kind: "uploaded", image: i }),
                        ),
                      ];

                      const safeIndex = Math.min(
                        currentImageIndex,
                        Math.max(allItems.length - 1, 0),
                      );
                      const current = allItems[safeIndex];

                      const goNext = () =>
                        setCurrentImageIndex((p) =>
                          p < allItems.length - 1 ? p + 1 : 0,
                        );
                      const goPrev = () =>
                        setCurrentImageIndex((p) =>
                          p > 0 ? p - 1 : allItems.length - 1,
                        );

                      const onTouchStart = (e: React.TouchEvent) => {
                        setTouchEnd(null);
                        const t = e.targetTouches[0];
                        if (t) setTouchStart(t.clientX);
                      };
                      const onTouchMove = (e: React.TouchEvent) => {
                        const t = e.targetTouches[0];
                        if (t) setTouchEnd(t.clientX);
                      };
                      const onTouchEnd = () => {
                        if (!touchStart || !touchEnd) return;
                        const d = touchStart - touchEnd;
                        if (d > 50) goNext();
                        if (d < -50) goPrev();
                      };

                      if (allItems.length === 0) {
                        return (
                          <Box
                            sx={{
                              border: 1,
                              borderStyle: "dashed",
                              borderColor: "divider",
                              borderRadius: 1,
                              p: 3,
                              textAlign: "center",
                              minHeight: 200,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Box>
                              <ImageIcon
                                style={{
                                  fontSize: 40,
                                  color: "#9e9e9e",
                                  marginBottom: 8,
                                }}
                              />
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Chưa có ảnh nào
                              </Typography>
                            </Box>
                          </Box>
                        );
                      }

                      const currentUrl =
                        current?.kind === "existing"
                          ? current.media.url
                          : current?.kind === "uploaded"
                            ? current.image.previewUrl
                            : undefined;

                      const currentAlt =
                        current?.kind === "existing"
                          ? current.media.altText || ""
                          : current?.kind === "uploaded"
                            ? current.image.altText
                            : "";

                      const isPrimaryFlag =
                        current?.kind === "existing"
                          ? !!current.media.isPrimary
                          : current?.kind === "uploaded"
                            ? !!current.image.isPrimary
                            : false;

                      const isMarkedDelete =
                        current?.kind === "existing" && current.media.id
                          ? mediaIdsToDelete.includes(current.media.id)
                          : false;

                      return (
                        <Box>
                          {/* Main carousel image */}
                          <Card
                            sx={{
                              position: "relative",
                              mb: 1.5,
                              cursor: allItems.length > 1 ? "grab" : "default",
                              userSelect: "none",
                              border: isMarkedDelete ? 2 : 0,
                              borderColor: isMarkedDelete
                                ? "error.main"
                                : "transparent",
                              "&:active": {
                                cursor:
                                  allItems.length > 1 ? "grabbing" : "default",
                              },
                            }}
                            onTouchStart={onTouchStart}
                            onTouchMove={onTouchMove}
                            onTouchEnd={onTouchEnd}
                          >
                            {currentUrl ? (
                              <CardMedia
                                component="img"
                                height="220"
                                image={currentUrl}
                                alt={currentAlt}
                                sx={{
                                  objectFit: "contain",
                                  bgcolor: "grey.50",
                                  pointerEvents: "none",
                                  opacity: isMarkedDelete ? 0.4 : 1,
                                }}
                              />
                            ) : (
                              <Box
                                sx={{
                                  height: 220,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  bgcolor: "grey.100",
                                }}
                              >
                                <ImageIcon
                                  style={{ fontSize: 48, color: "#bdbdbd" }}
                                />
                              </Box>
                            )}

                            {/* Prev/Next arrows */}
                            {allItems.length > 1 && (
                              <>
                                <IconButton
                                  onClick={goPrev}
                                  disabled={saving}
                                  size="small"
                                  sx={{
                                    position: "absolute",
                                    left: 6,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    bgcolor: "rgba(255,255,255,0.9)",
                                    "&:hover": { bgcolor: "#fff" },
                                  }}
                                >
                                  <ChevronLeft />
                                </IconButton>
                                <IconButton
                                  onClick={goNext}
                                  disabled={saving}
                                  size="small"
                                  sx={{
                                    position: "absolute",
                                    right: 6,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    bgcolor: "rgba(255,255,255,0.9)",
                                    "&:hover": { bgcolor: "#fff" },
                                  }}
                                >
                                  <ChevronRight />
                                </IconButton>
                              </>
                            )}

                            {/* Counter */}
                            <Chip
                              label={`${safeIndex + 1} / ${allItems.length}`}
                              size="small"
                              sx={{
                                position: "absolute",
                                top: 8,
                                right: 8,
                                bgcolor: "rgba(0,0,0,0.6)",
                                color: "white",
                              }}
                            />

                            {/* Primary badge */}
                            {isPrimaryFlag && (
                              <Chip
                                label="Hình chính"
                                color="primary"
                                size="small"
                                sx={{ position: "absolute", top: 8, left: 8 }}
                              />
                            )}

                            {/* Deleted overlay label */}
                            {isMarkedDelete && (
                              <Chip
                                label="Sẽ bị xoá"
                                color="error"
                                size="small"
                                sx={{
                                  position: "absolute",
                                  bottom: 8,
                                  left: "50%",
                                  transform: "translateX(-50%)",
                                }}
                              />
                            )}
                          </Card>

                          {/* Controls for current image */}
                          <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5 }}>
                            {current?.kind === "existing" &&
                              current.media.id && (
                                <Box display="flex" gap={1}>
                                  {!current.media.isPrimary &&
                                    !isMarkedDelete && (
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={
                                          <StarIcon style={{ fontSize: 14 }} />
                                        }
                                        onClick={() =>
                                          handleSetPrimaryExistingImage(
                                            current.media.id!,
                                          )
                                        }
                                        disabled={saving}
                                        fullWidth
                                      >
                                        Đặt làm chính
                                      </Button>
                                    )}
                                  <Button
                                    size="small"
                                    variant={
                                      isMarkedDelete ? "contained" : "outlined"
                                    }
                                    color={isMarkedDelete ? "error" : "inherit"}
                                    fullWidth
                                    onClick={() =>
                                      handleToggleExistingMedia(
                                        current.media.id,
                                      )
                                    }
                                    disabled={saving}
                                  >
                                    {isMarkedDelete ? "Bỏ xoá" : "Xoá ảnh này"}
                                  </Button>
                                </Box>
                              )}

                            {current?.kind === "uploaded" && (
                              <Box display="flex" gap={1}>
                                {!current.image.isPrimary && (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={
                                      <StarIcon style={{ fontSize: 14 }} />
                                    }
                                    onClick={() =>
                                      handleSetPrimaryImage(
                                        current.image.temporaryMediaId,
                                      )
                                    }
                                    disabled={saving}
                                    fullWidth
                                  >
                                    Đặt làm chính
                                  </Button>
                                )}
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  startIcon={
                                    <DeleteIcon style={{ fontSize: 14 }} />
                                  }
                                  onClick={() =>
                                    handleRemoveImage(
                                      current.image.temporaryMediaId,
                                    )
                                  }
                                  disabled={saving}
                                  fullWidth
                                >
                                  Xóa
                                </Button>
                              </Box>
                            )}
                          </Paper>

                          {/* Thumbnail strip */}
                          {allItems.length > 1 && (
                            <Box
                              sx={{
                                display: "flex",
                                gap: 1,
                                overflowX: "auto",
                                pb: 0.5,
                              }}
                            >
                              {allItems.map((item, idx) => {
                                const thumbUrl =
                                  item.kind === "existing"
                                    ? item.media.url
                                    : item.image.previewUrl;
                                const isSelected = idx === safeIndex;
                                const isDeleted =
                                  item.kind === "existing" && item.media.id
                                    ? mediaIdsToDelete.includes(item.media.id)
                                    : false;
                                return (
                                  <Box
                                    key={
                                      item.kind === "existing"
                                        ? item.media.id
                                        : item.image.temporaryMediaId
                                    }
                                    onClick={() => setCurrentImageIndex(idx)}
                                    sx={{
                                      width: 52,
                                      height: 52,
                                      flexShrink: 0,
                                      cursor: "pointer",
                                      border: 2,
                                      borderColor: isSelected
                                        ? "primary.main"
                                        : "divider",
                                      borderRadius: 1,
                                      overflow: "hidden",
                                      opacity: isDeleted
                                        ? 0.3
                                        : isSelected
                                          ? 1
                                          : 0.65,
                                      transition: "all 0.15s",
                                      bgcolor: "grey.100",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      "&:hover": { opacity: 1 },
                                    }}
                                  >
                                    {thumbUrl ? (
                                      <Box
                                        component="img"
                                        src={thumbUrl}
                                        sx={{
                                          width: "100%",
                                          height: "100%",
                                          objectFit: "cover",
                                          pointerEvents: "none",
                                        }}
                                      />
                                    ) : (
                                      <ImageIcon
                                        style={{
                                          fontSize: 20,
                                          color: "#bdbdbd",
                                        }}
                                      />
                                    )}
                                  </Box>
                                );
                              })}
                            </Box>
                          )}
                        </Box>
                      );
                    })()}
                  </Box>

                  {/* Right column: Form inputs */}
                  <Box>
                    <Box mb={2}>
                      <Typography variant="subtitle2" fontWeight={600}>
                        Thông tin variant
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Điền thông tin chi tiết
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
                        gap: 2,
                      }}
                    >
                      <Box>
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
                              ? `Tự động gợi ý: ${skuSeed}-[dung tích]-[nồng độ]`
                              : "SKU sẽ được gợi ý theo sản phẩm chính"
                          }
                        />
                      </Box>
                      <Box>
                        <TextField
                          label="Barcode"
                          name="barCode"
                          value={formValues.barCode}
                          onChange={handleInputChange}
                          fullWidth
                          required
                          disabled={saving}
                        />
                      </Box>
                      <Box>
                        <TextField
                          label="Dung tích (ml)"
                          name="volumeMl"
                          type="number"
                          value={formValues.volumeMl}
                          onChange={handleInputChange}
                          fullWidth
                          required
                          disabled={saving}
                          inputProps={{ min: 1, step: "any" }}
                          helperText="Phải lớn hơn 0"
                        />
                      </Box>
                      <Box>
                        <Autocomplete
                          options={concentrations}
                          getOptionLabel={(option) => option.name || ""}
                          value={selectedConcentration}
                          onChange={(_, newValue) =>
                            setSelectedConcentration(newValue)
                          }
                          disabled={saving || loadingConcentrations}
                          loading={loadingConcentrations}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Nồng độ"
                              required
                              helperText="Ví dụ: Eau de Parfum"
                              InputProps={{
                                ...params.InputProps,
                                endAdornment: (
                                  <>
                                    {loadingConcentrations ? (
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
                      <Box>
                        <TextField
                          label="Giá cơ bản (VND)"
                          name="basePrice"
                          value={
                            formValues.basePrice
                              ? parseInt(formValues.basePrice).toLocaleString(
                                  "vi-VN",
                                )
                              : ""
                          }
                          onChange={handleInputChange}
                          fullWidth
                          required
                          disabled={saving}
                          helperText="Phải lớn hơn 0"
                        />
                      </Box>
                      {!isEditMode && (
                        <Box>
                          <TextField
                            label="Mức cảnh báo tồn kho"
                            name="lowStockThreshold"
                            type="number"
                            value={formValues.lowStockThreshold}
                            onChange={handleInputChange}
                            fullWidth
                            required
                            disabled={saving}
                            inputProps={{ min: 1, step: 1 }}
                            helperText="Phải lớn hơn 0"
                          />
                        </Box>
                      )}
                      <Box>
                        <TextField
                          label="Loại variant"
                          name="type"
                          select
                          value={formValues.type}
                          onChange={handleInputChange}
                          fullWidth
                          required
                          disabled={saving}
                        >
                          {VARIANT_TYPES.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Box>
                      <Box>
                        <TextField
                          label="Trạng thái"
                          name="status"
                          select
                          value={formValues.status}
                          onChange={handleInputChange}
                          fullWidth
                          required
                          disabled={saving}
                        >
                          {VARIANT_STATUS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Box>
                    </Box>
                  </Box>
                </Box>

                <Divider sx={{ my: 3 }} />

                <Box
                  mb={1}
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
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
                    <Paper
                      key={`attr-${index}`}
                      variant="outlined"
                      sx={{ p: 2 }}
                    >
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: {
                            xs: "1fr",
                            sm: "repeat(12, 1fr)",
                          },
                          gap: 2,
                          alignItems: "center",
                        }}
                      >
                        <Box
                          sx={{ gridColumn: { xs: "span 1", sm: "span 5" } }}
                        >
                          <Autocomplete
                            options={availableAttributes}
                            getOptionLabel={(option) => option.name || ""}
                            value={selection.attribute}
                            onChange={(_, newValue) =>
                              handleAttributeChange(index, newValue)
                            }
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
                                      {selection.loadingValues && (
                                        <CircularProgress size={18} />
                                      )}
                                      {params.InputProps.endAdornment}
                                    </>
                                  ),
                                }}
                              />
                            )}
                          />
                        </Box>
                        <Box
                          sx={{ gridColumn: { xs: "span 1", sm: "span 5" } }}
                        >
                          <Autocomplete
                            multiple
                            options={selection.valueOptions}
                            getOptionLabel={(option) => option.value || ""}
                            value={selection.values}
                            onChange={(_, newValue) =>
                              handleValueChange(index, newValue)
                            }
                            loading={selection.loadingValues}
                            isOptionEqualToValue={(option, value) =>
                              option?.id === value?.id
                            }
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label="Giá trị"
                                placeholder="Chọn một hoặc nhiều giá trị"
                                InputProps={{
                                  ...params.InputProps,
                                  endAdornment: (
                                    <>
                                      {selection.loadingValues && (
                                        <CircularProgress size={18} />
                                      )}
                                      {params.InputProps.endAdornment}
                                    </>
                                  ),
                                }}
                              />
                            )}
                          />
                        </Box>
                        <Box
                          sx={{ gridColumn: { xs: "span 1", sm: "span 2" } }}
                        >
                          <IconButton
                            color="error"
                            onClick={() => handleRemoveAttribute(index)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </Box>
                    </Paper>
                  ))}
                </Stack>

                <Box mt={3} display="flex" justifyContent="flex-end" gap={2}>
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
            ) : (
              <Paper variant="outlined" sx={{ p: 3 }}>
                <Typography variant="subtitle1" fontWeight={600} mb={1}>
                  Chi tiết variant
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Chọn một variant trong danh sách để chỉnh sửa, hoặc bấm "Thêm
                  variant" để tạo mới.
                </Typography>
              </Paper>
            )}
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
        <Button
          onClick={handleClose}
          disabled={saving || uploadingImage || Boolean(deletingVariantId)}
        >
          Đóng
        </Button>
      </DialogActions>
    </Dialog>
  );
}
