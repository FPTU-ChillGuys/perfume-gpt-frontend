import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import type { OrderListItem } from "@/types/order";

interface OrderHistoryProps {
  orders: OrderListItem[];
  isLoading: boolean;
}

const OrderHistory = ({ orders, isLoading }: OrderHistoryProps) => {
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
                <TableRow key={order.id}>
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
                      label={order.status}
                      size="small"
                      color={
                        order.status === "Delivered"
                          ? "success"
                          : order.status === "Canceled"
                            ? "error"
                            : "warning"
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={order.paymentStatus}
                      size="small"
                      color={
                        order.paymentStatus === "Paid" ? "success" : "default"
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </>
  );
};

export default OrderHistory;
