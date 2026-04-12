import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ArrowBack from "@mui/icons-material/ArrowBack";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import momoLogo from "@/assets/momo.png";
import vnpayLogo from "@/assets/vnpay.jpg";
import transferLogo from "@/assets/transfer.png";
import { AdminLayout } from "@/layouts/AdminLayout";
import {
  orderService,
  type OrderCancelRequest,
  type ProcessCancelRequestBody,
} from "@/services/orderService";
import { useToast } from "@/hooks/useToast";
import type { OrderResponse } from "@/types/order";
import type { PaymentMethod } from "@/types/checkout";
import {
  CANCEL_ORDER_REASON_OPTIONS,
  type CancelOrderReason,
} from "@/utils/cancelOrderReason";
import { formatDateTimeVN, formatDateVN } from "@/utils/dateTime";

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

const PAYMENT_METHOD_LABELS: Record<NonNullable<PaymentMethod>, string> = {
  CashOnDelivery: "Thanh toán khi nhận hàng",
  CashInStore: "Thanh toán tại quầy",
  VnPay: "Thanh toán qua VNPay",
  Momo: "Thanh toán qua MoMo",
  ExternalBankTransfer: "Chuyển khoản ngân hàng",
  PayOs: "Thanh toán qua PayOS",
};

const cancelReasonLabel = (reason?: string | null) => {
  if (!reason) return "—";

  const matchedReason = CANCEL_ORDER_REASON_OPTIONS.find(
    (item) => item.value === (reason as CancelOrderReason),
  );

  return matchedReason?.label || reason;
};

const ONLINE_REFUND_METHODS: NonNullable<PaymentMethod>[] = ["VnPay", "Momo"];
const REFUND_METHOD_OPTIONS: {
  value: NonNullable<PaymentMethod>;
  label: string;
  iconSrc: string;
}[] = [
  {
    value: "VnPay",
    label: "VNPay",
    iconSrc: vnpayLogo,
  },
  {
    value: "Momo",
    label: "MoMo",
    iconSrc: momoLogo,
  },
  {
    value: "ExternalBankTransfer",
    label: "External Bank Transfer",
    iconSrc: transferLogo,
  },
];
const MIN_MANUAL_TRANSACTION_REFERENCE_LENGTH = 6;
const REFUND_DIALOG_TOP_NOTE =
  "Bạn có thể chọn hoàn qua cổng thanh toán ban đầu hoặc chuyển khoản thủ công khi cổng hoàn tự động bị treo/lỗi.";
const REFUND_DIALOG_METHOD_TITLE = "Chọn phương thức hoàn tiền";
const REFUND_DIALOG_MANUAL_MISSING_BANK_INFO_NOTE =
  "Yêu cầu này chưa có đủ thông tin tài khoản ngân hàng của khách. Vui lòng yêu cầu khách bổ sung trước khi duyệt chuyển khoản.";
const REFUND_DIALOG_MANUAL_REFERENCE_LABEL =
  "Mã giao dịch chuyển khoản thủ công *";
const REFUND_DIALOG_MANUAL_REFERENCE_HELPER =
  "Tối thiểu 6 ký tự (ví dụ: FT123456).";
const REFUND_DIALOG_CONFIRM_NOTE =
  "Bạn có chắc chắn muốn xác nhận hoàn tiền cho yêu cầu này không? Hành động này không thể hoàn tác.";

interface VietQrBank {
  name: string;
  code: string;
  bin: string;
  shortName?: string;
  short_name?: string;
}

const stripVietnameseDiacritics = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");

export const OrderCancelRequestDetailPage = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { cancelRequestId } = useParams<{ cancelRequestId: string }>();

  const backState = location.state as
    | {
        status?: string;
        page?: number;
        rowsPerPage?: number;
      }
    | undefined;

  const handleBack = () => {
    const prefix = window.location.pathname.startsWith("/staff")
      ? "/staff"
      : "/admin";

    navigate(`${prefix}/cancel-requests`, {
      state: {
        status: backState?.status ?? "All",
        page: backState?.page ?? 0,
        rowsPerPage: backState?.rowsPerPage ?? 10,
      },
    });
  };

  const [selected, setSelected] = useState<OrderCancelRequest | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderResponse | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [approveRefundDialogOpen, setApproveRefundDialogOpen] = useState(false);
  const [approveRefundMethod, setApproveRefundMethod] =
    useState<PaymentMethod | null>(null);
  const [
    approveManualTransactionReference,
    setApproveManualTransactionReference,
  ] = useState("");
  const [copiedRefundInfo, setCopiedRefundInfo] = useState(false);
  const [vietQrBanks, setVietQrBanks] = useState<VietQrBank[]>([]);

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

  const loadDetail = useCallback(async () => {
    if (!cancelRequestId) {
      return;
    }

    setIsLoading(true);
    try {
      const requestDetail =
        await orderService.getCancelRequestById(cancelRequestId);
      setSelected(requestDetail);

      if (requestDetail.orderId) {
        const orderDetail = await orderService.getOrderById(
          requestDetail.orderId,
        );
        setSelectedOrder(orderDetail);
      } else {
        setSelectedOrder(null);
      }
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Không thể tải chi tiết yêu cầu hủy",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  }, [cancelRequestId, showToast]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

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
      setRejectDialogOpen(false);
      setApproveRefundDialogOpen(false);
      setRejectNote("");
      setApproveRefundMethod(null);
      setApproveManualTransactionReference("");
      setCopiedRefundInfo(false);
      await loadDetail();
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
    // Không cần hoàn tiền → duyệt trực tiếp
    if (!selected?.isRefundRequired) {
      void submitProcessRequest({
        isApproved: true,
        staffNote: null,
        refundMethod: null,
        manualTransactionReference: null,
      });
      return;
    }

    const paymentMethod = resolveOrderPaymentMethod(selectedOrder);
    const fallbackMethod: NonNullable<PaymentMethod> =
      paymentMethod && ONLINE_REFUND_METHODS.includes(paymentMethod)
        ? paymentMethod
        : "ExternalBankTransfer";

    setApproveRefundMethod(fallbackMethod);
    setApproveManualTransactionReference("");
    setCopiedRefundInfo(false);
    setApproveRefundDialogOpen(true);
  };

  const handleConfirmApproveOnline = async () => {
    if (!approveRefundMethod) {
      showToast("Không xác định được phương thức hoàn tiền", "warning");
      return;
    }

    const isExternalTransfer = approveRefundMethod === "ExternalBankTransfer";
    const trimmedManualReference = approveManualTransactionReference.trim();

    if (
      isExternalTransfer &&
      trimmedManualReference.length < MIN_MANUAL_TRANSACTION_REFERENCE_LENGTH
    ) {
      showToast(
        `Mã giao dịch cần tối thiểu ${MIN_MANUAL_TRANSACTION_REFERENCE_LENGTH} ký tự`,
        "warning",
      );
      return;
    }

    await submitProcessRequest({
      isApproved: true,
      staffNote: null,
      refundMethod: approveRefundMethod,
      manualTransactionReference: isExternalTransfer
        ? trimmedManualReference
        : null,
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
  const refundMethodOptions: NonNullable<PaymentMethod>[] = [
    ...(currentPaymentMethod &&
    ONLINE_REFUND_METHODS.includes(currentPaymentMethod)
      ? [currentPaymentMethod]
      : []),
    "ExternalBankTransfer" as const,
  ].filter(
    (method, index, arr) => arr.indexOf(method) === index,
  ) as NonNullable<PaymentMethod>[];
  const isExternalTransferSelected =
    approveRefundMethod === "ExternalBankTransfer";
  const trimmedApproveManualTransactionReference =
    approveManualTransactionReference.trim();
  const isApproveManualReferenceTooShort =
    isExternalTransferSelected &&
    trimmedApproveManualTransactionReference.length <
      MIN_MANUAL_TRANSACTION_REFERENCE_LENGTH;
  const hasRefundBankInfo = Boolean(
    selected?.refundBankName &&
    selected?.refundAccountNumber &&
    selected?.refundAccountName,
  );
  const orderCodeForRefund = selectedOrder?.code || selected?.orderId || "-";

  useEffect(() => {
    if (!approveRefundDialogOpen || !isExternalTransferSelected) {
      return;
    }

    if (vietQrBanks.length > 0) {
      return;
    }

    const controller = new AbortController();

    const loadVietQrBanks = async () => {
      try {
        const response = await fetch("https://api.vietqr.io/v2/banks", {
          signal: controller.signal,
        });

        if (!response.ok) {
          return;
        }

        const json = (await response.json()) as { data?: VietQrBank[] };
        if (Array.isArray(json.data)) {
          setVietQrBanks(json.data);
        }
      } catch {
        // Keep UI usable without VietQR lookup data.
      }
    };

    void loadVietQrBanks();

    return () => {
      controller.abort();
    };
  }, [approveRefundDialogOpen, isExternalTransferSelected, vietQrBanks.length]);

  const normalizedRefundBankName = stripVietnameseDiacritics(
    selected?.refundBankName || "",
  )
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const matchedRefundBankBin =
    normalizedRefundBankName && vietQrBanks.length
      ? (vietQrBanks.find((bank) => {
          const candidates = [
            bank.shortName,
            bank.short_name,
            bank.code,
            bank.name,
          ]
            .filter(Boolean)
            .map((item) =>
              stripVietnameseDiacritics(String(item))
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, " ")
                .replace(/\s+/g, " ")
                .trim(),
            );

          return candidates.some(
            (candidate) =>
              candidate &&
              (normalizedRefundBankName.includes(candidate) ||
                candidate.includes(normalizedRefundBankName)),
          );
        })?.bin ?? "")
      : "";

  const cancelRefundQrImageUrl =
    isExternalTransferSelected &&
    matchedRefundBankBin &&
    selected?.refundAccountNumber &&
    refundAmountForCancelRequest > 0
      ? `https://img.vietqr.io/image/${matchedRefundBankBin}-${selected.refundAccountNumber}-compact2.jpg?amount=${refundAmountForCancelRequest}&addInfo=${encodeURIComponent(
          `Hoan tien don ${orderCodeForRefund}`,
        )}&accountName=${encodeURIComponent(selected?.refundAccountName || "")}`
      : "";

  const handleCopyRefundInfo = async () => {
    const textToCopy = [
      "YEU CAU HOAN TIEN HUY DON",
      `- Ma don: ${orderCodeForRefund}`,
      `- Ngan hang: ${selected?.refundBankName || "-"}`,
      `- STK: ${selected?.refundAccountNumber || "-"}`,
      `- Chu TK: ${selected?.refundAccountName || "-"}`,
      `- So tien: ${formatCurrency(refundAmountForCancelRequest)}`,
      `- Noi dung CK: Hoan tien don ${orderCodeForRefund}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedRefundInfo(true);
      setTimeout(() => setCopiedRefundInfo(false), 1800);
    } catch {
      showToast("Không thể copy thông tin hoàn tiền", "error");
    }
  };

  return (
    <AdminLayout>
      <Paper sx={{ overflow: "hidden", borderRadius: 2 }}>
        {isLoading || !selected ? (
          <Box textAlign="center" py={6}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              sx={{
                px: 3,
                py: 2,
                borderBottom: "1px solid",
                borderColor: "divider",
                gap: 2,
                flexWrap: "wrap",
              }}
            >
              <Button
                startIcon={<ArrowBack />}
                onClick={handleBack}
                sx={{ color: "text.secondary", textTransform: "none" }}
              >
                TRỞ LẠI
              </Button>

              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                flexWrap="wrap"
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ letterSpacing: 0.5 }}
                >
                  MÃ ĐƠN HÀNG:{" "}
                  <b style={{ color: "inherit" }}>
                    {(
                      selectedOrder?.code ||
                      selected.orderId ||
                      "-"
                    ).toUpperCase()}
                  </b>
                </Typography>
                <Divider orientation="vertical" flexItem />
                <Typography
                  variant="body2"
                  fontWeight={700}
                  sx={{ color: "#ee4d2d", textTransform: "uppercase" }}
                >
                  {statusLabel(selected.status)}
                </Typography>
              </Stack>
            </Box>

            <Box
              sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2 }}
            >
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
                  {selected.updatedAt && selected.status !== "Pending" && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Ngày xử lý
                      </Typography>
                      <Typography>{formatDate(selected.updatedAt)}</Typography>
                    </Box>
                  )}
                  {/* <Box>
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
                  </Box> */}

                  <Box
                    sx={
                      selected.updatedAt && selected.status !== "Pending"
                        ? { mt: 2 }
                        : {}
                    }
                  >
                    <Typography variant="caption" color="text.secondary">
                      Lý do hủy
                    </Typography>
                    <Typography>
                      {cancelReasonLabel(selected.reason)}
                    </Typography>
                  </Box>

                  {selected.isRefundRequired &&
                    selected.refundAmount != null && (
                      <Box mt={2}>
                        <Typography variant="caption" color="text.secondary">
                          Số tiền hoàn
                        </Typography>
                        <Typography fontWeight={700} sx={{ color: "#16a34a" }}>
                          {formatCurrency(selected.refundAmount)}
                        </Typography>
                      </Box>
                    )}

                  {selected.staffNote && (
                    <Box mt={2}>
                      <Typography variant="caption" color="text.secondary">
                        Ghi chú xử lý
                      </Typography>
                      <Typography>{selected.staffNote}</Typography>
                    </Box>
                  )}
                </Box>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle2" fontWeight={700} mb={1}>
                  Chi tiết đơn hàng
                </Typography>
                {!selectedOrder ? (
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
            </Box>
          </>
        )}
      </Paper>

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
            setCopiedRefundInfo(false);
          }
        }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Xác nhận duyệt và hoàn tiền</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 1.5 }}>
            {REFUND_DIALOG_TOP_NOTE}
          </Alert>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {REFUND_DIALOG_METHOD_TITLE}
          </Typography>
          <Stack
            direction="row"
            spacing={1.5}
            flexWrap="wrap"
            useFlexGap
            mb={2}
          >
            {REFUND_METHOD_OPTIONS.filter((option) =>
              refundMethodOptions.includes(option.value),
            ).map((option) => {
              const isActive = approveRefundMethod === option.value;
              return (
                <Paper
                  key={option.value}
                  variant="outlined"
                  onClick={() => setApproveRefundMethod(option.value)}
                  sx={{
                    px: 1.5,
                    py: 1,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    borderColor: isActive ? "#ee4d2d" : "divider",
                    bgcolor: isActive ? "rgba(238,77,45,0.06)" : "#fff",
                  }}
                >
                  <Box
                    component="img"
                    src={option.iconSrc}
                    alt={option.label}
                    sx={{
                      width: 22,
                      height: 22,
                      objectFit: "contain",
                      borderRadius: 0.5,
                    }}
                  />
                  <Typography variant="body2" fontWeight={isActive ? 700 : 500}>
                    {option.label}
                  </Typography>
                </Paper>
              );
            })}
          </Stack>

          {isExternalTransferSelected && (
            <Box sx={{ mb: 2 }}>
              {hasRefundBankInfo ? (
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={2}
                  alignItems="stretch"
                >
                  <Box
                    sx={{
                      flex: 1.2,
                      p: 1.5,
                      borderRadius: 1,
                      border: "1px solid",
                      borderColor: "divider",
                      bgcolor: "grey.50",
                    }}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      mb={1}
                    >
                      <Typography variant="body2" fontWeight={700}>
                        Thông tin tài khoản hoàn tiền của khách
                      </Typography>
                      <Tooltip
                        title={
                          copiedRefundInfo
                            ? "Đã copy thông tin"
                            : "Copy thông tin hoàn tiền"
                        }
                      >
                        <span>
                          <IconButton
                            size="small"
                            color={copiedRefundInfo ? "success" : "default"}
                            onClick={() => {
                              void handleCopyRefundInfo();
                            }}
                          >
                            {copiedRefundInfo ? (
                              <CheckIcon />
                            ) : (
                              <ContentCopyIcon />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>

                    <Stack spacing={0.6}>
                      <Typography variant="body2" color="text.secondary">
                        Ngân hàng: <b>{selected?.refundBankName || "-"}</b>
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Số tài khoản:{" "}
                        <b>{selected?.refundAccountNumber || "-"}</b>
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Chủ tài khoản:{" "}
                        <b>{selected?.refundAccountName || "-"}</b>
                      </Typography>
                      <Typography
                        variant="body1"
                        fontWeight={800}
                        sx={{ color: "#16a34a", pt: 0.5 }}
                      >
                        Số tiền hoàn:{" "}
                        {formatCurrency(refundAmountForCancelRequest)}
                      </Typography>
                    </Stack>
                  </Box>

                  <Box
                    sx={{
                      flex: 1,
                      minWidth: { xs: "100%", md: 260 },
                      p: 1.5,
                      borderRadius: 1,
                      border: "1px solid",
                      borderColor: "divider",
                      bgcolor: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {cancelRefundQrImageUrl ? (
                      <Box
                        component="img"
                        src={cancelRefundQrImageUrl}
                        alt="Mã QR chuyển khoản hoàn tiền"
                        sx={{ width: "100%", maxWidth: 280, borderRadius: 1 }}
                      />
                    ) : (
                      <Alert severity="warning" sx={{ width: "100%" }}>
                        Không thể tạo mã QR do thiếu thông tin ngân hàng.
                      </Alert>
                    )}
                  </Box>
                </Stack>
              ) : (
                <Alert severity="warning">
                  {REFUND_DIALOG_MANUAL_MISSING_BANK_INFO_NOTE}
                </Alert>
              )}

              <TextField
                fullWidth
                required
                error={isApproveManualReferenceTooShort}
                label={REFUND_DIALOG_MANUAL_REFERENCE_LABEL}
                value={approveManualTransactionReference}
                onChange={(event) =>
                  setApproveManualTransactionReference(event.target.value)
                }
                sx={{ mt: 1.5 }}
                helperText={REFUND_DIALOG_MANUAL_REFERENCE_HELPER}
              />
            </Box>
          )}

          <Box
            sx={{
              mb: 2,
              p: 1.25,
              borderRadius: 1,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "grey.50",
            }}
          >
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
          </Box>

          <Typography variant="body2" sx={{ mt: 1.5 }}>
            {REFUND_DIALOG_CONFIRM_NOTE}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setApproveRefundDialogOpen(false);
              setCopiedRefundInfo(false);
            }}
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
            disabled={
              isSaving ||
              !approveRefundMethod ||
              (isExternalTransferSelected &&
                (!hasRefundBankInfo || isApproveManualReferenceTooShort))
            }
          >
            {isSaving ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              "Xác nhận duyệt"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {!isLoading &&
        selected?.status === "Pending" &&
        (() => {
          const isStaff = location.pathname.startsWith("/staff");
          const staffCannotProcess = isStaff && selected?.isRefundRequired;
          const staffTooltip =
            "Yêu cầu này cần hoàn tiền, chỉ Admin mới có thể xử lý";

          return (
            <Box
              sx={{
                position: "sticky",
                bottom: 0,
                mt: 2,
                bgcolor: "background.paper",
                borderTop: "1px solid",
                borderColor: "divider",
                px: 2,
                py: 1.5,
                zIndex: 2,
              }}
            >
              <Stack direction="row" justifyContent="flex-end" spacing={1}>
                <Tooltip title={staffCannotProcess ? staffTooltip : ""} arrow>
                  <span>
                    <Button
                      variant="contained"
                      color="error"
                      onClick={() => setRejectDialogOpen(true)}
                      disabled={isSaving || !!staffCannotProcess}
                    >
                      Từ chối
                    </Button>
                  </span>
                </Tooltip>
                <Tooltip title={staffCannotProcess ? staffTooltip : ""} arrow>
                  <span>
                    <Button
                      variant="contained"
                      color="success"
                      onClick={handleApproveClick}
                      disabled={isSaving || !!staffCannotProcess}
                    >
                      Chấp thuận
                    </Button>
                  </span>
                </Tooltip>
              </Stack>
            </Box>
          );
        })()}
    </AdminLayout>
  );
};

export default OrderCancelRequestDetailPage;
