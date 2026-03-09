import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  Grid,
  InputAdornment,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { MainLayout } from "@/layouts/MainLayout";
import { orderService } from "@/services/orderService";
import { productReviewService } from "@/services/reviewService";
import { userService } from "@/services/userService";
import type { UserCredentials } from "@/services/userService";
import { useToast } from "@/hooks/useToast";
import type {
  OrderListItem,
  OrderStatus,
  OrderType,
  PaymentStatus,
} from "@/types/order";
import type { ReviewDialogTarget, ReviewResponse } from "@/types/review";
import {
  orderStatusLabels,
  orderStatusColors,
  paymentStatusLabels,
  paymentStatusColors,
  orderTypeLabels,
  orderTypeColors,
} from "@/utils/orderStatus";
import { MyOrderDetailModal } from "@/components/order/MyOrderDetailModal";
import { ReviewEditorDialog } from "@/components/review/ReviewEditorDialog";
import { UserProfileSidebar } from "@/components/profile/UserProfileSidebar";

const STATUS_TABS: { label: string; value: OrderStatus | "" }[] = [
  { label: "Tất cả", value: "" },
  { label: orderStatusLabels["Pending"], value: "Pending" },
  { label: orderStatusLabels["Processing"], value: "Processing" },
  { label: orderStatusLabels["Delivering"], value: "Delivering" },
  { label: orderStatusLabels["Delivered"], value: "Delivered" },
  { label: orderStatusLabels["Canceled"], value: "Canceled" },
  { label: orderStatusLabels["Returned"], value: "Returned" },
];

const formatCurrency = (value?: number | null) => {
  if (!value) return "0 ₫";
  return `${new Intl.NumberFormat("vi-VN").format(value)} ₫`;
};

const toIsoString = (value: string) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const shortenId = (id?: string | null) => {
  if (!id) return "";
  return `${id.slice(0, 8)}...${id.slice(-4)}`;
};

export const MyOrdersPage = () => {
  const { showToast } = useToast();
  const [userInfo, setUserInfo] = useState<UserCredentials | null>(null);
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | "">("");
  const [type, setType] = useState<OrderType | "">("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [myReviews, setMyReviews] = useState<ReviewResponse[]>([]);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewDialogMode, setReviewDialogMode] = useState<"create" | "edit">(
    "create",
  );
  const [reviewDialogTarget, setReviewDialogTarget] =
    useState<ReviewDialogTarget | null>(null);
  const [selectedReview, setSelectedReview] = useState<ReviewResponse | null>(
    null,
  );

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const reviewsIndex = useMemo(() => {
    const map: Record<string, ReviewResponse> = {};
    myReviews.forEach((review) => {
      if (review.orderDetailId) {
        map[review.orderDetailId] = review;
      }
    });
    return map;
  }, [myReviews]);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const { items, totalCount: count } = await orderService.getMyOrders({
        PageNumber: page,
        PageSize: pageSize,
        SearchTerm: searchTerm || undefined,
        Status: status || undefined,
        PaymentStatus: paymentStatus || undefined,
        Type: type || undefined,
        FromDate: toIsoString(fromDate),
        ToDate: toIsoString(toDate),
        SortBy: "CreatedAt",
        SortOrder: "desc",
      });
      setOrders(items);
      setTotalCount(count);
    } catch (error) {
      console.error("Failed to load my orders", error);
      showToast(
        error instanceof Error
          ? error.message
          : "Không thể tải danh sách đơn hàng",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    fromDate,
    page,
    pageSize,
    paymentStatus,
    searchTerm,
    showToast,
    status,
    toDate,
    type,
  ]);

  const loadReviews = useCallback(async () => {
    try {
      const data = await productReviewService.getMyReviews();
      setMyReviews(data);
    } catch (error) {
      console.error("Failed to load my reviews", error);
    }
  }, []);

  useEffect(() => {
    void userService.getUserMe().then(setUserInfo).catch(console.error);
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const handleSearch = () => {
    setSearchTerm(searchInput.trim());
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setSearchTerm("");
    setStatus("");
    setPaymentStatus("");
    setType("");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  const handleOpenDetail = (orderId?: string | null) => {
    if (!orderId) return;
    setSelectedOrderId(orderId);
    setIsDetailModalOpen(true);
  };

  const handleReviewSelected = (
    target: ReviewDialogTarget,
    existing?: ReviewResponse | null,
  ) => {
    setReviewDialogMode(existing ? "edit" : "create");
    setReviewDialogTarget(target);
    setSelectedReview(existing || null);
    setIsReviewDialogOpen(true);
  };

  const handleReviewDialogClose = () => {
    setIsReviewDialogOpen(false);
    setReviewDialogTarget(null);
    setSelectedReview(null);
  };

  const handleReviewSuccess = () => {
    void loadReviews();
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <MainLayout>
      <Box sx={{ bgcolor: "#f5f5f5", py: 4, flex: 1 }}>
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
              {/* Status tabs */}
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
                {/* Search */}
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Tìm theo mã đơn hàng, tên sản phẩm..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearch();
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }}
                />

                {/* Order list */}
                {isLoading ? (
                  <Box sx={{ py: 8, textAlign: "center" }}>
                    <CircularProgress sx={{ color: "#ee4d2d" }} />
                  </Box>
                ) : orders.length === 0 ? (
                  <Box sx={{ py: 8, textAlign: "center" }}>
                    <Typography
                      variant="h6"
                      color="text.secondary"
                      gutterBottom
                    >
                      Chưa có đơn hàng nào
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Khi đặt hàng, bạn có thể theo dõi trạng thái và đánh giá
                      sản phẩm tại đây.
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={2}>
                    {orders.map((order) => (
                      <Paper
                        key={order.id}
                        variant="outlined"
                        sx={{ p: 2.5, borderRadius: 2 }}
                      >
                        {/* Order header */}
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
                            <Typography variant="body2" color="text.secondary">
                              #{shortenId(order.id)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              ·
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {order.createdAt
                                ? new Date(order.createdAt).toLocaleDateString(
                                    "vi-VN",
                                  )
                                : "-"}
                            </Typography>
                          </Stack>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            {order.type && (
                              <Chip
                                label={orderTypeLabels[order.type]}
                                color={orderTypeColors[order.type]}
                                variant="outlined"
                                size="small"
                              />
                            )}
                            {order.paymentStatus && (
                              <Chip
                                label={paymentStatusLabels[order.paymentStatus]}
                                color={paymentStatusColors[order.paymentStatus]}
                                variant="outlined"
                                size="small"
                              />
                            )}
                            {order.status && (
                              <Chip
                                label={orderStatusLabels[order.status]}
                                color={orderStatusColors[order.status]}
                                variant="filled"
                                size="small"
                              />
                            )}
                          </Stack>
                        </Stack>

                        <Divider sx={{ mb: 1.5 }} />

                        {/* Order summary row */}
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          justifyContent="space-between"
                          alignItems={{ xs: "flex-start", sm: "center" }}
                          spacing={1}
                        >
                          <Typography variant="body2" color="text.secondary">
                            {order.itemCount || 0} sản phẩm
                          </Typography>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <Typography variant="body2" color="text.secondary">
                              Thành tiền:
                            </Typography>
                            <Typography
                              variant="subtitle1"
                              fontWeight={700}
                              sx={{ color: "#ee4d2d" }}
                            >
                              {formatCurrency(order.totalAmount)}
                            </Typography>
                          </Stack>
                        </Stack>

                        <Divider sx={{ my: 1.5 }} />

                        {/* Actions */}
                        <Stack
                          direction="row"
                          justifyContent="flex-end"
                          spacing={1}
                        >
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleOpenDetail(order.id)}
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
                          {order.status === "Delivered" && (
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => handleOpenDetail(order.id)}
                              sx={{
                                bgcolor: "#ee4d2d",
                                "&:hover": { bgcolor: "#d03e27" },
                              }}
                            >
                              Đánh giá
                            </Button>
                          )}
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                )}

                {/* Pagination */}
                {orders.length > 0 && (
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
                          <MenuItem value={50}>50</MenuItem>
                        </Select>
                      </FormControl>
                      <Typography variant="body2" color="text.secondary">
                        / {totalCount} đơn hàng
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

      <MyOrderDetailModal
        open={isDetailModalOpen}
        orderId={selectedOrderId}
        onClose={() => setIsDetailModalOpen(false)}
        reviewsIndex={reviewsIndex}
        onReview={handleReviewSelected}
      />

      <ReviewEditorDialog
        open={isReviewDialogOpen}
        mode={reviewDialogMode}
        target={reviewDialogTarget}
        initialReview={selectedReview}
        onClose={handleReviewDialogClose}
        onSuccess={handleReviewSuccess}
      />
    </MainLayout>
  );
};

export default MyOrdersPage;
