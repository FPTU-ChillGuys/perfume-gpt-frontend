import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Badge,
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
  Stack,
  Divider,
} from "@mui/material";
import { AdminLayout } from "../layouts/AdminLayout";
import {
  orderService,
  type OrderCancelRequest,
  type ProcessCancelRequestBody,
} from "../services/orderService";
import { useToast } from "../hooks/useToast";
import type { OrderResponse } from "../types/order";
import type { PaymentMethod } from "../types/checkout";
import {
  CANCEL_ORDER_REASON_OPTIONS,
  type CancelOrderReason,
} from "@/utils/cancelOrderReason";
import { formatDateTimeVN, formatDateVN } from "@/utils/dateTime";

const STATUS_OPTIONS = ["All", "Pending", "Approved", "Rejected"] as const;

const REJECT_NOTE_SUGGESTIONS = [
  "Lý do hủy không hợp lệ theo chính sách hiện tại.",
  "Đơn hàng đã được bàn giao cho đơn vị vận chuyển.",
  "Đơn hàng đã được xử lý và không thể hủy ở giai đoạn này.",
  "Thông tin yêu cầu chưa đầy đủ, vui lòng liên hệ CSKH.",
];

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

const formatDate = (d?: string) => (d ? formatDateVN(d) : "—");

const formatDateTime = (d?: string) => (d ? formatDateTimeVN(d) : "—");

const formatCurrency = (value?: number | null) => {
  if (!value) return "0 ₫";
  return `${new Intl.NumberFormat("vi-VN").format(value)} ₫`;
};

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CashOnDelivery: "Thanh toán khi nhận hàng",
  CashInStore: "Thanh toán tại quầy",
  VnPay: "Thanh toán qua VNPay",
  Momo: "Thanh toán qua MoMo",
  ExternalBankTransfer: "Chuyển khoản ngân hàng",
};

const cancelReasonLabel = (reason?: string | null) => {
  if (!reason) return "—";

  const matchedReason = CANCEL_ORDER_REASON_OPTIONS.find(
    (item) => item.value === (reason as CancelOrderReason),
  );

  return matchedReason?.label || reason;
};

const ONLINE_REFUND_METHODS: PaymentMethod[] = ["VnPay", "Momo"];

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
  const [selectedOrder, setSelectedOrder] = useState<OrderResponse | null>(
    null,
  );
  const [isOrderLoading, setIsOrderLoading] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [approveRefundDialogOpen, setApproveRefundDialogOpen] = useState(false);
  const [approveStaffNote, setApproveStaffNote] = useState("");
  const [approveRefundMethod, setApproveRefundMethod] =
    useState<PaymentMethod | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const pendingCount = requests.filter(
    (item) => item.status === "Pending",
  ).length;
  const approvedCount = requests.filter(
    (item) => item.status === "Approved",
  ).length;
  const rejectedCount = requests.filter(
    (item) => item.status === "Rejected",
  ).length;

  const statusFilter =
    STATUS_OPTIONS[tabIndex] === "All" ? undefined : STATUS_OPTIONS[tabIndex];

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await orderService.getAllCancelRequests({
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

  const openDetail = async (req: OrderCancelRequest) => {
    setSelected(req);
    setRejectNote("");
    setApproveStaffNote("");
    setApproveRefundMethod(null);
    setRejectDialogOpen(false);
    setApproveRefundDialogOpen(false);
    setDetailOpen(true);

    if (!req.orderId) {
      setSelectedOrder(null);
      return;
    }

    setIsOrderLoading(true);
    try {
      const orderDetail = await orderService.getOrderById(req.orderId);
      setSelectedOrder(orderDetail);
    } catch (e) {
      setSelectedOrder(null);
      showToast(
        e instanceof Error ? e.message : "Không thể tải chi tiết đơn hàng",
        "error",
      );
    } finally {
      setIsOrderLoading(false);
    }
  };

  const resolveOrderPaymentMethod = (
    order: OrderResponse | null,
  ): PaymentMethod | null => {
    const transactions = order?.paymentTransactions ?? [];

    const successfulPayment = transactions.find(
      (transaction) =>
        transaction.transactionType === "Payment" &&
        transaction.status === "Success" &&
        Boolean(transaction.paymentMethod),
    );

    if (successfulPayment?.paymentMethod) {
      return successfulPayment.paymentMethod;
    }

    const firstPaymentMethod = transactions.find((transaction) =>
      Boolean(transaction.paymentMethod),
    )?.paymentMethod;

    return firstPaymentMethod ?? null;
  };

  const submitProcessRequest = async (body: ProcessCancelRequestBody) => {
    if (!selected?.id) return;

    setIsSaving(true);
    try {
      await orderService.processCancelRequest(selected.id, body);
      showToast(
        body.isApproved
          ? "Duyệt yêu cầu thành công"
          : "Từ chối yêu cầu thành công",
        "success",
      );
      setDetailOpen(false);
      setRejectDialogOpen(false);
      setApproveRefundDialogOpen(false);
      setSelected(null);
      setSelectedOrder(null);
      setRejectNote("");
      setApproveStaffNote("");
      setApproveRefundMethod(null);
      load();
    } catch (err: any) {
      showToast(err?.message || "Xử lý thất bại", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectNote.trim()) {
      showToast("Vui lòng nhập lý do từ chối", "warning");
      return;
    }

    await submitProcessRequest({
      isApproved: false,
      staffNote: rejectNote.trim(),
      refundMethod: null,
      manualTransactionReference: null,
    });
  };

  const handleApproveClick = () => {
    const paymentMethod = resolveOrderPaymentMethod(selectedOrder);

    if (paymentMethod && ONLINE_REFUND_METHODS.includes(paymentMethod)) {
      setApproveRefundMethod(paymentMethod);
      setApproveRefundDialogOpen(true);
      return;
    }

    void submitProcessRequest({
      isApproved: true,
      staffNote: null,
      refundMethod: null,
      manualTransactionReference: null,
    });
  };

  const handleConfirmApproveOnline = async () => {
    if (!approveRefundMethod) {
      showToast("Không xác định được phương thức hoàn tiền", "warning");
      return;
    }

    await submitProcessRequest({
      isApproved: true,
      staffNote: approveStaffNote.trim() || null,
      refundMethod: approveRefundMethod,
      manualTransactionReference: null,
    });
  };

  const orderSubtotal =
    selectedOrder?.orderDetails?.reduce(
      (sum, item) => sum + Number(item.total ?? 0),
      0,
    ) ?? 0;
  const shippingFee = Number(selectedOrder?.shippingInfo?.shippingFee ?? 0);
  const grandTotal = Number(selectedOrder?.totalAmount ?? 0);
  const voucherDiscount = Math.max(orderSubtotal + shippingFee - grandTotal, 0);
  const refundAmountForCancelRequest = Number(
    selected?.refundAmount ?? selectedOrder?.totalAmount ?? 0,
  );
  const currentPaymentMethod = resolveOrderPaymentMethod(selectedOrder);

  return (
    <AdminLayout>
      <Box>
        <Paper sx={{ mb: 3, overflow: "hidden" }}>
          <Box
            sx={{ borderBottom: "1px solid", borderColor: "divider", px: 2 }}
          >
            <Tabs
              value={tabIndex}
              onChange={(_, v) => {
                setTabIndex(v);
                setPage(0);
              }}
              variant="scrollable"
              scrollButtons="auto"
              TabIndicatorProps={{ style: { backgroundColor: "#ee4d2d" } }}
              sx={{
                "& .MuiTab-root": {
                  textTransform: "none",
                  fontWeight: 500,
                  minWidth: 100,
                },
                "& .Mui-selected": { color: "#ee4d2d !important" },
              }}
            >
              <Tab label="Tất cả" />
              <Tab
                label={
                  <Badge
                    color="warning"
                    badgeContent={pendingCount > 99 ? "99+" : pendingCount}
                    invisible={pendingCount <= 0}
                  >
                    <Box component="span" sx={{ pr: 1 }}>
                      Chờ xử lý
                    </Box>
                  </Badge>
                }
              />
              <Tab
                label={
                  <Badge
                    color="success"
                    badgeContent={approvedCount > 99 ? "99+" : approvedCount}
                    invisible={approvedCount <= 0}
                  >
                    <Box component="span" sx={{ pr: 1 }}>
                      Đã duyệt
                    </Box>
                  </Badge>
                }
              />
              <Tab
                label={
                  <Badge
                    color="error"
                    badgeContent={rejectedCount > 99 ? "99+" : rejectedCount}
                    invisible={rejectedCount <= 0}
                  >
                    <Box component="span" sx={{ pr: 1 }}>
                      Từ chối
                    </Box>
                  </Badge>
                }
              />
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
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    align="center"
                    sx={{ py: 4, color: "text.secondary" }}
                  >
                    Không có yêu cầu hủy nào
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((r) => (
                  <TableRow
                    key={r.id}
                    hover
                    sx={{
                      cursor: "pointer",
                      "&:hover": {
                        bgcolor: "rgba(238,77,45,0.04)",
                      },
                    }}
                    onClick={() => {
                      void openDetail(r);
                    }}
                  >
                    <TableCell>
                      <strong>{r.orderId?.substring(0, 8)}</strong>
                    </TableCell>
                    <TableCell>{r.requestedByEmail || "—"}</TableCell>
                    <TableCell sx={{ maxWidth: 200 }}>
                      <Tooltip title={cancelReasonLabel(r.reason)}>
                        <Typography variant="body2" noWrap>
                          {cancelReasonLabel(r.reason)}
                        </Typography>
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

      {/* Detail Dialog */}
      <Dialog
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelected(null);
          setSelectedOrder(null);
          setRejectNote("");
          setApproveStaffNote("");
          setApproveRefundMethod(null);
          setRejectDialogOpen(false);
          setApproveRefundDialogOpen(false);
        }}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Chi tiết yêu cầu hủy và đơn hàng</DialogTitle>
        <DialogContent dividers>
          {selected && (
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
                  gridTemplateColumns={{ xs: "1fr", md: "1fr 1fr" }}
                  gap={2}
                >
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Mã đơn hàng
                    </Typography>
                    <Typography fontWeight={700}>
                      {selectedOrder?.code || selected.orderId || "—"}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Người yêu cầu
                    </Typography>
                    <Typography>{selected.requestedByEmail || "—"}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Ngày yêu cầu
                    </Typography>
                    <Typography>
                      {formatDateTime(selected.createdAt)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Trạng thái
                    </Typography>
                    <Box>
                      <Chip
                        label={statusLabel(selected.status)}
                        color={statusColor(selected.status)}
                        size="small"
                      />
                    </Box>
                  </Box>
                </Box>

                <Box mt={2}>
                  <Typography variant="caption" color="text.secondary">
                    Lý do hủy
                  </Typography>
                  <Typography>{cancelReasonLabel(selected.reason)}</Typography>
                </Box>
              </Box>

              {selected.staffNote && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Ghi chú xử lý
                  </Typography>
                  <Typography>{selected.staffNote}</Typography>
                </Box>
              )}
              {selected.updatedAt && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Ngày xử lý
                  </Typography>
                  <Typography>{formatDate(selected.updatedAt)}</Typography>
                </Box>
              )}

              <Divider />

              <Box>
                <Typography variant="subtitle2" fontWeight={700} mb={1}>
                  Chi tiết đơn hàng
                </Typography>
                {isOrderLoading ? (
                  <Box py={2}>
                    <CircularProgress size={24} />
                  </Box>
                ) : !selectedOrder ? (
                  <Typography variant="body2" color="text.secondary">
                    Không có dữ liệu chi tiết đơn hàng.
                  </Typography>
                ) : (
                  <Box
                    display="grid"
                    gridTemplateColumns={{ xs: "1fr", lg: "2fr 1fr" }}
                    gap={2}
                  >
                    <Paper variant="outlined" sx={{ borderRadius: 2 }}>
                      <Box
                        sx={{
                          px: 2,
                          py: 1.25,
                          borderBottom: "1px solid",
                          borderColor: "divider",
                        }}
                      >
                        <Typography fontWeight={700} variant="subtitle2">
                          Sản phẩm trong đơn
                        </Typography>
                      </Box>
                      <Stack spacing={1} sx={{ p: 2 }}>
                        {selectedOrder.orderDetails?.length ? (
                          selectedOrder.orderDetails.map((item) => (
                            <Box
                              key={item.id}
                              display="flex"
                              gap={1.5}
                              alignItems="center"
                              sx={{
                                p: 1,
                                borderRadius: 1.5,
                                border: "1px solid",
                                borderColor: "divider",
                              }}
                            >
                              {item.imageUrl ? (
                                <Box
                                  component="img"
                                  src={item.imageUrl}
                                  alt={item.variantName || "Sản phẩm"}
                                  sx={{
                                    width: 64,
                                    height: 64,
                                    objectFit: "cover",
                                    borderRadius: 1,
                                    border: "1px solid",
                                    borderColor: "divider",
                                    flexShrink: 0,
                                  }}
                                />
                              ) : (
                                <Box
                                  sx={{
                                    width: 64,
                                    height: 64,
                                    borderRadius: 1,
                                    bgcolor: "grey.100",
                                    border: "1px solid",
                                    borderColor: "divider",
                                    flexShrink: 0,
                                  }}
                                />
                              )}

                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography
                                  variant="body2"
                                  fontWeight={600}
                                  noWrap
                                >
                                  {item.variantName || "Sản phẩm"}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  Số lượng: {item.quantity || 0}
                                </Typography>
                                <Box
                                  display="flex"
                                  justifyContent="space-between"
                                  alignItems="center"
                                  mt={0.5}
                                  gap={1}
                                >
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    Đơn giá: {formatCurrency(item.unitPrice)}
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    fontWeight={700}
                                    sx={{ color: "#ee4d2d" }}
                                  >
                                    {formatCurrency(item.total)}
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>
                          ))
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Không có sản phẩm.
                          </Typography>
                        )}
                      </Stack>
                    </Paper>

                    <Stack spacing={2}>
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                        <Typography
                          variant="subtitle2"
                          fontWeight={700}
                          mb={1.5}
                        >
                          Thông tin giao hàng
                        </Typography>
                        <Stack spacing={1}>
                          <Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Khách hàng
                            </Typography>
                            <Typography>
                              {selectedOrder.recipientInfo?.recipientName ||
                                "—"}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Số điện thoại
                            </Typography>
                            <Typography>
                              {selectedOrder.recipientInfo
                                ?.recipientPhoneNumber || "—"}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Địa chỉ nhận hàng
                            </Typography>
                            <Typography>
                              {selectedOrder.recipientInfo?.fullAddress || "—"}
                            </Typography>
                          </Box>
                        </Stack>
                      </Paper>

                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                        <Typography
                          variant="subtitle2"
                          fontWeight={700}
                          mb={1.5}
                        >
                          Chi tiết thanh toán
                        </Typography>
                        <Stack spacing={1}>
                          <Box display="flex" justifyContent="space-between">
                            <Typography variant="body2" color="text.secondary">
                              Tạm tính
                            </Typography>
                            <Typography variant="body2">
                              {formatCurrency(orderSubtotal)}
                            </Typography>
                          </Box>
                          <Box display="flex" justifyContent="space-between">
                            <Typography variant="body2" color="text.secondary">
                              Phí vận chuyển
                            </Typography>
                            <Typography
                              variant="body2"
                              color="success.main"
                              fontWeight={500}
                            >
                              FREE
                            </Typography>
                          </Box>
                          {voucherDiscount > 0 && (
                            <Box display="flex" justifyContent="space-between">
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Giảm giá voucher
                              </Typography>
                              <Typography variant="body2" color="success.main">
                                -{formatCurrency(voucherDiscount)}
                              </Typography>
                            </Box>
                          )}
                          <Divider />
                          <Box display="flex" justifyContent="space-between">
                            <Typography variant="subtitle2" fontWeight={700}>
                              Tổng thanh toán
                            </Typography>
                            <Typography
                              variant="subtitle2"
                              fontWeight={700}
                              sx={{ color: "#ee4d2d" }}
                            >
                              {formatCurrency(grandTotal)}
                            </Typography>
                          </Box>
                          <Divider />
                          <Box
                            display="flex"
                            justifyContent="space-between"
                            alignItems="center"
                            gap={1.5}
                          >
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              noWrap
                              sx={{ flexShrink: 0 }}
                            >
                              Phương thức thanh toán
                            </Typography>
                            <Typography
                              variant="body2"
                              fontWeight={600}
                              noWrap
                              sx={{ whiteSpace: "nowrap" }}
                            >
                              {currentPaymentMethod
                                ? PAYMENT_METHOD_LABELS[currentPaymentMethod]
                                : "—"}
                            </Typography>
                          </Box>
                        </Stack>
                      </Paper>
                    </Stack>
                  </Box>
                )}
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDetailOpen(false);
              setSelected(null);
              setSelectedOrder(null);
              setRejectNote("");
              setApproveStaffNote("");
              setApproveRefundMethod(null);
              setRejectDialogOpen(false);
              setApproveRefundDialogOpen(false);
            }}
          >
            Đóng
          </Button>
          {selected?.status === "Pending" && (
            <>
              <Button
                variant="contained"
                color="error"
                onClick={() => setRejectDialogOpen(true)}
                disabled={isSaving}
              >
                {isSaving ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  "Từ chối"
                )}
              </Button>
              <Button
                variant="contained"
                color="success"
                onClick={handleApproveClick}
                disabled={isSaving}
              >
                {isSaving ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  "Chấp thuận"
                )}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <Dialog
        open={rejectDialogOpen}
        onClose={() => {
          if (!isSaving) {
            setRejectDialogOpen(false);
          }
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Từ chối yêu cầu hủy đơn</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Vui lòng nhập lý do từ chối hoặc chọn nhanh từ gợi ý bên dưới.
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={3}
            label="Lý do từ chối"
            value={rejectNote}
            onChange={(event) => setRejectNote(event.target.value)}
          />
          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
            useFlexGap
            mt={1.5}
          >
            {REJECT_NOTE_SUGGESTIONS.map((reason) => (
              <Chip
                key={reason}
                clickable
                color={rejectNote.trim() === reason ? "primary" : "default"}
                label={reason}
                onClick={() => setRejectNote(reason)}
                sx={{ maxWidth: "100%" }}
              />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setRejectDialogOpen(false)}
            disabled={isSaving}
          >
            Hủy
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              void handleConfirmReject();
            }}
            disabled={isSaving || !rejectNote.trim()}
          >
            {isSaving ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              "Xác nhận từ chối"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={approveRefundDialogOpen}
        onClose={() => {
          if (!isSaving) {
            setApproveRefundDialogOpen(false);
          }
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Xác nhận duyệt và hoàn tiền</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 1.5 }}>
            Đơn hàng thanh toán online sẽ hoàn tiền bằng đúng phương thức thanh
            toán ban đầu.
          </Alert>

          <Stack spacing={1.25} sx={{ mb: 2 }}>
            <Box display="flex" justifyContent="space-between" gap={2}>
              <Typography variant="body2" color="text.secondary">
                Phương thức hoàn tiền
              </Typography>
              <Typography variant="body2" fontWeight={700}>
                {approveRefundMethod || "-"}
              </Typography>
            </Box>
            <Box display="flex" justifyContent="space-between" gap={2}>
              <Typography variant="body2" color="text.secondary">
                Số tiền cần hoàn
              </Typography>
              <Typography
                variant="body2"
                fontWeight={700}
                sx={{ color: "#16a34a" }}
              >
                {formatCurrency(refundAmountForCancelRequest)}
              </Typography>
            </Box>
          </Stack>

          <TextField
            fullWidth
            multiline
            minRows={2}
            label="Ghi chú xử lý (tuỳ chọn)"
            value={approveStaffNote}
            onChange={(event) => setApproveStaffNote(event.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setApproveRefundDialogOpen(false)}
            disabled={isSaving}
          >
            Hủy
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={() => {
              void handleConfirmApproveOnline();
            }}
            disabled={isSaving || !approveRefundMethod}
          >
            {isSaving ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              "Xác nhận duyệt"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
};
