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
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import { AdminLayout } from "../layouts/AdminLayout";
import {
  voucherService,
  type VoucherResponse,
  type CreateVoucherRequest,
  type UpdateVoucherRequest,
} from "../services/voucherService";
import { useToast } from "../hooks/useToast";

const formatVND = (value?: number | null) =>
  value != null
    ? new Intl.NumberFormat("vi-VN").format(value) + "đ"
    : "—";

const formatDate = (dateStr?: string) =>
  dateStr ? new Date(dateStr).toLocaleDateString("vi-VN") : "—";

const parseCurrencyInput = (raw: string): number => {
  return parseInt(raw.replace(/\D/g, ""), 10) || 0;
};

const formatCurrencyInput = (value: number): string => {
  if (!value) return "";
  return new Intl.NumberFormat("vi-VN").format(value);
};

interface VoucherForm {
  code: string;
  discountType: "Percentage" | "FixedAmount";
  discountValue: number;
  applyType: "Order" | "Product";
  requiredPoints: number;
  maxDiscountAmount: number | null;
  minOrderValue: number;
  expiryDate: string;
  totalQuantity: number;
  remainingQuantity: number;
  maxUsagePerUser: number | null;
  isPublic: boolean;
}

const defaultForm: VoucherForm = {
  code: "",
  discountType: "Percentage",
  discountValue: 0,
  applyType: "Order",
  requiredPoints: 0,
  maxDiscountAmount: null,
  minOrderValue: 0,
  expiryDate: "",
  totalQuantity: 100,
  remainingQuantity: 100,
  maxUsagePerUser: null,
  isPublic: true,
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
  const [form, setForm] = useState<VoucherForm>(defaultForm);
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
      discountType: (v.discountType as "Percentage" | "FixedAmount") || "Percentage",
      discountValue: v.discountValue || 0,
      applyType: (v.applyType as "Order" | "Product") || "Order",
      requiredPoints: v.requiredPoints ?? 0,
      maxDiscountAmount: v.maxDiscountAmount ?? null,
      minOrderValue: v.minOrderValue ?? 0,
      expiryDate: v.expiryDate ? v.expiryDate.substring(0, 16) : "",
      totalQuantity: v.totalQuantity ?? 100,
      remainingQuantity: v.remainingQuantity ?? 0,
      maxUsagePerUser: v.maxUsagePerUser ?? null,
      isPublic: v.isPublic ?? true,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.code?.trim()) {
      showToast("Mã voucher không được để trống", "error");
      return;
    }
    if (form.discountValue <= 0) {
      showToast("Giá trị giảm phải lớn hơn 0", "error");
      return;
    }
    if (form.totalQuantity <= 0) {
      showToast("Số lượng phải lớn hơn 0", "error");
      return;
    }
    if (!form.expiryDate) {
      showToast("Vui lòng chọn ngày hết hạn", "error");
      return;
    }
    setIsSaving(true);
    try {
      const expiryISO = new Date(form.expiryDate).toISOString();
      if (editingVoucher?.id) {
        const body: UpdateVoucherRequest = {
          code: form.code,
          discountType: form.discountType,
          discountValue: form.discountValue,
          applyType: form.applyType,
          requiredPoints: form.requiredPoints,
          maxDiscountAmount: form.maxDiscountAmount,
          minOrderValue: form.minOrderValue,
          expiryDate: expiryISO,
          totalQuantity: form.totalQuantity,
          remainingQuantity: form.remainingQuantity,
          maxUsagePerUser: form.maxUsagePerUser,
          isPublic: form.isPublic,
        };
        await voucherService.update(editingVoucher.id, body);
        showToast("Cập nhật voucher thành công", "success");
      } else {
        const body: CreateVoucherRequest = {
          code: form.code,
          discountType: form.discountType,
          discountValue: form.discountValue,
          applyType: form.applyType,
          requiredPoints: form.requiredPoints,
          maxDiscountAmount: form.maxDiscountAmount,
          minOrderValue: form.minOrderValue,
          expiryDate: expiryISO,
          totalQuantity: form.totalQuantity,
          maxUsagePerUser: form.maxUsagePerUser,
          isPublic: form.isPublic,
        };
        await voucherService.create(body);
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
      <Box>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr auto" }, alignItems: "center" }}>
            <TextField
              placeholder="Tìm theo mã voucher..."
              size="small"
              value={searchInput}
              onChange={(e) => { setSearchInput(e.target.value); }}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
              fullWidth
            />
            <Button variant="contained" startIcon={<Add />} onClick={openCreate} sx={{ height: 40 }}>
              Tạo voucher
            </Button>
          </Box>
        </Paper>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell><strong>Mã</strong></TableCell>
                <TableCell><strong>Áp dụng</strong></TableCell>
                <TableCell><strong>Loại giảm</strong></TableCell>
                <TableCell><strong>Giá trị</strong></TableCell>
                <TableCell><strong>Giảm tối đa</strong></TableCell>
                <TableCell><strong>Đơn tối thiểu</strong></TableCell>
                <TableCell><strong>Điểm đổi</strong></TableCell>
                <TableCell><strong>SL còn / tổng</strong></TableCell>
                <TableCell><strong>Hết hạn</strong></TableCell>
                <TableCell><strong>Công khai</strong></TableCell>
                <TableCell><strong>Trạng thái</strong></TableCell>
                <TableCell align="center"><strong>Thao tác</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={12} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : vouchers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} align="center" sx={{ py: 4, color: "text.secondary" }}>
                    Không có voucher nào
                  </TableCell>
                </TableRow>
              ) : (
                vouchers.map((v) => (
                  <TableRow key={v.id} hover>
                    <TableCell><strong>{v.code}</strong></TableCell>
                    <TableCell>
                      <Chip
                        label={v.applyType === "Product" ? "Sản phẩm" : "Đơn hàng"}
                        size="small"
                        variant="outlined"
                        color={v.applyType === "Product" ? "secondary" : "primary"}
                      />
                    </TableCell>
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
                        : formatVND(v.discountValue)}
                    </TableCell>
                    <TableCell>
                      {v.discountType === "Percentage" && v.maxDiscountAmount
                        ? formatVND(v.maxDiscountAmount)
                        : "—"}
                    </TableCell>
                    <TableCell>{formatVND(v.minOrderValue ?? undefined)}</TableCell>
                    <TableCell>{v.requiredPoints ?? 0}</TableCell>
                    <TableCell>
                      {v.remainingQuantity ?? 0} / {v.totalQuantity ?? "∞"}
                    </TableCell>
                    <TableCell>{formatDate(v.expiryDate)}</TableCell>
                    <TableCell>
                      {v.isPublic ? (
                        <Tooltip title="Công khai"><Visibility fontSize="small" color="success" /></Tooltip>
                      ) : (
                        <Tooltip title="Ẩn"><VisibilityOff fontSize="small" color="disabled" /></Tooltip>
                      )}
                    </TableCell>
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
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })}
              size="small"
              disabled={!!editingVoucher}
              helperText="Chỉ chứa A-Z, 0-9, _ hoặc -"
            />
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <FormControl size="small">
                <InputLabel>Loại giảm giá</InputLabel>
                <Select
                  value={form.discountType}
                  label="Loại giảm giá"
                  onChange={(e) => setForm({ ...form, discountType: e.target.value as "Percentage" | "FixedAmount" })}
                >
                  <MenuItem value="Percentage">Phần trăm (%)</MenuItem>
                  <MenuItem value="FixedAmount">Số tiền cố định</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small">
                <InputLabel>Áp dụng cho</InputLabel>
                <Select
                  value={form.applyType}
                  label="Áp dụng cho"
                  onChange={(e) => setForm({ ...form, applyType: e.target.value as "Order" | "Product" })}
                >
                  <MenuItem value="Order">Đơn hàng</MenuItem>
                  <MenuItem value="Product">Sản phẩm</MenuItem>
                </Select>
              </FormControl>
            </Box>
            {form.discountType === "Percentage" ? (
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                <TextField
                  label="Giá trị giảm (%)"
                  type="number"
                  value={form.discountValue || ""}
                  onChange={(e) => setForm({ ...form, discountValue: parseFloat(e.target.value) || 0 })}
                  size="small"
                  inputProps={{ min: 0, max: 100 }}
                />
                <TextField
                  label="Giảm tối đa"
                  value={form.maxDiscountAmount != null ? formatCurrencyInput(form.maxDiscountAmount) : ""}
                  onChange={(e) => {
                    const v = parseCurrencyInput(e.target.value);
                    setForm({ ...form, maxDiscountAmount: v || null });
                  }}
                  size="small"
                  InputProps={{ endAdornment: <InputAdornment position="end">đ</InputAdornment> }}
                />
              </Box>
            ) : (
              <TextField
                label="Số tiền giảm"
                value={form.discountValue ? formatCurrencyInput(form.discountValue) : ""}
                onChange={(e) => setForm({ ...form, discountValue: parseCurrencyInput(e.target.value) })}
                size="small"
                InputProps={{ endAdornment: <InputAdornment position="end">đ</InputAdornment> }}
              />
            )}
            <TextField
              label="Đơn hàng tối thiểu"
              value={form.minOrderValue ? formatCurrencyInput(form.minOrderValue) : ""}
              onChange={(e) => setForm({ ...form, minOrderValue: parseCurrencyInput(e.target.value) })}
              size="small"
              InputProps={{ endAdornment: <InputAdornment position="end">đ</InputAdornment> }}
            />
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <TextField
                label="Điểm loyalty cần đổi"
                type="number"
                value={form.requiredPoints}
                onChange={(e) => setForm({ ...form, requiredPoints: parseInt(e.target.value) || 0 })}
                size="small"
                inputProps={{ min: 0 }}
              />
              <TextField
                label="Số lần/người"
                type="number"
                value={form.maxUsagePerUser ?? ""}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  setForm({ ...form, maxUsagePerUser: isNaN(v) ? null : v });
                }}
                size="small"
                helperText="Để trống = không giới hạn"
              />
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <TextField
                label="Tổng số lượng *"
                type="number"
                value={form.totalQuantity}
                onChange={(e) => setForm({ ...form, totalQuantity: parseInt(e.target.value) || 0 })}
                size="small"
                inputProps={{ min: 1 }}
              />
              {editingVoucher && (
                <TextField
                  label="Số lượng còn lại"
                  type="number"
                  value={form.remainingQuantity}
                  onChange={(e) => setForm({ ...form, remainingQuantity: parseInt(e.target.value) || 0 })}
                  size="small"
                  inputProps={{ min: 0 }}
                />
              )}
            </Box>
            <TextField
              label="Ngày hết hạn *"
              type="datetime-local"
              value={form.expiryDate}
              onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
              size="small"
              InputLabelProps={{ shrink: true }}
            />
            <FormControl size="small">
              <InputLabel>Hiển thị</InputLabel>
              <Select
                value={form.isPublic ? "true" : "false"}
                label="Hiển thị"
                onChange={(e) => setForm({ ...form, isPublic: e.target.value === "true" })}
              >
                <MenuItem value="true">Công khai (khách hàng thấy)</MenuItem>
                <MenuItem value="false">Ẩn (chỉ admin)</MenuItem>
              </Select>
            </FormControl>
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
