import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Select,
  MenuItem,
  FormControl,
} from "@mui/material";
import { useMemo, useState } from "react";
import type { OrderListItem } from "@/types/order";
import { MyOrderDetailModal } from "@/components/order/MyOrderDetailModal";
import {
  orderStatusLabels,
  orderStatusColors,
  paymentStatusLabels,
  paymentStatusColors,
} from "@/utils/orderStatus";
import type { ReviewResponse } from "@/types/review";
import type { ReviewDialogTarget } from "@/types/review";

interface OrderHistoryProps {
  orders: OrderListItem[];
  isLoading: boolean;
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  myReviews: ReviewResponse[];
  onReviewSelected: (
    target: ReviewDialogTarget,
    existing?: ReviewResponse | null,
  ) => void;
}

const OrderHistory = ({
  orders,
  isLoading,
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  myReviews,
  onReviewSelected,
}: OrderHistoryProps) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const reviewsByOrderDetailId = useMemo(() => {
    const map: Record<string, ReviewResponse> = {};
    myReviews.forEach((review) => {
      if (review.orderDetailId) {
        map[review.orderDetailId] = review;
      }
    });
    return map;
  }, [myReviews]);

  const handleRowClick = (orderId: string) => {
    setSelectedOrderId(orderId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrderId(null);
  };

  return (
    <>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h6" fontWeight="bold">
          Lịch sử mua hàng
        </Typography>
      </Box>

      {isLoading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : orders.length === 0 ? (
        <Alert severity="info">
          Bạn chưa có đơn hàng nào. Hãy khám phá sản phẩm và đặt hàng ngay!
        </Alert>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Mã đơn</TableCell>
                <TableCell>Ngày đặt</TableCell>
                <TableCell>Số lượng</TableCell>
                <TableCell align="right">Tổng tiền</TableCell>
                <TableCell>Trạng thái</TableCell>
                <TableCell>Thanh toán</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((order) => (
                <TableRow
                  key={order.id}
                  onClick={() => handleRowClick(order.id || "")}
                  sx={{
                    cursor: "pointer",
                    "&:hover": {
                      bgcolor: "action.hover",
                    },
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {order.id?.slice(0, 8)}...
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {order.createdAt
                      ? new Date(order.createdAt).toLocaleDateString("vi-VN")
                      : "-"}
                  </TableCell>
                  <TableCell>{order.itemCount}</TableCell>
                  <TableCell align="right">
                    {order.totalAmount?.toLocaleString("vi-VN")} ₫
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={
                        order.status
                          ? orderStatusLabels[order.status]
                          : order.status
                      }
                      size="small"
                      color={orderStatusColors[order.status || "Pending"]}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={
                        order.paymentStatus
                          ? paymentStatusLabels[order.paymentStatus]
                          : order.paymentStatus
                      }
                      size="small"
                      color={
                        paymentStatusColors[order.paymentStatus || "Unpaid"]
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {!isLoading && orders.length > 0 && (
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mt={3}
        >
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="body2" color="text.secondary">
              Số dòng mỗi trang:
            </Typography>
            <FormControl size="small">
              <Select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
              >
                <MenuItem value={5}>5</MenuItem>
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={20}>20</MenuItem>
                <MenuItem value={50}>50</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="body2" color="text.secondary">
              Tổng: {totalCount} đơn hàng
            </Typography>
          </Box>
          <Pagination
            count={Math.ceil(totalCount / pageSize)}
            page={page}
            onChange={(_, newPage) => onPageChange(newPage)}
            color="primary"
            showFirstButton
            showLastButton
          />
        </Box>
      )}

      {/* Order Detail Modal */}
      <MyOrderDetailModal
        open={isModalOpen}
        orderId={selectedOrderId}
        onClose={handleCloseModal}
        reviewsIndex={reviewsByOrderDetailId}
        onReview={(target, existing) => onReviewSelected(target, existing)}
      />
    </>
  );
};

export default OrderHistory;
