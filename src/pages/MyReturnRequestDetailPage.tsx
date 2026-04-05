import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ImageIcon from "@mui/icons-material/Image";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import LocalPrintshopOutlinedIcon from "@mui/icons-material/LocalPrintshopOutlined";
import Sync from "@mui/icons-material/Sync";
import { MainLayout } from "@/layouts/MainLayout";
import { orderService, type OrderReturnRequest } from "@/services/orderService";
import { userService } from "@/services/userService";
import type { UserCredentials } from "@/services/userService";
import { useToast } from "@/hooks/useToast";
import type { OrderResponse } from "@/types/order";
import { UserProfileSidebar } from "@/components/profile/UserProfileSidebar";

const statusLabel = (status?: string) => {
  if (status === "Pending") return "Chờ duyệt";
  if (status === "ApprovedForReturn") return "Đã duyệt trả";
  if (status === "Inspecting") return "Đang kiểm định";
  if (status === "ReadyForRefund") return "Chờ hoàn tiền";
  if (status === "Rejected") return "Từ chối";
  if (status === "Completed") return "Đã hoàn tiền";
  return status || "-";
};

const shippingStatusLabel = (status?: string | null) => {
  if (!status) return "-";

  if (status === "Pending") return "Chờ lấy hàng";
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
  <Box
    sx={{
      position: open ? "fixed" : "absolute",
      inset: 0,
      bgcolor: "rgba(0,0,0,0.65)",
      zIndex: open ? 1300 : -1,
      display: open ? "flex" : "none",
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

export const MyReturnRequestDetailPage = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { returnRequestId } = useParams<{ returnRequestId: string }>();
  const [userInfo, setUserInfo] = useState<UserCredentials | null>(null);

  const [request, setRequest] = useState<OrderReturnRequest | null>(null);
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncingShipping, setIsSyncingShipping] = useState(false);
  const [isGeneratingLabelUrl, setIsGeneratingLabelUrl] = useState(false);

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
                      px: 3,
                      py: 2,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      gap: 2,
                      flexWrap: "wrap",
                    }}
                  >
                    <Button
                      startIcon={<ArrowBackIcon />}
                      onClick={() => navigate(-1)}
                      sx={{ color: "text.secondary", textTransform: "none" }}
                    >
                      TRỞ LẠI
                    </Button>

                    <Box
                      display="flex"
                      alignItems="center"
                      gap={2}
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
                            Tiền yêu cầu hoàn
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
                          {request.staffNote && (
                            <Box>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Ghi chú nhân viên
                              </Typography>
                              <Typography>{request.staffNote}</Typography>
                            </Box>
                          )}
                          {request.inspectionNote && (
                            <Box>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Ghi chú kiểm định
                              </Typography>
                              <Typography>{request.inspectionNote}</Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </Box>

                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle2" fontWeight={700} mb={1.5}>
                        Sản phẩm trong đơn
                      </Typography>
                      <Stack spacing={0} divider={<Divider />}>
                        {(order?.orderDetails || []).map((item, index) => {
                          const quantity = toNumber(item.quantity);
                          const unitPrice = toNumber(item.unitPrice);
                          const name =
                            item.variantName || `Sản phẩm ${index + 1}`;
                          const imageUrl = item.imageUrl || null;
                          const totalItem = unitPrice * quantity;

                          return (
                            <Box key={item.id || index} sx={{ py: 1.5 }}>
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

                                {totalItem > 0 && (
                                  <Typography
                                    variant="body1"
                                    fontWeight={700}
                                    color="#ee4d2d"
                                    sx={{ flexShrink: 0, whiteSpace: "nowrap" }}
                                  >
                                    {formatCurrency(totalItem)}
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
                        <Typography
                          variant="subtitle2"
                          fontWeight={700}
                          mb={1.5}
                        >
                          Ảnh/Video minh chứng ({request.proofImages.length})
                        </Typography>
                        <Stack
                          direction="row"
                          spacing={1}
                          flexWrap="wrap"
                          useFlexGap
                        >
                          {request.proofImages.map((img, idx) =>
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
