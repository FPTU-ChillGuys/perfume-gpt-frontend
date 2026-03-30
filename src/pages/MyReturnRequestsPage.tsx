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

/* ─── Image Lightbox ─── */
const ImageLightbox = ({
  open,
  imageUrl,
  onClose,
}: {
  open: boolean;
  imageUrl: string;
  onClose: () => void;
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="md">
    <DialogContent sx={{ p: 1 }}>
      <Box
        component="img"
        src={imageUrl}
        alt="Ảnh minh chứng"
        sx={{ maxWidth: "100%", maxHeight: "80vh", display: "block" }}
      />
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
  const [selectedImage, setSelectedImage] = useState("");

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
                                Đơn hàng: #{request.orderId?.slice(0, 8) || "-"}
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
                            {request.reason || "Không có lý do"}
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
      <Dialog open={detailOpen} onClose={closeDetail} fullWidth maxWidth="md">
        <DialogTitle
          sx={{ borderBottom: "1px solid", borderColor: "divider", pb: 2 }}
        >
          Chi tiết yêu cầu hoàn trả
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {isDetailLoading || !selectedRequest ? (
            <Box textAlign="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            <Stack spacing={3}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Mã đơn hàng: {selectedRequest.orderId}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Ngày yêu cầu: {formatDate(selectedRequest.createdAt)}
                  </Typography>
                </Box>
                <Chip
                  label={statusLabel(selectedRequest.status)}
                  color={statusColor(selectedRequest.status)}
                />
              </Stack>

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Lý do từ khách hàng
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: "grey.50" }}>
                  <Typography variant="body2">
                    <strong>Lý do:</strong> {selectedRequest.reason}
                  </Typography>
                  {selectedRequest.customerNote && (
                    <Typography variant="body2" mt={1}>
                      <strong>Ghi chú thêm:</strong>{" "}
                      {selectedRequest.customerNote}
                    </Typography>
                  )}
                </Paper>
              </Box>

              {/* Feedback responses from Admin/Staff */}
              {(selectedRequest.staffNote ||
                selectedRequest.inspectionNote) && (
                <Box>
                  <Typography
                    variant="subtitle2"
                    color="error.main"
                    gutterBottom
                  >
                    Phản hồi từ cửa hàng
                  </Typography>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      bgcolor: "#fff4f4",
                      borderColor: "error.light",
                    }}
                  >
                    {selectedRequest.staffNote && (
                      <Typography variant="body2">
                        <strong>Ghi chú duyệt:</strong>{" "}
                        {selectedRequest.staffNote}
                      </Typography>
                    )}
                    {selectedRequest.inspectionNote && (
                      <Typography
                        variant="body2"
                        mt={selectedRequest.staffNote ? 1 : 0}
                      >
                        <strong>Ghi chú kiểm định:</strong>{" "}
                        {selectedRequest.inspectionNote}
                      </Typography>
                    )}
                  </Paper>
                </Box>
              )}

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Sản phẩm yêu cầu hoàn
                </Typography>
                <Stack spacing={1}>
                  {(selectedOrder?.orderDetails || []).map((item, idx) => {
                    const qty = Number(item.quantity ?? 0);
                    const price = Number(item.unitPrice ?? 0);
                    const imageUrl = item.imageUrl;

                    return (
                      <Box
                        key={item.id || idx}
                        sx={{
                          display: "flex",
                          gap: 2,
                          p: 1.5,
                          border: "1px solid",
                          borderColor: "divider",
                          borderRadius: 1,
                        }}
                      >
                        {imageUrl ? (
                          <Box
                            component="img"
                            src={imageUrl}
                            sx={{
                              width: 64,
                              height: 64,
                              borderRadius: 1,
                              objectFit: "cover",
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
                              flexShrink: 0,
                            }}
                          >
                            <ImageIcon sx={{ color: "grey.300" }} />
                          </Box>
                        )}
                        <Box flex={1}>
                          <Typography variant="body2" fontWeight={600}>
                            {item.variantName || `Sản phẩm ${idx + 1}`}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                          >
                            Số lượng: {qty}
                          </Typography>
                          {price > 0 && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Đơn giá: {formatCurrency(price)}
                            </Typography>
                          )}
                        </Box>
                        {price > 0 && (
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            color="#ee4d2d"
                          >
                            {formatCurrency(price * qty)}
                          </Typography>
                        )}
                      </Box>
                    );
                  })}
                  {!(selectedOrder?.orderDetails || []).length && (
                    <Typography variant="body2" color="text.secondary">
                      Không tải được danh sách sản phẩm của đơn hàng.
                    </Typography>
                  )}
                </Stack>
              </Box>

              {/* Status Tracking */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Thông tin hoàn tiền
                </Typography>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Tiền yêu cầu hoàn:
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formatCurrency(selectedRequest.requestedRefundAmount)}
                  </Typography>
                </Stack>
                {selectedRequest.approvedRefundAmount !== null && (
                  <Stack direction="row" justifyContent="space-between" mt={1}>
                    <Typography variant="body2" color="text.secondary">
                      Tiền được duyệt hoàn:
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight={700}
                      color="success.main"
                    >
                      {formatCurrency(selectedRequest.approvedRefundAmount)}
                    </Typography>
                  </Stack>
                )}
              </Box>

              {/* Attachments */}
              {selectedRequest.proofImages &&
                selectedRequest.proofImages.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Ảnh minh chứng
                    </Typography>
                    <Stack direction="row" spacing={1.5} flexWrap="wrap">
                      {selectedRequest.proofImages.map((imgDef, idx) => {
                        const img =
                          typeof imgDef === "string"
                            ? imgDef
                            : (imgDef as any).url;
                        if (!img) return null;
                        return (
                          <Box
                            key={idx}
                            component="img"
                            src={img}
                            onClick={() => {
                              setSelectedImage(img);
                              setLightboxOpen(true);
                            }}
                            sx={{
                              width: 80,
                              height: 80,
                              borderRadius: 1,
                              objectFit: "cover",
                              cursor: "pointer",
                              border: "1px solid",
                              borderColor: "divider",
                              "&:hover": { opacity: 0.8 },
                            }}
                          />
                        );
                      })}
                    </Stack>
                  </Box>
                )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDetail}>Đóng</Button>
        </DialogActions>
      </Dialog>
      <ImageLightbox
        open={lightboxOpen}
        imageUrl={selectedImage}
        onClose={() => setLightboxOpen(false)}
      />
    </MainLayout>
  );
};

export default MyReturnRequestsPage;
