import { useState, useEffect } from "react";
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
} from "@mui/material";
import { X, Plus, Trash2 } from "lucide-react";
import type {
  CreateProductRequest,
  AttributeLookupItem,
  AttributeValueLookupItem,
} from "@/types/product";
import { productService } from "@/services/productService";
import { attributeService } from "@/services/attributeService";

interface AttributeSelection {
  attribute: AttributeLookupItem | null | undefined;
  value: AttributeValueLookupItem | null | undefined;
  valueOptions: AttributeValueLookupItem[];
  loadingValues: boolean;
}

interface CreateProductDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateProductDialog({
  open,
  onClose,
  onSuccess,
}: CreateProductDialogProps) {
  const [name, setName] = useState("");
  const [brandId, setBrandId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [temporaryMediaIds, setTemporaryMediaIds] = useState<string[]>([""]);
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

  const handleAddMediaId = () => {
    setTemporaryMediaIds([...temporaryMediaIds, ""]);
  };

  const handleRemoveMediaId = (index: number) => {
    setTemporaryMediaIds(temporaryMediaIds.filter((_, i) => i !== index));
  };

  const handleMediaIdChange = (index: number, value: string) => {
    const newMediaIds = [...temporaryMediaIds];
    newMediaIds[index] = value;
    setTemporaryMediaIds(newMediaIds);
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

    const request: CreateProductRequest = {
      name: name.trim(),
      brandId: parseInt(brandId),
      categoryId: parseInt(categoryId),
      description: description.trim() || null,
      temporaryMediaIds: temporaryMediaIds.filter((id) => id.trim()),
      attributes: attributeSelections
        .filter((sel) => sel.attribute?.id && sel.value?.id)
        .map((sel) => ({
          attributeId: sel.attribute!.id,
          valueId: sel.value!.id,
        })),
    };

    try {
      setLoading(true);
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
    setTemporaryMediaIds([""]);
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
              Media IDs
            </Typography>
            {temporaryMediaIds.map((mediaId, index) => (
              <Box key={index} className="flex items-center gap-2 mb-2">
                <TextField
                  placeholder="Media ID"
                  fullWidth
                  value={mediaId}
                  onChange={(e) => handleMediaIdChange(index, e.target.value)}
                  disabled={loading}
                  size="small"
                />
                <IconButton
                  onClick={() => handleRemoveMediaId(index)}
                  disabled={loading || temporaryMediaIds.length === 1}
                  size="small"
                  color="error"
                >
                  <Trash2 className="w-4 h-4" />
                </IconButton>
              </Box>
            ))}
            <Button
              startIcon={<Plus className="w-4 h-4" />}
              onClick={handleAddMediaId}
              disabled={loading}
              size="small"
            >
              Thêm Media ID
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
