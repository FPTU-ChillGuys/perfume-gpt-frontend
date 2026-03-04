import { useState, useEffect } from "react";
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
  FormControlLabel,
  Switch,
} from "@mui/material";
import { X, Plus, Trash2 } from "lucide-react";
import type {
  CreateProductRequest,
  AttributeLookupItem,
  AttributeValueLookupItem,
  ProductImageUploadPayload,
} from "@/types/product";
import { productService } from "@/services/productService";
import { attributeService } from "@/services/attributeService";

interface AttributeSelection {
  attribute: AttributeLookupItem | null | undefined;
  value: AttributeValueLookupItem | null | undefined;
  valueOptions: AttributeValueLookupItem[];
  loadingValues: boolean;
}

interface ImageFormState {
  file: File | null;
  altText: string;
  displayOrder: string;
  isPrimary: boolean;
}

interface CreateProductDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const createEmptyImageForm = (isPrimary = false): ImageFormState => ({
  file: null,
  altText: "",
  displayOrder: "",
  isPrimary,
});

export default function CreateProductDialog({
  open,
  onClose,
  onSuccess,
}: CreateProductDialogProps) {
  const [name, setName] = useState("");
  const [brandId, setBrandId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [imageForms, setImageForms] = useState<ImageFormState[]>([
    createEmptyImageForm(true),
  ]);
  const [attributeSelections, setAttributeSelections] = useState<
    AttributeSelection[]
  >([
    {
      attribute: null,
      value: null,
      valueOptions: [],
      loadingValues: false,
    },
  ]);
  const [availableAttributes, setAvailableAttributes] = useState<
    AttributeLookupItem[]
  >([]);
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchAttributes();
    }
  }, [open]);

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

  const handleAddImageForm = () => {
    setImageForms((prev) => [...prev, createEmptyImageForm()]);
  };

  const handleRemoveImageForm = (index: number) => {
    setImageForms((prev) => {
      if (prev.length === 1) {
        return prev;
      }
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length && !updated.some((img) => img.isPrimary)) {
        updated[0] = { ...updated[0], isPrimary: true };
      }
      return updated;
    });
  };

  const handleImageFileChange = (
    index: number,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0] || null;
    setImageForms((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        file,
      };
      return updated;
    });
    event.target.value = "";
  };

  const handleImageFieldChange = (
    index: number,
    field: keyof Omit<ImageFormState, "file" | "isPrimary">,
    value: string,
  ) => {
    setImageForms((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
  };

  const handlePrimaryChange = (index: number) => {
    setImageForms((prev) =>
      prev.map((form, i) => ({
        ...form,
        isPrimary: i === index,
      })),
    );
  };

  const handleAddAttribute = () => {
    setAttributeSelections([
      ...attributeSelections,
      {
        attribute: null,
        value: null,
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
      value: null,
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
              value: current.value,
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

  const handleSubmit = async () => {
    setError(null);

    if (!name.trim()) {
      setError("Tên sản phẩm là bắt buộc");
      return;
    }

    if (!brandId || parseInt(brandId) <= 0) {
      setError("Brand ID là bắt buộc và phải lớn hơn 0");
      return;
    }

    if (!categoryId || parseInt(categoryId) <= 0) {
      setError("Category ID là bắt buộc và phải lớn hơn 0");
      return;
    }

    try {
      setLoading(true);
      let temporaryMediaIds: string[] = [];
      const uploadableImages = imageForms.filter((form) => form.file);

      if (uploadableImages.length) {
        const payload: ProductImageUploadPayload[] = uploadableImages.map((form, index) => {
          const parsedOrder = parseInt(form.displayOrder, 10);
          return {
            file: form.file!,
            altText: form.altText.trim() || undefined,
            displayOrder: Number.isNaN(parsedOrder) ? index : parsedOrder,
            isPrimary: form.isPrimary,
          };
        });

        const uploaded = await productService.uploadProductImages(payload);
        if (uploaded.length !== uploadableImages.length) {
          throw new Error(
            "Không thể tải lên tất cả ảnh. Vui lòng thử lại.",
          );
        }

        temporaryMediaIds = uploaded
          .map((media) => media.id)
          .filter((id): id is string => Boolean(id));

        if (temporaryMediaIds.length !== uploadableImages.length) {
          throw new Error(
            "Thiếu ID ảnh tạm thời từ phản hồi máy chủ.",
          );
        }
      }

      const request: CreateProductRequest = {
        name: name.trim(),
        brandId: parseInt(brandId),
        categoryId: parseInt(categoryId),
        description: description.trim() || null,
        temporaryMediaIds,
        attributes: attributeSelections
          .filter((sel) => sel.attribute?.id && sel.value?.id)
          .map((sel) => ({
            attributeId: sel.attribute!.id,
            valueId: sel.value!.id,
          })),
      };

      await productService.createProduct(request);
      handleReset();
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Có lỗi xảy ra khi tạo sản phẩm");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setName("");
    setBrandId("");
    setCategoryId("");
    setDescription("");
    setImageForms([createEmptyImageForm(true)]);
    setAttributeSelections([
      {
        attribute: null,
        value: null,
        valueOptions: [],
        loadingValues: false,
      },
    ]);
    setError(null);
  };

  const handleClose = () => {
    if (!loading) {
      handleReset();
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle className="flex items-center justify-between">
        <span>Thêm Sản Phẩm Mới</span>
        <IconButton onClick={handleClose} disabled={loading} size="small">
          <X className="w-5 h-5" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Box className="space-y-4">
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <TextField
            label="Tên sản phẩm"
            fullWidth
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
          />

          <Box className="grid grid-cols-2 gap-4">
            <TextField
              label="Brand ID"
              type="number"
              fullWidth
              required
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              disabled={loading}
              helperText="ID của thương hiệu"
            />

            <TextField
              label="Category ID"
              type="number"
              fullWidth
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={loading}
              helperText="ID của danh mục"
            />
          </Box>

          <TextField
            label="Mô tả"
            fullWidth
            multiline
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
          />

          <Box>
            <Typography variant="subtitle2" className="mb-2">
              Ảnh sản phẩm
            </Typography>
            {imageForms.map((form, index) => (
              <Box
                key={index}
                className="mb-4 p-4 border rounded"
              >
                <Box className="flex flex-col gap-3">
                  <Box className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outlined"
                      size="small"
                      component="label"
                      disabled={loading}
                    >
                      Chọn ảnh
                      <input
                        hidden
                        type="file"
                        accept="image/*"
                        onChange={(event) =>
                          handleImageFileChange(index, event)
                        }
                      />
                    </Button>
                    <Typography variant="body2" color="text.secondary">
                      {form.file ? form.file.name : "Chưa chọn ảnh"}
                    </Typography>
                  </Box>
                  <TextField
                    label="Alt text"
                    fullWidth
                    size="small"
                    value={form.altText}
                    onChange={(e) =>
                      handleImageFieldChange(index, "altText", e.target.value)
                    }
                    disabled={loading}
                  />
                  <Box className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <TextField
                      label="Thứ tự hiển thị"
                      type="number"
                      size="small"
                      value={form.displayOrder}
                      onChange={(e) =>
                        handleImageFieldChange(
                          index,
                          "displayOrder",
                          e.target.value,
                        )
                      }
                      disabled={loading}
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={form.isPrimary}
                          onChange={() => handlePrimaryChange(index)}
                          disabled={loading}
                        />
                      }
                      label="Hình chính"
                    />
                  </Box>
                  <IconButton
                    onClick={() => handleRemoveImageForm(index)}
                    disabled={loading || imageForms.length === 1}
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
              onClick={handleAddImageForm}
              disabled={loading}
              size="small"
            >
              Thêm ảnh
            </Button>
          </Box>

          <Box>
            <Typography variant="subtitle2" className="mb-2">
              Attributes
            </Typography>
            {loadingAttributes ? (
              <Box className="flex items-center justify-center py-4">
                <CircularProgress size={24} />
                <Typography className="ml-2">Đang tải attributes...</Typography>
              </Box>
            ) : (
              <>
                {attributeSelections.map((selection, index) => (
                  <Box key={index} className="mb-4 p-4 border rounded">
                    <Box className="flex items-start gap-2">
                      <Box className="flex-1 space-y-2">
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
                          options={selection.valueOptions}
                          getOptionLabel={(option) => option.value || ""}
                          value={selection.value}
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
                        disabled={loading || attributeSelections.length === 1}
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
                >
                  Thêm Attribute
                </Button>
              </>
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Hủy
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? "Đang tạo..." : "Tạo sản phẩm"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
