import { useState, useEffect, useMemo } from "react";
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
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper,
} from "@mui/material";
import {
  X,
  Plus,
  Trash2,
  Upload,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type {
  CreateProductRequest,
  AttributeLookupItem,
  AttributeValueLookupItem,
  ProductImageUploadPayload,
  Gender,
  NoteType,
  OlfactoryLookupItem,
  ScentNoteLookupItem,
} from "@/types/product";
import { productService } from "@/services/productService";
import { attributeService } from "@/services/attributeService";
import { brandService, type BrandLookupItem } from "@/services/brandService";
import { olfactoryService } from "@/services/olfactoryService";
import { scentNoteService } from "@/services/scentNoteService";
import {
  categoryService,
  type CategoryLookupItem,
} from "@/services/categoryService";
import { useToast } from "@/hooks/useToast";
import RichTextEditor from "@/components/common/RichTextEditor";

interface AttributeSelection {
  attribute: AttributeLookupItem | null | undefined;
  values: AttributeValueLookupItem[];
  valueOptions: AttributeValueLookupItem[];
  loadingValues: boolean;
}

interface UploadedImage {
  temporaryMediaId: string;
  file: File;
  previewUrl: string;
  altText: string;
  displayOrder: number;
  isPrimary: boolean;
}

interface CreateProductDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "Male", label: "Nam" },
  { value: "Female", label: "Nữ" },
  { value: "Unisex", label: "Unisex" },
];

const SCENT_NOTE_ROWS: {
  type: NoteType;
  label: string;
}[] = [
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

export default function CreateProductDialog({
  open,
  onClose,
  onSuccess,
}: CreateProductDialogProps) {
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
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [attributeSelections, setAttributeSelections] = useState<
    AttributeSelection[]
  >([
    {
      attribute: null,
      values: [],
      valueOptions: [],
      loadingValues: false,
    },
  ]);

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const normalizeDescription = (input: string) => {
    const container = document.createElement("div");
    container.innerHTML = input || "";
    const text = (container.textContent || "").replace(/\u00a0/g, " ").trim();
    return text ? container.innerHTML.replace(/[\r\n]+/g, "").trim() : "";
  };

  const styleAttribute = useMemo(
    () =>
      availableAttributes.find((attribute) => {
        const name = normalizeSearchText(attribute.name);
        const description = normalizeSearchText(attribute.description);
        const searchable = `${name} ${description}`;
        return (
          searchable.includes("phong cach") || searchable.includes("style")
        );
      }) || null,
    [availableAttributes],
  );

  useEffect(() => {
    if (open) {
      fetchBrands();
      fetchCategories();
      fetchAttributes();
      fetchOlfactoryFamilies();
      fetchScentNotes();
    }
  }, [open]);

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
      } catch (err: any) {
        console.error("Error fetching style values:", err);
        setStyleValueOptions([]);
      } finally {
        setLoadingStyleValues(false);
      }
    };

    void loadStyleValues();
  }, [open, styleAttribute?.id]);

  const fetchBrands = async () => {
    try {
      setLoadingBrands(true);
      const brandsList = await brandService.getBrandsLookup();
      setBrands(brandsList);
    } catch (err: any) {
      console.error("Error fetching brands:", err);
      setError("Không thể tải danh sách thương hiệu");
    } finally {
      setLoadingBrands(false);
    }
  };

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const categoriesList = await categoryService.getCategoriesLookup();
      setCategories(categoriesList);
    } catch (err: any) {
      console.error("Error fetching categories:", err);
      setError("Không thể tải danh sách danh mục");
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchAttributes = async () => {
    try {
      setLoadingAttributes(true);
      const attributes = await attributeService.getAttributes();
      setAvailableAttributes(attributes);
    } catch (err: any) {
      console.error("Error fetching attributes:", err);
      setError("Không thể tải danh sách attributes");
    } finally {
      setLoadingAttributes(false);
    }
  };

  const fetchOlfactoryFamilies = async () => {
    try {
      setLoadingOlfactory(true);
      const options = await olfactoryService.getOlfactoryLookup();
      setOlfactoryOptions(options);
    } catch (err: any) {
      console.error("Error fetching olfactory families:", err);
      setError("Không thể tải nhóm hương");
    } finally {
      setLoadingOlfactory(false);
    }
  };

  const fetchScentNotes = async () => {
    try {
      setLoadingScentNotes(true);
      const options = await scentNoteService.getScentNotesLookup();
      setScentNoteOptions(options);
    } catch (err: any) {
      console.error("Error fetching scent notes:", err);
      setError("Không thể tải danh sách nốt hương");
    } finally {
      setLoadingScentNotes(false);
    }
  };

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
          displayOrder: uploadedImages.length + index,
          isPrimary: uploadedImages.length === 0 && index === 0,
        }),
      );

      const uploadedMedia = await productService.uploadProductImages(payload);

      const newImages: UploadedImage[] = uploadedMedia
        .map((media, index) => {
          const file = filesToUpload[index];
          if (!media?.id || !file) return null;

          return {
            temporaryMediaId: media.id,
            file,
            previewUrl: URL.createObjectURL(file),
            altText: file.name,
            displayOrder: uploadedImages.length + index,
            isPrimary: uploadedImages.length === 0 && index === 0,
          };
        })
        .filter((item): item is UploadedImage => Boolean(item));

      if (newImages.length === 0) {
        throw new Error("Không nhận được ID ảnh hợp lệ từ server");
      }

      setUploadedImages((prev) => {
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

  const handleRemoveImage = (temporaryMediaId: string) => {
    showToast("Đã xóa ảnh", "info");
    setUploadedImages((prev) => {
      const filtered = prev.filter(
        (img) => img.temporaryMediaId !== temporaryMediaId,
      );

      // Revoke object URL to free memory
      const removedImage = prev.find(
        (img) => img.temporaryMediaId === temporaryMediaId,
      );
      if (removedImage) {
        URL.revokeObjectURL(removedImage.previewUrl);
      }

      // If we removed the primary image, set the first remaining image as primary
      if (removedImage?.isPrimary && filtered.length > 0 && filtered[0]) {
        const firstImage = filtered[0];
        filtered[0] = { ...firstImage, isPrimary: true };
      }

      // Adjust current index after removal
      if (currentImageIndex >= filtered.length && filtered.length > 0) {
        setCurrentImageIndex(filtered.length - 1);
      } else if (filtered.length === 0) {
        setCurrentImageIndex(0);
      }

      return filtered;
    });
  };

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) =>
      prev > 0 ? prev - 1 : uploadedImages.length - 1,
    );
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) =>
      prev < uploadedImages.length - 1 ? prev + 1 : 0,
    );
  };

  const handleSetPrimaryImage = (temporaryMediaId: string) => {
    setUploadedImages((prev) =>
      prev.map((img) => ({
        ...img,
        isPrimary: img.temporaryMediaId === temporaryMediaId,
      })),
    );
  };

  const handleAddAttribute = () => {
    setAttributeSelections([
      ...attributeSelections,
      {
        attribute: null,
        values: [],
        valueOptions: [],
        loadingValues: false,
      },
    ]);
  };

  const handleRemoveAttribute = (index: number) => {
    setAttributeSelections(attributeSelections.filter((_, i) => i !== index));
  };

  const handleAttributeChange = async (
    index: number,
    attribute: AttributeLookupItem | null,
  ) => {
    const newSelections = [...attributeSelections];
    newSelections[index] = {
      attribute,
      values: [],
      valueOptions: [],
      loadingValues: !!attribute,
    };
    setAttributeSelections(newSelections);

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
              loadingValues: false,
              valueOptions: values,
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
          values,
          valueOptions: current.valueOptions,
          loadingValues: current.loadingValues,
        };
      }
      return updated;
    });
  };

  const handleSubmit = async () => {
    setError(null);

    if (!name.trim()) {
      showToast("Tên sản phẩm là bắt buộc", "error");
      return;
    }

    if (!selectedBrand?.id) {
      showToast("Vui lòng chọn thương hiệu", "error");
      return;
    }

    if (!selectedCategory?.id) {
      showToast("Vui lòng chọn danh mục", "error");
      return;
    }

    const releaseYearInput = releaseYear.trim();
    const parsedReleaseYear =
      releaseYearInput === "" ? undefined : Number(releaseYearInput);

    if (
      releaseYearInput !== "" &&
      (!Number.isInteger(parsedReleaseYear) || (parsedReleaseYear ?? 0) <= 0)
    ) {
      showToast("Năm phát hành phải là số nguyên dương", "error");
      return;
    }

    try {
      setLoading(true);

      // Collect temporary media IDs from uploaded images
      const temporaryMediaIds = uploadedImages.map(
        (img) => img.temporaryMediaId,
      );

      const parsedOlfactoryFamilyIds = selectedOlfactoryFamilies
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

      const normalizedDescription = normalizeDescription(description);

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

      const request: CreateProductRequest = {
        name: name.trim(),
        brandId: selectedBrand.id,
        categoryId: selectedCategory.id,
        gender: gender || undefined,
        origin: origin.trim(),
        releaseYear: parsedReleaseYear,
        description: normalizedDescription || null,
        olfactoryFamilyIds: parsedOlfactoryFamilyIds,
        temporaryMediaIds,
        scentNotes,
        attributes: [...styleAttributePayload, ...aiAttributes],
      };

      await productService.createProduct(request);
      showToast("Đã tạo sản phẩm thành công", "success");
      handleReset();
      onSuccess();
      onClose();
    } catch (err: any) {
      const errorMessage = err.message || "Có lỗi xảy ra khi tạo sản phẩm";
      setError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
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

    // Clean up image preview URLs
    uploadedImages.forEach((img) => {
      URL.revokeObjectURL(img.previewUrl);
    });
    setUploadedImages([]);

    setAttributeSelections([
      {
        attribute: null,
        values: [],
        valueOptions: [],
        loadingValues: false,
      },
    ]);
    setError(null);
  };

  const handleClose = () => {
    if (!loading && !uploadingImage) {
      handleReset();
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" fontWeight={600}>
            Thêm Sản Phẩm Mới
          </Typography>
          <IconButton
            onClick={handleClose}
            disabled={loading || uploadingImage}
            size="small"
          >
            <X className="w-5 h-5" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
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
                disabled={loading || uploadingImage}
                sx={{ mb: 2, py: 1.5 }}
              >
                {uploadingImage ? "Đang tải lên..." : "Thêm ảnh"}
                <input
                  hidden
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={loading || uploadingImage}
                />
              </Button>

              {/* Image Carousel */}
              <Box>
                {uploadedImages.length === 0 ? (
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
                        image={uploadedImages[currentImageIndex]?.previewUrl}
                        alt={uploadedImages[currentImageIndex]?.altText}
                        sx={{ objectFit: "cover" }}
                      />

                      {/* Navigation arrows */}
                      {uploadedImages.length > 1 && (
                        <>
                          <IconButton
                            onClick={handlePrevImage}
                            disabled={loading}
                            sx={{
                              position: "absolute",
                              left: 8,
                              top: "50%",
                              transform: "translateY(-50%)",
                              bgcolor: "rgba(255, 255, 255, 0.9)",
                              "&:hover": { bgcolor: "rgba(255, 255, 255, 1)" },
                            }}
                          >
                            <ChevronLeft />
                          </IconButton>
                          <IconButton
                            onClick={handleNextImage}
                            disabled={loading}
                            sx={{
                              position: "absolute",
                              right: 8,
                              top: "50%",
                              transform: "translateY(-50%)",
                              bgcolor: "rgba(255, 255, 255, 0.9)",
                              "&:hover": { bgcolor: "rgba(255, 255, 255, 1)" },
                            }}
                          >
                            <ChevronRight />
                          </IconButton>
                        </>
                      )}

                      {/* Image counter */}
                      <Chip
                        label={`${currentImageIndex + 1} / ${uploadedImages.length}`}
                        size="small"
                        sx={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          bgcolor: "rgba(0, 0, 0, 0.6)",
                          color: "white",
                        }}
                      />

                      {/* Primary badge */}
                      {uploadedImages[currentImageIndex]?.isPrimary && (
                        <Chip
                          label="Hình chính"
                          color="primary"
                          size="small"
                          sx={{ position: "absolute", top: 8, left: 8 }}
                        />
                      )}
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
                        </Typography>
                        <Box>
                          {!uploadedImages[currentImageIndex]?.isPrimary && (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<Upload className="w-3 h-3" />}
                              onClick={() =>
                                handleSetPrimaryImage(
                                  uploadedImages[currentImageIndex]!
                                    .temporaryMediaId,
                                )
                              }
                              disabled={loading}
                              sx={{ mr: 1 }}
                            >
                              Đặt làm chính
                            </Button>
                          )}
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<Trash2 className="w-3 h-3" />}
                            onClick={() =>
                              handleRemoveImage(
                                uploadedImages[currentImageIndex]!
                                  .temporaryMediaId,
                              )
                            }
                            disabled={loading}
                          >
                            Xóa
                          </Button>
                        </Box>
                      </Box>
                    </Box>

                    {/* Thumbnail navigation */}
                    {uploadedImages.length > 1 && (
                      <Box
                        sx={{
                          mt: 2,
                          display: "flex",
                          gap: 1,
                          overflowX: "auto",
                          pb: 1,
                        }}
                      >
                        {uploadedImages.map((img, idx) => (
                          <Box
                            key={img.temporaryMediaId}
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
                              opacity: currentImageIndex === idx ? 1 : 0.6,
                              transition: "all 0.2s",
                              "&:hover": { opacity: 1 },
                            }}
                          >
                            <Box
                              component="img"
                              src={img.previewUrl}
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
                disabled={loading}
              />

              <Autocomplete
                options={brands}
                getOptionLabel={(option) => option.name || ""}
                value={selectedBrand}
                onChange={(_, newValue) => setSelectedBrand(newValue)}
                disabled={loading || loadingBrands}
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
                disabled={loading || loadingCategories}
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
                disabled={loading}
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
                            disabled={loading}
                          >
                            <MenuItem value="">
                              <em>Chưa chọn</em>
                            </MenuItem>
                            {GENDER_OPTIONS.map((option) => (
                              <MenuItem key={option.value} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </TextField>
                        </TableCell>
                      </TableRow>

                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Xuất xứ</TableCell>
                        <TableCell>
                          <TextField
                            fullWidth
                            size="small"
                            value={origin}
                            onChange={(e) => setOrigin(e.target.value)}
                            placeholder="VD: France"
                            disabled={loading}
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
                            disabled={loading}
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
                            loading={loadingOlfactory}
                            disabled={loading}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                size="small"
                                placeholder="Chọn nhóm hương"
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
                            loading={loadingStyleValues}
                            disabled={loading || !styleAttribute}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                size="small"
                                placeholder={
                                  styleAttribute
                                    ? "Chọn phong cách"
                                    : "Chưa tìm thấy attribute Phong cách"
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
                              disabled={loading}
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  size="small"
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
                              disabled={loading}
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
                              multiple
                              options={selection.valueOptions}
                              getOptionLabel={(option) => option.value || ""}
                              value={selection.values}
                              onChange={(_, newValue) =>
                                handleValueChange(index, newValue)
                              }
                              disabled={
                                loading ||
                                !selection.attribute ||
                                selection.loadingValues
                              }
                              loading={selection.loadingValues}
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  label="Values"
                                  placeholder="Select values"
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
                              loading || attributeSelections.length === 1
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
                      disabled={loading || loadingAttributes}
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
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={loading || uploadingImage}>
          Hủy
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || uploadingImage}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? "Đang tạo..." : "Tạo sản phẩm"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
