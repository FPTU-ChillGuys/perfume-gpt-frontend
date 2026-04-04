import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  Checkbox,
} from "@mui/material";
import ImageIcon from "@mui/icons-material/Image";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import { AdminLayout } from "../layouts/AdminLayout";
import {
  orderService,
  type OrderReturnRequest,
  type ReturnRequestStatus,
} from "../services/orderService";
import { useToast } from "../hooks/useToast";
import type { OrderResponse } from "../types/order";

type ReturnTabStatus = "All" | ReturnRequestStatus;

const STATUS_OPTIONS: ReturnTabStatus[] = [
  "All",
  "Pending",
  "ApprovedForReturn",
  "Inspecting",
  "ReadyForRefund",
  "Rejected",
  "Completed",
];

const statusLabel = (status?: string) => {
  if (status === "Pending") return "Chờ duyệt";
  if (status === "ApprovedForReturn") return "Đã duyệt trả";
  if (status === "Inspecting") return "Đang kiểm định";
  if (status === "ReadyForRefund") return "Chờ hoàn tiền";
  if (status === "Rejected") return "Từ chối";
  if (status === "Completed") return "Đã hoàn tất";
  if (status === "Refunded") return "Đã hoàn tiền";
  return status || "-";
};

const returnReasonLabel = (reason?: string | null) => {
  if (!reason) return "-";

  if (reason === "DamagedProduct") return "Hàng bể vỡ / hư hỏng";
  if (reason === "WrongItemReceived") return "Người bán gửi sai hàng";
  if (reason === "ItemNotAsDescribed") return "Hàng không đúng mô tả";
  if (reason === "ChangedMind") return "Đổi ý, không còn nhu cầu";
  if (reason === "AllergicReaction") return "Không phù hợp / kích ứng";

  return reason;
};

const statusColor = (
  status?: string,
): "default" | "warning" | "info" | "success" | "error" => {
  if (status === "Pending") return "warning";
  if (status === "ApprovedForReturn") return "info";
  if (status === "Inspecting") return "info";
  if (status === "ReadyForRefund") return "success";
  if (status === "Rejected") return "error";
  if (status === "Completed") return "success";
  if (status === "Refunded") return "success";
  return "default";
};

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleString("vi-VN") : "-";

const formatCurrency = (value?: number | null) =>
  `${new Intl.NumberFormat("vi-VN").format(Number(value ?? 0))} đ`;

const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const REJECT_REASON_SUGGESTIONS = [
  "Yêu cầu quá thời hạn hỗ trợ đổi trả",
  "Sản phẩm không đủ điều kiện đổi trả theo chính sách",
  "Bằng chứng cung cấp chưa đủ để xác minh",
  "Sản phẩm có dấu hiệu đã qua sử dụng không đúng quy định",
  "Thông tin yêu cầu chưa đầy đủ, vui lòng gửi lại",
];

/* ─── Media Preview ─── */
const isVideoMedia = (url: string, mimeType?: string | null) => {
  if (mimeType?.toLowerCase().startsWith("video/")) {
    return true;
  }

  return /\.(mp4|mov|webm|mkv|avi|m4v)(\?.*)?$/i.test(url);
};

const MediaPreviewDialog = ({
  open,
  mediaUrl,
  mimeType,
  onClose,
}: {
  open: boolean;
  mediaUrl: string;
  mimeType?: string | null;
  onClose: () => void;
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="md">
    <DialogContent sx={{ p: 1 }}>
      {isVideoMedia(mediaUrl, mimeType) ? (
        <Box
          component="video"
          src={mediaUrl}
          controls
          sx={{ maxWidth: "100%", maxHeight: "80vh", display: "block" }}
        />
      ) : (
        <Box
          component="img"
          src={mediaUrl}
          alt="Ảnh minh chứng"
          sx={{ maxWidth: "100%", maxHeight: "80vh", display: "block" }}
        />
      )}
    </DialogContent>
  </Dialog>
);

/* ─── Main Page Component ─── */
export const OrderReturnRequestsPage = () => {
  const { showToast } = useToast();

  const [requests, setRequests] = useState<OrderReturnRequest[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [tabIndex, setTabIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const [detailOpen, setDetailOpen] = useState(false);
  const [refundConfirmOpen, setRefundConfirmOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] =
    useState<OrderReturnRequest | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderResponse | null>(
    null,
  );
  const [isOrderLoading, setIsOrderLoading] = useState(false);

  const [reviewNote, setReviewNote] = useState("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [inspectionStartNote, setInspectionStartNote] = useState("");
  const [inspectionFailNote, setInspectionFailNote] = useState("");
  const [inspectionApprovedRefund, setInspectionApprovedRefund] = useState(0);
  const [inspectionRestocked, setInspectionRestocked] = useState(false);
  const [inspectionResultNote, setInspectionResultNote] = useState("");

  // Image lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxMediaUrl, setLightboxMediaUrl] = useState("");
  const [lightboxMediaMimeType, setLightboxMediaMimeType] = useState<
    string | null
  >(null);

  const statusFilter =
    STATUS_OPTIONS[tabIndex] === "All" ? undefined : STATUS_OPTIONS[tabIndex];

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    requests.forEach((item) => {
      const key = item.status || "Unknown";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [requests]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const result = await orderService.getAllReturnRequests({
        Status: statusFilter,
        PageNumber: page + 1,
        PageSize: rowsPerPage,
        SortBy: "createdAt",
        SortOrder: "desc",
      });
      setRequests(result.items || []);
      setTotalCount(result.totalCount || 0);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải yêu cầu trả hàng",
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, rowsPerPage, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedRequest) {
      setInspectionApprovedRefund(0);
      setInspectionRestocked(false);
      setInspectionResultNote("");
      return;
    }

    setInspectionApprovedRefund(
      toNumber(
        selectedRequest.approvedRefundAmount ??
          selectedRequest.requestedRefundAmount,
      ),
    );
    setInspectionRestocked(Boolean(selectedRequest.isRestocked));
    setInspectionResultNote(selectedRequest.inspectionNote || "");
  }, [selectedRequest]);

  const openDetail = async (request: OrderReturnRequest) => {
    setSelectedRequest(request);
    setSelectedOrder(null);
    setReviewNote("");
    setRejectDialogOpen(false);
    setRejectReason("");
    setInspectionStartNote("");
    setInspectionFailNote("");
    setDetailOpen(true);

    setIsOrderLoading(true);
    try {
      // Fetch the full return request details (list API doesn't include returnDetails)
      if (request.id) {
        const fullRequest = await orderService.getReturnRequestById(request.id);
        setSelectedRequest(fullRequest);
      }

      // Also fetch the order details for additional context
      if (request.orderId) {
        const order = await orderService.getOrderById(request.orderId);
        setSelectedOrder(order);
      }
    } catch (loadError) {
      showToast(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải chi tiết",
        "error",
      );
    } finally {
      setIsOrderLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setSelectedRequest(null);
    setSelectedOrder(null);
    setReviewNote("");
    setRejectDialogOpen(false);
    setRejectReason("");
    setInspectionStartNote("");
    setInspectionFailNote("");
    setInspectionApprovedRefund(0);
    setInspectionRestocked(false);
    setInspectionResultNote("");
  };

  const refreshAfterAction = async (successMessage: string) => {
    showToast(successMessage, "success");
    await load();
    if (selectedRequest?.id) {
      try {
        const fullRequest = await orderService.getReturnRequestById(
          selectedRequest.id,
        );
        setSelectedRequest(fullRequest);
      } catch {
        closeDetail();
      }
    } else {
      closeDetail();
    }
  };

  const handleReview = async (
    isApproved: boolean,
    note?: string | null,
  ): Promise<boolean> => {
    if (!selectedRequest?.id) {
      return false;
    }

    const finalNote = (note ?? reviewNote).trim();

    if (!isApproved && !finalNote) {
      showToast("Vui lòng nhập ghi chú khi từ chối", "warning");
      return false;
    }

    setIsSaving(true);
    try {
      await orderService.reviewReturnRequest(selectedRequest.id, {
        isApproved,
        staffNote: finalNote || null,
      });
      await refreshAfterAction(
        isApproved
          ? "Đã duyệt yêu cầu trả hàng"
          : "Đã từ chối yêu cầu trả hàng",
      );
      return true;
    } catch (actionError) {
      showToast(
        actionError instanceof Error ? actionError.message : "Xử lý thất bại",
        "error",
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const openRejectDialog = () => {
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  const closeRejectDialog = () => {
    if (isSaving) {
      return;
    }
    setRejectDialogOpen(false);
    setRejectReason("");
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) {
      showToast("Vui lòng nhập hoặc chọn lý do từ chối", "warning");
      return;
    }

    const success = await handleReview(false, rejectReason);
    if (success) {
      setRejectDialogOpen(false);
      setRejectReason("");
    }
  };

  const handleStartInspection = async () => {
    if (!selectedRequest?.id) {
      return;
    }

    setIsSaving(true);
    try {
      await orderService.startReturnInspection(selectedRequest.id, {
        inspectionNote: inspectionStartNote.trim() || null,
      });
      await refreshAfterAction("Đã bắt đầu kiểm định");
    } catch (actionError) {
      showToast(
        actionError instanceof Error
          ? actionError.message
          : "Không thể bắt đầu kiểm định",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompleteInspection = async () => {
    if (!selectedRequest?.id) {
      return;
    }

    if (inspectionApprovedRefund < 0) {
      showToast("Số tiền hoàn được duyệt không hợp lệ", "warning");
      return;
    }

    setIsSaving(true);
    try {
      await orderService.completeReturnInspection(selectedRequest.id, {
        approvedRefundAmount: inspectionApprovedRefund,
        isRestocked: inspectionRestocked,
        inspectionNote: inspectionResultNote.trim() || null,
      });
      await refreshAfterAction("Đã hoàn tất kiểm định");
    } catch (actionError) {
      showToast(
        actionError instanceof Error
          ? actionError.message
          : "Không thể hoàn tất kiểm định",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleFailInspection = async () => {
    if (!selectedRequest?.id) {
      return;
    }

    if (!inspectionFailNote.trim()) {
      showToast("Vui lòng nhập lý do từ chối kiểm định", "warning");
      return;
    }

    setIsSaving(true);
    try {
      await orderService.failReturnInspection(selectedRequest.id, {
        note: inspectionFailNote.trim(),
      });
      await refreshAfterAction("Đã từ chối yêu cầu trả hàng");
    } catch (actionError) {
      showToast(
        actionError instanceof Error
          ? actionError.message
          : "Không thể từ chối kiểm định",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefund = () => {
    if (!selectedRequest?.id) {
      return;
    }
    setRefundConfirmOpen(true);
  };

  const executeRefund = async () => {
    if (!selectedRequest?.id) {
      return;
    }

    setIsSaving(true);
    setRefundConfirmOpen(false);
    try {
      await orderService.refundReturnRequest(selectedRequest.id);
      await refreshAfterAction("Đã hoàn tiền cho khách hàng");
    } catch (actionError) {
      showToast(
        actionError instanceof Error
          ? actionError.message
          : "Không thể hoàn tiền",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout>
      <Box>
        <Paper sx={{ mb: 3, overflow: "hidden" }}>
          <Box
            sx={{ borderBottom: "1px solid", borderColor: "divider", px: 2 }}
          >
            <Tabs
              value={tabIndex}
              onChange={(_, value) => {
                setTabIndex(value);
                setPage(0);
              }}
              variant="scrollable"
              scrollButtons="auto"
              TabIndicatorProps={{ style: { backgroundColor: "#ee4d2d" } }}
              sx={{
                "& .MuiTab-root": {
                  textTransform: "none",
                  fontWeight: 500,
                  minWidth: 120,
                },
                "& .Mui-selected": { color: "#ee4d2d !important" },
              }}
            >
              {STATUS_OPTIONS.map((status) => {
                const count =
                  status === "All" ? totalCount : counts.get(status) || 0;
                return (
                  <Tab
                    key={status}
                    label={
                      status === "All" ? (
                        "Tất cả"
                      ) : (
                        <Badge
                          color={statusColor(status)}
                          badgeContent={count > 99 ? "99+" : count}
                          invisible={count <= 0}
                        >
                          <Box component="span" sx={{ pr: 1 }}>
                            {statusLabel(status)}
                          </Box>
                        </Badge>
                      )
                    }
                  />
                );
              })}
            </Tabs>
          </Box>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell>
                  <strong>Mã đơn</strong>
                </TableCell>
                <TableCell>
                  <strong>Khách hàng</strong>
                </TableCell>
                <TableCell>
                  <strong>Lý do</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>Tiền yêu cầu hoàn</strong>
                </TableCell>
                <TableCell>
                  <strong>Ngày yêu cầu</strong>
                </TableCell>
                <TableCell>
                  <strong>Trạng thái</strong>
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
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    align="center"
                    sx={{ py: 4, color: "text.secondary" }}
                  >
                    Không có yêu cầu trả hàng
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((request) => (
                  <TableRow
                    key={request.id}
                    hover
                    sx={{
                      cursor: "pointer",
                      "&:hover": { bgcolor: "rgba(238,77,45,0.04)" },
                    }}
                    onClick={() => {
                      void openDetail(request);
                    }}
                  >
                    <TableCell>
                      <strong>{request.orderId || "-"}</strong>
                    </TableCell>
                    <TableCell>{request.requestedByEmail || "-"}</TableCell>
                    <TableCell sx={{ maxWidth: 240 }}>
                      <Tooltip title={returnReasonLabel(request.reason)}>
                        <Typography variant="body2" noWrap>
                          {returnReasonLabel(request.reason)}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(request.requestedRefundAmount)}
                    </TableCell>
                    <TableCell>{formatDate(request.createdAt)}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={statusLabel(request.status)}
                        color={statusColor(request.status)}
                      />
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
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 20, 30]}
            labelRowsPerPage="Số hàng:"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}-${to} / ${count}`
            }
          />
        </TableContainer>
      </Box>

      {/* ─── Detail Dialog ─── */}
      <Dialog open={detailOpen} onClose={closeDetail} fullWidth maxWidth="lg">
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="h6" fontWeight={700} component="span">
            Chi tiết yêu cầu trả hàng
          </Typography>
          {selectedRequest?.status && (
            <Chip
              size="small"
              label={statusLabel(selectedRequest.status)}
              color={statusColor(selectedRequest.status)}
            />
          )}
        </DialogTitle>
        <DialogContent dividers>
          {!selectedRequest ? null : (
            <Stack spacing={2.5}>
              {/* ─── Request Info Card ─── */}
              <Box
                sx={{
                  p: 2.5,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  bgcolor: "grey.50",
                }}
              >
                <Typography
                  variant="subtitle2"
                  fontWeight={700}
                  mb={2}
                  sx={{ color: "#333" }}
                >
                  Thông tin yêu cầu
                </Typography>
                <Box
                  display="grid"
                  gridTemplateColumns={{ xs: "1fr", md: "1fr 1fr 1fr" }}
                  gap={2}
                >
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Mã yêu cầu
                    </Typography>
                    <Typography
                      fontWeight={700}
                      sx={{ fontFamily: "monospace", fontSize: 13 }}
                    >
                      {selectedRequest.id || "-"}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Mã đơn hàng
                    </Typography>
                    <Typography
                      fontWeight={700}
                      sx={{ fontFamily: "monospace", fontSize: 13 }}
                    >
                      {selectedRequest.orderId || "-"}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Trạng thái
                    </Typography>
                    <Box>
                      <Chip
                        size="small"
                        label={statusLabel(selectedRequest.status)}
                        color={statusColor(selectedRequest.status)}
                      />
                    </Box>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Người yêu cầu
                    </Typography>
                    <Typography>
                      {selectedRequest.requestedByEmail || "-"}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Ngày tạo
                    </Typography>
                    <Typography>
                      {formatDate(selectedRequest.createdAt)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Tiền yêu cầu hoàn
                    </Typography>
                    <Typography fontWeight={700} color="#ee4d2d">
                      {formatCurrency(selectedRequest.requestedRefundAmount)}
                    </Typography>
                  </Box>
                  {selectedRequest.approvedRefundAmount != null &&
                    selectedRequest.approvedRefundAmount > 0 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Tiền được duyệt hoàn
                        </Typography>
                        <Typography fontWeight={700} color="success.main">
                          {formatCurrency(selectedRequest.approvedRefundAmount)}
                        </Typography>
                      </Box>
                    )}
                  {selectedRequest.processedByName && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Người xử lý
                      </Typography>
                      <Typography>{selectedRequest.processedByName}</Typography>
                    </Box>
                  )}
                  {selectedRequest.inspectedByName && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Người kiểm định
                      </Typography>
                      <Typography>{selectedRequest.inspectedByName}</Typography>
                    </Box>
                  )}
                  {selectedRequest.updatedAt && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Cập nhật lần cuối
                      </Typography>
                      <Typography>
                        {formatDate(selectedRequest.updatedAt)}
                      </Typography>
                    </Box>
                  )}
                </Box>

                <Box mt={2}>
                  <Typography variant="caption" color="text.secondary">
                    Lý do trả hàng
                  </Typography>
                  <Typography>
                    {returnReasonLabel(selectedRequest.reason)}
                  </Typography>
                </Box>

                {selectedRequest.customerNote && (
                  <Box mt={1}>
                    <Typography variant="caption" color="text.secondary">
                      Ghi chú khách hàng
                    </Typography>
                    <Typography>{selectedRequest.customerNote}</Typography>
                  </Box>
                )}

                {selectedRequest.staffNote && (
                  <Box mt={1}>
                    <Typography variant="caption" color="text.secondary">
                      Ghi chú nhân viên
                    </Typography>
                    <Typography>{selectedRequest.staffNote}</Typography>
                  </Box>
                )}

                {selectedRequest.inspectionNote && (
                  <Box mt={1}>
                    <Typography variant="caption" color="text.secondary">
                      Ghi chú kiểm định
                    </Typography>
                    <Typography>{selectedRequest.inspectionNote}</Typography>
                  </Box>
                )}
              </Box>

              {/* ─── Product Items (Card Style) ─── */}
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" fontWeight={700} mb={1.5}>
                  Sản phẩm trong đơn
                </Typography>
                <Stack spacing={0} divider={<Divider />}>
                  {(selectedOrder?.orderDetails || []).map((item, index) => {
                    const quantity = toNumber(item.quantity);
                    const unitPrice = toNumber(item.unitPrice);
                    const name = item.variantName || `Sản phẩm ${index + 1}`;
                    const imageUrl = item.imageUrl || null;
                    const total = unitPrice * quantity;

                    return (
                      <Box
                        key={item.id || index}
                        sx={{
                          py: 1.5,
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 2,
                          }}
                        >
                          <Box
                            sx={{
                              flex: 1,
                              display: "flex",
                              flexDirection: "column",
                              gap: 1.5,
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                              }}
                            >
                              {/* Product Image */}
                              {imageUrl ? (
                                <Box
                                  component="img"
                                  src={imageUrl}
                                  alt={name}
                                  sx={{
                                    width: 72,
                                    height: 72,
                                    borderRadius: 1.5,
                                    objectFit: "cover",
                                    border: "1px solid",
                                    borderColor: "divider",
                                    flexShrink: 0,
                                  }}
                                />
                              ) : (
                                <Box
                                  sx={{
                                    width: 72,
                                    height: 72,
                                    borderRadius: 1.5,
                                    bgcolor: "grey.100",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    border: "1px solid",
                                    borderColor: "divider",
                                    flexShrink: 0,
                                  }}
                                >
                                  <ImageIcon
                                    sx={{ color: "grey.400", fontSize: 28 }}
                                  />
                                </Box>
                              )}

                              {/* Product Info */}
                              <Box flex={1} minWidth={0}>
                                <Typography
                                  variant="body2"
                                  fontWeight={600}
                                  sx={{
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                  }}
                                >
                                  {name}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  Số lượng: {quantity}
                                </Typography>
                                {unitPrice > 0 && (
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    display="block"
                                  >
                                    Đơn giá: {formatCurrency(unitPrice)}
                                  </Typography>
                                )}
                              </Box>

                              {/* Price */}
                              {total > 0 && (
                                <Typography
                                  variant="body1"
                                  fontWeight={700}
                                  color="#ee4d2d"
                                  sx={{ flexShrink: 0, whiteSpace: "nowrap" }}
                                >
                                  {formatCurrency(total)}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </Box>
                      </Box>
                    );
                  })}
                  {!(selectedOrder?.orderDetails || []).length && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ py: 1 }}
                    >
                      Không tải được chi tiết sản phẩm của đơn hàng.
                    </Typography>
                  )}
                </Stack>

                {/* Total */}
                {selectedRequest.requestedRefundAmount != null &&
                  selectedRequest.requestedRefundAmount > 0 && (
                    <Box
                      display="flex"
                      justifyContent="flex-end"
                      alignItems="center"
                      mt={1.5}
                      pt={1.5}
                      sx={{
                        borderTop: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      <Typography variant="body2" color="text.secondary" mr={2}>
                        Tổng tiền yêu cầu hoàn:
                      </Typography>
                      <Typography
                        variant="subtitle1"
                        fontWeight={700}
                        color="#ee4d2d"
                      >
                        {formatCurrency(selectedRequest.requestedRefundAmount)}
                      </Typography>
                    </Box>
                  )}
              </Paper>

              {/* ─── Proof Images ─── */}
              {selectedRequest.proofImages &&
                selectedRequest.proofImages.length > 0 && (
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700} mb={1.5}>
                      Ảnh/Video minh chứng ({selectedRequest.proofImages.length}
                      )
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={1}
                      flexWrap="wrap"
                      useFlexGap
                    >
                      {selectedRequest.proofImages.map((img, imgIndex) =>
                        img.url ? (
                          <Box
                            key={img.id || imgIndex}
                            onClick={() => {
                              setLightboxMediaUrl(img.url!);
                              setLightboxMediaMimeType(img.mimeType ?? null);
                              setLightboxOpen(true);
                            }}
                            sx={{
                              cursor: "pointer",
                              borderRadius: 1.5,
                              overflow: "hidden",
                              border: "2px solid",
                              borderColor: "divider",
                              transition: "all 0.2s",
                              "&:hover": {
                                borderColor: "#ee4d2d",
                                transform: "scale(1.03)",
                                boxShadow: 2,
                              },
                              position: "relative",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              bgcolor: "grey.100",
                            }}
                          >
                            {isVideoMedia(img.url, img.mimeType) ? (
                              <>
                                <Box
                                  component="video"
                                  src={img.url}
                                  muted
                                  playsInline
                                  preload="metadata"
                                  sx={{
                                    width: 100,
                                    height: 100,
                                    objectFit: "cover",
                                    display: "block",
                                  }}
                                />
                                <PlayCircleOutlineIcon
                                  sx={{
                                    fontSize: 36,
                                    color: "common.white",
                                    position: "absolute",
                                    top: "50%",
                                    left: "50%",
                                    transform: "translate(-50%, -50%)",
                                    textShadow: "0 2px 8px rgba(0,0,0,0.45)",
                                  }}
                                />
                                <Typography
                                  variant="caption"
                                  sx={{
                                    position: "absolute",
                                    bottom: 4,
                                    left: 0,
                                    right: 0,
                                    textAlign: "center",
                                    color: "common.white",
                                    bgcolor: "rgba(0,0,0,0.45)",
                                  }}
                                >
                                  Video
                                </Typography>
                              </>
                            ) : (
                              <Box
                                component="img"
                                src={img.url}
                                alt={img.altText || `Ảnh ${imgIndex + 1}`}
                                sx={{
                                  width: 100,
                                  height: 100,
                                  objectFit: "cover",
                                  display: "block",
                                }}
                              />
                            )}
                          </Box>
                        ) : null,
                      )}
                    </Stack>
                  </Paper>
                )}

              {isOrderLoading && (
                <Box textAlign="center" py={1}>
                  <CircularProgress size={24} />
                </Box>
              )}

              {/* ─── Pending: Review ─── */}
              {selectedRequest.status === "Pending" && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700} mb={1.5}>
                    Duyệt yêu cầu
                  </Typography>
                  <Stack
                    direction="row"
                    spacing={1}
                    justifyContent="flex-end"
                    mt={1}
                  >
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={openRejectDialog}
                      disabled={isSaving}
                    >
                      Từ chối
                    </Button>
                    <Button
                      variant="contained"
                      color="success"
                      onClick={() => {
                        void handleReview(true);
                      }}
                      disabled={isSaving}
                    >
                      Duyệt yêu cầu
                    </Button>
                  </Stack>
                </Paper>
              )}

              {/* ─── ApprovedForReturn: Start Inspection ─── */}
              {selectedRequest.status === "ApprovedForReturn" && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700} mb={1.5}>
                    Bắt đầu kiểm định khi shop đã nhận hàng
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    label="Ghi chú bắt đầu kiểm định (tuỳ chọn)"
                    value={inspectionStartNote}
                    onChange={(event) =>
                      setInspectionStartNote(event.target.value)
                    }
                  />
                  <Stack direction="row" justifyContent="flex-end" mt={2}>
                    <Button
                      variant="contained"
                      color="warning"
                      onClick={() => {
                        void handleStartInspection();
                      }}
                      disabled={isSaving}
                    >
                      Bắt đầu kiểm định
                    </Button>
                  </Stack>
                </Paper>
              )}

              {/* ─── Inspecting: Complete / Fail ─── */}
              {selectedRequest.status === "Inspecting" && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700} mb={1.5}>
                    Hoàn tất kiểm định
                  </Typography>

                  <TextField
                    fullWidth
                    type="number"
                    label="Số tiền hoàn được duyệt"
                    value={inspectionApprovedRefund}
                    onChange={(event) =>
                      setInspectionApprovedRefund(toNumber(event.target.value))
                    }
                    inputProps={{ min: 0 }}
                  />

                  <FormControlLabel
                    sx={{ mt: 1.5 }}
                    control={
                      <Checkbox
                        checked={inspectionRestocked}
                        onChange={(event) =>
                          setInspectionRestocked(event.target.checked)
                        }
                      />
                    }
                    label="Nhập lại kho"
                  />

                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    label="Ghi chú kiểm định (tuỳ chọn)"
                    value={inspectionResultNote}
                    onChange={(event) =>
                      setInspectionResultNote(event.target.value)
                    }
                    sx={{ mt: 2 }}
                  />

                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    label="Lý do từ chối kiểm định (nếu có)"
                    value={inspectionFailNote}
                    onChange={(event) =>
                      setInspectionFailNote(event.target.value)
                    }
                    sx={{ mt: 2 }}
                  />

                  <Stack
                    direction="row"
                    spacing={1}
                    justifyContent="flex-end"
                    mt={2}
                  >
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => {
                        void handleFailInspection();
                      }}
                      disabled={isSaving}
                    >
                      Từ chối kiểm định
                    </Button>
                    <Button
                      variant="contained"
                      color="success"
                      onClick={() => {
                        void handleCompleteInspection();
                      }}
                      disabled={isSaving}
                    >
                      Hoàn tất kiểm định
                    </Button>
                  </Stack>
                </Paper>
              )}

              {/* ─── ReadyForRefund: Refund ─── */}
              {selectedRequest.status === "ReadyForRefund" && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700} mb={1}>
                    Hoàn tiền cho khách hàng
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    Khi xác nhận hoàn tiền, hệ thống sẽ cập nhật trạng thái yêu
                    cầu.
                  </Typography>
                  <Stack direction="row" justifyContent="flex-end">
                    <Button
                      variant="contained"
                      color="success"
                      onClick={() => {
                        void handleRefund();
                      }}
                      disabled={isSaving}
                    >
                      Hoàn tiền
                    </Button>
                  </Stack>
                </Paper>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDetail}>Đóng</Button>
        </DialogActions>
      </Dialog>

      {/* ─── Refund Confirmation Dialog ─── */}
      <Dialog
        open={refundConfirmOpen}
        onClose={() => !isSaving && setRefundConfirmOpen(false)}
      >
        <DialogTitle>Xác nhận hoàn tiền</DialogTitle>
        <DialogContent>
          <Typography>
            Bạn có chắc chắn muốn xác nhận hoàn tiền cho yêu cầu này không? Hành
            động này không thể hoàn tác.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setRefundConfirmOpen(false)}
            disabled={isSaving}
          >
            Hủy
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={() => {
              void executeRefund();
            }}
            disabled={isSaving}
          >
            {isSaving ? <CircularProgress size={24} /> : "Xác nhận hoàn tiền"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Reject Reason Dialog ─── */}
      <Dialog
        open={rejectDialogOpen}
        onClose={closeRejectDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Nhập lý do từ chối</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Bạn có thể nhập lý do hoặc chọn nhanh một gợi ý bên dưới.
          </Typography>

          <TextField
            fullWidth
            multiline
            minRows={3}
            label="Lý do từ chối"
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
          />

          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
            useFlexGap
            mt={1.5}
          >
            {REJECT_REASON_SUGGESTIONS.map((reason) => {
              const isSelected = rejectReason.trim() === reason;
              return (
                <Chip
                  key={reason}
                  clickable
                  color={isSelected ? "primary" : "default"}
                  label={reason}
                  onClick={() => setRejectReason(reason)}
                  sx={{ maxWidth: "100%" }}
                />
              );
            })}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeRejectDialog} disabled={isSaving}>
            Hủy
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              void confirmReject();
            }}
            disabled={isSaving || !rejectReason.trim()}
          >
            Xác nhận từ chối
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Image Lightbox ─── */}
      <MediaPreviewDialog
        open={lightboxOpen}
        mediaUrl={lightboxMediaUrl}
        mimeType={lightboxMediaMimeType}
        onClose={() => setLightboxOpen(false)}
      />
    </AdminLayout>
  );
};
