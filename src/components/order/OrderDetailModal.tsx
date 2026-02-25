import { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { orderService } from "@/services/orderService";
import type { OrderResponse, CarrierName } from "@/types/order";
import {
  orderStatusLabels,
  orderStatusColors,
  paymentStatusLabels,
  paymentStatusColors,
  orderTypeLabels,
  orderTypeColors,
} from "@/utils/orderStatus";

const carrierNameLabel: Record<CarrierName, string> = {
  GHN: "Giao Hàng Nhanh",
  GHTK: "Giao Hàng Tiết Kiệm",
};

interface OrderDetailModalProps {
  open: boolean;
  orderId: string | null;
  onClose: () => void;
}

export const OrderDetailModal = ({
  open,
  orderId,
  onClose,
}: OrderDetailModalProps) => {
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrderDetail = async () => {
      if (!orderId || !open) {
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const data = await orderService.getOrderById(orderId);
        setOrder(data);
      } catch (err: any) {
        console.error("Error loading order details:", err);
        setError(err.message || "Không thể tải chi tiết đơn hàng");
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderDetail();
  }, [orderId, open]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("vi-VN");
  };

  const shortenId = (id: string) => {
    return `${id.substring(0, 8)}...${id.substring(id.length - 4)}`;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" fontWeight="bold">
            Chi tiết đơn hàng
          </Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {isLoading && (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="300px"
          >
            <CircularProgress />
          </Box>
        )}

        {error && !isLoading && (
          <Box textAlign="center" py={4}>
            <Typography color="error">{error}</Typography>
          </Box>
        )}

        {!isLoading && !error && order && (
          <Box>
            {/* Order Information Card */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Thông tin đơn hàng
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box
                  display="grid"
                  gridTemplateColumns="repeat(2, 1fr)"
                  gap={2}
                >
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Mã đơn hàng
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {order.id ? shortenId(order.id) : "N/A"}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Loại đơn hàng
                    </Typography>
                    <Box mt={0.5}>
                      {order.type && (
                        <Chip
                          label={orderTypeLabels[order.type]}
                          color={orderTypeColors[order.type]}
                          size="small"
                        />
                      )}
                    </Box>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Khách hàng
                    </Typography>
                    <Typography variant="body1">
                      {order.customerName || "N/A"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {order.customerEmail || ""}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Nhân viên xử lý
                    </Typography>
                    <Typography variant="body1">
                      {order.staffName || "Chưa có"}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Trạng thái đơn hàng
                    </Typography>
                    <Box mt={0.5}>
                      {order.status && (
                        <Chip
                          label={orderStatusLabels[order.status]}
                          color={orderStatusColors[order.status]}
                          size="small"
                        />
                      )}
                    </Box>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Trạng thái thanh toán
                    </Typography>
                    <Box mt={0.5}>
                      {order.paymentStatus && (
                        <Chip
                          label={paymentStatusLabels[order.paymentStatus]}
                          color={paymentStatusColors[order.paymentStatus]}
                          size="small"
                        />
                      )}
                    </Box>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Tổng tiền
                    </Typography>
                    <Typography variant="h6" color="primary" fontWeight="bold">
                      {formatCurrency(order.totalAmount ?? 0)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Voucher
                    </Typography>
                    <Typography variant="body1">
                      {order.voucherCode || "Không có"}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Ngày tạo
                    </Typography>
                    <Typography variant="body1">
                      {formatDateTime(order.createdAt ?? null)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Ngày thanh toán
                    </Typography>
                    <Typography variant="body1">
                      {formatDateTime(order.paidAt ?? null)}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Shipping Information Card */}
            {order.shippingInfo && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Thông tin vận chuyển
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Box
                    display="grid"
                    gridTemplateColumns="repeat(2, 1fr)"
                    gap={2}
                  >
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Đơn vị vận chuyển
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {order.shippingInfo.carrierName
                          ? (carrierNameLabel[order.shippingInfo.carrierName] ??
                            order.shippingInfo.carrierName)
                          : "N/A"}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Mã vận đơn
                      </Typography>
                      <Typography variant="body1">
                        {order.shippingInfo.trackingNumber || "Chưa có"}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Phí vận chuyển
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {formatCurrency(order.shippingInfo.shippingFee ?? 0)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Thời gian giao hàng (ngày)
                      </Typography>
                      <Typography variant="body1">
                        {order.shippingInfo.leadTime ?? "N/A"}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Recipient Information Card */}
            {order.recipientInfo && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Thông tin người nhận
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Box
                    display="grid"
                    gridTemplateColumns="repeat(2, 1fr)"
                    gap={2}
                  >
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Họ và tên
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {order.recipientInfo.fullName}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Số điện thoại
                      </Typography>
                      <Typography variant="body1">
                        {order.recipientInfo.phone}
                      </Typography>
                    </Box>
                    <Box gridColumn="span 2">
                      <Typography variant="body2" color="text.secondary">
                        Địa chỉ
                      </Typography>
                      <Typography variant="body1">
                        {order.recipientInfo.fullAddress},{" "}
                        {order.recipientInfo.wardName},{" "}
                        {order.recipientInfo.districtName},{" "}
                        {order.recipientInfo.provinceName}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Order Items Table */}
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Chi tiết sản phẩm
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Hình ảnh</TableCell>
                        <TableCell>Tên sản phẩm</TableCell>
                        <TableCell align="right">Số lượng</TableCell>
                        <TableCell align="right">Đơn giá</TableCell>
                        <TableCell align="right">Thành tiền</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {order.orderDetails?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.variantName}
                                style={{
                                  width: 60,
                                  height: 60,
                                  objectFit: "cover",
                                  borderRadius: 4,
                                }}
                              />
                            ) : (
                              <Box
                                sx={{
                                  width: 60,
                                  height: 60,
                                  bgcolor: "grey.200",
                                  borderRadius: 1,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  No image
                                </Typography>
                              </Box>
                            )}
                          </TableCell>
                          <TableCell>{item.variantName}</TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">
                            {formatCurrency(item.unitPrice ?? 0)}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ fontWeight: "medium" }}
                          >
                            {formatCurrency(item.total ?? 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={4} align="right">
                          <Typography variant="h6" fontWeight="bold">
                            Tổng cộng:
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="h6"
                            color="primary"
                            fontWeight="bold"
                          >
                            {formatCurrency(order.totalAmount ?? 0)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};
