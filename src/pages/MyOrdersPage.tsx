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
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { MainLayout } from "@/layouts/MainLayout";
import { orderService } from "@/services/orderService";
import { productReviewService } from "@/services/reviewService";
import { useToast } from "@/hooks/useToast";
import type {
  OrderListItem,
  OrderStatus,
  OrderType,
  PaymentStatus,
} from "@/types/order";
import type {
  ReviewDialogTarget,
  ReviewResponse,
} from "@/types/review";
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
  const [reviewDialogMode, setReviewDialogMode] =
    useState<"create" | "edit">("create");
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
      <Box sx={{ bgcolor: "background.paper", py: { xs: 4, md: 6 } }}>
        <Container maxWidth="lg">
          <Stack spacing={3}>
            <Box>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                Đơn hàng của tôi
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Theo dõi trạng thái đơn hàng và gửi đánh giá cho sản phẩm bạn đã nhận.
              </Typography>
            </Box>

            <Paper sx={{ p: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Tìm kiếm"
                    placeholder="Mã đơn, sản phẩm..."
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") handleSearch();
                    }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <Button
                            variant="text"
                            size="small"
                            onClick={handleSearch}
                            startIcon={<SearchIcon fontSize="small" />}
                          >
                            Tìm
                          </Button>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Từ ngày"
                    type="date"
                    value={fromDate}
                    onChange={(event) => setFromDate(event.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Đến ngày"
                    type="date"
                    value={toDate}
                    onChange={(event) => setToDate(event.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <TextField
                      select
                      label="Trạng thái đơn"
                      value={status}
                      onChange={(event) => {
                        setStatus(event.target.value as OrderStatus | "");
                        setPage(1);
                      }}
                    >
                      <MenuItem value="">Tất cả</MenuItem>
                      <MenuItem value="Pending">Chờ xử lý</MenuItem>
                      <MenuItem value="Processing">Đang xử lý</MenuItem>
                      <MenuItem value="Delivering">Đang giao</MenuItem>
                      <MenuItem value="Delivered">Đã giao</MenuItem>
                      <MenuItem value="Canceled">Đã hủy</MenuItem>
                      <MenuItem value="Returned">Đã trả</MenuItem>
                    </TextField>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <TextField
                      select
                      label="Thanh toán"
                      value={paymentStatus}
                      onChange={(event) => {
                        setPaymentStatus(
                          event.target.value as PaymentStatus | "",
                        );
                        setPage(1);
                      }}
                    >
                      <MenuItem value="">Tất cả</MenuItem>
                      <MenuItem value="Unpaid">Chưa thanh toán</MenuItem>
                      <MenuItem value="Paid">Đã thanh toán</MenuItem>
                      <MenuItem value="Refunded">Đã hoàn tiền</MenuItem>
                    </TextField>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <TextField
                      select
                      label="Loại đơn"
                      value={type}
                      onChange={(event) => {
                        setType(event.target.value as OrderType | "");
                        setPage(1);
                      }}
                    >
                      <MenuItem value="">Tất cả</MenuItem>
                      <MenuItem value="Online">Online</MenuItem>
                      <MenuItem value="Offline">Tại cửa hàng</MenuItem>
                      <MenuItem value="Shoppe">Shopee</MenuItem>
                    </TextField>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    justifyContent={{ xs: "stretch", sm: "flex-end" }}
                  >
                    <Button
                      variant="outlined"
                      sx={{ width: { xs: "100%", sm: "auto" } }}
                      onClick={handleClearFilters}
                    >
                      Xóa bộ lọc
                    </Button>
                    <Button
                      variant="contained"
                      sx={{ width: { xs: "100%", sm: "auto" } }}
                      onClick={handleSearch}
                    >
                      Áp dụng
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </Paper>

            {isLoading ? (
              <Paper sx={{ p: 6, textAlign: "center" }}>
                <CircularProgress />
              </Paper>
            ) : orders.length === 0 ? (
              <Paper sx={{ p: 6, textAlign: "center" }}>
                <Typography variant="h6" gutterBottom>
                  Bạn chưa có đơn hàng nào
                </Typography>
                <Typography color="text.secondary">
                  Khi đặt hàng, bạn có thể theo dõi trạng thái và đánh giá sản phẩm tại đây.
                </Typography>
              </Paper>
            ) : (
              <Stack spacing={2}>
                {orders.map((order) => (
                  <Paper key={order.id} sx={{ p: 3 }}>
                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      spacing={2}
                      justifyContent="space-between"
                      alignItems={{ xs: "flex-start", md: "center" }}
                    >
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          Mã đơn hàng
                        </Typography>
                        <Typography variant="h6" fontWeight={700}>
                          {shortenId(order.id)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Đặt lúc {order.createdAt ? new Date(order.createdAt).toLocaleString("vi-VN") : "-"}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {order.type && (
                          <Chip
                            label={orderTypeLabels[order.type]}
                            color={orderTypeColors[order.type]}
                            variant="outlined"
                          />
                        )}
                        {order.status && (
                          <Chip
                            label={orderStatusLabels[order.status]}
                            color={orderStatusColors[order.status]}
                            variant="filled"
                          />
                        )}
                        {order.paymentStatus && (
                          <Chip
                            label={paymentStatusLabels[order.paymentStatus]}
                            color={paymentStatusColors[order.paymentStatus]}
                            variant="outlined"
                          />
                        )}
                      </Stack>
                      <Box textAlign={{ xs: "left", md: "right" }}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Tổng thanh toán
                        </Typography>
                        <Typography variant="h5" color="primary" fontWeight={700}>
                          {formatCurrency(order.totalAmount)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {order.itemCount || 0} sản phẩm
                        </Typography>
                      </Box>
                    </Stack>

                    <Divider sx={{ my: 2 }} />

                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={2}
                      justifyContent="space-between"
                      alignItems={{ xs: "flex-start", sm: "center" }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Bạn có thể xem chi tiết vận chuyển và đánh giá từng sản phẩm sau khi đơn được giao thành công.
                      </Typography>
                      <Stack direction="row" spacing={1}>
                        <Button
                          variant="outlined"
                          onClick={() => handleOpenDetail(order.id)}
                        >
                          Xem chi tiết
                        </Button>
                        {order.status === "Delivered" && (
                          <Button
                            variant="contained"
                            onClick={() => handleOpenDetail(order.id)}
                          >
                            Đánh giá sản phẩm
                          </Button>
                        )}
                      </Stack>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}

            {orders.length > 0 && (
              <Paper sx={{ p: 3 }}>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", md: "center" }}
                  spacing={2}
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      Hiển thị mỗi trang
                    </Typography>
                    <FormControl size="small">
                      <Select
                        value={pageSize.toString()}
                        onChange={(event) => {
                          const nextSize = Number(event.target.value);
                          setPageSize(nextSize);
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
                      Tổng cộng {totalCount} đơn hàng
                    </Typography>
                  </Stack>
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={(_, value) => setPage(value)}
                    showFirstButton
                    showLastButton
                    color="primary"
                  />
                </Stack>
              </Paper>
            )}
          </Stack>
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
