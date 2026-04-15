import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Tooltip,
  Chip,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Radio,
  Divider,
  FormControlLabel,
  Switch,
} from "@mui/material";
import {
  Add,
  Delete,
  Star,
  StarBorder,
  Save,
  Close,
  Search,
  ArrowBack,
} from "@mui/icons-material";
import { AdminLayout } from "../layouts/AdminLayout";
import {
  sourcingCatalogService,
  type CatalogItem,
  type VariantLookupItem,
  type CreateCatalogItemRequest,
} from "../services/sourcingCatalogService";
import { useToast } from "../hooks/useToast";
import ConfirmDialog from "../components/common/ConfirmDialog";

interface SupplierCatalogProps {
  supplierId: number;
  supplierName?: string;
}

interface EditingCell {
  id: string;
  field: "negotiatedPrice" | "estimatedLeadTimeDays";
  value: string;
}

const formatCurrency = (value?: number) => {
  if (value == null) return "—";
  return new Intl.NumberFormat("vi-VN").format(value) + " ₫";
};

const formatNumberWithDots = (value: string) => {
  const num = value.replace(/\D/g, "");
  return num.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
};

const parseNumberWithDots = (value: string) => {
  return value.replace(/\./g, "");
};

export const SupplierCatalogPage = ({
  supplierId,
  supplierName,
}: SupplierCatalogProps) => {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [lookupProducts, setLookupProducts] = useState<VariantLookupItem[]>([]);
  const [isLoadingLookup, setIsLoadingLookup] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [newPrice, setNewPrice] = useState("");
  const [newLeadTime, setNewLeadTime] = useState("");
  const [newIsPrimary, setNewIsPrimary] = useState(false);
  const [searchLookup, setSearchLookup] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await sourcingCatalogService.getCatalog(supplierId);
      setCatalog(result);
    } catch (err: any) {
      setError(err?.message || "Không thể tải danh mục");
    } finally {
      setIsLoading(false);
    }
  }, [supplierId]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const handleCellClick = (
    item: CatalogItem,
    field: "negotiatedPrice" | "estimatedLeadTimeDays",
  ) => {
    const currentValue =
      field === "negotiatedPrice"
        ? (item.negotiatedPrice?.toString() ?? "")
        : (item.estimatedLeadTimeDays?.toString() ?? "");

    setEditingCell({
      id: item.id!,
      field,
      value:
        field === "negotiatedPrice"
          ? formatNumberWithDots(currentValue)
          : currentValue,
    });
  };

  const handleCellChange = (value: string) => {
    if (editingCell) {
      setEditingCell({ ...editingCell, value });
    }
  };

  const handleCellSave = async () => {
    if (!editingCell) return;

    const rawValue =
      editingCell.field === "negotiatedPrice"
        ? parseNumberWithDots(editingCell.value)
        : editingCell.value;
    const numValue = parseFloat(rawValue);
    if (isNaN(numValue) || numValue < 0) {
      showToast("Giá trị không hợp lệ", "error");
      setEditingCell(null);
      return;
    }

    setIsSaving(true);
    try {
      // Find current item to get all fields
      const currentItem = catalog.find((item) => item.id === editingCell.id);
      if (!currentItem) {
        showToast("Không tìm thấy item", "error");
        return;
      }

      // Always send both fields as required by API
      const updateBody = {
        negotiatedPrice:
          editingCell.field === "negotiatedPrice"
            ? numValue
            : (currentItem.negotiatedPrice ?? 0),
        estimatedLeadTimeDays:
          editingCell.field === "estimatedLeadTimeDays"
            ? Math.floor(numValue)
            : (currentItem.estimatedLeadTimeDays ?? 0),
      };

      await sourcingCatalogService.update(editingCell.id, updateBody);
      showToast("Cập nhật thành công", "success");
      setEditingCell(null);
      loadCatalog();
    } catch (err: any) {
      showToast(err?.message || "Cập nhật thất bại", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCellCancel = () => {
    setEditingCell(null);
  };

  const handleSetPrimary = async (id: string) => {
    try {
      await sourcingCatalogService.setPrimary(id);
      showToast("Đã đặt nhà cung cấp ưu tiên", "success");
      loadCatalog();
    } catch (err: any) {
      showToast(err?.message || "Thất bại", "error");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await sourcingCatalogService.delete(id);
      showToast("Xóa thành công", "success");
      setConfirmDeleteId(null);
      loadCatalog();
    } catch (err: any) {
      showToast(err?.message || "Xóa thất bại", "error");
    }
  };

  const openAddDialog = async () => {
    setAddDialogOpen(true);
    setSelectedVariantId("");
    setNewPrice("");
    setNewLeadTime("");
    setNewIsPrimary(false);
    setSearchLookup("");
    setIsLoadingLookup(true);
    try {
      const result = await sourcingCatalogService.getLookupVariants(supplierId);
      setLookupProducts(result);
    } catch (err: any) {
      showToast(err?.message || "Không thể tải danh sách sản phẩm", "error");
    } finally {
      setIsLoadingLookup(false);
    }
  };

  const handleAddProduct = async () => {
    if (!selectedVariantId) {
      showToast("Vui lòng chọn sản phẩm", "error");
      return;
    }

    const priceNum = parseFloat(parseNumberWithDots(newPrice));
    const leadTime = parseInt(newLeadTime);

    if (!newPrice || isNaN(priceNum) || priceNum <= 0) {
      showToast("Giá nhập không hợp lệ", "error");
      return;
    }

    if (!newLeadTime || isNaN(leadTime) || leadTime <= 0) {
      showToast("Thời gian giao hàng không hợp lệ", "error");
      return;
    }

    setIsAdding(true);
    try {
      const payload: CreateCatalogItemRequest = {
        productVariantId: selectedVariantId,
        supplierId,
        negotiatedPrice: priceNum,
        estimatedLeadTimeDays: leadTime,
        isPrimary: newIsPrimary,
      };

      await sourcingCatalogService.create(payload);
      showToast("Thêm sản phẩm thành công", "success");
      setAddDialogOpen(false);
      loadCatalog();
    } catch (err: any) {
      showToast(err?.message || "Thêm thất bại", "error");
    } finally {
      setIsAdding(false);
    }
  };

  const filteredLookupProducts = lookupProducts.filter(
    (p) =>
      p.sku.toLowerCase().includes(searchLookup.toLowerCase()) ||
      p.displayName.toLowerCase().includes(searchLookup.toLowerCase()) ||
      p.barcode.toLowerCase().includes(searchLookup.toLowerCase()),
  );

  return (
    <AdminLayout>
      <Box>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={() => navigate("/admin/suppliers")}
            >
              Quay lại
            </Button>
          </Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                Danh mục Nguồn hàng
              </Typography>
              {supplierName && (
                <Typography variant="body2" color="text.secondary">
                  Nhà cung cấp: <strong>{supplierName}</strong>
                </Typography>
              )}
            </Box>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={openAddDialog}
            >
              Thêm sản phẩm
            </Button>
          </Box>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell sx={{ width: 60 }}>
                  <strong>Hình</strong>
                </TableCell>
                <TableCell sx={{ width: 140 }}>
                  <strong>SKU</strong>
                </TableCell>
                <TableCell>
                  <strong>Tên sản phẩm</strong>
                </TableCell>
                <TableCell align="right" sx={{ width: 180 }}>
                  <strong>Giá nhập (₫)</strong>
                </TableCell>
                <TableCell align="center" sx={{ width: 180 }}>
                  <strong>Thời gian giao (ngày)</strong>
                </TableCell>
                <TableCell align="center" sx={{ width: 100 }}>
                  <strong>Ưu tiên</strong>
                </TableCell>
                <TableCell align="center" sx={{ width: 80 }}>
                  <strong>Thao tác</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : catalog.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    align="center"
                    sx={{ py: 4, color: "text.secondary" }}
                  >
                    Chưa có sản phẩm nào trong danh mục
                  </TableCell>
                </TableRow>
              ) : (
                catalog.map((item) => {
                  const isEditingPrice =
                    editingCell?.id === item.id &&
                    editingCell?.field === "negotiatedPrice";
                  const isEditingLeadTime =
                    editingCell?.id === item.id &&
                    editingCell?.field === "estimatedLeadTimeDays";

                  return (
                    <TableRow key={item.id} hover>
                      {/* Image Cell */}
                      <TableCell sx={{ width: 60 }}>
                        {item.primaryImageUrl ? (
                          <Box
                            component="img"
                            src={item.primaryImageUrl}
                            alt={item.variantName || item.variantSku}
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: 1,
                              border: "1px solid",
                              borderColor: "divider",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: 1,
                              border: "1px dashed",
                              borderColor: "divider",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 10,
                              color: "text.disabled",
                            }}
                          >
                            No Img
                          </Box>
                        )}
                      </TableCell>

                      {/* SKU Cell */}
                      <TableCell sx={{ width: 140 }}>
                        <Typography variant="body2" fontFamily="monospace">
                          {item.variantSku}
                        </Typography>
                      </TableCell>

                      {/* Name Cell */}
                      <TableCell>
                        <Typography variant="body2">
                          {item.variantName || item.variantSku}
                        </Typography>
                      </TableCell>

                      {/* Editable Price Cell */}
                      <TableCell
                        align="right"
                        onClick={() =>
                          !isEditingPrice &&
                          handleCellClick(item, "negotiatedPrice")
                        }
                        sx={{
                          width: 180,
                          cursor: isEditingPrice ? "default" : "pointer",
                          "&:hover": {
                            bgcolor: isEditingPrice
                              ? "inherit"
                              : "action.hover",
                          },
                        }}
                      >
                        {isEditingPrice ? (
                          <TextField
                            autoFocus
                            size="small"
                            value={editingCell.value}
                            onChange={(e) =>
                              handleCellChange(
                                formatNumberWithDots(e.target.value),
                              )
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleCellSave();
                              if (e.key === "Escape") handleCellCancel();
                            }}
                            onBlur={handleCellCancel}
                            disabled={isSaving}
                            sx={{ width: "100%" }}
                          />
                        ) : (
                          <Typography variant="body2">
                            {formatCurrency(item.negotiatedPrice)}
                          </Typography>
                        )}
                      </TableCell>

                      {/* Editable Lead Time Cell */}
                      <TableCell
                        align="center"
                        onClick={() =>
                          !isEditingLeadTime &&
                          handleCellClick(item, "estimatedLeadTimeDays")
                        }
                        sx={{
                          width: 180,
                          cursor: isEditingLeadTime ? "default" : "pointer",
                          "&:hover": {
                            bgcolor: isEditingLeadTime
                              ? "inherit"
                              : "action.hover",
                          },
                        }}
                      >
                        {isEditingLeadTime ? (
                          <Box
                            sx={{ display: "flex", justifyContent: "center" }}
                          >
                            <TextField
                              autoFocus
                              size="small"
                              type="number"
                              value={editingCell.value}
                              onChange={(e) => handleCellChange(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleCellSave();
                                if (e.key === "Escape") handleCellCancel();
                              }}
                              onBlur={handleCellCancel}
                              disabled={isSaving}
                              sx={{ width: 100 }}
                            />
                          </Box>
                        ) : (
                          <Chip
                            label={`${item.estimatedLeadTimeDays ?? 0} ngày`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </TableCell>

                      {/* Primary Status */}
                      <TableCell align="center">
                        <Tooltip
                          title={
                            item.isPrimary
                              ? "Nhà cung cấp ưu tiên"
                              : "Đặt làm ưu tiên"
                          }
                        >
                          <IconButton
                            size="small"
                            onClick={() => handleSetPrimary(item.id!)}
                            color={item.isPrimary ? "warning" : "default"}
                          >
                            {item.isPrimary ? <Star /> : <StarBorder />}
                          </IconButton>
                        </Tooltip>
                      </TableCell>

                      {/* Actions */}
                      <TableCell align="center">
                        <Tooltip title="Xóa">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setConfirmDeleteId(item.id!)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Add Product Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Thêm sản phẩm vào danh mục</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField
              placeholder="Tìm theo SKU, tên, barcode..."
              size="small"
              value={searchLookup}
              onChange={(e) => setSearchLookup(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              fullWidth
            />

            {isLoadingLookup ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box
                sx={{
                  maxHeight: 300,
                  overflow: "auto",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                }}
              >
                <List dense>
                  {filteredLookupProducts.length === 0 ? (
                    <ListItem>
                      <ListItemText
                        primary="Không tìm thấy sản phẩm"
                        sx={{ textAlign: "center", color: "text.secondary" }}
                      />
                    </ListItem>
                  ) : (
                    filteredLookupProducts.map((product) => (
                      <ListItemButton
                        key={product.id}
                        onClick={() => setSelectedVariantId(product.id!)}
                        selected={selectedVariantId === product.id}
                      >
                        <Radio
                          checked={selectedVariantId === product.id}
                          size="small"
                          sx={{ mr: 1 }}
                        />
                        <ListItemAvatar>
                          <Avatar
                            src={product.primaryImageUrl || undefined}
                            alt={product.displayName}
                            variant="rounded"
                          />
                        </ListItemAvatar>
                        <ListItemText
                          primary={product.displayName}
                          secondary={
                            <>
                              <Typography
                                component="span"
                                variant="body2"
                                fontFamily="monospace"
                              >
                                SKU: {product.sku}
                              </Typography>
                              {" • "}
                              <Typography component="span" variant="body2">
                                Giá gốc: {formatCurrency(product.basePrice)}
                              </Typography>
                            </>
                          }
                        />
                      </ListItemButton>
                    ))
                  )}
                </List>
              </Box>
            )}

            <Divider />

            <Typography variant="subtitle2" fontWeight="bold">
              Thông tin giá và thời gian giao hàng
            </Typography>

            <TextField
              label="Giá nhập (₫) *"
              size="small"
              value={newPrice}
              onChange={(e) => {
                const input = e.target.value;
                const numOnly = parseNumberWithDots(input);
                if (numOnly === "" || /^\d+$/.test(numOnly)) {
                  setNewPrice(formatNumberWithDots(numOnly));
                }
              }}
              fullWidth
              placeholder="Ví dụ: 100.000"
            />

            <TextField
              label="Thời gian giao hàng (ngày) *"
              type="number"
              size="small"
              value={newLeadTime}
              onChange={(e) => setNewLeadTime(e.target.value)}
              fullWidth
              inputProps={{ min: 1, step: 1 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={newIsPrimary}
                  onChange={(e) => setNewIsPrimary(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body2" fontWeight="medium">
                    Đặt làm nhà cung cấp ưu tiên
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Nếu bật, sản phẩm này sẽ ưu tiên lấy từ nhà cung cấp này
                  </Typography>
                </Box>
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)} disabled={isAdding}>
            Hủy
          </Button>
          <Button
            variant="contained"
            onClick={handleAddProduct}
            disabled={isAdding || !selectedVariantId}
          >
            {isAdding ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              "Xác nhận thêm"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmDeleteId != null}
        title="Xóa sản phẩm khỏi danh mục"
        description="Bạn có chắc muốn xóa sản phẩm này khỏi danh mục nguồn hàng không?"
        confirmText="Xóa"
        onConfirm={() =>
          confirmDeleteId != null && handleDelete(confirmDeleteId)
        }
        onClose={() => setConfirmDeleteId(null)}
      />
    </AdminLayout>
  );
};
