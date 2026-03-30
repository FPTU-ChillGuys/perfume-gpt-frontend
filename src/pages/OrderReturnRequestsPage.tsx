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
import { AdminLayout } from "../layouts/AdminLayout";
import {
  orderService,
  type OrderReturnRequest,
  type OrderReturnRequestDetail,
  type ReturnRequestStatus,
} from "../services/orderService";
import { useToast } from "../hooks/useToast";
import type { OrderResponse } from "../types/order";

type ReturnTabStatus = "All" | ReturnRequestStatus;

type InspectionRow = {
  detailId: string;
  orderDetailId?: string;
  variantName: string;
  requestedQuantity: number;
  unitPrice: number;
  approved: boolean;
  isRestocked: boolean;
  note: string;
};

const STATUS_OPTIONS: ReturnTabStatus[] = [
  "All",
  "Pending",
  "ApprovedForReturn",
  "Inspecting",
  "ReadyForRefund",
  "Rejected",
  "Refunded",
];

const statusLabel = (status?: string) => {
  if (status === "Pending") return "Chờ duyệt";
  if (status === "ApprovedForReturn") return "Đã duyệt trả";
  if (status === "Inspecting") return "Đang kiểm định";
  if (status === "ReadyForRefund") return "Chờ hoàn tiền";
  if (status === "Rejected") return "Từ chối";
  if (status === "Refunded") return "Đã hoàn tiền";
  return status || "-";
};

const statusColor = (
  status?: string,
): "default" | "warning" | "info" | "success" | "error" => {
  if (status === "Pending") return "warning";
  if (status === "ApprovedForReturn") return "info";
  if (status === "Inspecting") return "info";
  if (status === "ReadyForRefund") return "success";
  if (status === "Rejected") return "error";
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

const toRequestQuantity = (item: OrderReturnRequestDetail) => {
  return Math.max(
    0,
    toNumber(item.returnedQuantity ?? item.requestedQuantity ?? item.quantity),
  );
};

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
  const [selectedRequest, setSelectedRequest] =
    useState<OrderReturnRequest | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderResponse | null>(
    null,
  );
  const [isOrderLoading, setIsOrderLoading] = useState(false);

  const [reviewNote, setReviewNote] = useState("");
  const [inspectionStartNote, setInspectionStartNote] = useState("");
  const [inspectionFailNote, setInspectionFailNote] = useState("");
  const [inspectionRows, setInspectionRows] = useState<InspectionRow[]>([]);

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
      setInspectionRows([]);
      return;
    }

    const requestItems = selectedRequest.returnItems || [];
    const orderDetails = selectedOrder?.orderDetails || [];

    const rows: InspectionRow[] = requestItems
      .map((item, index) => {
        const detailId = item.id;
        if (!detailId) {
          return null;
        }

        const orderDetail = orderDetails.find(
          (d) => d.id === item.orderDetailId,
        );
        const unitPrice = toNumber(item.unitPrice ?? orderDetail?.unitPrice);
        const requestedQuantity = toRequestQuantity(item);

        return {
          detailId,
          orderDetailId: item.orderDetailId,
          variantName:
            item.variantName ||
            orderDetail?.variantName ||
            `Sản phẩm ${index + 1}`,
          requestedQuantity,
          unitPrice,
          approved: requestedQuantity > 0,
          isRestocked: false,
          note: item.note || "",
        } as InspectionRow;
      })
      .filter((item): item is InspectionRow => item !== null);

    setInspectionRows(rows);
  }, [selectedRequest, selectedOrder]);

  const approvedRefundAmount = useMemo(
    () =>
      inspectionRows
        .filter((item) => item.approved)
        .reduce(
          (sum, item) =>
            sum + item.unitPrice * Math.max(item.requestedQuantity, 0),
          0,
        ),
    [inspectionRows],
  );

  const openDetail = async (request: OrderReturnRequest) => {
    setSelectedRequest(request);
    setSelectedOrder(null);
    setReviewNote("");
    setInspectionStartNote("");
    setInspectionFailNote("");
    setDetailOpen(true);

    if (!request.orderId) {
      return;
    }

    setIsOrderLoading(true);
    try {
      const order = await orderService.getOrderById(request.orderId);
      setSelectedOrder(order);
    } catch (loadError) {
      showToast(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải chi tiết đơn hàng",
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
    setInspectionStartNote("");
    setInspectionFailNote("");
    setInspectionRows([]);
  };

  const refreshAfterAction = async (successMessage: string) => {
    showToast(successMessage, "success");
    await load();
    closeDetail();
  };

  const handleReview = async (isApproved: boolean) => {
    if (!selectedRequest?.id) {
      return;
    }

    setIsSaving(true);
    try {
      await orderService.reviewReturnRequest(selectedRequest.id, {
        isApproved,
        staffNote: reviewNote.trim() || null,
      });
      await refreshAfterAction(
        isApproved
          ? "Đã duyệt yêu cầu trả hàng"
          : "Đã từ chối yêu cầu trả hàng",
      );
    } catch (actionError) {
      showToast(
        actionError instanceof Error ? actionError.message : "Xử lý thất bại",
        "error",
      );
    } finally {
      setIsSaving(false);
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

    const approvedItems = inspectionRows.filter((item) => item.approved);
    if (!approvedItems.length) {
      showToast("Vui lòng chọn ít nhất một sản phẩm đạt kiểm định", "warning");
      return;
    }

    setIsSaving(true);
    try {
      await orderService.completeReturnInspection(selectedRequest.id, {
        approvedRefundAmount,
        inspectionResults: approvedItems.map((item) => ({
          detailId: item.detailId,
          isRestocked: item.isRestocked,
          note: item.note.trim() || null,
        })),
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

  const handleRefund = async () => {
    if (!selectedRequest?.id) {
      return;
    }

    setIsSaving(true);
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
                      <strong>{request.orderId?.slice(0, 8) || "-"}</strong>
                    </TableCell>
                    <TableCell>{request.requestedByEmail || "-"}</TableCell>
                    <TableCell sx={{ maxWidth: 240 }}>
                      <Tooltip title={request.reason || ""}>
                        <Typography variant="body2" noWrap>
                          {request.reason || "-"}
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

      <Dialog open={detailOpen} onClose={closeDetail} fullWidth maxWidth="lg">
        <DialogTitle>Chi tiết yêu cầu trả hàng</DialogTitle>
        <DialogContent dividers>
          {!selectedRequest ? null : (
            <Stack spacing={2}>
              <Box
                sx={{
                  p: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  bgcolor: "grey.50",
                }}
              >
                <Box
                  display="grid"
                  gridTemplateColumns={{ xs: "1fr", md: "1fr 1fr 1fr" }}
                  gap={2}
                >
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Mã yêu cầu
                    </Typography>
                    <Typography fontWeight={700}>
                      {selectedRequest.id || "-"}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Mã đơn hàng
                    </Typography>
                    <Typography fontWeight={700}>
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
                    <Typography>
                      {formatCurrency(selectedRequest.requestedRefundAmount)}
                    </Typography>
                  </Box>
                </Box>

                <Box mt={2}>
                  <Typography variant="caption" color="text.secondary">
                    Lý do trả hàng
                  </Typography>
                  <Typography>{selectedRequest.reason || "-"}</Typography>
                </Box>

                {selectedRequest.customerNote && (
                  <Box mt={1}>
                    <Typography variant="caption" color="text.secondary">
                      Ghi chú khách hàng
                    </Typography>
                    <Typography>{selectedRequest.customerNote}</Typography>
                  </Box>
                )}
              </Box>

              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" fontWeight={700} mb={1.5}>
                  Sản phẩm yêu cầu trả
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: "grey.50" }}>
                      <TableCell>Sản phẩm</TableCell>
                      <TableCell align="center">Số lượng</TableCell>
                      <TableCell align="right">Đơn giá</TableCell>
                      <TableCell align="right">Tổng</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(selectedRequest.returnItems || []).map((item, index) => {
                      const quantity = toRequestQuantity(item);
                      const orderDetail = selectedOrder?.orderDetails?.find(
                        (orderItem) => orderItem.id === item.orderDetailId,
                      );
                      const unitPrice = toNumber(
                        item.unitPrice ?? orderDetail?.unitPrice,
                      );
                      const name =
                        item.variantName ||
                        orderDetail?.variantName ||
                        `Sản phẩm ${index + 1}`;

                      return (
                        <TableRow
                          key={item.id || `${item.orderDetailId}-${index}`}
                        >
                          <TableCell>{name}</TableCell>
                          <TableCell align="center">x{quantity}</TableCell>
                          <TableCell align="right">
                            {formatCurrency(unitPrice)}
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(unitPrice * quantity)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Paper>

              {isOrderLoading && (
                <Box textAlign="center" py={1}>
                  <CircularProgress size={24} />
                </Box>
              )}

              {selectedRequest.status === "Pending" && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700} mb={1.5}>
                    Duyệt yêu cầu ban đầu
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    label="Ghi chú xử lý (tuỳ chọn)"
                    value={reviewNote}
                    onChange={(event) => setReviewNote(event.target.value)}
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
                        void handleReview(false);
                      }}
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

              {selectedRequest.status === "Inspecting" && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700} mb={1.5}>
                    Kết quả kiểm định
                  </Typography>

                  <Stack spacing={1.25}>
                    {inspectionRows.map((row) => (
                      <Box
                        key={row.detailId}
                        sx={{
                          p: 1.25,
                          border: "1px solid",
                          borderColor: row.approved
                            ? "success.light"
                            : "divider",
                          borderRadius: 1.5,
                          bgcolor: row.approved ? "#f5fff8" : "#fff",
                        }}
                      >
                        <Stack
                          direction={{ xs: "column", md: "row" }}
                          spacing={1.25}
                          alignItems={{ xs: "flex-start", md: "center" }}
                        >
                          <Box flex={1}>
                            <Typography fontWeight={700} variant="body2">
                              {row.variantName}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {`Số lượng: ${row.requestedQuantity} | Đơn giá: ${formatCurrency(row.unitPrice)}`}
                            </Typography>
                          </Box>

                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={row.approved}
                                onChange={(event) =>
                                  setInspectionRows((prev) =>
                                    prev.map((item) =>
                                      item.detailId === row.detailId
                                        ? {
                                            ...item,
                                            approved: event.target.checked,
                                          }
                                        : item,
                                    ),
                                  )
                                }
                              />
                            }
                            label="Đạt"
                          />

                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={row.isRestocked}
                                disabled={!row.approved}
                                onChange={(event) =>
                                  setInspectionRows((prev) =>
                                    prev.map((item) =>
                                      item.detailId === row.detailId
                                        ? {
                                            ...item,
                                            isRestocked: event.target.checked,
                                          }
                                        : item,
                                    ),
                                  )
                                }
                              />
                            }
                            label="Nhập lại kho"
                          />

                          <TextField
                            size="small"
                            label="Ghi chú"
                            value={row.note}
                            onChange={(event) =>
                              setInspectionRows((prev) =>
                                prev.map((item) =>
                                  item.detailId === row.detailId
                                    ? { ...item, note: event.target.value }
                                    : item,
                                ),
                              )
                            }
                            sx={{ minWidth: 220 }}
                          />
                        </Stack>
                      </Box>
                    ))}
                  </Stack>

                  <Divider sx={{ my: 2 }} />

                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Typography variant="body2" color="text.secondary">
                      Số tiền hoàn được duyệt
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      fontWeight={700}
                      color="#ee4d2d"
                    >
                      {formatCurrency(approvedRefundAmount)}
                    </Typography>
                  </Box>

                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    label="Lý do từ chối kiểm định (nếu cần)"
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
                      Fail Inspection
                    </Button>
                    <Button
                      variant="contained"
                      color="success"
                      onClick={() => {
                        void handleCompleteInspection();
                      }}
                      disabled={isSaving}
                    >
                      Complete Inspection
                    </Button>
                  </Stack>
                </Paper>
              )}

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
    </AdminLayout>
  );
};
