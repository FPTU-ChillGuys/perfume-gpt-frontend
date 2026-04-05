import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ArrowBack from "@mui/icons-material/ArrowBack";
import ImageIcon from "@mui/icons-material/Image";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import LocalPrintshopOutlinedIcon from "@mui/icons-material/LocalPrintshopOutlined";
import Sync from "@mui/icons-material/Sync";
import momoLogo from "@/assets/momo.png";
import vnpayLogo from "@/assets/vnpay.jpg";
import storeLogo from "@/assets/store.png";
import { AdminLayout } from "@/layouts/AdminLayout";
import {
  orderService,
  type OrderReturnRequest,
  type ReturnRefundMethod,
} from "@/services/orderService";
import { useToast } from "@/hooks/useToast";
import type { OrderResponse } from "@/types/order";

const REJECT_REASON_SUGGESTIONS = [
  "Yêu cầu quá thời hạn hỗ trợ đổi trả",
  "Sản phẩm không đủ điều kiện đổi trả theo chính sách",
  "Bằng chứng cung cấp chưa đủ để xác minh",
  "Sản phẩm có dấu hiệu đã qua sử dụng không đúng quy định",
  "Thông tin yêu cầu chưa đầy đủ, vui lòng gửi lại",
];

const REFUND_METHOD_OPTIONS: {
  value: ReturnRefundMethod;
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
    value: "CashInStore",
    label: "Cash In Store",
    iconSrc: storeLogo,
  },
];

const statusLabel = (status?: string) => {
  if (status === "Pending") return "Chờ duyệt";
  if (status === "RequestMoreInfo") return "Bổ sung bằng chứng";
  if (status === "ApprovedForReturn") return "Đã duyệt trả";
  if (status === "Inspecting") return "Đang kiểm định";
  if (status === "ReadyForRefund") return "Chờ hoàn tiền";
  if (status === "Rejected") return "Từ chối";
  if (status === "Completed") return "Đã hoàn tất";
  if (status === "Refunded") return "Đã hoàn tiền";
  return status || "-";
};

const shippingStatusLabel = (status?: string | null) => {
  if (!status) return "-";

  if (status === "Pending") return "Chờ lấy hàng";
  if (status === "Confirmed") return "Đã xác nhận";
  if (status === "PickedUp") return "Đã lấy hàng";
  if (status === "InTransit") return "Đang vận chuyển";
  if (status === "OutForDelivery") return "Đang giao hàng";
  if (status === "Delivered") return "Giao hàng thành công";
  if (status === "DeliveryFailed") return "Giao hàng thất bại";
  if (status === "Returned") return "Đã hoàn hàng";
  if (status === "Cancelled") return "Đã hủy";

  return status;
};

const statusColor = (
  status?: string,
): "default" | "warning" | "info" | "success" | "error" => {
  if (status === "Pending") return "warning";
  if (status === "RequestMoreInfo") return "warning";
  if (status === "ApprovedForReturn") return "info";
  if (status === "Inspecting") return "info";
  if (status === "ReadyForRefund") return "success";
  if (status === "Rejected") return "error";
  if (status === "Completed") return "success";
  if (status === "Refunded") return "success";
  return "default";
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

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleString("vi-VN") : "-";

const formatCurrency = (value?: number | null) =>
  `${new Intl.NumberFormat("vi-VN").format(Number(value ?? 0))} đ`;

const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

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

export const OrderReturnRequestDetailPage = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { returnRequestId } = useParams<{ returnRequestId: string }>();

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

    navigate(`${prefix}/return-requests`, {
      state: {
        status: backState?.status ?? "All",
        page: backState?.page ?? 0,
        rowsPerPage: backState?.rowsPerPage ?? 10,
      },
    });
  };

  const [request, setRequest] = useState<OrderReturnRequest | null>(null);
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncingShipping, setIsSyncingShipping] = useState(false);
  const [isGeneratingLabelUrl, setIsGeneratingLabelUrl] = useState(false);

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [moreInfoDialogOpen, setMoreInfoDialogOpen] = useState(false);
  const [moreInfoReason, setMoreInfoReason] = useState("");

  const [inspectionApprovedRefund, setInspectionApprovedRefund] = useState(0);
  const [inspectionRestocked, setInspectionRestocked] = useState(false);
  const [inspectionResultNote, setInspectionResultNote] = useState("");
  const [inspectionRejectDialogOpen, setInspectionRejectDialogOpen] =
    useState(false);
  const [inspectionRejectReason, setInspectionRejectReason] = useState("");

  const [refundConfirmOpen, setRefundConfirmOpen] = useState(false);
  const [selectedRefundMethod, setSelectedRefundMethod] =
    useState<ReturnRefundMethod>("VnPay");

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxMediaUrl, setLightboxMediaUrl] = useState("");
  const [lightboxMediaMimeType, setLightboxMediaMimeType] = useState<
    string | null
  >(null);

  const loadDetail = useCallback(async () => {
    if (!returnRequestId) {
      return;
    }

    setIsLoading(true);
    try {
      const fullRequest =
        await orderService.getReturnRequestById(returnRequestId);
      setRequest(fullRequest);

      if (fullRequest.orderId) {
        const loadedOrder = await orderService.getOrderById(
          fullRequest.orderId,
        );
        setOrder(loadedOrder);
      } else {
        setOrder(null);
      }

      setInspectionApprovedRefund(
        toNumber(
          fullRequest.approvedRefundAmount ?? fullRequest.requestedRefundAmount,
        ),
      );
      setInspectionRestocked(Boolean(fullRequest.isRestocked));
      setInspectionResultNote(fullRequest.inspectionNote || "");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Không thể tải chi tiết",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  }, [returnRequestId, showToast]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const refreshAfterAction = async (successMessage: string) => {
    showToast(successMessage, "success");
    await loadDetail();
  };

  const handleReview = async (
    isApproved: boolean,
    note?: string | null,
    isRequestMoreInfo = false,
  ) => {
    if (!request?.id) {
      return;
    }

    const finalNote = (note ?? "").trim();
    const isRejectAction = !isApproved && !isRequestMoreInfo;

    if (isRejectAction && !finalNote) {
      showToast("Vui lòng nhập lý do", "warning");
      return;
    }

    const staffNoteToSend = isApproved ? null : finalNote || null;

    setIsSaving(true);
    try {
      await orderService.reviewReturnRequest(request.id, {
        isApproved,
        isRequestMoreInfo,
        staffNote: staffNoteToSend,
      });

      if (isRequestMoreInfo) {
        setMoreInfoDialogOpen(false);
        setMoreInfoReason("");
      } else if (!isApproved) {
        setRejectDialogOpen(false);
        setRejectReason("");
      }

      await refreshAfterAction(
        isRequestMoreInfo
          ? "Đã yêu cầu bổ sung bằng chứng"
          : isApproved
            ? "Đã duyệt yêu cầu trả hàng"
            : "Đã từ chối yêu cầu trả hàng",
      );
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Xử lý thất bại",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartInspection = async () => {
    if (!request?.id) {
      return;
    }

    setIsSaving(true);
    try {
      await orderService.startReturnInspection(request.id, {
        inspectionNote: null,
      });
      await refreshAfterAction("Đã bắt đầu kiểm định");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Không thể bắt đầu kiểm định",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompleteInspection = async () => {
    if (!request?.id) {
      return;
    }

    if (inspectionApprovedRefund < 0) {
      showToast("Số tiền hoàn được duyệt không hợp lệ", "warning");
      return;
    }

    setIsSaving(true);
    try {
      await orderService.completeReturnInspection(request.id, {
        approvedRefundAmount: inspectionApprovedRefund,
        isRestocked: inspectionRestocked,
        inspectionNote: inspectionResultNote.trim() || null,
      });
      await refreshAfterAction("Đã hoàn tất kiểm định");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Không thể hoàn tất kiểm định",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleFailInspection = async () => {
    if (!request?.id) {
      return;
    }

    if (!inspectionRejectReason.trim()) {
      showToast("Vui lòng nhập lý do từ chối kiểm định", "warning");
      return;
    }

    setIsSaving(true);
    try {
      await orderService.failReturnInspection(request.id, {
        note: inspectionRejectReason.trim(),
      });
      setInspectionRejectDialogOpen(false);
      setInspectionRejectReason("");
      await refreshAfterAction("Đã từ chối yêu cầu trả hàng");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Không thể từ chối kiểm định",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefund = async () => {
    if (!request?.id) {
      return;
    }

    setIsSaving(true);
    setRefundConfirmOpen(false);
    try {
      await orderService.refundReturnRequest(request.id, selectedRefundMethod);
      await refreshAfterAction("Đã hoàn tiền cho khách hàng");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Không thể hoàn tiền",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncShippingStatus = async () => {
    if (!request?.id || !request.customerId) {
      showToast("Không tìm thấy khách hàng để đồng bộ vận chuyển", "warning");
      return;
    }

    setIsSyncingShipping(true);
    try {
      await orderService.syncShippingStatusByUserId(request.customerId);
      await loadDetail();
      showToast("Đã đồng bộ trạng thái vận chuyển", "success");
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Không thể đồng bộ trạng thái vận chuyển",
        "error",
      );
    } finally {
      setIsSyncingShipping(false);
    }
  };

  const handlePrintShippingLabel = async () => {
    const trackingNumber = request?.returnShippingInfo?.trackingNumber?.trim();

    if (!trackingNumber) {
      showToast("Không có mã vận đơn để in phiếu", "error");
      return;
    }

    try {
      setIsGeneratingLabelUrl(true);
      const printUrl = await orderService.getShippingOrderInfoUrl([
        trackingNumber,
      ]);
      const printWindow = window.open(
        printUrl,
        "_blank",
        "noopener,noreferrer",
      );

      if (!printWindow) {
        showToast(
          "Trình duyệt đang chặn popup. Vui lòng cho phép popup để in phiếu.",
          "error",
        );
        return;
      }

      showToast("Đã mở link in phiếu vận chuyển", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Không thể mở link in phiếu",
        "error",
      );
    } finally {
      setIsGeneratingLabelUrl(false);
    }
  };

  const requestItems = useMemo(() => {
    const orderDetails = order?.orderDetails || [];
    const returnDetails = request?.returnDetails || [];

    if (!returnDetails.length) {
      return orderDetails.map((item, index) => {
        const quantity = toNumber(item.quantity);
        const unitPrice = toNumber(item.unitPrice);
        return {
          key: item.id || index,
          name: item.variantName || `Sản phẩm ${index + 1}`,
          imageUrl: item.imageUrl || null,
          quantity,
          unitPrice,
          total: unitPrice * quantity,
        };
      });
    }

    return returnDetails.map((detail, index) => {
      const matchedOrderDetail = orderDetails.find(
        (item) =>
          item.id === detail.orderDetailId ||
          (detail.variantId && item.variantId === detail.variantId),
      );

      const quantity = toNumber(detail.requestedQuantity);
      const unitPrice = toNumber(
        detail.unitPrice ?? matchedOrderDetail?.unitPrice,
      );

      return {
        key:
          detail.id ||
          detail.orderDetailId ||
          detail.variantId ||
          matchedOrderDetail?.id ||
          index,
        name:
          matchedOrderDetail?.variantName || `Sản phẩm hoàn trả ${index + 1}`,
        imageUrl: matchedOrderDetail?.imageUrl || null,
        quantity,
        unitPrice,
        total: unitPrice * quantity,
      };
    });
  }, [order?.orderDetails, request?.returnDetails]);

  return (
    <AdminLayout>
      <Paper sx={{ overflow: "hidden", borderRadius: 2 }}>
        {isLoading || !request ? (
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
                {request.returnShippingInfo?.trackingNumber && (
                  <Tooltip title="In phiếu gửi trả">
                    <span>
                      <IconButton
                        size="small"
                        onClick={handlePrintShippingLabel}
                        disabled={isGeneratingLabelUrl || isLoading}
                        aria-label="In phiếu gửi trả"
                      >
                        <LocalPrintshopOutlinedIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
                <IconButton
                  size="small"
                  onClick={handleSyncShippingStatus}
                  disabled={isSyncingShipping || isLoading}
                  aria-label="Đồng bộ trạng thái vận chuyển"
                >
                  <Sync
                    sx={{
                      animation: isSyncingShipping
                        ? "sync-spin 0.9s linear infinite"
                        : "none",
                      "@keyframes sync-spin": {
                        from: { transform: "rotate(0deg)" },
                        to: { transform: "rotate(360deg)" },
                      },
                    }}
                  />
                </IconButton>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ letterSpacing: 0.5 }}
                >
                  MÃ ĐƠN HÀNG:{" "}
                  <b style={{ color: "inherit" }}>
                    {(request.orderCode || "-").toUpperCase()}
                  </b>
                </Typography>
                <Divider orientation="vertical" flexItem />
                <Typography
                  variant="body2"
                  fontWeight={700}
                  sx={{ color: "#ee4d2d", textTransform: "uppercase" }}
                >
                  {statusLabel(request.status)}
                </Typography>
              </Stack>
            </Box>

            <Box
              sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2.5 }}
            >
              <Box
                sx={{
                  p: 2.5,
                  pt: 3.25,
                  border: "1px solid",
                  borderColor: "#e5e7eb",
                  borderRadius: 2,
                  bgcolor: "background.paper",
                  position: "relative",
                  overflow: "hidden",
                  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 8,
                    background:
                      "repeating-linear-gradient(90deg, #ef4444 0 14px, #ffffff 14px 22px, #3b82f6 22px 36px, #ffffff 36px 44px)",
                  },
                }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  mb={2}
                >
                  <Typography
                    variant="subtitle2"
                    fontWeight={700}
                    sx={{ color: "text.primary" }}
                  >
                    Thông tin yêu cầu
                  </Typography>
                </Stack>

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
                      sx={{ fontFamily: "monospace", fontSize: 15 }}
                    >
                      {request.id || "-"}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Trạng thái
                    </Typography>
                    <Box>
                      <Chip
                        size="small"
                        label={statusLabel(request.status)}
                        color={statusColor(request.status)}
                      />
                    </Box>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Người yêu cầu
                    </Typography>
                    <Typography>{request.requestedByEmail || "-"}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Ngày tạo
                    </Typography>
                    <Typography>{formatDate(request.createdAt)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Tiền yêu cầu hoàn
                    </Typography>
                    <Typography fontWeight={700} color="#ee4d2d">
                      {formatCurrency(request.requestedRefundAmount)}
                    </Typography>
                  </Box>
                  {request.approvedRefundAmount != null &&
                    request.approvedRefundAmount > 0 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Tiền được duyệt hoàn
                        </Typography>
                        <Typography fontWeight={700} color="success.main">
                          {formatCurrency(request.approvedRefundAmount)}
                        </Typography>
                      </Box>
                    )}
                  {request.returnShippingInfo && (
                    <>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Mã đơn vận chuyển
                        </Typography>
                        <Typography
                          fontWeight={700}
                          sx={{
                            fontFamily: "monospace",
                            fontSize: 15,
                            fontWeight: 700,
                          }}
                        >
                          {request.returnShippingInfo.trackingNumber || "-"}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Đơn vị vận chuyển
                        </Typography>
                        <Typography
                          sx={{
                            fontFamily: "monospace",
                            fontSize: 15,
                            fontWeight: 700,
                          }}
                        >
                          {request.returnShippingInfo.carrierName || "-"}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Trạng thái vận chuyển
                        </Typography>
                        <Typography>
                          {shippingStatusLabel(
                            request.returnShippingInfo.status,
                          )}
                        </Typography>
                      </Box>
                      {request.status === "ApprovedForReturn" &&
                        request.returnShippingInfo.estimatedDeliveryDate && (
                          <Box sx={{ gridColumn: { xs: "1", md: "1 / -1" } }}>
                            <Alert severity="info" sx={{ py: 0.5 }}>
                              Dự kiến hàng trả về kho:{" "}
                              <b>
                                {formatDate(
                                  request.returnShippingInfo
                                    .estimatedDeliveryDate,
                                )}
                              </b>
                            </Alert>
                          </Box>
                        )}
                    </>
                  )}

                  <Box
                    sx={{
                      gridColumn: { xs: "1", md: "1 / -1" },
                      mt: 0.5,
                      pt: 2,
                      borderTop: "1px dashed",
                      borderColor: "divider",
                    }}
                  >
                    <Box
                      display="grid"
                      gridTemplateColumns={{ xs: "1fr", md: "1fr 1fr 1fr" }}
                      gap={2}
                    >
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Lý do trả hàng
                        </Typography>
                        <Typography>
                          {returnReasonLabel(request.reason)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Ghi chú khách hàng
                        </Typography>
                        <Typography sx={{ whiteSpace: "pre-wrap" }}>
                          {request.customerNote?.trim() || "-"}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Ghi chú nhân viên
                        </Typography>
                        <Typography sx={{ whiteSpace: "pre-wrap" }}>
                          {request.staffNote?.trim() || "-"}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Box>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" fontWeight={700} mb={1.5}>
                  Sản phẩm trong đơn
                </Typography>
                <Stack spacing={0} divider={<Divider />}>
                  {requestItems.map((item) => {
                    const { key, quantity, unitPrice, name, imageUrl, total } =
                      item;

                    return (
                      <Box key={key} sx={{ py: 1.5 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 2,
                          }}
                        >
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

                          <Box flex={1} minWidth={0}>
                            <Typography variant="body2" fontWeight={600}>
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
                    );
                  })}
                </Stack>
              </Paper>

              {request.proofImages && request.proofImages.length > 0 && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700} mb={1.5}>
                    Ảnh/Video minh chứng ({request.proofImages.length})
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {request.proofImages.map((img, idx) =>
                      img.url ? (
                        <Box
                          key={img.id || idx}
                          onClick={() => {
                            setLightboxMediaUrl(img.url || "");
                            setLightboxMediaMimeType(img.mimeType ?? null);
                            setLightboxOpen(true);
                          }}
                          sx={{
                            cursor: "pointer",
                            borderRadius: 1.5,
                            overflow: "hidden",
                            border: "2px solid",
                            borderColor: "divider",
                            position: "relative",
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
                                }}
                              />
                            </>
                          ) : (
                            <Box
                              component="img"
                              src={img.url}
                              alt={img.altText || `Ảnh ${idx + 1}`}
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

              {request.status === "Pending" && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700} mb={1.5}>
                    Duyệt yêu cầu
                  </Typography>
                  <Stack
                    direction="row"
                    spacing={1}
                    justifyContent="flex-end"
                    mt={2}
                  >
                    <Button
                      variant="outlined"
                      color="warning"
                      onClick={() => {
                        setMoreInfoReason("");
                        setMoreInfoDialogOpen(true);
                      }}
                      disabled={isSaving}
                    >
                      Yêu cầu bổ sung bằng chứng
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => {
                        setRejectReason("");
                        setRejectDialogOpen(true);
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

              {request.status === "ApprovedForReturn" && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700} mb={1.5}>
                    Bắt đầu kiểm định khi shop đã nhận hàng
                  </Typography>
                  <Stack direction="row" justifyContent="flex-end">
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

              {request.status === "Inspecting" && (
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
                        setInspectionRejectReason("");
                        setInspectionRejectDialogOpen(true);
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

              {request.status === "ReadyForRefund" && (
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
                        setSelectedRefundMethod("VnPay");
                        setRefundConfirmOpen(true);
                      }}
                      disabled={isSaving}
                    >
                      Hoàn tiền
                    </Button>
                  </Stack>
                </Paper>
              )}
            </Box>
          </>
        )}
      </Paper>

      <Dialog
        open={rejectDialogOpen}
        onClose={() => !isSaving && setRejectDialogOpen(false)}
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
              void handleReview(false, rejectReason, false);
            }}
            disabled={isSaving || !rejectReason.trim()}
          >
            Xác nhận từ chối
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={moreInfoDialogOpen}
        onClose={() => !isSaving && setMoreInfoDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Yêu cầu bổ sung bằng chứng</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Bạn có thể nhập lý do hoặc chọn nhanh một gợi ý bên dưới.
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={3}
            label="Lý do yêu cầu bổ sung"
            value={moreInfoReason}
            onChange={(event) => setMoreInfoReason(event.target.value)}
          />
          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
            useFlexGap
            mt={1.5}
          >
            {REJECT_REASON_SUGGESTIONS.map((reason) => {
              const isSelected = moreInfoReason.trim() === reason;
              return (
                <Chip
                  key={reason}
                  clickable
                  color={isSelected ? "primary" : "default"}
                  label={reason}
                  onClick={() => setMoreInfoReason(reason)}
                  sx={{ maxWidth: "100%" }}
                />
              );
            })}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setMoreInfoDialogOpen(false)}
            disabled={isSaving}
          >
            Hủy
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={() => {
              void handleReview(false, moreInfoReason, true);
            }}
            disabled={isSaving}
          >
            Xác nhận yêu cầu bổ sung
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={inspectionRejectDialogOpen}
        onClose={() => !isSaving && setInspectionRejectDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Nhập lý do từ chối kiểm định</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Bạn có thể nhập lý do hoặc chọn nhanh một gợi ý bên dưới.
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={3}
            label="Lý do từ chối kiểm định"
            value={inspectionRejectReason}
            onChange={(event) => setInspectionRejectReason(event.target.value)}
          />
          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
            useFlexGap
            mt={1.5}
          >
            {REJECT_REASON_SUGGESTIONS.map((reason) => {
              const isSelected = inspectionRejectReason.trim() === reason;
              return (
                <Chip
                  key={reason}
                  clickable
                  color={isSelected ? "primary" : "default"}
                  label={reason}
                  onClick={() => setInspectionRejectReason(reason)}
                  sx={{ maxWidth: "100%" }}
                />
              );
            })}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setInspectionRejectDialogOpen(false)}
            disabled={isSaving}
          >
            Hủy
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              void handleFailInspection();
            }}
            disabled={isSaving || !inspectionRejectReason.trim()}
          >
            Xác nhận từ chối kiểm định
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={refundConfirmOpen}
        onClose={() => !isSaving && setRefundConfirmOpen(false)}
      >
        <DialogTitle>Xác nhận hoàn tiền</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Chọn phương thức hoàn tiền:
          </Typography>

          <Stack
            direction="row"
            spacing={1.5}
            flexWrap="wrap"
            useFlexGap
            mb={2}
          >
            {REFUND_METHOD_OPTIONS.map((option) => {
              const active = selectedRefundMethod === option.value;
              return (
                <Paper
                  key={option.value}
                  variant="outlined"
                  onClick={() => setSelectedRefundMethod(option.value)}
                  sx={{
                    px: 1.5,
                    py: 1,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    borderColor: active ? "#ee4d2d" : "divider",
                    bgcolor: active ? "rgba(238,77,45,0.06)" : "#fff",
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
                  <Typography variant="body2" fontWeight={active ? 700 : 500}>
                    {option.label}
                  </Typography>
                </Paper>
              );
            })}
          </Stack>

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
              void handleRefund();
            }}
            disabled={isSaving}
          >
            {isSaving ? <CircularProgress size={24} /> : "Xác nhận hoàn tiền"}
          </Button>
        </DialogActions>
      </Dialog>

      <MediaPreviewDialog
        open={lightboxOpen}
        mediaUrl={lightboxMediaUrl}
        mimeType={lightboxMediaMimeType}
        onClose={() => setLightboxOpen(false)}
      />
    </AdminLayout>
  );
};

export default OrderReturnRequestDetailPage;
