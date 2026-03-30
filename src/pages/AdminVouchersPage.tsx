import { useState, useEffect, useCallback } from "react";
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
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  CircularProgress,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import {
  Search,
  Add,
  Edit,
  Delete,
  LocalOffer,
} from "@mui/icons-material";
import { AdminLayout } from "../layouts/AdminLayout";
import {
  voucherService,
  type VoucherResponse,
  type CreateVoucherRequest,
} from "../services/voucherService";
import { useToast } from "../hooks/useToast";

const formatCurrency = (value?: number) =>
  value != null
    ? value.toLocaleString("vi-VN", { style: "currency", currency: "VND" })
    : "—";

const formatDate = (dateStr?: string) =>
  dateStr ? new Date(dateStr).toLocaleDateString("vi-VN") : "—";

const defaultForm: CreateVoucherRequest = {
  code: "",
  description: "",
  discountType: "Percentage",
  discountValue: 0,
  minOrderValue: 0,
  maxUsage: 100,
  startDate: "",
  endDate: "",
};

export const AdminVouchersPage = () => {
  const { showToast } = useToast();

  const [vouchers, setVouchers] = useState<VoucherResponse[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<VoucherResponse | null>(null);
  const [form, setForm] = useState<CreateVoucherRequest>(defaultForm);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadVouchers = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await voucherService.getAll({
        PageNumber: page + 1,
        PageSize: rowsPerPage,
        Code: search || undefined,
      });
      setVouchers(result.items);
      setTotalCount(result.totalCount);
    } catch (err: any) {
      setError(err?.message || "Không thể tải danh sách voucher");
    } finally {
      setIsLoading(false);
    }
  }, [page, rowsPerPage, search]);

  useEffect(() => {
    loadVouchers();
  }, [loadVouchers]);

  // Debounce search input: commit to `search` after 400ms of no typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const openCreate = () => {
    setEditingVoucher(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEdit = (v: VoucherResponse) => {
    setEditingVoucher(v);
    setForm({
      code: v.code || "",
      description: "",
      discountType: (v.discountType as any) || "Percentage",
      discountValue: v.discountValue || 0,
      minOrderValue: v.minOrderValue ?? 0,
      maxUsage: v.totalQuantity || 100,
      startDate: "",
      endDate: v.expiryDate ? v.expiryDate.substring(0, 10) : "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.code?.trim()) {
      showToast("Mã voucher không được để trống", "error");
      return;
    }
    setIsSaving(true);
    try {
      if (editingVoucher?.id) {
        await voucherService.update(editingVoucher.id, form);
        showToast("Cập nhật voucher thành công", "success");
      } else {
        await voucherService.create(form);
        showToast("Tạo voucher thành công", "success");
      }
      setDialogOpen(false);
      loadVouchers();
    } catch (err: any) {
      showToast(err?.message || "Lưu voucher thất bại", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await voucherService.deleteVoucher(id);
      showToast("Xóa voucher thành công", "success");
      setConfirmDeleteId(null);
      loadVouchers();
    } catch (err: any) {
      showToast(err?.message || "Xóa thất bại", "error");
    }
  };

  const getStatusChip = (v: VoucherResponse) => {
    if (v.isExpired) return <Chip label="Hết hạn" color="error" size="small" />;
    const now = new Date();
    const end = v.expiryDate ? new Date(v.expiryDate) : null;
    if (end && end < now) return <Chip label="Hết hạn" color="error" size="small" />;
    return <Chip label="Đang hiệu lực" color="success" size="small" />;
  };

  return (
    <AdminLayout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <LocalOffer color="primary" />
            <Typography variant="h5" fontWeight="bold">Quản lý Voucher</Typography>
          </Box>
          <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
            Tạo voucher
          </Button>
        </Box>

        <Paper sx={{ p: 2, mb: 2 }}>
          <TextField
            placeholder="Tìm theo mã voucher..."
            size="small"
            value={searchInput}
            onChange={(e) => { setSearchInput(e.target.value); }}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
            sx={{ width: 300 }}
          />
        </Paper>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell><strong>Mã</strong></TableCell>
                <TableCell><strong>Mô tả</strong></TableCell>
                <TableCell><strong>Loại giảm</strong></TableCell>
                <TableCell><strong>Giá trị</strong></TableCell>
                <TableCell><strong>Đơn tối thiểu</strong></TableCell>
                <TableCell><strong>Sử dụng</strong></TableCell>
                <TableCell><strong>Hết hạn</strong></TableCell>
                <TableCell><strong>Trạng thái</strong></TableCell>
                <TableCell align="center"><strong>Thao tác</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : vouchers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4, color: "text.secondary" }}>
                    Không có voucher nào
                  </TableCell>
                </TableRow>
              ) : (
                vouchers.map((v) => (
                  <TableRow key={v.id} hover>
                    <TableCell><strong>{v.code}</strong></TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>
                      <Chip
                        label={v.discountType === "Percentage" ? "%" : "VNĐ"}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {v.discountType === "Percentage"
                        ? `${v.discountValue}%`
                        : formatCurrency(v.discountValue)}
                    </TableCell>
                    <TableCell>{formatCurrency(v.minOrderValue ?? undefined)}</TableCell>
                    <TableCell>
                      {(v.totalQuantity ?? 0) - (v.remainingQuantity ?? 0)} / {v.totalQuantity ?? "∞"}
                    </TableCell>
                    <TableCell>{formatDate(v.expiryDate)}</TableCell>
                    <TableCell>{getStatusChip(v)}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="Sửa">
                        <IconButton size="small" onClick={() => openEdit(v)}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Xóa">
                        <IconButton size="small" color="error" onClick={() => setConfirmDeleteId(v.id!)}>
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
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
            labelRowsPerPage="Số hàng:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
          />
        </TableContainer>
      </Box>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingVoucher ? "Sửa voucher" : "Tạo voucher mới"}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField
              label="Mã voucher *"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              size="small"
              disabled={!!editingVoucher}
            />
            <TextField
              label="Mô tả"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              size="small"
              multiline
              rows={2}
            />
            <FormControl size="small">
              <InputLabel>Loại giảm giá</InputLabel>
              <Select
                value={form.discountType}
                label="Loại giảm giá"
                onChange={(e) => setForm({ ...form, discountType: e.target.value as any })}
              >
                <MenuItem value="Percentage">Phần trăm (%)</MenuItem>
                <MenuItem value="FixedAmount">Số tiền cố định (VNĐ)</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label={form.discountType === "Percentage" ? "Giá trị giảm (%)" : "Số tiền giảm (VNĐ)"}
              type="number"
              value={form.discountValue}
              onChange={(e) => setForm({ ...form, discountValue: parseFloat(e.target.value) || 0 })}
              size="small"
            />
            <TextField
              label="Đơn hàng tối thiểu (VNĐ)"
              type="number"
              value={form.minOrderValue}
              onChange={(e) => setForm({ ...form, minOrderValue: parseFloat(e.target.value) || 0 })}
              size="small"
            />
            <TextField
              label="Số lần sử dụng tối đa"
              type="number"
              value={form.maxUsage}
              onChange={(e) => setForm({ ...form, maxUsage: parseInt(e.target.value) || 0 })}
              size="small"
            />
            <TextField
              label="Ngày bắt đầu"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              size="small"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Ngày kết thúc"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={isSaving}>Hủy</Button>
          <Button variant="contained" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <CircularProgress size={20} color="inherit" /> : "Lưu"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Delete */}
      <Dialog open={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Xác nhận xóa</DialogTitle>
        <DialogContent>
          <Typography>Bạn có chắc muốn xóa voucher này không?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteId(null)}>Hủy</Button>
          <Button variant="contained" color="error" onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}>
            Xóa
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
};
