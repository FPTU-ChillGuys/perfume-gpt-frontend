import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Tooltip,
  IconButton,
  Stack,
} from "@mui/material";
import { Search, CheckCircle, Cancel, Visibility } from "@mui/icons-material";
import { AdminLayout } from "../layouts/AdminLayout";
import {
  orderCancelRequestService,
  type OrderCancelRequest,
} from "../services/orderCancelRequestService";
import { useToast } from "../hooks/useToast";

const STATUS_OPTIONS = ["All", "Pending", "Approved", "Rejected"] as const;

const statusColor = (
  s?: string,
): "warning" | "success" | "error" | "default" => {
  if (s === "Pending") return "warning";
  if (s === "Approved") return "success";
  if (s === "Rejected") return "error";
  return "default";
};

const statusLabel = (s?: string) => {
  if (s === "Pending") return "Chờ xử lý";
  if (s === "Approved") return "Đã duyệt";
  if (s === "Rejected") return "Từ chối";
  return s || "—";
};

const formatDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString("vi-VN") : "—";

export const OrderCancelRequestsPage = () => {
  const { showToast } = useToast();

  const [requests, setRequests] = useState<OrderCancelRequest[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [tabIndex, setTabIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Detail + process dialog
  const [selected, setSelected] = useState<OrderCancelRequest | null>(null);
  const [processDialogOpen, setProcessDialogOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(true);
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const statusFilter =
    STATUS_OPTIONS[tabIndex] === "All" ? undefined : STATUS_OPTIONS[tabIndex];

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await orderCancelRequestService.getAll({
        Status: statusFilter as any,
        PageNumber: page + 1,
        PageSize: rowsPerPage,
      });
      setRequests(result.items);
      setTotalCount(result.totalCount);
    } catch (err: any) {
      setError(err?.message || "Không thể tải danh sách yêu cầu hủy");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, page, rowsPerPage]);

  useEffect(() => {
    load();
  }, [load]);

  const openProcess = (req: OrderCancelRequest, approve: boolean) => {
    setSelected(req);
    setIsApproving(approve);
    setNote("");
    setProcessDialogOpen(true);
  };

  const handleProcess = async () => {
    if (!selected?.id) return;
    setIsSaving(true);
    try {
      await orderCancelRequestService.process(selected.id, {
        isApproved: isApproving,
        staffNote: note || null,
      });
      showToast(isApproving ? "Duyệt yêu cầu thành công" : "Từ chối yêu cầu thành công", "success");
      setProcessDialogOpen(false);
      load();
    } catch (err: any) {
      showToast(err?.message || "Xử lý thất bại", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" fontWeight="bold" mb={3}>
          Yêu cầu hủy đơn hàng
        </Typography>

        <Tabs
          value={tabIndex}
          onChange={(_, v) => { setTabIndex(v); setPage(0); }}
          sx={{ mb: 2 }}
        >
          <Tab label="Tất cả" />
          <Tab label="Chờ xử lý" />
          <Tab label="Đã duyệt" />
          <Tab label="Từ chối" />
        </Tabs>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell><strong>Mã đơn</strong></TableCell>
                <TableCell><strong>Khách hàng</strong></TableCell>
                <TableCell><strong>Lý do</strong></TableCell>
                <TableCell><strong>Ngày yêu cầu</strong></TableCell>
                <TableCell><strong>Trạng thái</strong></TableCell>
                <TableCell align="center"><strong>Thao tác</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: "text.secondary" }}>
                    Không có yêu cầu hủy nào
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>
                      <strong>{r.orderId?.substring(0, 8)}</strong>
                    </TableCell>
                    <TableCell>{r.requestedByEmail || "—"}</TableCell>
                    <TableCell sx={{ maxWidth: 200 }}>
                      <Tooltip title={r.reason || ""}>
                        <Typography variant="body2" noWrap>{r.reason || "—"}</Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{formatDate(r.createdAt)}</TableCell>
                    <TableCell>
                      <Chip
                        label={statusLabel(r.status)}
                        color={statusColor(r.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Xem chi tiết">
                        <IconButton
                          size="small"
                          onClick={() => { setSelected(r); setDetailOpen(true); }}
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {r.status === "Pending" && (
                        <>
                          <Tooltip title="Duyệt">
                            <IconButton size="small" color="success" onClick={() => openProcess(r, true)}>
                              <CheckCircle fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Từ chối">
                            <IconButton size="small" color="error" onClick={() => openProcess(r, false)}>
                              <Cancel fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
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

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Chi tiết yêu cầu hủy</DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Stack spacing={1.5}>
              <Box><Typography variant="caption" color="text.secondary">Mã đơn hàng</Typography>
                <Typography fontWeight={600}>{selected.orderId}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">Người yêu cầu</Typography>
                <Typography>{selected.requestedByEmail || "—"}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">Lý do hủy</Typography>
                <Typography>{selected.reason || "—"}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">Ngày yêu cầu</Typography>
                <Typography>{formatDate(selected.createdAt)}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">Trạng thái</Typography>
                <Chip label={statusLabel(selected.status)} color={statusColor(selected.status)} size="small" /></Box>
              {selected.staffNote && (
                <Box><Typography variant="caption" color="text.secondary">Ghi chú xử lý</Typography>
                  <Typography>{selected.staffNote}</Typography></Box>
              )}
              {selected.updatedAt && (
                <Box><Typography variant="caption" color="text.secondary">Ngày xử lý</Typography>
                  <Typography>{formatDate(selected.updatedAt)}</Typography></Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>

      {/* Process Dialog */}
      <Dialog open={processDialogOpen} onClose={() => setProcessDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {isApproving ? "✅ Duyệt yêu cầu hủy" : "❌ Từ chối yêu cầu hủy"}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" mb={2}>
            {isApproving
              ? "Xác nhận duyệt yêu cầu hủy đơn hàng này?"
              : "Xác nhận từ chối yêu cầu hủy đơn hàng này?"}
          </Typography>
          <TextField
            label="Ghi chú (tuỳ chọn)"
            fullWidth
            multiline
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            size="small"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProcessDialogOpen(false)} disabled={isSaving}>Hủy</Button>
          <Button
            variant="contained"
            color={isApproving ? "success" : "error"}
            onClick={handleProcess}
            disabled={isSaving}
          >
            {isSaving ? <CircularProgress size={20} color="inherit" /> : "Xác nhận"}
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
};
