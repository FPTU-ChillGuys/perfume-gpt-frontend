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
  FormControlLabel,
  Switch,
  Checkbox,
} from "@mui/material";
import { X, Plus, Trash2 } from "lucide-react";
import { attributeService } from "@/services/attributeService";
import { productService } from "@/services/productService";
import type {
  AttributeLookupItem,
  AttributeValueLookupItem,
  MediaResponse,
  ProductImageUploadPayload,
  UpdateProductRequest,
} from "@/types/product";

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

interface EditableImage extends MediaResponse {
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

const createEmptyImageForm = (): ImageFormState => ({
  file: null,
  altText: "",
  displayOrder: "",
  isPrimary: false,
});

export default function EditProductDialog({
  open,
  productId,
  onClose,
  onSuccess,
}: EditProductDialogProps) {
  const [name, setName] = useState("");
  const [brandId, setBrandId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [existingImages, setExistingImages] = useState<EditableImage[]>([]);
  const [newImageForms, setNewImageForms] = useState<ImageFormState[]>([
    createEmptyImageForm(),
  ]);
  const [attributeSelections, setAttributeSelections] = useState<
    AttributeSelection[]
  >([createEmptyAttributeSelection()]);
  const [availableAttributes, setAvailableAttributes] = useState<
    AttributeLookupItem[]
  >([]);
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingPrimaryId, setSettingPrimaryId] = useState<string | null>(null);

  const resetState = () => {
    setName("");
    setBrandId("");
    setCategoryId("");
    setDescription("");
    setExistingImages([]);
    setNewImageForms([createEmptyImageForm()]);
    setAttributeSelections([createEmptyAttributeSelection()]);
    setAvailableAttributes([]);
    setError(null);
  };

  const initializeDialog = useCallback(async () => {
    if (!productId) {
      return;
    }
    setInitializing(true);
    setLoadingAttributes(true);
    setError(null);
    try {
      const [attributeLookup, productDetail, images] = await Promise.all([
        attributeService.getAttributes(),
        productService.getProductDetail(productId),
        productService.getProductImages(productId),
      ]);

      if (!productDetail) {
        throw new Error("Không tìm thấy sản phẩm");
      }

      setName(productDetail.name || "");
      setBrandId(
        typeof productDetail.brandId === "number"
          ? productDetail.brandId.toString()
          : "",
      );
      setCategoryId(
        typeof productDetail.categoryId === "number"
          ? productDetail.categoryId.toString()
          : "",
      );
      setDescription(productDetail.description || "");

      const sortedImages = (images || [])
        .slice()
        .sort(
          (a, b) => (a.displayOrder || 0) - (b.displayOrder || 0),
        )
        .map((image) => ({
          ...image,
          markedForDeletion: false,
        }));
      setExistingImages(sortedImages);

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
      setNewImageForms([createEmptyImageForm()]);
    } catch (err: any) {
      console.error("Error loading product for edit:", err);
      setError(err.message || "Không thể tải dữ liệu sản phẩm");
    } finally {
      setInitializing(false);
      setLoadingAttributes(false);
    }
  }, [productId]);

  useEffect(() => {
    if (open && productId) {
      initializeDialog();
    } else if (!open) {
      resetState();
    }
  }, [open, productId, initializeDialog]);

  const handleAddAttribute = () => {
    setAttributeSelections((prev) => [...prev, createEmptyAttributeSelection()]);
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

  const handleToggleImageDeletion = (mediaId?: string) => {
    if (!mediaId) {
      return;
    }
    setExistingImages((prev) =>
      prev.map((image) =>
        image.id === mediaId
          ? { ...image, markedForDeletion: !image.markedForDeletion }
          : image,
      ),
    );
  };

  const handleSetPrimaryImage = async (mediaId?: string) => {
    if (!mediaId) {
      return;
    }
    try {
      setSettingPrimaryId(mediaId);
      await productService.setPrimaryProductImage(mediaId);
      setExistingImages((prev) =>
        prev.map((image) => ({
          ...image,
          isPrimary: image.id === mediaId,
        })),
      );
    } catch (err: any) {
      console.error("Error setting primary image:", err);
      setError(err.message || "Không thể đặt hình chính");
    } finally {
      setSettingPrimaryId(null);
    }
  };

  const handleAddNewImageForm = () => {
    setNewImageForms((prev) => [...prev, createEmptyImageForm()]);
  };

  const handleRemoveNewImageForm = (index: number) => {
    setNewImageForms((prev) => prev.filter((_, i) => i !== index));
  };

  const handleNewImageFileChange = (
    index: number,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0] || null;
    setNewImageForms((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        file,
      };
      return updated;
    });
    event.target.value = "";
  };

  const handleNewImageFieldChange = (
    index: number,
    field: keyof Omit<ImageFormState, "file" | "isPrimary">,
    value: string,
  ) => {
    setNewImageForms((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
  };

  const handleNewImagePrimaryToggle = (
    index: number,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const { checked } = event.target;
    setNewImageForms((prev) =>
      prev.map((form, i) => ({
        ...form,
        isPrimary: checked ? i === index : i === index ? false : form.isPrimary,
      })),
    );
  };

  const validateForm = () => {
    if (!name.trim()) {
      setError("Tên sản phẩm là bắt buộc");
      return false;
    }
    if (!brandId || parseInt(brandId, 10) <= 0) {
      setError("Brand ID là bắt buộc và phải lớn hơn 0");
      return false;
    }
    if (!categoryId || parseInt(categoryId, 10) <= 0) {
      setError("Category ID là bắt buộc và phải lớn hơn 0");
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

      const uploadableImages = newImageForms.filter((form) => form.file);
      let temporaryMediaIdsToAdd: string[] = [];

      if (uploadableImages.length) {
        const payload: ProductImageUploadPayload[] = uploadableImages.map(
          (form, index) => {
            const parsedOrder = parseInt(form.displayOrder, 10);
            return {
              file: form.file!,
              altText: form.altText.trim() || undefined,
              displayOrder: Number.isNaN(parsedOrder) ? index : parsedOrder,
              isPrimary: form.isPrimary,
            };
          },
        );

        const uploaded = await productService.uploadProductImages(payload);
        const ids = uploaded
          .map((media) => media.id)
          .filter((id): id is string => Boolean(id));

        if (ids.length !== uploadableImages.length) {
          throw new Error("Không thể tải lên tất cả ảnh mới");
        }

        temporaryMediaIdsToAdd = ids;
      }

      const mediaIdsToDelete = existingImages
        .filter((image) => image.markedForDeletion && image.id)
        .map((image) => image.id!)
        .filter((id) => !!id);

      const payload: UpdateProductRequest = {
        name: name.trim(),
        brandId: parseInt(brandId, 10),
        categoryId: parseInt(categoryId, 10),
        description: description.trim() || null,
        attributes: attributeSelections
          .filter((sel) => sel.attribute?.id && sel.value?.id)
          .map((sel) => ({
            attributeId: sel.attribute!.id,
            valueId: sel.value!.id,
          })),
      };

      if (temporaryMediaIdsToAdd.length) {
        payload.temporaryMediaIdsToAdd = temporaryMediaIdsToAdd;
      }

      if (mediaIdsToDelete.length) {
        payload.mediaIdsToDelete = mediaIdsToDelete;
      }

      await productService.updateProduct(productId, payload);
      onSuccess();
      resetState();
      onClose();
    } catch (err: any) {
      console.error("Error updating product:", err);
      setError(err.message || "Có lỗi xảy ra khi cập nhật sản phẩm");
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
    <Dialog open={open} onClose={handleDialogClose} maxWidth="md" fullWidth>
      <DialogTitle className="flex items-center justify-between">
        <span>Chỉnh Sửa Sản Phẩm</span>
        <IconButton
          onClick={handleDialogClose}
          disabled={saving || initializing}
          size="small"
        >
          <X className="w-5 h-5" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {!productId ? (
          <Typography variant="body2">
            Vui lòng chọn sản phẩm để chỉnh sửa.
          </Typography>
        ) : initializing ? (
          <Box className="flex items-center justify-center py-6 space-x-2">
            <CircularProgress size={24} />
            <Typography variant="body2">
              Đang tải dữ liệu sản phẩm...
            </Typography>
          </Box>
        ) : (
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
              disabled={saving}
            />

            <Box className="grid grid-cols-2 gap-4">
              <TextField
                label="Brand ID"
                type="number"
                fullWidth
                required
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                disabled={saving}
                helperText="ID của thương hiệu"
              />

              <TextField
                label="Category ID"
                type="number"
                fullWidth
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                disabled={saving}
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
              disabled={saving}
            />

            <Box>
              <Typography variant="subtitle2" className="mb-2">
                Hình hiện tại
              </Typography>
              {existingImages.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Chưa có hình cho sản phẩm này.
                </Typography>
              ) : (
                existingImages.map((image) => (
                  <Box
                    key={image.id}
                    className="flex flex-col md:flex-row gap-3 p-3 border rounded mb-3"
                  >
                    <Box
                      component="img"
                      src={image.url || ""}
                      alt={image.altText || "Product image"}
                      className="w-full md:w-32 h-32 object-cover rounded border"
                    />
                    <Box className="flex-1 space-y-1">
                      <Typography variant="body2">
                        Alt: {image.altText || "Không có"}
                      </Typography>
                      <Typography variant="body2">
                        Thứ tự: {image.displayOrder ?? "-"}
                      </Typography>
                      {image.isPrimary && (
                        <Typography variant="caption" color="primary">
                          Hình chính
                        </Typography>
                      )}
                    </Box>
                    <Box className="flex flex-col gap-2">
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={Boolean(image.markedForDeletion)}
                            onChange={() => handleToggleImageDeletion(image.id)}
                            disabled={saving}
                          />
                        }
                        label="Đánh dấu xoá"
                      />
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleSetPrimaryImage(image.id)}
                        disabled={
                          saving ||
                          !image.id ||
                          image.isPrimary ||
                          Boolean(image.markedForDeletion) ||
                          settingPrimaryId === image.id
                        }
                      >
                        {settingPrimaryId === image.id
                          ? "Đang cập nhật..."
                          : "Đặt làm hình chính"}
                      </Button>
                    </Box>
                  </Box>
                ))
              )}
            </Box>

            <Box>
              <Typography variant="subtitle2" className="mb-2">
                Ảnh mới cần thêm
              </Typography>
              {newImageForms.map((form, index) => (
                <Box key={index} className="mb-4 p-4 border rounded space-y-3">
                  <Box className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outlined"
                      size="small"
                      component="label"
                      disabled={saving}
                    >
                      Chọn ảnh
                      <input
                        hidden
                        type="file"
                        accept="image/*"
                        onChange={(event) =>
                          handleNewImageFileChange(index, event)
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
                      handleNewImageFieldChange(index, "altText", e.target.value)
                    }
                    disabled={saving}
                  />
                  <Box className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <TextField
                      label="Thứ tự hiển thị"
                      type="number"
                      size="small"
                      value={form.displayOrder}
                      onChange={(e) =>
                        handleNewImageFieldChange(
                          index,
                          "displayOrder",
                          e.target.value,
                        )
                      }
                      disabled={saving}
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={form.isPrimary}
                          onChange={(event) =>
                            handleNewImagePrimaryToggle(index, event)
                          }
                          disabled={saving}
                        />
                      }
                      label="Hình chính"
                    />
                  </Box>
                  <IconButton
                    onClick={() => handleRemoveNewImageForm(index)}
                    disabled={saving}
                    size="small"
                    color="error"
                  >
                    <Trash2 className="w-4 h-4" />
                  </IconButton>
                </Box>
              ))}
              <Button
                startIcon={<Plus className="w-4 h-4" />}
                onClick={handleAddNewImageForm}
                disabled={saving}
                size="small"
              >
                Thêm ảnh mới
              </Button>
            </Box>

            <Box>
              <Typography variant="subtitle2" className="mb-2">
                Attributes
              </Typography>
              {loadingAttributes ? (
                <Box className="flex items-center justify-center py-4">
                  <CircularProgress size={24} />
                  <Typography className="ml-2">
                    Đang tải attributes...
                  </Typography>
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
                              `${option.name || "Attribute"}${option.description ? ` (${option.description})` : ""}`
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
                            getOptionLabel={(option) => option.value || ""}
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
                          disabled={saving || attributeSelections.length === 1}
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
                  >
                    Thêm Attribute
                  </Button>
                </>
              )}
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleDialogClose} disabled={saving || initializing}>
          Huỷ
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={saving || initializing || !productId}
        >
          {saving ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
