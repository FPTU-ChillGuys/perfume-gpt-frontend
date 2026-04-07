import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { MainLayout } from "@/layouts/MainLayout";
import { orderService, type OrderCancelRequest } from "@/services/orderService";
import { userService } from "@/services/userService";
import type { UserCredentials } from "@/services/userService";
import type { OrderResponse } from "@/types/order";
import type { PaymentMethod } from "@/types/checkout";
import { UserProfileSidebar } from "@/components/profile/UserProfileSidebar";
import {
  CANCEL_ORDER_REASON_OPTIONS,
  type CancelOrderReason,
} from "@/utils/cancelOrderReason";
import { useToast } from "@/hooks/useToast";
import { formatDateTimeVN } from "@/utils/dateTime";

type CancelRequestStatus = "Pending" | "Approved" | "Rejected";

const statusLabel = (status?: string) => {
  if (status === "Pending") return "Chờ xử lý";
  if (status === "Approved") return "Đã duyệt";
  if (status === "Rejected") return "Từ chối";
  return status || "-";
};

const cancelReasonLabel = (reason?: string | null) => {
  if (!reason) return "Không có lý do";

  const matchedReason = CANCEL_ORDER_REASON_OPTIONS.find(
    (item) => item.value === (reason as CancelOrderReason),
  );

  return matchedReason?.label || reason;
};

const formatDate = (value?: string | null) => formatDateTimeVN(value);

const formatCurrency = (value?: number | null) =>
  `${new Intl.NumberFormat("vi-VN").format(Number(value ?? 0))} đ`;

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CashOnDelivery: "Thanh toán khi nhận hàng",
  CashInStore: "Thanh toán tại quầy",
  VnPay: "Thanh toán qua VNPay",
  Momo: "Thanh toán qua MoMo",
  ExternalBankTransfer: "Chuyển khoản ngân hàng",
};

export const MyCancelRequestDetailPage = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { cancelRequestId } = useParams<{ cancelRequestId: string }>();

  const backState = location.state as
    | {
        status?: CancelRequestStatus | "All";
        page?: number;
        pageSize?: number;
      }
    | undefined;

  const [userInfo, setUserInfo] = useState<UserCredentials | null>(null);
  const [request, setRequest] = useState<OrderCancelRequest | null>(null);
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDetail = useCallback(async () => {
    if (!cancelRequestId) return;

    setIsLoading(true);
    try {
      const cancelRequest =
        await orderService.getCancelRequestById(cancelRequestId);
      setRequest(cancelRequest);

      if (cancelRequest.orderId) {
        const myOrder = await orderService.getMyOrderById(
          cancelRequest.orderId,
        );
        setOrder(myOrder);
      } else {
        setOrder(null);
      }
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Không thể tải chi tiết yêu cầu hủy",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  }, [cancelRequestId, showToast]);

  useEffect(() => {
    void userService.getUserMe().then(setUserInfo).catch(console.error);
  }, []);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const handleBack = () => {
    navigate("/my-cancel-requests", {
      state: {
        status: backState?.status ?? "All",
        page: backState?.page ?? 1,
        pageSize: backState?.pageSize ?? 10,
      },
    });
  };

  const orderSubtotal =
    order?.orderDetails?.reduce(
      (sum, item) => sum + Number(item.total ?? 0),
      0,
    ) ?? 0;
  const shippingFee = Number(order?.shippingInfo?.shippingFee ?? 0);
  const grandTotal = Number(order?.totalAmount ?? 0);
  const voucherDiscount = Math.max(orderSubtotal + shippingFee - grandTotal, 0);

  const paymentMethod =
    order?.paymentTransactions?.find(
      (transaction) =>
        transaction.transactionType === "Payment" &&
        transaction.status === "Success" &&
        Boolean(transaction.paymentMethod),
    )?.paymentMethod ||
    order?.paymentTransactions?.find((transaction) =>
      Boolean(transaction.paymentMethod),
    )?.paymentMethod;

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
              {isLoading ? (
                <Box sx={{ py: 8, textAlign: "center" }}>
                  <CircularProgress sx={{ color: "#ee4d2d" }} />
                </Box>
              ) : !request ? (
                <Box sx={{ p: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    Không tìm thấy yêu cầu hủy.
                  </Typography>
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
                      onClick={handleBack}
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
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ letterSpacing: 0.5 }}
                      >
                        MÃ ĐƠN HÀNG:{" "}
                        <b style={{ color: "inherit" }}>
                          {(
                            order?.code ||
                            request.orderId ||
                            "-"
                          ).toUpperCase()}
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

                  <Box sx={{ p: 3 }}>
                    <Stack spacing={2}>
                      <Paper
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
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ fontFamily: "monospace" }}
                            >
                              Đơn hàng: #{order?.code || request.orderId || "-"}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              ·
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {formatDate(request.createdAt)}
                            </Typography>
                          </Stack>
                        </Stack>

                        <Divider sx={{ mb: 1.5 }} />

                        <Stack spacing={1}>
                          <Typography variant="body2" color="text.secondary">
                            <strong>Lý do hủy:</strong>{" "}
                            {cancelReasonLabel(request.reason)}
                          </Typography>
                          <Box
                            display="flex"
                            justifyContent="space-between"
                            alignItems="center"
                          >
                            <Typography variant="body2" color="text.secondary">
                              <strong>Số tiền hoàn:</strong>
                            </Typography>
                            <Typography
                              variant="subtitle2"
                              fontWeight={700}
                              sx={{ color: "#ee4d2d" }}
                            >
                              {formatCurrency(request.refundAmount)}
                            </Typography>
                          </Box>
                          {request.staffNote && (
                            <Typography variant="body2" color="text.secondary">
                              <strong>Ghi chú xử lý:</strong>{" "}
                              {request.staffNote}
                            </Typography>
                          )}
                          {request.updatedAt && (
                            <Typography variant="body2" color="text.secondary">
                              <strong>Ngày xử lý:</strong>{" "}
                              {formatDate(request.updatedAt)}
                            </Typography>
                          )}
                        </Stack>
                      </Paper>

                      {order && (
                        <Box
                          display="grid"
                          gridTemplateColumns={{ xs: "1fr", lg: "2fr 1fr" }}
                          gap={2}
                        >
                          <Paper variant="outlined" sx={{ borderRadius: 2 }}>
                            <Box
                              sx={{
                                px: 2,
                                py: 1.25,
                                borderBottom: "1px solid",
                                borderColor: "divider",
                              }}
                            >
                              <Typography fontWeight={700} variant="subtitle2">
                                Sản phẩm trong đơn
                              </Typography>
                            </Box>
                            <Stack spacing={1} sx={{ p: 2 }}>
                              {order.orderDetails?.length ? (
                                order.orderDetails.map((item) => (
                                  <Box
                                    key={item.id}
                                    display="flex"
                                    gap={1.5}
                                    alignItems="center"
                                    sx={{
                                      p: 1,
                                      borderRadius: 1.5,
                                      border: "1px solid",
                                      borderColor: "divider",
                                    }}
                                  >
                                    {item.imageUrl ? (
                                      <Box
                                        component="img"
                                        src={item.imageUrl}
                                        alt={item.variantName || "Sản phẩm"}
                                        sx={{
                                          width: 64,
                                          height: 64,
                                          objectFit: "cover",
                                          borderRadius: 1,
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
                                          border: "1px solid",
                                          borderColor: "divider",
                                          flexShrink: 0,
                                        }}
                                      />
                                    )}

                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                      <Typography
                                        variant="body2"
                                        fontWeight={600}
                                        noWrap
                                      >
                                        {item.variantName || "Sản phẩm"}
                                      </Typography>
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                      >
                                        Số lượng: {item.quantity || 0}
                                      </Typography>
                                      <Box
                                        display="flex"
                                        justifyContent="space-between"
                                        alignItems="center"
                                        mt={0.5}
                                        gap={1}
                                      >
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                        >
                                          Đơn giá:{" "}
                                          {formatCurrency(item.unitPrice)}
                                        </Typography>
                                        <Typography
                                          variant="body2"
                                          fontWeight={700}
                                          sx={{ color: "#ee4d2d" }}
                                        >
                                          {formatCurrency(item.total)}
                                        </Typography>
                                      </Box>
                                    </Box>
                                  </Box>
                                ))
                              ) : (
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  Không có sản phẩm.
                                </Typography>
                              )}
                            </Stack>
                          </Paper>

                          <Stack spacing={2}>
                            <Paper
                              variant="outlined"
                              sx={{ p: 2, borderRadius: 2 }}
                            >
                              <Typography
                                variant="subtitle2"
                                fontWeight={700}
                                mb={1.5}
                              >
                                Thông tin giao hàng
                              </Typography>
                              <Stack spacing={1}>
                                <Box>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    Khách hàng
                                  </Typography>
                                  <Typography>
                                    {order.recipientInfo?.recipientName || "—"}
                                  </Typography>
                                </Box>
                                <Box>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    Số điện thoại
                                  </Typography>
                                  <Typography>
                                    {order.recipientInfo
                                      ?.recipientPhoneNumber || "—"}
                                  </Typography>
                                </Box>
                                <Box>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    Địa chỉ nhận hàng
                                  </Typography>
                                  <Typography>
                                    {order.recipientInfo?.fullAddress || "—"}
                                  </Typography>
                                </Box>
                              </Stack>
                            </Paper>

                            <Paper
                              variant="outlined"
                              sx={{ p: 2, borderRadius: 2 }}
                            >
                              <Typography
                                variant="subtitle2"
                                fontWeight={700}
                                mb={1.5}
                              >
                                Chi tiết thanh toán
                              </Typography>
                              <Stack spacing={1}>
                                <Box
                                  display="flex"
                                  justifyContent="space-between"
                                >
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    Tổng tiền hàng
                                  </Typography>
                                  <Typography variant="body2">
                                    {formatCurrency(orderSubtotal)}
                                  </Typography>
                                </Box>
                                <Box
                                  display="flex"
                                  justifyContent="space-between"
                                >
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    Phí vận chuyển
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    color="success.main"
                                    fontWeight={500}
                                  >
                                    FREE
                                  </Typography>
                                </Box>
                                {voucherDiscount > 0 && (
                                  <Box
                                    display="flex"
                                    justifyContent="space-between"
                                  >
                                    <Typography
                                      variant="body2"
                                      color="text.secondary"
                                    >
                                      Giảm giá voucher
                                    </Typography>
                                    <Typography
                                      variant="body2"
                                      color="success.main"
                                    >
                                      -{formatCurrency(voucherDiscount)}
                                    </Typography>
                                  </Box>
                                )}
                                <Divider />
                                <Box
                                  display="flex"
                                  justifyContent="space-between"
                                >
                                  <Typography
                                    variant="subtitle2"
                                    fontWeight={700}
                                  >
                                    Tổng thanh toán
                                  </Typography>
                                  <Typography
                                    variant="subtitle2"
                                    fontWeight={700}
                                    sx={{ color: "#ee4d2d" }}
                                  >
                                    {formatCurrency(grandTotal)}
                                  </Typography>
                                </Box>
                                <Divider />
                                <Box
                                  display="flex"
                                  justifyContent="space-between"
                                  alignItems="center"
                                  gap={1.5}
                                >
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    noWrap
                                    sx={{ flexShrink: 0 }}
                                  >
                                    Phương thức thanh toán
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    fontWeight={600}
                                    noWrap
                                    sx={{ whiteSpace: "nowrap" }}
                                  >
                                    {paymentMethod
                                      ? PAYMENT_METHOD_LABELS[paymentMethod]
                                      : "—"}
                                  </Typography>
                                </Box>
                              </Stack>
                            </Paper>
                          </Stack>
                        </Box>
                      )}
                    </Stack>
                  </Box>
                </>
              )}
            </Box>
          </Paper>
        </Container>
      </Box>
    </MainLayout>
  );
};

export default MyCancelRequestDetailPage;
