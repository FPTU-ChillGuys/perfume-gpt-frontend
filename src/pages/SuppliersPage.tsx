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
  TablePagination,
  TextField,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Tooltip,
} from "@mui/material";
import { Search, Add, Edit, Delete, Inventory } from "@mui/icons-material";
import { AdminLayout } from "../layouts/AdminLayout";
import {
  supplierService,
  type SupplierDetail,
  type CreateSupplierRequest,
} from "../services/supplierService";
import { useToast } from "../hooks/useToast";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { useDebounce } from "../hooks/useDebounce";

const defaultForm: CreateSupplierRequest = {
  name: "",
  contactEmail: "",
  contactPhone: "",
  address: "",
};

export const SuppliersPage = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [suppliers, setSuppliers] = useState<SupplierDetail[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierDetail | null>(
    null,
  );
  const [form, setForm] = useState<CreateSupplierRequest>(defaultForm);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await supplierService.getAll({
        SearchTerm: debouncedSearch || undefined,
        PageNumber: page + 1,
        PageSize: rowsPerPage,
      });
      setSuppliers(result.items);
      setTotalCount(result.totalCount);
    } catch (err: any) {
      setError(err?.message || "Không thể tải danh sách nhà cung cấp");
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, page, rowsPerPage]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditingSupplier(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEdit = (s: SupplierDetail) => {
    setEditingSupplier(s);
    setForm({
      name: s.name || "",
      contactEmail: s.contactEmail || "",
      contactPhone: s.contactPhone || "",
      address: s.address || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast("Tên nhà cung cấp không được để trống", "error");
      return;
    }
    setIsSaving(true);
    try {
      if (editingSupplier?.id) {
        await supplierService.update(editingSupplier.id, form);
        showToast("Cập nhật thành công", "success");
      } else {
        await supplierService.create(form);
        showToast("Tạo nhà cung cấp thành công", "success");
      }
      setDialogOpen(false);
      load();
    } catch (err: any) {
      showToast(err?.message || "Lưu thất bại", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await supplierService.delete(id);
      showToast("Xóa nhà cung cấp thành công", "success");
      setConfirmDeleteId(null);
      load();
    } catch (err: any) {
      showToast(err?.message || "Xóa thất bại", "error");
    }
  };

  return (
    <AdminLayout>
      <Box>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: { xs: "1fr", md: "1fr auto" },
              alignItems: "center",
            }}
          >
            <TextField
              placeholder="Tìm theo tên..."
              size="small"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              inputProps={{ "aria-label": "Tìm kiếm nhà cung cấp" }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              fullWidth
            />
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={openCreate}
              sx={{ height: 40 }}
            >
              Thêm nhà cung cấp
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
                <TableCell>
                  <strong>Tên nhà cung cấp</strong>
                </TableCell>
                <TableCell>
                  <strong>Email</strong>
                </TableCell>
                <TableCell>
                  <strong>Số điện thoại</strong>
                </TableCell>
                <TableCell>
                  <strong>Địa chỉ</strong>
                </TableCell>
                <TableCell align="center">
                  <strong>Thao tác</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : suppliers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    align="center"
                    sx={{ py: 4, color: "text.secondary" }}
                  >
                    Không có nhà cung cấp nào
                  </TableCell>
                </TableRow>
              ) : (
                suppliers.map((s) => (
                  <TableRow key={s.id} hover>
                    <TableCell>
                      <strong>{s.name}</strong>
                    </TableCell>
                    <TableCell>{s.contactEmail || "—"}</TableCell>
                    <TableCell>{s.contactPhone || "—"}</TableCell>
                    <TableCell>{s.address || "—"}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="Xem Danh mục">
                        <IconButton
                          size="small"
                          aria-label="Xem danh mục sản phẩm"
                          color="primary"
                          onClick={() =>
                            navigate(`/admin/suppliers/${s.id}/catalog`)
                          }
                        >
                          <Inventory fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Sửa">
                        <IconButton
                          size="small"
                          aria-label="Sửa nhà cung cấp"
                          onClick={() => openEdit(s)}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Xóa">
                        <IconButton
                          size="small"
                          aria-label="Xóa nhà cung cấp"
                          color="error"
                          onClick={() => setConfirmDeleteId(s.id!)}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value));
              setPage(0);
            }}
            labelRowsPerPage="Số hàng:"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}-${to} / ${count}`
            }
          />
        </TableContainer>
      </Box>

      {/* Create / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingSupplier ? "Sửa nhà cung cấp" : "Thêm nhà cung cấp"}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField
              label="Tên nhà cung cấp *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              size="small"
              fullWidth
            />
            <TextField
              label="Email liên hệ"
              type="email"
              value={form.contactEmail}
              onChange={(e) =>
                setForm({ ...form, contactEmail: e.target.value })
              }
              size="small"
              fullWidth
            />
            <TextField
              label="Số điện thoại"
              value={form.contactPhone}
              onChange={(e) =>
                setForm({ ...form, contactPhone: e.target.value })
              }
              size="small"
              fullWidth
            />
            <TextField
              label="Địa chỉ"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              size="small"
              fullWidth
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={isSaving}>
            Hủy
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <CircularProgress size={20} color="inherit" /> : "Lưu"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Delete */}
      <ConfirmDialog
        open={confirmDeleteId != null}
        title="Xóa nhà cung cấp"
        description="Bạn có chắc muốn xóa nhà cung cấp này không?"
        confirmText="Xóa"
        onConfirm={() =>
          confirmDeleteId != null && handleDelete(confirmDeleteId)
        }
        onClose={() => setConfirmDeleteId(null)}
      />
    </AdminLayout>
  );
};
