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
  Divider,
} from "@mui/material";
import {
  Search,
  Add,
  Edit,
  Delete,
  LocalOffer,
  Visibility,
  VisibilityOff,
  Person,
  Public,
  ContentCopy,
} from "@mui/icons-material";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import { AdminLayout } from "../layouts/AdminLayout";
import {
  voucherService,
  type VoucherResponse,
  type CreateVoucherRequest,
  type UpdateVoucherRequest,
} from "../services/voucherService";
import { useToast } from "../hooks/useToast";

const formatVND = (value?: number | null) =>
  value != null ? new Intl.NumberFormat("vi-VN").format(value) + "đ" : "—";

const formatDateTimeVN = (dateStr?: string) => {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  date.setHours(date.getHours() + 7);
  const d = date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const t = date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return `${d} ${t}`;
};

const toLocalDatetimeString = (isoDate?: string | null) => {
  if (!isoDate) return "";
  const d = new Date(isoDate);
  d.setHours(d.getHours() + 7);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const fromLocalDatetimeString = (local: string) => {
  if (!local) return "";
  const d = new Date(local);
  d.setHours(d.getHours() - 7);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}:00`;
};

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
  isMemberOnly: boolean;
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
  isMemberOnly: false,
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
  const [editingVoucher, setEditingVoucher] = useState<VoucherResponse | null>(
    null,
  );
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
        IsRegular: true,
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
      discountType:
        (v.discountType as "Percentage" | "FixedAmount") || "Percentage",
      discountValue: v.discountValue || 0,
      applyType: (v.applyType as "Order" | "Product") || "Order",
      requiredPoints: v.requiredPoints ?? 0,
      maxDiscountAmount: v.maxDiscountAmount ?? null,
      minOrderValue: v.minOrderValue ?? 0,
      expiryDate: toLocalDatetimeString(v.expiryDate),
      totalQuantity: v.totalQuantity ?? 100,
      remainingQuantity: v.remainingQuantity ?? 0,
      maxUsagePerUser: v.maxUsagePerUser ?? null,
      isPublic: v.isPublic ?? true,
      isMemberOnly: v.isMemberOnly ?? false,
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
    if (form.discountType === "Percentage" && form.discountValue > 100) {
      showToast("Giảm phần trăm không được vượt quá 100%", "error");
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
      const expiryISO = fromLocalDatetimeString(form.expiryDate);
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
          isMemberOnly: form.isMemberOnly,
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
          isMemberOnly: form.isMemberOnly,
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

  const handleCopyVoucherCode = async (code?: string | null) => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      showToast("Đã sao chép mã voucher", "success");
    } catch {
      showToast("Không thể sao chép mã voucher", "error");
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
              placeholder="Tìm theo mã voucher..."
              size="small"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
              }}
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
              Tạo voucher
            </Button>
          </Box>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TableContainer
          component={Paper}
          sx={{ borderRadius: 2, overflow: "hidden" }}
        >
          <Table size="small">
            <TableHead>
              <TableRow
                sx={{
                  bgcolor: "grey.100",
                  "& th": {
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "text.secondary",
                    borderBottom: "2px solid",
                    borderColor: "divider",
                    py: 1.5,
                    whiteSpace: "nowrap",
                  },
                }}
              >
                <TableCell>Mã</TableCell>
                <TableCell>Loại giảm</TableCell>
                <TableCell>Giá trị</TableCell>
                <TableCell>Giảm tối đa</TableCell>
                <TableCell>Đơn tối thiểu</TableCell>
                <TableCell>Điểm đổi</TableCell>
                <TableCell>Số lượng</TableCell>
                <TableCell>Hạn Dùng</TableCell>
                <TableCell align="center">Đối tượng</TableCell>
                <TableCell align="center">Công khai</TableCell>
                <TableCell align="center">Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={12} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : vouchers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={12}
                    align="center"
                    sx={{ py: 6, color: "text.secondary" }}
                  >
                    <LocalOffer
                      sx={{
                        fontSize: 40,
                        opacity: 0.3,
                        display: "block",
                        mx: "auto",
                        mb: 1,
                      }}
                    />
                    Không có voucher nào
                  </TableCell>
                </TableRow>
              ) : (
                vouchers.map((v) => (
                  <TableRow
                    key={v.id}
                    hover
                    sx={{
                      "&:last-child td": { border: 0 },
                      transition: "background 0.15s",
                    }}
                  >
                    <TableCell>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                      >
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          fontFamily="monospace"
                          sx={{ letterSpacing: "0.04em" }}
                        >
                          {v.code}
                        </Typography>
                        <Tooltip title="Sao chép mã">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleCopyVoucherCode(v.code);
                            }}
                            sx={{ p: 0.25, color: "text.secondary" }}
                          >
                            <ContentCopy sx={{ fontSize: 13 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          v.discountType === "Percentage"
                            ? "Phần trăm"
                            : "Cố định"
                        }
                        size="small"
                        color={
                          v.discountType === "Percentage" ? "info" : "default"
                        }
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.7rem",
                          minWidth: 88,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        color="error.main"
                      >
                        {v.discountType === "Percentage"
                          ? `${v.discountValue}%`
                          : formatVND(v.discountValue)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {v.discountType === "Percentage" && v.maxDiscountAmount
                          ? formatVND(v.maxDiscountAmount)
                          : "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatVND(v.minOrderValue ?? undefined)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {(v.requiredPoints ?? 0) > 0 ? (
                        <Chip
                          label={new Intl.NumberFormat("vi-VN").format(
                            v.requiredPoints ?? 0,
                          )}
                          size="small"
                          color="warning"
                          variant="outlined"
                          sx={{
                            fontWeight: 600,
                            fontSize: "0.7rem",
                            minWidth: 72,
                          }}
                        />
                      ) : (
                        <Typography variant="body2" color="text.disabled">
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 0.25,
                        }}
                      >
                        <Typography variant="body2" fontWeight={600}>
                          {new Intl.NumberFormat("vi-VN").format(
                            v.remainingQuantity ?? 0,
                          )}
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.secondary"
                          >
                            {" "}
                            /{" "}
                            {new Intl.NumberFormat("vi-VN").format(
                              v.totalQuantity ?? 0,
                            )}
                          </Typography>
                        </Typography>
                        <Box
                          sx={{
                            height: 3,
                            borderRadius: 2,
                            bgcolor: "grey.200",
                            overflow: "hidden",
                            width: 60,
                          }}
                        >
                          <Box
                            sx={{
                              height: "100%",
                              width: `${Math.min(100, ((v.remainingQuantity ?? 0) / Math.max(v.totalQuantity ?? 1, 1)) * 100)}%`,
                              bgcolor:
                                (v.remainingQuantity ?? 0) === 0
                                  ? "error.main"
                                  : (v.remainingQuantity ?? 0) /
                                        (v.totalQuantity ?? 1) <
                                      0.2
                                    ? "warning.main"
                                    : "success.main",
                              borderRadius: 2,
                            }}
                          />
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ whiteSpace: "nowrap" }}
                      >
                        {formatDateTimeVN(v.expiryDate)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title={v.isMemberOnly ? "Thành viên" : "Tất cả"}>
                        <Chip
                          icon={
                            v.isMemberOnly ? (
                              <Person sx={{ fontSize: "14px !important" }} />
                            ) : (
                              <Public sx={{ fontSize: "14px !important" }} />
                            )
                          }
                          label={v.isMemberOnly ? "Thành viên" : "Tất cả"}
                          size="small"
                          color={v.isMemberOnly ? "secondary" : "default"}
                          variant="outlined"
                          sx={{ fontSize: "0.68rem", minWidth: 100 }}
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">
                      {v.isPublic ? (
                        <Tooltip title="Công khai">
                          <Chip
                            icon={
                              <Visibility
                                sx={{ fontSize: "14px !important" }}
                              />
                            }
                            label="Công khai"
                            size="small"
                            color="success"
                            variant="outlined"
                            sx={{ fontSize: "0.68rem", minWidth: 96 }}
                          />
                        </Tooltip>
                      ) : (
                        <Tooltip title="Ẩn">
                          <Chip
                            icon={
                              <VisibilityOff
                                sx={{ fontSize: "14px !important" }}
                              />
                            }
                            label="Ẩn"
                            size="small"
                            color="default"
                            variant="outlined"
                            sx={{ fontSize: "0.68rem", minWidth: 96 }}
                          />
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                      <Tooltip title="Chỉnh sửa">
                        <IconButton
                          size="small"
                          onClick={() => openEdit(v)}
                          sx={{
                            color: "primary.main",
                            "&:hover": { bgcolor: "primary.50" },
                          }}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Xóa">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setConfirmDeleteId(v.id!)}
                          sx={{ "&:hover": { bgcolor: "error.50" } }}
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
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle
          sx={{
            px: 3,
            py: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Typography variant="h6" fontWeight={600} component="span">
            {editingVoucher ? "Chỉnh sửa voucher" : "Tạo voucher mới"}
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ px: 3, py: 2.5 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            {/* ── Section 1: Thông tin cơ bản ── */}
            <Box>
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ letterSpacing: 1, fontWeight: 600 }}
              >
                Thông tin cơ bản
              </Typography>
              <Divider sx={{ mt: 0.5, mb: 1.5 }} />
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <TextField
                  label="Mã voucher *"
                  value={form.code}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      code: e.target.value
                        .toUpperCase()
                        .replace(/[^A-Z0-9_-]/g, ""),
                    })
                  }
                  size="small"
                  fullWidth
                  disabled={!!editingVoucher}
                  helperText="Chỉ chứa A-Z, 0-9, _ hoặc -"
                />
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 2,
                  }}
                >
                  <FormControl size="small" fullWidth>
                    <InputLabel>Loại giảm giá</InputLabel>
                    <Select
                      value={form.discountType}
                      label="Loại giảm giá"
                      onChange={(e) =>
                        setForm({
                          ...form,
                          discountType: e.target.value as
                            | "Percentage"
                            | "FixedAmount",
                          discountValue: 0,
                        })
                      }
                    >
                      <MenuItem value="Percentage">Phần trăm (%)</MenuItem>
                      <MenuItem value="FixedAmount">Số tiền cố định</MenuItem>
                    </Select>
                  </FormControl>

                  {form.discountType === "Percentage" ? (
                    <TextField
                      label="Giá trị giảm (%)"
                      value={
                        form.discountValue === 0
                          ? ""
                          : String(form.discountValue)
                      }
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "");
                        const num =
                          raw === "" ? 0 : Math.min(100, parseInt(raw, 10));
                        setForm({ ...form, discountValue: num });
                      }}
                      size="small"
                      inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
                    />
                  ) : (
                    <TextField
                      label="Số tiền giảm"
                      value={
                        form.discountValue
                          ? formatCurrencyInput(form.discountValue)
                          : ""
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          discountValue: parseCurrencyInput(e.target.value),
                        })
                      }
                      size="small"
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">đ</InputAdornment>
                        ),
                      }}
                    />
                  )}
                </Box>

                {form.discountType === "Percentage" && (
                  <TextField
                    label="Giảm tối đa"
                    value={
                      form.maxDiscountAmount != null
                        ? formatCurrencyInput(form.maxDiscountAmount)
                        : ""
                    }
                    onChange={(e) => {
                      const v = parseCurrencyInput(e.target.value);
                      setForm({ ...form, maxDiscountAmount: v || null });
                    }}
                    size="small"
                    fullWidth
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">đ</InputAdornment>
                      ),
                    }}
                  />
                )}
              </Box>
            </Box>

            {/* ── Section 2: Điều kiện áp dụng ── */}
            <Box>
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ letterSpacing: 1, fontWeight: 600 }}
              >
                Điều kiện áp dụng
              </Typography>
              <Divider sx={{ mt: 0.5, mb: 1.5 }} />
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 2,
                  }}
                >
                  <TextField
                    label="Đơn hàng tối thiểu"
                    value={
                      form.minOrderValue
                        ? formatCurrencyInput(form.minOrderValue)
                        : ""
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        minOrderValue: parseCurrencyInput(e.target.value),
                      })
                    }
                    size="small"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">đ</InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    label="Ngày hết hạn *"
                    type="datetime-local"
                    value={form.expiryDate}
                    onChange={(e) =>
                      setForm({ ...form, expiryDate: e.target.value })
                    }
                    size="small"
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: editingVoucher ? "1fr 1fr" : "1fr",
                    gap: 2,
                  }}
                >
                  <TextField
                    label="Tổng số lượng *"
                    value={
                      form.totalQuantity === 0 ? "" : String(form.totalQuantity)
                    }
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      setForm({
                        ...form,
                        totalQuantity: raw === "" ? 0 : parseInt(raw, 10),
                      });
                    }}
                    size="small"
                    inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
                  />
                  {editingVoucher && (
                    <TextField
                      label="Số lượng còn lại"
                      value={
                        form.remainingQuantity === 0
                          ? ""
                          : String(form.remainingQuantity)
                      }
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "");
                        setForm({
                          ...form,
                          remainingQuantity: raw === "" ? 0 : parseInt(raw, 10),
                        });
                      }}
                      size="small"
                      inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
                    />
                  )}
                </Box>
              </Box>
            </Box>

            {/* ── Section 3: Cài đặt nâng cao ── */}
            <Box>
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ letterSpacing: 1, fontWeight: 600 }}
              >
                Cài đặt nâng cao
              </Typography>
              <Divider sx={{ mt: 0.5, mb: 1.5 }} />
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 2,
                }}
              >
                <TextField
                  label="Điểm loyalty cần đổi"
                  value={
                    form.requiredPoints === 0
                      ? ""
                      : formatCurrencyInput(form.requiredPoints)
                  }
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    const pts = raw === "" ? 0 : parseInt(raw, 10);
                    setForm({
                      ...form,
                      requiredPoints: pts,
                      isMemberOnly: pts > 0 ? true : form.isMemberOnly,
                    });
                  }}
                  size="small"
                  inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
                  helperText={
                    form.requiredPoints > 0
                      ? "Tự động giới hạn thành viên"
                      : undefined
                  }
                />
                <TextField
                  label="Số lần/người"
                  value={
                    form.maxUsagePerUser === null
                      ? ""
                      : String(form.maxUsagePerUser)
                  }
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    setForm({
                      ...form,
                      maxUsagePerUser: raw === "" ? null : parseInt(raw, 10),
                    });
                  }}
                  size="small"
                  helperText="Để trống = không giới hạn"
                  inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
                />
              </Box>
            </Box>

            {/* ── Section 4: Đối tượng & Hiển thị ── */}
            <Box>
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ letterSpacing: 1, fontWeight: 600 }}
              >
                Đối tượng & Hiển thị
              </Typography>
              <Divider sx={{ mt: 0.5, mb: 1.5 }} />
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 2,
                }}
              >
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mb: 0.75, display: "block", fontWeight: 500 }}
                  >
                    Đối tượng áp dụng
                  </Typography>
                  <ToggleButtonGroup
                    value={form.isMemberOnly ? "member" : "all"}
                    exclusive
                    onChange={(_, val) => {
                      if (val !== null)
                        setForm({ ...form, isMemberOnly: val === "member" });
                    }}
                    size="small"
                    fullWidth
                  >
                    <ToggleButton value="all" sx={{ flex: 1, fontSize: 12 }}>
                      <Public fontSize="small" sx={{ mr: 0.5 }} />
                      Tất cả
                    </ToggleButton>
                    <ToggleButton value="member" sx={{ flex: 1, fontSize: 12 }}>
                      <Person fontSize="small" sx={{ mr: 0.5 }} />
                      Thành viên
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mb: 0.75, display: "block", fontWeight: 500 }}
                  >
                    Hiển thị
                  </Typography>
                  <ToggleButtonGroup
                    value={form.isPublic ? "public" : "private"}
                    exclusive
                    onChange={(_, val) => {
                      if (val !== null)
                        setForm({ ...form, isPublic: val === "public" });
                    }}
                    size="small"
                    fullWidth
                  >
                    <ToggleButton value="public" sx={{ flex: 1, fontSize: 12 }}>
                      <Visibility fontSize="small" sx={{ mr: 0.5 }} />
                      Công khai
                    </ToggleButton>
                    <ToggleButton
                      value="private"
                      sx={{ flex: 1, fontSize: 12 }}
                    >
                      <VisibilityOff fontSize="small" sx={{ mr: 0.5 }} />
                      Ẩn
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              </Box>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: "1px solid",
            borderColor: "divider",
            gap: 1,
          }}
        >
          <Button
            onClick={() => setDialogOpen(false)}
            disabled={isSaving}
            variant="outlined"
            color="inherit"
          >
            Hủy
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isSaving}
            sx={{ minWidth: 90 }}
          >
            {isSaving ? <CircularProgress size={20} color="inherit" /> : "Lưu"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Delete */}
      <Dialog
        open={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Xác nhận xóa</DialogTitle>
        <DialogContent>
          <Typography>Bạn có chắc muốn xóa voucher này không?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteId(null)}>Hủy</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}
          >
            Xóa
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
};
