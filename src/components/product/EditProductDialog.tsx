import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
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
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper,
  Checkbox,
  FormControlLabel,
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
import { olfactoryService } from "@/services/olfactoryService";
import { scentNoteService } from "@/services/scentNoteService";
import type { BrandLookupItem } from "@/services/brandService";
import { categoryService } from "@/services/categoryService";
import type { CategoryLookupItem } from "@/services/categoryService";
import { useToast } from "@/hooks/useToast";
import RichTextEditor from "@/components/common/RichTextEditor";
import type {
  AttributeLookupItem,
  AttributeValueLookupItem,
  ProductImageUploadPayload,
  UpdateProductRequest,
  Gender,
  NoteType,
  OlfactoryLookupItem,
  ScentNoteLookupItem,
} from "@/types/product";

interface AttributeSelection {
  attribute: AttributeLookupItem | null | undefined;
  values: AttributeValueLookupItem[]; // Changed to support multiple values
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
  values: [], // Changed to empty array
  valueOptions: [],
  loadingValues: false,
});

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "Male", label: "Nam" },
  { value: "Female", label: "Nữ" },
  { value: "Unisex", label: "Unisex" },
];

const SCENT_NOTE_ROWS: { type: NoteType; label: string }[] = [
  { type: "Top", label: "Hương đầu" },
  { type: "Heart", label: "Hương giữa" },
  { type: "Base", label: "Hương cuối" },
];

const normalizeSearchText = (value?: string | null) =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const hasSearchMatch = <T,>(
  inputValue: string,
  options: T[],
  getSearchText: (option: T) => string | null | undefined,
) => {
  const normalizedInput = normalizeSearchText(inputValue);
  if (!normalizedInput) {
    return false;
  }

  return options.some((option) =>
    normalizeSearchText(getSearchText(option)).includes(normalizedInput),
  );
};

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
  const [gender, setGender] = useState<Gender | "">("");
  const [origin, setOrigin] = useState("");
  const [releaseYear, setReleaseYear] = useState("");
  const [selectedOlfactoryFamilies, setSelectedOlfactoryFamilies] = useState<
    OlfactoryLookupItem[]
  >([]);
  const [topNotes, setTopNotes] = useState<ScentNoteLookupItem[]>([]);
  const [heartNotes, setHeartNotes] = useState<ScentNoteLookupItem[]>([]);
  const [baseNotes, setBaseNotes] = useState<ScentNoteLookupItem[]>([]);
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
  const [styleValueOptions, setStyleValueOptions] = useState<
    AttributeValueLookupItem[]
  >([]);
  const [selectedStyleValues, setSelectedStyleValues] = useState<
    AttributeValueLookupItem[]
  >([]);
  const [olfactoryOptions, setOlfactoryOptions] = useState<
    OlfactoryLookupItem[]
  >([]);
  const [scentNoteOptions, setScentNoteOptions] = useState<
    ScentNoteLookupItem[]
  >([]);

  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  const [loadingStyleValues, setLoadingStyleValues] = useState(false);
  const [loadingOlfactory, setLoadingOlfactory] = useState(false);
  const [loadingScentNotes, setLoadingScentNotes] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [newOlfactoryName, setNewOlfactoryName] = useState("");
  const [newAttributeNamesByIndex, setNewAttributeNamesByIndex] = useState<
    Record<number, string>
  >({});
  const [newStyleValueName, setNewStyleValueName] = useState("");
  const [newAttributeValueNames, setNewAttributeValueNames] = useState<
    Record<number, string>
  >({});
  const [newScentNoteNames, setNewScentNoteNames] = useState<
    Record<NoteType, string>
  >({
    Top: "",
    Heart: "",
    Base: "",
  });

  const [creatingBrand, setCreatingBrand] = useState(false);
  const [creatingOlfactory, setCreatingOlfactory] = useState(false);
  const [creatingScentNote, setCreatingScentNote] = useState(false);
  const [creatingAttribute, setCreatingAttribute] = useState(false);
  const [creatingStyleValue, setCreatingStyleValue] = useState(false);
  const [creatingAttributeValues, setCreatingAttributeValues] = useState<
    Record<number, boolean>
  >({});

  const brandInputRef = useRef<HTMLInputElement | null>(null);
  const olfactoryInputRef = useRef<HTMLInputElement | null>(null);
  const styleValueInputRef = useRef<HTMLInputElement | null>(null);
  const scentNoteInputRefs = useRef<Record<NoteType, HTMLInputElement | null>>({
    Top: null,
    Heart: null,
    Base: null,
  });
  const attributeInputRefs = useRef<Record<number, HTMLInputElement | null>>(
    {},
  );
  const attributeValueInputRefs = useRef<
    Record<number, HTMLInputElement | null>
  >({});

  const normalizeDescription = (input: string) => {
    const container = document.createElement("div");
    container.innerHTML = input || "";
    const text = (container.textContent || "").replace(/\u00a0/g, " ").trim();
    return text ? container.innerHTML.replace(/[\r\n]+/g, "").trim() : "";
  };

  const styleAttribute = useMemo(
    () =>
      availableAttributes.find((attribute) => {
        const searchable = `${normalizeSearchText(attribute.name)} ${normalizeSearchText(attribute.description)}`;
        return (
          searchable.includes("phong cach") || searchable.includes("style")
        );
      }) || null,
    [availableAttributes],
  );

  const appendUniqueById = <T extends { id?: number }>(
    list: T[],
    item: T,
  ): T[] => {
    if (typeof item.id !== "number") {
      return list;
    }
    return list.some((existing) => existing.id === item.id)
      ? list
      : [...list, item];
  };

  const renderCreateNoOptions = (
    value: string,
    creating: boolean,
    onCreate: () => void,
  ) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return "Không có dữ liệu";
    }

    return (
      <Button
        size="small"
        onMouseDown={(event) => event.preventDefault()}
        onClick={onCreate}
        disabled={saving || creating}
      >
        {creating ? "Đang tạo..." : `Tạo mới: ${trimmed}`}
      </Button>
    );
  };

  const refocusInput = (input: HTMLInputElement | null) => {
    requestAnimationFrame(() => {
      input?.focus();
    });
  };

  const handleCreateOnEnter = (
    event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    value: string,
    creating: boolean,
    optionExists: boolean,
    onCreate: () => void,
  ) => {
    if (event.key !== "Enter") {
      return;
    }

    if (!value.trim() || creating || optionExists) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onCreate();
  };

  const resetState = useCallback(() => {
    setName("");
    setSelectedBrand(null);
    setSelectedCategory(null);
    setDescription("");
    setGender("");
    setOrigin("");
    setReleaseYear("");
    setSelectedOlfactoryFamilies([]);
    setTopNotes([]);
    setHeartNotes([]);
    setBaseNotes([]);
    setSelectedStyleValues([]);
    setStyleValueOptions([]);
    setOlfactoryOptions([]);
    setScentNoteOptions([]);

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
    setNewBrandName("");
    setNewOlfactoryName("");
    setNewAttributeNamesByIndex({});
    setNewStyleValueName("");
    setNewAttributeValueNames({});
    setNewScentNoteNames({ Top: "", Heart: "", Base: "" });
    setCreatingAttributeValues({});
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
        olfactoryLookup,
        scentLookup,
      ] = await Promise.all([
        attributeService.getAttributes(),
        productService.getProductDetail(productId),
        productService.getProductImages(productId),
        brandService.getBrandsLookup(),
        categoryService.getCategoriesLookup(),
        olfactoryService.getOlfactoryLookup(),
        scentNoteService.getScentNotesLookup(),
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
      setGender(productDetail.gender || "");
      setOrigin(productDetail.origin || "");
      setReleaseYear(
        productDetail.releaseYear && productDetail.releaseYear > 0
          ? String(productDetail.releaseYear)
          : "",
      );
      setOlfactoryOptions(olfactoryLookup);
      setScentNoteOptions(scentLookup);

      const olfactoryById = new Map(
        olfactoryLookup
          .filter((item) => typeof item.id === "number")
          .map((item) => [item.id as number, item]),
      );
      const selectedFamilies = (productDetail.olfactoryFamilies || [])
        .map((family) => {
          const id = family.olfactoryFamilyId;
          if (typeof id !== "number") return null;
          return (
            olfactoryById.get(id) || {
              id,
              name: family.name || "",
            }
          );
        })
        .filter((item): item is OlfactoryLookupItem => Boolean(item));
      setSelectedOlfactoryFamilies(selectedFamilies);

      const noteById = new Map(
        scentLookup
          .filter((item) => typeof item.id === "number")
          .map((item) => [item.id as number, item]),
      );
      const mapScentNotesByType = (type: NoteType) =>
        (productDetail.scentNotes || [])
          .filter(
            (note) => note.type === type && typeof note.noteId === "number",
          )
          .map(
            (note) =>
              noteById.get(note.noteId as number) || {
                id: note.noteId,
                name: note.name || "",
              },
          );

      setTopNotes(mapScentNotesByType("Top"));
      setHeartNotes(mapScentNotesByType("Heart"));
      setBaseNotes(mapScentNotesByType("Base"));

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

      // Group attributes by attributeId
      const groupedAttributes = productAttributes.reduce(
        (acc: any, attr: any) => {
          const attrId = attr.attributeId;
          if (!acc[attrId]) {
            acc[attrId] = [];
          }
          acc[attrId].push(attr);
          return acc;
        },
        {},
      );

      const selections =
        Object.keys(groupedAttributes).length > 0
          ? await Promise.all(
              Object.entries(groupedAttributes).map(
                async ([_, attrs]: [string, any]) => {
                  const firstAttr = attrs[0];
                  let attributeOption =
                    attributeLookup.find(
                      (item) => item.id === firstAttr.attributeId,
                    ) || null;

                  if (
                    !attributeOption &&
                    typeof firstAttr.attributeId === "number"
                  ) {
                    attributeOption = {
                      id: firstAttr.attributeId,
                      internalCode: `ATTR_${firstAttr.attributeId}`,
                      name:
                        firstAttr.attribute ||
                        `Attribute ${firstAttr.attributeId}`,
                      description: firstAttr.description || undefined,
                    };
                    if (
                      attributeOption &&
                      !fallbackAttributes.some(
                        (item) => item.id === firstAttr.attributeId,
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
                      console.error(
                        "Error fetching attribute values:",
                        valueError,
                      );
                    }
                  }

                  // Collect all values for this attribute
                  const selectedValues: AttributeValueLookupItem[] = [];
                  attrs.forEach((attr: any) => {
                    const fallbackValue =
                      typeof attr.valueId === "number"
                        ? { id: attr.valueId, value: attr.value || "" }
                        : null;

                    if (
                      fallbackValue &&
                      !valueOptions.some(
                        (option) => option.id === fallbackValue.id,
                      )
                    ) {
                      valueOptions = [...valueOptions, fallbackValue];
                    }

                    const value =
                      valueOptions.find(
                        (option) => option.id === attr.valueId,
                      ) || fallbackValue;
                    if (
                      value &&
                      !selectedValues.some((v) => v.id === value.id)
                    ) {
                      selectedValues.push(value);
                    }
                  });

                  return {
                    attribute: attributeOption,
                    values: selectedValues, // Array of all values for this attribute
                    valueOptions,
                    loadingValues: false,
                  };
                },
              ),
            )
          : [createEmptyAttributeSelection()];

      const normalizedAttributes = [
        ...attributeLookup,
        ...fallbackAttributes.filter(
          (fallback) =>
            !attributeLookup.some((attr) => attr.id === fallback.id),
        ),
      ];

      const styleAttributeFromLookup =
        normalizedAttributes.find((attribute) => {
          const searchable = `${normalizeSearchText(attribute.name)} ${normalizeSearchText(attribute.description)}`;
          return (
            searchable.includes("phong cach") || searchable.includes("style")
          );
        }) || null;

      const styleSelection =
        styleAttributeFromLookup &&
        selections.find(
          (selection) =>
            selection.attribute?.id === styleAttributeFromLookup.id,
        );

      setSelectedStyleValues(styleSelection?.values || []);

      const aiSelections = selections.filter(
        (selection) => selection.attribute?.id !== styleAttributeFromLookup?.id,
      );

      setAttributeSelections(
        aiSelections.length ? aiSelections : [createEmptyAttributeSelection()],
      );
      setAvailableAttributes(normalizedAttributes);
      setInitialized(true);
    } catch (err: any) {
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

  useEffect(() => {
    const styleAttributeId = styleAttribute?.id;

    if (!open || !styleAttributeId) {
      setStyleValueOptions([]);
      setSelectedStyleValues([]);
      return;
    }

    const loadStyleValues = async () => {
      try {
        setLoadingStyleValues(true);
        const values =
          await attributeService.getAttributeValues(styleAttributeId);
        setStyleValueOptions(values);

        if (!values.length) {
          setSelectedStyleValues([]);
          return;
        }

        setSelectedStyleValues((prev) => {
          const valueById = new Map(values.map((item) => [item.id, item]));
          return prev
            .map((item) => valueById.get(item.id))
            .filter((item): item is AttributeValueLookupItem => Boolean(item));
        });
      } catch (err: any) {
        console.error("Error fetching style values:", err);
        setStyleValueOptions([]);
      } finally {
        setLoadingStyleValues(false);
      }
    };

    void loadStyleValues();
  }, [open, styleAttribute?.id]);

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const filesToUpload = Array.from(files);

    try {
      setUploadingImage(true);
      setError(null);

      const payload: ProductImageUploadPayload[] = filesToUpload.map(
        (file, index) => ({
          file,
          altText: file.name,
          displayOrder: images.length + index,
          isPrimary: images.length === 0 && index === 0,
        }),
      );

      const uploadedMedia = await productService.uploadProductImages(payload);

      const newImages: UnifiedImage[] = uploadedMedia
        .map((media, index) => {
          const file = filesToUpload[index];
          if (!media?.id || !file) return null;

          return {
            temporaryMediaId: media.id,
            file,
            previewUrl: URL.createObjectURL(file),
            altText: file.name,
            displayOrder: images.length + index,
            isPrimary: images.length === 0 && index === 0,
            isExisting: false,
          } as UnifiedImage;
        })
        .filter((item): item is UnifiedImage => Boolean(item));

      if (newImages.length === 0) {
        throw new Error("Không nhận được ID ảnh hợp lệ từ server");
      }

      setImages((prev) => {
        const updated = [...prev, ...newImages];
        setCurrentImageIndex(updated.length - newImages.length);
        return updated;
      });
      showToast(`Đã tải lên ${newImages.length} ảnh thành công`, "success");
    } catch (err: any) {
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

  const handleToggleImageDeletion = (
    imageIndex: number,
    markedForDeletion: boolean,
  ) => {
    setImages((prev) =>
      prev.map((img, idx) =>
        idx === imageIndex ? { ...img, markedForDeletion } : img,
      ),
    );
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
        values: [], // Changed to empty array
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
              values: current.values,
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
              values: current.values,
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
    values: AttributeValueLookupItem[],
  ) => {
    setAttributeSelections((prev) => {
      const updated = [...prev];
      const current = updated[index];
      if (current) {
        updated[index] = {
          attribute: current.attribute,
          values, // Now accept array of values
          valueOptions: current.valueOptions,
          loadingValues: current.loadingValues,
        };
      }
      return updated;
    });
  };

  const handleCreateBrand = async () => {
    const name = newBrandName.trim();
    if (!name) {
      showToast("Nhập tên thương hiệu trước khi tạo", "warning");
      return;
    }

    try {
      setCreatingBrand(true);
      const created = await brandService.createBrand(name);
      setBrands((prev) => appendUniqueById(prev, created));
      setSelectedBrand(created);
      setNewBrandName("");
      refocusInput(brandInputRef.current);
      showToast("Đã tạo thương hiệu mới", "success");
    } catch (err: any) {
      const message = err.message || "Không thể tạo thương hiệu";
      setError(message);
      showToast(message, "error");
    } finally {
      setCreatingBrand(false);
    }
  };

  const handleCreateOlfactoryFamily = async () => {
    const name = newOlfactoryName.trim();
    if (!name) {
      showToast("Nhập tên nhóm hương trước khi tạo", "warning");
      return;
    }

    try {
      setCreatingOlfactory(true);
      const created = await olfactoryService.createOlfactoryFamily(name);
      setOlfactoryOptions((prev) => appendUniqueById(prev, created));
      setSelectedOlfactoryFamilies((prev) => appendUniqueById(prev, created));
      setNewOlfactoryName("");
      refocusInput(olfactoryInputRef.current);
      showToast("Đã tạo nhóm hương mới", "success");
    } catch (err: any) {
      const message = err.message || "Không thể tạo nhóm hương";
      setError(message);
      showToast(message, "error");
    } finally {
      setCreatingOlfactory(false);
    }
  };

  const handleCreateScentNote = async (type: NoteType) => {
    const name = (newScentNoteNames[type] || "").trim();
    if (!name) {
      showToast("Nhập tên nốt hương trước khi tạo", "warning");
      return;
    }

    try {
      setCreatingScentNote(true);
      const created = await scentNoteService.createScentNote(name);
      setScentNoteOptions((prev) => appendUniqueById(prev, created));
      if (type === "Top") {
        setTopNotes((prev) => appendUniqueById(prev, created));
      } else if (type === "Heart") {
        setHeartNotes((prev) => appendUniqueById(prev, created));
      } else {
        setBaseNotes((prev) => appendUniqueById(prev, created));
      }
      setNewScentNoteNames((prev) => ({ ...prev, [type]: "" }));
      refocusInput(scentNoteInputRefs.current[type]);
      showToast("Đã tạo nốt hương mới", "success");
    } catch (err: any) {
      const message = err.message || "Không thể tạo nốt hương";
      setError(message);
      showToast(message, "error");
    } finally {
      setCreatingScentNote(false);
    }
  };

  const handleCreateAttribute = async (index: number) => {
    const name = (newAttributeNamesByIndex[index] || "").trim();
    if (!name) {
      showToast("Nhập tên attribute trước khi tạo", "warning");
      return;
    }

    try {
      setCreatingAttribute(true);
      const created = await attributeService.createAttribute({
        name,
        isVariantLevel: false,
      });
      setAvailableAttributes((prev) => appendUniqueById(prev, created));
      setAttributeSelections((prev) => {
        const updated = [...prev];
        const current = updated[index];
        if (!current) {
          return prev;
        }
        updated[index] = {
          ...current,
          attribute: created,
          values: [],
          valueOptions: [],
          loadingValues: false,
        };
        return updated;
      });
      setNewAttributeNamesByIndex((prev) => ({ ...prev, [index]: "" }));
      refocusInput(attributeInputRefs.current[index] || null);
      showToast("Đã tạo attribute mới", "success");
    } catch (err: any) {
      const message = err.message || "Không thể tạo attribute";
      setError(message);
      showToast(message, "error");
    } finally {
      setCreatingAttribute(false);
    }
  };

  const handleCreateStyleValue = async () => {
    const styleAttributeId = styleAttribute?.id;
    const value = newStyleValueName.trim();
    if (!styleAttributeId) {
      showToast("Chưa có attribute Phong cách", "warning");
      return;
    }
    if (!value) {
      showToast("Nhập giá trị phong cách trước khi tạo", "warning");
      return;
    }

    try {
      setCreatingStyleValue(true);
      const created = await attributeService.createAttributeValue(
        styleAttributeId,
        value,
      );
      setStyleValueOptions((prev) => appendUniqueById(prev, created));
      setSelectedStyleValues((prev) => appendUniqueById(prev, created));
      setNewStyleValueName("");
      refocusInput(styleValueInputRef.current);
      showToast("Đã tạo giá trị phong cách mới", "success");
    } catch (err: any) {
      const message = err.message || "Không thể tạo giá trị phong cách";
      setError(message);
      showToast(message, "error");
    } finally {
      setCreatingStyleValue(false);
    }
  };

  const handleCreateAttributeValue = async (index: number) => {
    const selection = attributeSelections[index];
    const attributeId = selection?.attribute?.id;
    const value = (newAttributeValueNames[index] || "").trim();

    if (!attributeId) {
      showToast("Vui lòng chọn attribute trước", "warning");
      return;
    }
    if (!value) {
      showToast("Nhập giá trị trước khi tạo", "warning");
      return;
    }

    try {
      setCreatingAttributeValues((prev) => ({ ...prev, [index]: true }));
      const created = await attributeService.createAttributeValue(
        attributeId,
        value,
      );

      setAttributeSelections((prev) => {
        const updated = [...prev];
        const current = updated[index];
        if (!current) {
          return prev;
        }
        updated[index] = {
          ...current,
          valueOptions: appendUniqueById(current.valueOptions, created),
          values: appendUniqueById(current.values, created),
        };
        return updated;
      });

      setNewAttributeValueNames((prev) => ({ ...prev, [index]: "" }));
      refocusInput(attributeValueInputRefs.current[index] || null);
      showToast("Đã tạo giá trị mới", "success");
    } catch (err: any) {
      const message = err.message || "Không thể tạo giá trị attribute";
      setError(message);
      showToast(message, "error");
    } finally {
      setCreatingAttributeValues((prev) => ({ ...prev, [index]: false }));
    }
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

    const releaseYearInput = releaseYear.trim();
    const parsedReleaseYear =
      releaseYearInput === "" ? undefined : Number(releaseYearInput);
    if (
      releaseYearInput !== "" &&
      (!Number.isInteger(parsedReleaseYear) || (parsedReleaseYear ?? 0) <= 0)
    ) {
      setError("Năm phát hành phải là số nguyên dương");
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

      const normalizedDescription = normalizeDescription(description);
      const parsedReleaseYear =
        releaseYear.trim() === "" ? undefined : Number(releaseYear.trim());
      const olfactoryFamilyIds = selectedOlfactoryFamilies
        .map((item) => item.id)
        .filter((id): id is number => typeof id === "number");
      const scentNotes = [
        ...topNotes
          .map((item) => item.id)
          .filter((id): id is number => typeof id === "number")
          .map((noteId) => ({ noteId, type: "Top" as NoteType })),
        ...heartNotes
          .map((item) => item.id)
          .filter((id): id is number => typeof id === "number")
          .map((noteId) => ({ noteId, type: "Heart" as NoteType })),
        ...baseNotes
          .map((item) => item.id)
          .filter((id): id is number => typeof id === "number")
          .map((noteId) => ({ noteId, type: "Base" as NoteType })),
      ];

      const aiAttributes = attributeSelections
        .filter(
          (sel) =>
            sel.attribute?.id &&
            sel.values.length > 0 &&
            sel.attribute.id !== styleAttribute?.id,
        )
        .flatMap((sel) =>
          sel.values.map((value) => ({
            attributeId: sel.attribute!.id,
            valueId: value.id,
          })),
        );

      const styleAttributePayload = styleAttribute?.id
        ? selectedStyleValues
            .map((value) => value.id)
            .filter((id): id is number => typeof id === "number")
            .map((valueId) => ({
              attributeId: styleAttribute.id,
              valueId,
            }))
        : [];

      const payload: UpdateProductRequest = {
        name: name.trim(),
        brandId: selectedBrand!.id,
        categoryId: selectedCategory!.id,
        gender: gender || undefined,
        origin: origin.trim(),
        releaseYear: parsedReleaseYear,
        description: normalizedDescription || null,
        olfactoryFamilyIds,
        scentNotes,
        temporaryMediaIdsToAdd:
          temporaryMediaIdsToAdd.length > 0 ? temporaryMediaIdsToAdd : [],
        mediaIdsToDelete: mediaIdsToDelete.length > 0 ? mediaIdsToDelete : [],
        attributes: [...styleAttributePayload, ...aiAttributes],
      };

      await productService.updateProduct(productId, payload);
      showToast("Đã cập nhật sản phẩm thành công", "success");
      onSuccess();
      resetState();
      onClose();
    } catch (err: any) {
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
                      multiple
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
                              {images[currentImageIndex]?.isExisting ? (
                                <FormControlLabel
                                  sx={{ ml: 0.5 }}
                                  control={
                                    <Checkbox
                                      color="error"
                                      size="small"
                                      checked={Boolean(
                                        images[currentImageIndex]
                                          ?.markedForDeletion,
                                      )}
                                      onChange={(e) =>
                                        handleToggleImageDeletion(
                                          currentImageIndex,
                                          e.target.checked,
                                        )
                                      }
                                      disabled={saving}
                                    />
                                  }
                                  label="Đánh dấu xóa"
                                />
                              ) : (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  startIcon={<Trash2 className="w-3 h-3" />}
                                  onClick={() =>
                                    handleRemoveImage(currentImageIndex)
                                  }
                                  disabled={saving}
                                >
                                  Xóa
                                </Button>
                              )}
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
                    inputValue={newBrandName}
                    onInputChange={(_, value) => setNewBrandName(value)}
                    noOptionsText={renderCreateNoOptions(
                      newBrandName,
                      creatingBrand,
                      handleCreateBrand,
                    )}
                    disabled={saving || loadingBrands}
                    loading={loadingBrands}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        inputRef={brandInputRef}
                        label="Thương hiệu"
                        required
                        inputProps={{
                          ...params.inputProps,
                          onKeyDown: (event) => {
                            (
                              params.inputProps.onKeyDown as
                                | ((
                                    e: KeyboardEvent<
                                      HTMLInputElement | HTMLTextAreaElement
                                    >,
                                  ) => void)
                                | undefined
                            )?.(event);
                            handleCreateOnEnter(
                              event,
                              newBrandName,
                              creatingBrand,
                              hasSearchMatch(
                                newBrandName,
                                brands,
                                (item) => item.name,
                              ),
                              handleCreateBrand,
                            );
                          },
                        }}
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

                  <RichTextEditor
                    label="Mô tả"
                    value={description}
                    onChange={setDescription}
                    disabled={saving}
                    minHeight={140}
                    placeholder="Nhập mô tả sản phẩm, có thể in đậm và xuống dòng"
                  />

                  <Box>
                    <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
                      Thông tin hiển thị cho khách hàng
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small" sx={{ tableLayout: "fixed" }}>
                        <TableBody>
                          <TableRow>
                            <TableCell sx={{ width: 180, fontWeight: 600 }}>
                              Giới tính
                            </TableCell>
                            <TableCell>
                              <TextField
                                select
                                fullWidth
                                size="small"
                                value={gender}
                                onChange={(e) =>
                                  setGender(e.target.value as Gender)
                                }
                                disabled={saving}
                              >
                                <MenuItem value="">
                                  <em>Chưa chọn</em>
                                </MenuItem>
                                {GENDER_OPTIONS.map((option) => (
                                  <MenuItem
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </MenuItem>
                                ))}
                              </TextField>
                            </TableCell>
                          </TableRow>

                          <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>
                              Xuất xứ
                            </TableCell>
                            <TableCell>
                              <TextField
                                fullWidth
                                size="small"
                                value={origin}
                                onChange={(e) => setOrigin(e.target.value)}
                                placeholder="VD: Pháp, Mỹ, Italy..."
                                disabled={saving}
                              />
                            </TableCell>
                          </TableRow>

                          <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>
                              Năm phát hành
                            </TableCell>
                            <TableCell>
                              <TextField
                                fullWidth
                                size="small"
                                type="number"
                                value={releaseYear}
                                onChange={(e) =>
                                  setReleaseYear(
                                    e.target.value.replace(/[^\d]/g, ""),
                                  )
                                }
                                placeholder="VD: 2024"
                                disabled={saving}
                                inputProps={{ min: 1, step: 1 }}
                              />
                            </TableCell>
                          </TableRow>

                          <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>
                              Nhóm hương
                            </TableCell>
                            <TableCell>
                              <Autocomplete
                                multiple
                                options={olfactoryOptions}
                                getOptionLabel={(option) => option.name || ""}
                                value={selectedOlfactoryFamilies}
                                onChange={(_, value) =>
                                  setSelectedOlfactoryFamilies(value)
                                }
                                inputValue={newOlfactoryName}
                                onInputChange={(_, value) =>
                                  setNewOlfactoryName(value)
                                }
                                noOptionsText={renderCreateNoOptions(
                                  newOlfactoryName,
                                  creatingOlfactory,
                                  handleCreateOlfactoryFamily,
                                )}
                                loading={loadingOlfactory}
                                disabled={saving}
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    inputRef={olfactoryInputRef}
                                    size="small"
                                    placeholder="Chọn nhóm hương"
                                    inputProps={{
                                      ...params.inputProps,
                                      onKeyDown: (event) => {
                                        (
                                          params.inputProps.onKeyDown as
                                            | ((
                                                e: KeyboardEvent<
                                                  | HTMLInputElement
                                                  | HTMLTextAreaElement
                                                >,
                                              ) => void)
                                            | undefined
                                        )?.(event);
                                        handleCreateOnEnter(
                                          event,
                                          newOlfactoryName,
                                          creatingOlfactory,
                                          hasSearchMatch(
                                            newOlfactoryName,
                                            olfactoryOptions,
                                            (item) => item.name,
                                          ),
                                          handleCreateOlfactoryFamily,
                                        );
                                      },
                                    }}
                                    InputProps={{
                                      ...params.InputProps,
                                      endAdornment: (
                                        <>
                                          {loadingOlfactory ? (
                                            <CircularProgress size={18} />
                                          ) : null}
                                          {params.InputProps.endAdornment}
                                        </>
                                      ),
                                    }}
                                  />
                                )}
                              />
                            </TableCell>
                          </TableRow>

                          <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>
                              Phong cách
                            </TableCell>
                            <TableCell>
                              <Autocomplete
                                multiple
                                options={styleValueOptions}
                                getOptionLabel={(option) => option.value || ""}
                                value={selectedStyleValues}
                                onChange={(_, value) =>
                                  setSelectedStyleValues(value)
                                }
                                inputValue={newStyleValueName}
                                onInputChange={(_, value) =>
                                  setNewStyleValueName(value)
                                }
                                noOptionsText={renderCreateNoOptions(
                                  newStyleValueName,
                                  creatingStyleValue,
                                  handleCreateStyleValue,
                                )}
                                loading={loadingStyleValues}
                                disabled={saving || !styleAttribute}
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    inputRef={styleValueInputRef}
                                    size="small"
                                    inputProps={{
                                      ...params.inputProps,
                                      onKeyDown: (event) => {
                                        (
                                          params.inputProps.onKeyDown as
                                            | ((
                                                e: KeyboardEvent<
                                                  | HTMLInputElement
                                                  | HTMLTextAreaElement
                                                >,
                                              ) => void)
                                            | undefined
                                        )?.(event);
                                        handleCreateOnEnter(
                                          event,
                                          newStyleValueName,
                                          creatingStyleValue,
                                          hasSearchMatch(
                                            newStyleValueName,
                                            styleValueOptions,
                                            (item) => item.value,
                                          ),
                                          handleCreateStyleValue,
                                        );
                                      },
                                    }}
                                    placeholder={
                                      styleAttribute
                                        ? "Chọn phong cách"
                                        : "Chưa tìm thấy thuộc tính Phong cách"
                                    }
                                    InputProps={{
                                      ...params.InputProps,
                                      endAdornment: (
                                        <>
                                          {loadingStyleValues ? (
                                            <CircularProgress size={18} />
                                          ) : null}
                                          {params.InputProps.endAdornment}
                                        </>
                                      ),
                                    }}
                                  />
                                )}
                              />
                            </TableCell>
                          </TableRow>

                          {SCENT_NOTE_ROWS.map((row) => (
                            <TableRow key={row.type}>
                              <TableCell sx={{ fontWeight: 600 }}>
                                {row.label}
                              </TableCell>
                              <TableCell>
                                <Autocomplete
                                  multiple
                                  options={scentNoteOptions}
                                  getOptionLabel={(option) => option.name || ""}
                                  value={
                                    row.type === "Top"
                                      ? topNotes
                                      : row.type === "Heart"
                                        ? heartNotes
                                        : baseNotes
                                  }
                                  inputValue={newScentNoteNames[row.type] || ""}
                                  onInputChange={(_, value) =>
                                    setNewScentNoteNames((prev) => ({
                                      ...prev,
                                      [row.type]: value,
                                    }))
                                  }
                                  noOptionsText={renderCreateNoOptions(
                                    newScentNoteNames[row.type] || "",
                                    creatingScentNote,
                                    () => handleCreateScentNote(row.type),
                                  )}
                                  onChange={(_, value) => {
                                    if (row.type === "Top") {
                                      setTopNotes(value);
                                      return;
                                    }
                                    if (row.type === "Heart") {
                                      setHeartNotes(value);
                                      return;
                                    }
                                    setBaseNotes(value);
                                  }}
                                  loading={loadingScentNotes}
                                  disabled={saving}
                                  renderInput={(params) => (
                                    <TextField
                                      {...params}
                                      inputRef={(node) => {
                                        scentNoteInputRefs.current[row.type] =
                                          node;
                                      }}
                                      size="small"
                                      inputProps={{
                                        ...params.inputProps,
                                        onKeyDown: (event) => {
                                          (
                                            params.inputProps.onKeyDown as
                                              | ((
                                                  e: KeyboardEvent<
                                                    | HTMLInputElement
                                                    | HTMLTextAreaElement
                                                  >,
                                                ) => void)
                                              | undefined
                                          )?.(event);
                                          handleCreateOnEnter(
                                            event,
                                            newScentNoteNames[row.type] || "",
                                            creatingScentNote,
                                            hasSearchMatch(
                                              newScentNoteNames[row.type] || "",
                                              scentNoteOptions,
                                              (item) => item.name,
                                            ),
                                            () =>
                                              handleCreateScentNote(row.type),
                                          );
                                        },
                                      }}
                                      placeholder={`Chọn ${row.label.toLowerCase()}`}
                                      InputProps={{
                                        ...params.InputProps,
                                        endAdornment: (
                                          <>
                                            {loadingScentNotes ? (
                                              <CircularProgress size={18} />
                                            ) : null}
                                            {params.InputProps.endAdornment}
                                          </>
                                        ),
                                      }}
                                    />
                                  )}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>

                  {/* Attributes section */}
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
                      Thuộc tính mở rộng cho AI
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
                          Đang tải thuộc tính...
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
                                  inputValue={
                                    newAttributeNamesByIndex[index] || ""
                                  }
                                  onInputChange={(_, value) =>
                                    setNewAttributeNamesByIndex((prev) => ({
                                      ...prev,
                                      [index]: value,
                                    }))
                                  }
                                  noOptionsText={renderCreateNoOptions(
                                    newAttributeNamesByIndex[index] || "",
                                    creatingAttribute,
                                    () => handleCreateAttribute(index),
                                  )}
                                  disabled={saving}
                                  renderInput={(params) => (
                                    <TextField
                                      {...params}
                                      inputRef={(node) => {
                                        attributeInputRefs.current[index] =
                                          node;
                                      }}
                                      label="Thuộc tính"
                                      size="small"
                                      required
                                      inputProps={{
                                        ...params.inputProps,
                                        onKeyDown: (event) => {
                                          (
                                            params.inputProps.onKeyDown as
                                              | ((
                                                  e: KeyboardEvent<
                                                    | HTMLInputElement
                                                    | HTMLTextAreaElement
                                                  >,
                                                ) => void)
                                              | undefined
                                          )?.(event);
                                          handleCreateOnEnter(
                                            event,
                                            newAttributeNamesByIndex[index] ||
                                              "",
                                            creatingAttribute,
                                            hasSearchMatch(
                                              newAttributeNamesByIndex[index] ||
                                                "",
                                              availableAttributes,
                                              (item) => item.name,
                                            ),
                                            () => handleCreateAttribute(index),
                                          );
                                        },
                                      }}
                                    />
                                  )}
                                />
                                <Autocomplete
                                  multiple
                                  options={selection.valueOptions}
                                  getOptionLabel={(option) =>
                                    option.value || ""
                                  }
                                  value={selection.values}
                                  onChange={(_, newValue) =>
                                    handleValueChange(index, newValue)
                                  }
                                  inputValue={
                                    newAttributeValueNames[index] || ""
                                  }
                                  onInputChange={(_, value) =>
                                    setNewAttributeValueNames((prev) => ({
                                      ...prev,
                                      [index]: value,
                                    }))
                                  }
                                  noOptionsText={
                                    selection.attribute
                                      ? renderCreateNoOptions(
                                          newAttributeValueNames[index] || "",
                                          Boolean(
                                            creatingAttributeValues[index],
                                          ),
                                          () =>
                                            handleCreateAttributeValue(index),
                                        )
                                      : "Vui lòng chọn thuộc tính trước"
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
                                      inputRef={(node) => {
                                        attributeValueInputRefs.current[index] =
                                          node;
                                      }}
                                      label="Giá trị"
                                      size="small"
                                      required
                                      placeholder="Chọn một hoặc nhiều giá trị"
                                      inputProps={{
                                        ...params.inputProps,
                                        onKeyDown: (event) => {
                                          (
                                            params.inputProps.onKeyDown as
                                              | ((
                                                  e: KeyboardEvent<
                                                    | HTMLInputElement
                                                    | HTMLTextAreaElement
                                                  >,
                                                ) => void)
                                              | undefined
                                          )?.(event);
                                          handleCreateOnEnter(
                                            event,
                                            newAttributeValueNames[index] || "",
                                            Boolean(
                                              creatingAttributeValues[index],
                                            ),
                                            hasSearchMatch(
                                              newAttributeValueNames[index] ||
                                                "",
                                              selection.valueOptions,
                                              (item) => item.value,
                                            ),
                                            () =>
                                              handleCreateAttributeValue(index),
                                          );
                                        },
                                      }}
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
                          Thêm thuộc tính
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
