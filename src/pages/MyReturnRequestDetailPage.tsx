import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  Input,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ImageIcon from "@mui/icons-material/Image";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import LocalPrintshopOutlinedIcon from "@mui/icons-material/LocalPrintshopOutlined";
import Sync from "@mui/icons-material/Sync";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PhotoCameraOutlined from "@mui/icons-material/PhotoCameraOutlined";
import VideocamOutlined from "@mui/icons-material/VideocamOutlined";
import { MainLayout } from "@/layouts/MainLayout";
import {
  orderService,
  type OrderReturnRequest,
  type UpdateReturnRequestDto,
} from "@/services/orderService";
import { userService } from "@/services/userService";
import type { UserCredentials } from "@/services/userService";
import { useToast } from "@/hooks/useToast";
import type { OrderResponse } from "@/types/order";
import { UserProfileSidebar } from "@/components/profile/UserProfileSidebar";
import { formatDateTimeVN } from "@/utils/dateTime";

const statusLabel = (status?: string) => {
  if (status === "Pending") return "Chờ duyệt";
  if (status === "RequestMoreInfo") return "Bổ sung bằng chứng";
  if (status === "ApprovedForReturn") return "Đã duyệt trả";
  if (status === "Inspecting") return "Đang kiểm định";
  if (status === "ReadyForRefund") return "Chờ hoàn tiền";
  if (status === "Rejected") return "Từ chối";
  if (status === "Completed") return "Đã hoàn tiền";
  return status || "-";
};

const shippingStatusLabel = (status?: string | null) => {
  if (!status) return "-";

  if (status === "Pending") return "Chờ lấy hàng";
  if (status === "ReadyToPick") return "Chờ lấy hàng";
  if (status === "Confirmed") return "Đã xác nhận";
  if (status === "PickedUp") return "Đã lấy hàng";
  if (status === "InTransit") return "Đang vận chuyển";
  if (status === "Delivering") return "Đang vận chuyển";
  if (status === "OutForDelivery") return "Đang giao hàng";
  if (status === "Delivered") return "Giao hàng thành công";
  if (status === "DeliveryFailed") return "Giao hàng thất bại";
  if (status === "Returned") return "Đã hoàn hàng";
  if (status === "Cancelled") return "Đã hủy";

  return status;
};

const returnReasonLabel = (reason?: string | null) => {
  if (!reason) return "Không có lý do";

  if (reason === "DamagedProduct") return "Hàng bể vỡ / hư hỏng";
  if (reason === "WrongItemReceived") return "Người bán gửi sai hàng";
  if (reason === "ItemNotAsDescribed") return "Hàng không đúng mô tả";
  if (reason === "ChangedMind") return "Đổi ý, không còn nhu cầu";
  if (reason === "AllergicReaction") return "Không phù hợp / kích ứng";

  return reason;
};

const returnOptionLabel = (isRefundOnly?: boolean | null) =>
  isRefundOnly ? "Hoàn trả (Không trả hàng)" : "Trả hàng/Hoàn trả";

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

const formatDate = (value?: string | null) => formatDateTimeVN(value);

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
}) => {
  if (!open || !mediaUrl) {
    return null;
  }

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        bgcolor: "rgba(0,0,0,0.65)",
        zIndex: 1300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
      onClick={onClose}
    >
      <Box onClick={(e) => e.stopPropagation()}>
        {isVideoMedia(mediaUrl, mimeType) ? (
          <Box
            component="video"
            src={mediaUrl}
            controls
            sx={{ maxWidth: "90vw", maxHeight: "85vh", display: "block" }}
          />
        ) : (
          <Box
            component="img"
            src={mediaUrl}
            alt="Ảnh minh chứng"
            sx={{ maxWidth: "90vw", maxHeight: "85vh", display: "block" }}
          />
        )}
      </Box>
    </Box>
  );
};

export const MyReturnRequestDetailPage = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { returnRequestId } = useParams<{ returnRequestId: string }>();

  const backState = location.state as
    | {
        status?: string;
        page?: number;
        pageSize?: number;
      }
    | undefined;

  const handleBack = () => {
    navigate("/my-return-requests", {
      state: {
        status: backState?.status ?? "All",
        page: backState?.page ?? 1,
        pageSize: backState?.pageSize ?? 10,
      },
    });
  };
  const [userInfo, setUserInfo] = useState<UserCredentials | null>(null);

  const [request, setRequest] = useState<OrderReturnRequest | null>(null);
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncingShipping, setIsSyncingShipping] = useState(false);
  const [isGeneratingLabelUrl, setIsGeneratingLabelUrl] = useState(false);
  const [isUpdatingEvidence, setIsUpdatingEvidence] = useState(false);
  const [customerNoteDraft, setCustomerNoteDraft] = useState("");
  const [newMediaFiles, setNewMediaFiles] = useState<File[]>([]);
  const [removeMediaIds, setRemoveMediaIds] = useState<string[]>([]);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedMediaUrl, setSelectedMediaUrl] = useState("");
  const [selectedMediaMimeType, setSelectedMediaMimeType] = useState<
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
        const orderDetail = await orderService.getMyOrderById(
          fullRequest.orderId,
        );
        setOrder(orderDetail);
      } else {
        setOrder(null);
      }

      setCustomerNoteDraft(fullRequest.customerNote || "");
      setNewMediaFiles([]);
      setRemoveMediaIds([]);
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
    void userService.getUserMe().then(setUserInfo).catch(console.error);
  }, []);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const handleSyncShippingStatus = async () => {
    if (!request?.id) {
      return;
    }

    try {
      setIsSyncingShipping(true);
      await orderService.syncMyShippingStatus();
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

  const isRequestMoreInfo = request?.status === "RequestMoreInfo";
  const shouldShowStaffNote =
    request?.status === "Rejected" || request?.status === "RequestMoreInfo";

  const existingProofImages = request?.proofImages || [];
  const visibleProofImages = existingProofImages.filter(
    (media) => !removeMediaIds.includes(media.id || ""),
  );

  const newImageFilesCount = newMediaFiles.filter(
    (file) => !file.type.startsWith("video/"),
  ).length;

  const newVideoFilesCount = newMediaFiles.filter((file) =>
    file.type.startsWith("video/"),
  ).length;

  const newMediaPreviews = useMemo(
    () =>
      newMediaFiles.map((file, index) => ({
        index,
        name: file.name,
        mimeType: file.type,
        isVideo: file.type.startsWith("video/"),
        url: URL.createObjectURL(file),
      })),
    [newMediaFiles],
  );

  useEffect(() => {
    return () => {
      newMediaPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [newMediaPreviews]);

  const handlePickNewImages = (event: React.ChangeEvent<HTMLInputElement>) => {
    const pickedFiles = Array.from(event.target.files || []).filter((file) =>
      file.type.startsWith("image/"),
    );
    if (!pickedFiles.length) {
      return;
    }

    setNewMediaFiles((prev) => [...prev, ...pickedFiles]);
    event.target.value = "";
  };

  const handlePickNewVideos = (event: React.ChangeEvent<HTMLInputElement>) => {
    const pickedFiles = Array.from(event.target.files || []).filter((file) =>
      file.type.startsWith("video/"),
    );
    if (!pickedFiles.length) {
      return;
    }

    setNewMediaFiles((prev) => [...prev, ...pickedFiles]);
    event.target.value = "";
  };

  const handleRemoveExistingMedia = (mediaId?: string) => {
    if (!mediaId) {
      showToast("Không thể xóa media này vì thiếu mã định danh", "warning");
      return;
    }

    setRemoveMediaIds((prev) =>
      prev.includes(mediaId) ? prev : [...prev, mediaId],
    );
  };

  const handleUndoRemoveExistingMedia = (mediaId?: string) => {
    if (!mediaId) return;
    setRemoveMediaIds((prev) => prev.filter((id) => id !== mediaId));
  };

  const handleRemoveNewFile = (indexToRemove: number) => {
    setNewMediaFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmitMoreEvidence = async () => {
    if (!request?.id || !isRequestMoreInfo) {
      return;
    }

    const draftCustomerNote = customerNoteDraft.trim();
    const currentCustomerNote = (request.customerNote || "").trim();
    const isCustomerNoteChanged = draftCustomerNote !== currentCustomerNote;

    if (
      removeMediaIds.length === 0 &&
      newMediaFiles.length === 0 &&
      !isCustomerNoteChanged
    ) {
      showToast(
        "Bạn chưa thay đổi hình ảnh/video hoặc ghi chú để cập nhật",
        "warning",
      );
      return;
    }

    try {
      setIsUpdatingEvidence(true);

      let temporaryMediaIds: string[] = [];
      if (newMediaFiles.length > 0) {
        const uploadResult =
          await orderService.uploadTemporaryReturnMedia(newMediaFiles);
        temporaryMediaIds = uploadResult
          .map((item) => item.id)
          .filter((id): id is string => Boolean(id));
      }

      const updatePayload: UpdateReturnRequestDto = {
        customerNote: draftCustomerNote || null,
        temporaryMediaIds: temporaryMediaIds.length ? temporaryMediaIds : null,
        removeMediaIds: removeMediaIds.length ? removeMediaIds : null,
      };

      await orderService.updateReturnRequest(request.id, updatePayload);

      showToast("Đã gửi bổ sung bằng chứng thành công", "success");
      await loadDetail();
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Không thể cập nhật yêu cầu bổ sung bằng chứng",
        "error",
      );
    } finally {
      setIsUpdatingEvidence(false);
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
          campaignPrice: 0,
          campaignDiscount: 0,
          voucherDiscount: 0,
          refundableAmount: unitPrice * quantity,
          totalItem: unitPrice * quantity,
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
      const campaignPrice = toNumber(detail.campaignPrice ?? 0);
      const campaignDiscount = toNumber(detail.campaignDiscount ?? 0);
      const voucherDiscount = toNumber(detail.voucherDiscount ?? 0);
      const refundableAmount = toNumber(detail.refundableAmount);

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
        campaignPrice,
        campaignDiscount,
        voucherDiscount,
        refundableAmount,
        totalItem: unitPrice * quantity,
      };
    });
  }, [order?.orderDetails, request?.returnDetails]);

  const refundSummary = useMemo(() => {
    const totalRefundableAmount = requestItems.reduce(
      (sum, item) => sum + toNumber(item.refundableAmount),
      0,
    );
    const refundedShippingFee = toNumber(request?.refundedShippingFee ?? 0);
    const totalAmount = toNumber(request?.requestedRefundAmount);

    return {
      totalRefundableAmount,
      refundedShippingFee,
      totalAmount,
    };
  }, [requestItems, request]);

  return (
    <MainLayout>
      <Box sx={{ bgcolor: "background.default", py: 4, flex: 1 }}>
        <Container maxWidth="lg">
          <Paper
            elevation={0}
            sx={{
              display: "flex",
              overflow: "hidden",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              minHeight: 600,
            }}
          >
            <UserProfileSidebar userInfo={userInfo} />

            <Box
              sx={{
                flex: 1,
                bgcolor: "background.paper",
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
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
                      px: { xs: 2, sm: 3 },
                      py: { xs: 1.5, sm: 2 },
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      gap: { xs: 1, sm: 2 },
                      flexWrap: "wrap",
                    }}
                  >
                    <Button
                      startIcon={<ArrowBackIcon />}
                      onClick={handleBack}
                      size="small"
                      sx={{
                        color: "text.secondary",
                        textTransform: "none",
                        fontSize: { xs: "0.75rem", sm: "0.875rem" },
                        px: { xs: 1, sm: 2 },
                      }}
                    >
                      TRỞ LẠI
                    </Button>

                    <Box
                      display="flex"
                      alignItems="center"
                      gap={{ xs: 0.5, sm: 1, md: 2 }}
                      flexWrap="wrap"
                      justifyContent="flex-end"
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
                        sx={{
                          letterSpacing: 0.5,
                          fontSize: { xs: "0.75rem", sm: "0.875rem" },
                          display: { xs: "none", sm: "block" },
                        }}
                      >
                        MÃ ĐƠN HÀNG:{" "}
                        <b style={{ color: "inherit" }}>
                          {(request.orderCode || "-").toUpperCase()}
                        </b>
                      </Typography>
                      <Divider
                        orientation="vertical"
                        flexItem
                        sx={{ display: { xs: "none", sm: "block" } }}
                      />
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        sx={{
                          color: "#ee4d2d",
                          textTransform: "uppercase",
                          fontSize: { xs: "0.75rem", sm: "0.875rem" },
                        }}
                      >
                        {statusLabel(request.status)}
                      </Typography>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      p: 3,
                      display: "flex",
                      flexDirection: "column",
                      gap: 2.5,
                    }}
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
                            sx={{ fontFamily: "monospace", fontSize: 13 }}
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
                          <Typography>
                            {request.requestedByEmail || "-"}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Ngày tạo
                          </Typography>
                          <Typography>
                            {formatDate(request.createdAt)}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Tiền ước tính hoàn
                          </Typography>
                          <Typography fontWeight={700} color="#ee4d2d">
                            {formatCurrency(request.requestedRefundAmount)}
                          </Typography>
                        </Box>
                        {request.approvedRefundAmount != null &&
                          request.approvedRefundAmount > 0 && (
                            <Box>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Tiền được duyệt hoàn
                              </Typography>
                              <Typography fontWeight={700} color="success.main">
                                {formatCurrency(request.approvedRefundAmount)}
                              </Typography>
                            </Box>
                          )}
                        {request.processedByName && (
                          <Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Người xử lý
                            </Typography>
                            <Typography>{request.processedByName}</Typography>
                          </Box>
                        )}
                        {request.inspectedByName && (
                          <Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Người kiểm định
                            </Typography>
                            <Typography>{request.inspectedByName}</Typography>
                          </Box>
                        )}
                        {request.updatedAt && (
                          <Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Cập nhật lần cuối
                            </Typography>
                            <Typography>
                              {formatDate(request.updatedAt)}
                            </Typography>
                          </Box>
                        )}
                        {request.returnShippingInfo && (
                          <>
                            <Box>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Mã đơn vận chuyển
                              </Typography>
                              <Typography
                                sx={{
                                  fontFamily: "monospace",
                                  fontSize: 15,
                                  fontWeight: 700,
                                }}
                              >
                                {request.returnShippingInfo.trackingNumber ||
                                  "-"}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
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
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Trạng thái vận chuyển
                              </Typography>
                              <Typography>
                                {shippingStatusLabel(
                                  request.returnShippingInfo.status,
                                )}
                              </Typography>
                            </Box>
                          </>
                        )}
                      </Box>

                      <Box
                        mt={2}
                        pt={2}
                        sx={{ borderTop: "1px dashed", borderColor: "divider" }}
                      >
                        <Box
                          display="grid"
                          gridTemplateColumns={{ xs: "1fr", md: "1fr 1fr" }}
                          gap={2}
                        >
                          <Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Phương án khách chọn
                            </Typography>
                            <Typography>
                              {returnOptionLabel(request.isRefundOnly === true)}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Lý do trả hàng
                            </Typography>
                            <Typography>
                              {returnReasonLabel(request.reason)}
                            </Typography>
                          </Box>
                          {request.customerNote && (
                            <Box>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Ghi chú khách hàng
                              </Typography>
                              <Typography>{request.customerNote}</Typography>
                            </Box>
                          )}
                          {shouldShowStaffNote && request.staffNote && (
                            <Box>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Ghi chú nhân viên / kiểm định
                              </Typography>
                              <Typography>
                                {request.staffNote?.trim() ||
                                  request.inspectionNote?.trim() ||
                                  "-"}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </Box>

                    {request.status === "ApprovedForReturn" &&
                      request.returnShippingInfo?.trackingNumber && (
                        <Alert severity="success" sx={{ mb: 1 }}>
                          <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                            Vui lòng <strong>in đơn vận chuyển</strong> từ nút
                            "In phiếu" ở trên, sau đó{" "}
                            <strong>dán vào bên ngoài kiện hàng</strong> để bưu
                            tá có thể đến lấy. Bước này rất quan trọng để đảm
                            bảo việc vận chuyển diễn ra suôn sẻ.
                          </Typography>
                        </Alert>
                      )}

                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle2" fontWeight={700} mb={2}>
                        Bảng đối soát hoàn tiền
                      </Typography>

                      {/* Mobile/Tablet View */}
                      <Stack
                        spacing={2}
                        divider={<Divider />}
                        sx={{ display: { xs: "flex", md: "none" } }}
                      >
                        {requestItems.map((item) => {
                          const campaignDiscountAmount =
                            (toNumber(item.unitPrice) -
                              toNumber(item.campaignPrice)) *
                            toNumber(item.quantity);
                          const voucherDiscountAmount = toNumber(
                            item.voucherDiscount,
                          );
                          const totalDiscount =
                            campaignDiscountAmount + voucherDiscountAmount;

                          return (
                            <Box key={item.key} sx={{ py: 1 }}>
                              <Box sx={{ display: "flex", gap: 1.5, mb: 1.5 }}>
                                {item.imageUrl ? (
                                  <Box
                                    component="img"
                                    src={item.imageUrl}
                                    alt={item.name}
                                    sx={{
                                      width: 64,
                                      height: 64,
                                      borderRadius: 1,
                                      objectFit: "cover",
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
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      border: "1px solid",
                                      borderColor: "divider",
                                      flexShrink: 0,
                                    }}
                                  >
                                    <ImageIcon
                                      sx={{ color: "grey.400", fontSize: 24 }}
                                    />
                                  </Box>
                                )}
                                <Box flex={1}>
                                  <Typography variant="body2" fontWeight={600}>
                                    {item.name}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    Số lượng: {item.quantity}
                                  </Typography>
                                </Box>
                              </Box>

                              <Stack
                                spacing={0.5}
                                sx={{
                                  bgcolor: "grey.50",
                                  p: 1.5,
                                  borderRadius: 1,
                                }}
                              >
                                <Box
                                  sx={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                  }}
                                >
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    Đơn giá gốc:
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    fontWeight={600}
                                  >
                                    {formatCurrency(item.unitPrice)}
                                  </Typography>
                                </Box>
                                <Box
                                  sx={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                  }}
                                >
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    Chiết khấu:
                                  </Typography>
                                  {totalDiscount > 0 ? (
                                    <Typography
                                      variant="caption"
                                      color="error.main"
                                      fontWeight={600}
                                    >
                                      -{formatCurrency(totalDiscount)}
                                    </Typography>
                                  ) : (
                                    <Typography
                                      variant="caption"
                                      color="text.disabled"
                                    >
                                      -
                                    </Typography>
                                  )}
                                </Box>
                                <Divider sx={{ my: 0.5 }} />
                                <Box
                                  sx={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                  }}
                                >
                                  <Typography variant="body2" fontWeight={700}>
                                    Thực trả / Hoàn tiền:
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    fontWeight={700}
                                    color="primary.main"
                                  >
                                    {formatCurrency(item.refundableAmount)}
                                  </Typography>
                                </Box>
                              </Stack>
                            </Box>
                          );
                        })}
                      </Stack>

                      {/* Desktop Table View */}
                      <Box
                        sx={{
                          display: { xs: "none", md: "block" },
                          overflowX: "auto",
                        }}
                      >
                        <table
                          style={{ width: "100%", borderCollapse: "collapse" }}
                        >
                          <thead>
                            <tr
                              style={{
                                borderBottom: "2px solid #e0e0e0",
                              }}
                            >
                              <th
                                style={{
                                  textAlign: "left",
                                  padding: "12px 8px",
                                  fontWeight: 600,
                                  fontSize: "0.875rem",
                                  color: "#666",
                                }}
                              >
                                Sản phẩm
                              </th>
                              <th
                                style={{
                                  textAlign: "right",
                                  padding: "12px 8px",
                                  fontWeight: 600,
                                  fontSize: "0.875rem",
                                  color: "#666",
                                  minWidth: "100px",
                                }}
                              >
                                Đơn giá gốc
                              </th>
                              <th
                                style={{
                                  textAlign: "right",
                                  padding: "12px 8px",
                                  fontWeight: 600,
                                  fontSize: "0.875rem",
                                  color: "#666",
                                  minWidth: "100px",
                                }}
                              >
                                Chiết khấu
                              </th>
                              <th
                                style={{
                                  textAlign: "right",
                                  padding: "12px 8px",
                                  fontWeight: 600,
                                  fontSize: "0.875rem",
                                  color: "#666",
                                  minWidth: "120px",
                                }}
                              >
                                Thực trả / Hoàn tiền
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {requestItems.map((item) => {
                              const campaignDiscountAmount =
                                (toNumber(item.unitPrice) -
                                  toNumber(item.campaignPrice)) *
                                toNumber(item.quantity);
                              const voucherDiscountAmount = toNumber(
                                item.voucherDiscount,
                              );
                              const totalDiscount =
                                campaignDiscountAmount + voucherDiscountAmount;

                              return (
                                <tr
                                  key={item.key}
                                  style={{
                                    borderBottom: "1px solid #f0f0f0",
                                  }}
                                >
                                  <td style={{ padding: "16px 8px" }}>
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 2,
                                      }}
                                    >
                                      {item.imageUrl ? (
                                        <Box
                                          component="img"
                                          src={item.imageUrl}
                                          alt={item.name}
                                          sx={{
                                            width: 60,
                                            height: 60,
                                            borderRadius: 1,
                                            objectFit: "cover",
                                            border: "1px solid",
                                            borderColor: "divider",
                                            flexShrink: 0,
                                          }}
                                        />
                                      ) : (
                                        <Box
                                          sx={{
                                            width: 60,
                                            height: 60,
                                            borderRadius: 1,
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
                                            sx={{
                                              color: "grey.400",
                                              fontSize: 24,
                                            }}
                                          />
                                        </Box>
                                      )}
                                      <Box>
                                        <Typography
                                          variant="body2"
                                          fontWeight={600}
                                        >
                                          {item.name}
                                        </Typography>
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                        >
                                          Số lượng: {item.quantity}
                                        </Typography>
                                      </Box>
                                    </Box>
                                  </td>
                                  <td
                                    style={{
                                      textAlign: "right",
                                      padding: "16px 8px",
                                    }}
                                  >
                                    <Typography variant="body2">
                                      {formatCurrency(item.unitPrice)}
                                    </Typography>
                                  </td>
                                  <td
                                    style={{
                                      textAlign: "right",
                                      padding: "16px 8px",
                                    }}
                                  >
                                    {totalDiscount > 0 ? (
                                      <Typography
                                        variant="body2"
                                        color="error.main"
                                        fontWeight={600}
                                      >
                                        -{formatCurrency(totalDiscount)}
                                      </Typography>
                                    ) : (
                                      <Typography
                                        variant="body2"
                                        color="text.disabled"
                                      >
                                        -
                                      </Typography>
                                    )}
                                  </td>
                                  <td
                                    style={{
                                      textAlign: "right",
                                      padding: "16px 8px",
                                    }}
                                  >
                                    <Typography
                                      variant="body2"
                                      fontWeight={700}
                                      color="primary.main"
                                    >
                                      {formatCurrency(item.refundableAmount)}
                                    </Typography>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </Box>

                      {/* Refund Summary */}
                      <Box
                        sx={{
                          mt: 3,
                          pt: 2,
                          borderTop: "2px solid",
                          borderColor: "divider",
                        }}
                      >
                        <Stack
                          spacing={1}
                          sx={{
                            maxWidth: { xs: "100%", md: "400px" },
                            ml: "auto",
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <Typography variant="body2" color="text.secondary">
                              Tiền hàng hoàn lại:
                            </Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {formatCurrency(
                                refundSummary.totalRefundableAmount,
                              )}
                            </Typography>
                          </Box>

                          {refundSummary.refundedShippingFee > 0 && (
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Phí vận chuyển hoàn lại:
                              </Typography>
                              <Typography
                                variant="body2"
                                fontWeight={600}
                                color="success.main"
                              >
                                {formatCurrency(
                                  refundSummary.refundedShippingFee,
                                )}
                              </Typography>
                            </Box>
                          )}

                          <Divider sx={{ my: 1 }} />

                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <Typography
                              variant="h6"
                              fontWeight={700}
                              sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }}
                            >
                              TỔNG TIỀN HOÀN:
                            </Typography>
                            <Typography
                              variant="h6"
                              fontWeight={700}
                              color="error.main"
                              sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }}
                            >
                              {formatCurrency(refundSummary.totalAmount)}
                            </Typography>
                          </Box>
                        </Stack>
                      </Box>
                    </Paper>

                    {request.proofImages && request.proofImages.length > 0 && (
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography
                          variant="subtitle2"
                          fontWeight={700}
                          mb={1.5}
                        >
                          Ảnh/Video minh chứng ({visibleProofImages.length})
                        </Typography>
                        <Stack
                          direction="row"
                          spacing={1}
                          flexWrap="wrap"
                          useFlexGap
                        >
                          {visibleProofImages.map((img, idx) =>
                            img.url ? (
                              <Box
                                key={img.id || idx}
                                onClick={() => {
                                  setSelectedMediaUrl(img.url || "");
                                  setSelectedMediaMimeType(
                                    img.mimeType ?? null,
                                  );
                                  setLightboxOpen(true);
                                }}
                                sx={{
                                  cursor: "pointer",
                                  borderRadius: 1.5,
                                  overflow: "hidden",
                                  border: "2px solid",
                                  borderColor: "divider",
                                  transition: "all 0.2s",
                                  position: "relative",
                                  bgcolor: "grey.100",
                                }}
                              >
                                {isRequestMoreInfo && img.id && (
                                  <IconButton
                                    size="small"
                                    onPointerDown={(event) => {
                                      event.stopPropagation();
                                    }}
                                    onMouseDown={(event) => {
                                      event.stopPropagation();
                                    }}
                                    onClick={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      if (removeMediaIds.includes(img.id!)) {
                                        handleUndoRemoveExistingMedia(img.id);
                                      } else {
                                        handleRemoveExistingMedia(img.id);
                                      }
                                    }}
                                    sx={{
                                      position: "absolute",
                                      top: 4,
                                      right: 4,
                                      zIndex: 2,
                                      bgcolor: removeMediaIds.includes(img.id)
                                        ? "warning.main"
                                        : "rgba(0,0,0,0.6)",
                                      color: "white",
                                      "&:hover": {
                                        bgcolor: removeMediaIds.includes(img.id)
                                          ? "warning.dark"
                                          : "rgba(0,0,0,0.8)",
                                      },
                                    }}
                                  >
                                    <DeleteOutlineIcon fontSize="small" />
                                  </IconButton>
                                )}

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

                        {isRequestMoreInfo && (
                          <Typography
                            variant="caption"
                            color="warning.main"
                            sx={{ display: "block", mt: 1 }}
                          >
                            Nhấn biểu tượng thùng rác trên ảnh/video cũ để đánh
                            dấu xóa trước khi gửi cập nhật.
                          </Typography>
                        )}
                      </Paper>
                    )}

                    {isRequestMoreInfo && (
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography
                          variant="subtitle2"
                          fontWeight={700}
                          mb={1.5}
                        >
                          Bổ sung bằng chứng
                        </Typography>

                        <Alert severity="info" sx={{ mb: 2 }}>
                          Vui lòng bổ sung hình ảnh/video theo yêu cầu của quản
                          trị viên. Bạn có thể thêm mới hoặc xóa media cũ trước
                          khi gửi lại.
                        </Alert>

                        <Stack
                          direction="row"
                          spacing={1.5}
                          useFlexGap
                          flexWrap="wrap"
                        >
                          <Box
                            component="label"
                            sx={{
                              border: "1px dashed",
                              borderColor: "divider",
                              borderRadius: 2,
                              p: 1.5,
                              width: 164,
                              textAlign: "center",
                              cursor: isUpdatingEvidence
                                ? "not-allowed"
                                : "pointer",
                              bgcolor: "#fafafa",
                              opacity: isUpdatingEvidence ? 0.6 : 1,
                            }}
                          >
                            <PhotoCameraOutlined
                              sx={{ color: "text.secondary" }}
                            />
                            <Typography variant="body2" mt={0.5}>
                              Thêm Hình ảnh
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {newImageFilesCount}
                            </Typography>
                            <Input
                              type="file"
                              inputProps={{ accept: "image/*", multiple: true }}
                              onChange={handlePickNewImages}
                              disabled={isUpdatingEvidence}
                              sx={{ display: "none" }}
                            />
                          </Box>

                          <Box
                            component="label"
                            sx={{
                              border: "1px dashed",
                              borderColor: "divider",
                              borderRadius: 2,
                              p: 1.5,
                              width: 164,
                              textAlign: "center",
                              cursor: isUpdatingEvidence
                                ? "not-allowed"
                                : "pointer",
                              bgcolor: "#fafafa",
                              opacity: isUpdatingEvidence ? 0.6 : 1,
                            }}
                          >
                            <VideocamOutlined
                              sx={{ color: "text.secondary" }}
                            />
                            <Typography variant="body2" mt={0.5}>
                              Thêm Video
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {newVideoFilesCount}
                            </Typography>
                            <Input
                              type="file"
                              inputProps={{ accept: "video/*" }}
                              onChange={handlePickNewVideos}
                              disabled={isUpdatingEvidence}
                              sx={{ display: "none" }}
                            />
                          </Box>
                        </Stack>

                        {newMediaPreviews.length > 0 && (
                          <Stack spacing={1} mt={2}>
                            <Typography variant="body2" fontWeight={600}>
                              Tệp mới đã chọn
                            </Typography>
                            <Stack
                              direction="row"
                              spacing={1}
                              flexWrap="wrap"
                              useFlexGap
                            >
                              {newMediaPreviews.map((preview) => (
                                <Box
                                  key={`${preview.name}-${preview.index}`}
                                  onClick={() => {
                                    setSelectedMediaUrl(preview.url);
                                    setSelectedMediaMimeType(preview.mimeType);
                                    setLightboxOpen(true);
                                  }}
                                  sx={{
                                    cursor: "pointer",
                                    borderRadius: 1.5,
                                    overflow: "hidden",
                                    border: "2px solid",
                                    borderColor: "divider",
                                    transition: "all 0.2s",
                                    position: "relative",
                                    bgcolor: "grey.100",
                                  }}
                                >
                                  <IconButton
                                    size="small"
                                    onPointerDown={(event) => {
                                      event.stopPropagation();
                                    }}
                                    onMouseDown={(event) => {
                                      event.stopPropagation();
                                    }}
                                    onClick={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      handleRemoveNewFile(preview.index);
                                    }}
                                    disabled={isUpdatingEvidence}
                                    sx={{
                                      position: "absolute",
                                      top: 4,
                                      right: 4,
                                      zIndex: 2,
                                      bgcolor: "rgba(0,0,0,0.6)",
                                      color: "white",
                                      "&:hover": {
                                        bgcolor: "rgba(0,0,0,0.8)",
                                      },
                                    }}
                                  >
                                    <DeleteOutlineIcon fontSize="small" />
                                  </IconButton>

                                  {preview.isVideo ? (
                                    <>
                                      <Box
                                        component="video"
                                        src={preview.url}
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
                                      src={preview.url}
                                      alt={preview.name}
                                      sx={{
                                        width: 100,
                                        height: 100,
                                        objectFit: "cover",
                                        display: "block",
                                      }}
                                    />
                                  )}
                                </Box>
                              ))}
                            </Stack>
                          </Stack>
                        )}

                        <TextField
                          fullWidth
                          multiline
                          minRows={3}
                          label="Ghi chú của bạn (có thể chỉnh sửa)"
                          value={customerNoteDraft}
                          onChange={(event) =>
                            setCustomerNoteDraft(event.target.value)
                          }
                          disabled={isUpdatingEvidence}
                          sx={{ mt: 2 }}
                        />

                        <Stack
                          direction="row"
                          justifyContent="flex-end"
                          spacing={1}
                          mt={2}
                        >
                          <Button
                            variant="contained"
                            onClick={handleSubmitMoreEvidence}
                            disabled={isUpdatingEvidence}
                          >
                            {isUpdatingEvidence
                              ? "Đang gửi cập nhật..."
                              : "Gửi bổ sung bằng chứng"}
                          </Button>
                        </Stack>
                      </Paper>
                    )}
                  </Box>
                </>
              )}
            </Box>
          </Paper>
        </Container>
      </Box>

      <MediaPreviewDialog
        open={lightboxOpen}
        mediaUrl={selectedMediaUrl}
        mimeType={selectedMediaMimeType}
        onClose={() => setLightboxOpen(false)}
      />
    </MainLayout>
  );
};

export default MyReturnRequestDetailPage;
