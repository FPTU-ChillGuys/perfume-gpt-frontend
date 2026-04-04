import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material";
import ImageIcon from "@mui/icons-material/Image";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import { MainLayout } from "@/layouts/MainLayout";
import {
  orderService,
  type OrderReturnRequest,
  type ReturnRequestStatus,
} from "@/services/orderService";
import { userService } from "@/services/userService";
import type { UserCredentials } from "@/services/userService";
import { useToast } from "@/hooks/useToast";
import type { OrderResponse } from "@/types/order";
import { UserProfileSidebar } from "@/components/profile/UserProfileSidebar";

const STATUS_TABS: { label: string; value: ReturnRequestStatus | "All" }[] = [
  { label: "Tất cả", value: "All" },
  { label: "Chờ duyệt", value: "Pending" },
  { label: "Đã duyệt trả", value: "ApprovedForReturn" },
  { label: "Đang kiểm định", value: "Inspecting" },
  { label: "Chờ hoàn tiền", value: "ReadyForRefund" },
  { label: "Từ chối", value: "Rejected" },
  { label: "Đã hoàn tất", value: "Completed" },
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

/* ─── Image Lightbox ─── */
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

export const MyReturnRequestsPage = () => {
  const { showToast } = useToast();
  const [userInfo, setUserInfo] = useState<UserCredentials | null>(null);

  const [requests, setRequests] = useState<OrderReturnRequest[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [status, setStatus] = useState<ReturnRequestStatus | "All">("All");
  const [isLoading, setIsLoading] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] =
    useState<OrderReturnRequest | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderResponse | null>(
    null,
  );
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedMediaUrl, setSelectedMediaUrl] = useState("");
  const [selectedMediaMimeType, setSelectedMediaMimeType] = useState<
    string | null
  >(null);

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const { items, totalCount: count } =
        await orderService.getMyReturnRequests({
          PageNumber: page,
          PageSize: pageSize,
          Status: status,
          SortBy: "CreatedAt",
          SortOrder: "desc",
        });
      setRequests(items);
      setTotalCount(count);
    } catch (error) {
      console.error("Failed to load return requests", error);
      showToast(
        error instanceof Error
          ? error.message
          : "Không thể tải danh sách yêu cầu hoàn trả",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, status, showToast]);

  useEffect(() => {
    void userService.getUserMe().then(setUserInfo).catch(console.error);
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const handleOpenDetail = async (request: OrderReturnRequest) => {
    setSelectedRequest(request);
    setSelectedOrder(null);
    setDetailOpen(true);
    setIsDetailLoading(true);
    try {
      let loadedRequest = request;
      if (request.id) {
        const fullRequest = await orderService.getReturnRequestById(request.id);
        setSelectedRequest(fullRequest);
        loadedRequest = fullRequest;
      }

      const orderId = loadedRequest.orderId || request.orderId;
      if (orderId) {
        const order = await orderService.getMyOrderById(orderId);
        setSelectedOrder(order);
      }
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Không thể tải chi tiết",
        "error",
      );
    } finally {
      setIsDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setSelectedRequest(null);
    setSelectedOrder(null);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <MainLayout>
      <Box sx={{ bgcolor: "white", py: 4, flex: 1 }}>
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

            {/* Main content */}
            <Box
              sx={{
                flex: 1,
                bgcolor: "#fff",
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
                <Tabs
                  value={status}
                  onChange={(_, val) => {
                    setStatus(val);
                    setPage(1);
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
                  {STATUS_TABS.map((tab) => (
                    <Tab key={tab.value} label={tab.label} value={tab.value} />
                  ))}
                </Tabs>
              </Box>

              <Box
                sx={{
                  p: 3,
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                {isLoading ? (
                  <Box sx={{ py: 8, textAlign: "center" }}>
                    <CircularProgress sx={{ color: "#ee4d2d" }} />
                  </Box>
                ) : requests.length === 0 ? (
                  <Box sx={{ py: 8, textAlign: "center" }}>
                    <Typography
                      variant="h6"
                      color="text.secondary"
                      gutterBottom
                    >
                      Chưa có yêu cầu hoàn trả nào
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Các yêu cầu hoàn trả sản phẩm của bạn sẽ xuất hiện tại
                      đây.
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={2}>
                    {requests.map((request) => (
                      <Paper
                        key={request.id}
                        variant="outlined"
                        sx={{ p: 2.5, borderRadius: 2 }}
                      >
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                          mb={1.5}
                        >
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <Tooltip title={request.orderId || ""}>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ fontFamily: "monospace" }}
                              >
                                Đơn hàng: #{request.orderId || "-"}
                              </Typography>
                            </Tooltip>
                            <Typography variant="body2" color="text.secondary">
                              ·
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {formatDate(request.createdAt)}
                            </Typography>
                          </Stack>
                          <Chip
                            label={statusLabel(request.status)}
                            color={statusColor(request.status)}
                            variant="filled"
                            size="small"
                          />
                        </Stack>

                        <Divider sx={{ mb: 1.5 }} />

                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          justifyContent="space-between"
                          alignItems={{ xs: "flex-start", sm: "center" }}
                          spacing={1}
                        >
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ maxWidth: "60%" }}
                          >
                            <strong>Lý do:</strong>{" "}
                            {returnReasonLabel(request.reason)}
                          </Typography>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <Typography variant="body2" color="text.secondary">
                              Yêu cầu hoàn:
                            </Typography>
                            <Typography
                              variant="subtitle1"
                              fontWeight={700}
                              sx={{ color: "#ee4d2d" }}
                            >
                              {formatCurrency(request.requestedRefundAmount)}
                            </Typography>
                          </Stack>
                        </Stack>

                        <Divider sx={{ my: 1.5 }} />

                        <Stack direction="row" justifyContent="flex-end">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              void handleOpenDetail(request);
                            }}
                            sx={{
                              borderColor: "#ee4d2d",
                              color: "#ee4d2d",
                              "&:hover": {
                                borderColor: "#d03e27",
                                bgcolor: "rgba(238,77,45,0.04)",
                              },
                            }}
                          >
                            Xem chi tiết
                          </Button>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                )}

                {requests.length > 0 && (
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    justifyContent="space-between"
                    alignItems="center"
                    spacing={2}
                    pt={1}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Typography variant="body2" color="text.secondary">
                        Hiển thị
                      </Typography>
                      <FormControl size="small">
                        <Select
                          value={pageSize.toString()}
                          onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setPage(1);
                          }}
                        >
                          <MenuItem value={5}>5</MenuItem>
                          <MenuItem value={10}>10</MenuItem>
                          <MenuItem value={20}>20</MenuItem>
                        </Select>
                      </FormControl>
                      <Typography variant="body2" color="text.secondary">
                        / {totalCount} yêu cầu
                      </Typography>
                    </Stack>
                    <Pagination
                      count={totalPages}
                      page={page}
                      onChange={(_, value) => setPage(value)}
                      showFirstButton
                      showLastButton
                      sx={{
                        "& .Mui-selected": {
                          bgcolor: "#ee4d2d !important",
                          color: "#fff",
                        },
                      }}
                    />
                  </Stack>
                )}
              </Box>
            </Box>
          </Paper>
        </Container>
      </Box>

      {/* Detail Dialog */}
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
          {isDetailLoading || !selectedRequest ? (
            <Box textAlign="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            <Stack spacing={2.5}>
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
                      {selectedRequest.proofImages.map((imgDef, idx) => {
                        const mediaUrl =
                          typeof imgDef === "string"
                            ? imgDef
                            : (imgDef as any).url;
                        const mimeType =
                          typeof imgDef === "string"
                            ? null
                            : ((imgDef as any).mimeType ?? null);
                        if (!mediaUrl) return null;

                        const isVideo = isVideoMedia(mediaUrl, mimeType);

                        return (
                          <Box
                            key={idx}
                            onClick={() => {
                              setSelectedMediaUrl(mediaUrl);
                              setSelectedMediaMimeType(mimeType);
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
                            {isVideo ? (
                              <>
                                <Box
                                  component="video"
                                  src={mediaUrl}
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
                                src={mediaUrl}
                                sx={{
                                  width: 100,
                                  height: 100,
                                  objectFit: "cover",
                                  display: "block",
                                }}
                              />
                            )}
                          </Box>
                        );
                      })}
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
      <MediaPreviewDialog
        open={lightboxOpen}
        mediaUrl={selectedMediaUrl}
        mimeType={selectedMediaMimeType}
        onClose={() => setLightboxOpen(false)}
      />
    </MainLayout>
  );
};

export default MyReturnRequestsPage;
