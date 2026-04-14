import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { MainLayout } from "@/layouts/MainLayout";
import { orderService, type OrderCancelRequest } from "@/services/orderService";
import { userService } from "@/services/userService";
import type { UserCredentials } from "@/services/userService";
import type { OrderResponse } from "@/types/order";
import { UserProfileSidebar } from "@/components/profile/UserProfileSidebar";
import {
  CANCEL_ORDER_REASON_OPTIONS,
  type CancelOrderReason,
} from "@/utils/cancelOrderReason";
import { useToast } from "@/hooks/useToast";
import { formatDateVN } from "@/utils/dateTime";
import {
  CancelStatusStepper,
  RefundInfoSection,
  OrderItemsSummary,
} from "@/components/cancel-request";

type CancelRequestStatus = "Pending" | "Approved" | "Rejected";

const getStatusLabel = (status: CancelRequestStatus): string => {
  switch (status) {
    case "Pending":
      return "Chờ xử lí";
    case "Approved":
      return "Đã duyệt";
    case "Rejected":
      return "Từ chối";
    default:
      return status;
  }
};

const cancelReasonLabel = (reason?: string | null) => {
  if (!reason) return "Không có lý do";

  const matchedReason = CANCEL_ORDER_REASON_OPTIONS.find(
    (item) => item.value === (reason as CancelOrderReason),
  );

  return matchedReason?.label || reason;
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

  const cancelRequestStatus = (request?.status ??
    "Pending") as CancelRequestStatus;

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
                      px: { xs: 2, sm: 3 },
                      py: { xs: 1.5, sm: 2 },
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      gap: { xs: 1, sm: 2 },
                      flexWrap: "wrap",
                    }}
                  >
                    <Button
                      size="small"
                      startIcon={<ArrowBackIcon />}
                      onClick={handleBack}
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
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          letterSpacing: 0.5,
                          fontSize: { xs: "0.7rem", sm: "0.875rem" },
                          display: { xs: "none", sm: "block" },
                        }}
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
                        sx={{
                          color: "#ee4d2d",
                          textTransform: "uppercase",
                          fontSize: { xs: "0.75rem", sm: "0.875rem" },
                          whiteSpace: "nowrap",
                        }}
                      >
                        {getStatusLabel(cancelRequestStatus)}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ p: 3 }}>
                    <Stack spacing={3}>
                      <CancelStatusStepper
                        status={cancelRequestStatus}
                        isRefunded={request?.isRefunded}
                      />

                      <Box
                        display="grid"
                        gridTemplateColumns={{ xs: "1fr", lg: "1.2fr 1.8fr" }}
                        gap={2.5}
                      >
                        {/* Cột Trái: Thông tin chung */}
                        <Paper
                          variant="outlined"
                          sx={{ p: 2.5, borderRadius: 2 }}
                        >
                          <Stack spacing={1.5}>
                            <Box display="flex" justifyContent="space-between">
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ fontFamily: "monospace" }}
                              >
                                Mã đơn hàng:
                              </Typography>
                              <Typography variant="body2" fontWeight={600}>
                                #{order?.code || request?.orderId || "-"}
                              </Typography>
                            </Box>

                            <Box display="flex" justifyContent="space-between">
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Ngày yêu cầu:
                              </Typography>
                              <Typography variant="body2">
                                {formatDateVN(request?.createdAt)}
                              </Typography>
                            </Box>

                            <Box display="flex" justifyContent="space-between">
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Lý do hủy:
                              </Typography>
                              <Typography variant="body2" fontWeight={600}>
                                {cancelReasonLabel(request?.reason)}
                              </Typography>
                            </Box>

                            {request?.staffNote && (
                              <Box
                                display="flex"
                                justifyContent="space-between"
                              >
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  Ghi chú xử lý:
                                </Typography>
                                <Typography variant="body2">
                                  {request.staffNote}
                                </Typography>
                              </Box>
                            )}

                            {request?.updatedAt && (
                              <Box
                                display="flex"
                                justifyContent="space-between"
                              >
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  Ngày xử lý:
                                </Typography>
                                <Typography variant="body2">
                                  {formatDateVN(request.updatedAt)}
                                </Typography>
                              </Box>
                            )}
                          </Stack>
                        </Paper>

                        {/* Cột Phải: Thông tin Hoàn tiền (Logic Động) */}
                        <RefundInfoSection
                          isRefundRequired={request?.isRefundRequired ?? false}
                          refundAmount={request?.refundAmount ?? undefined}
                          vnpTransactionNo={request?.vnpTransactionNo}
                          refundBankName={request?.refundBankName}
                          refundAccountName={request?.refundAccountName}
                          refundAccountNumber={request?.refundAccountNumber}
                          isRefunded={request?.isRefunded}
                          status={request?.status}
                        />
                      </Box>

                      {/* ═══════════════════════════════════════════════════════════
                          Khu vực 3: Chi tiết Đơn hàng (Simplified Order Summary)
                          ═══════════════════════════════════════════════════════════ */}
                      {order && (
                        <OrderItemsSummary
                          items={order.orderDetails}
                          shippingFee={order.shippingInfo?.shippingFee}
                          totalAmount={order.totalAmount}
                        />
                      )}

                      {/* ═══════════════════════════════════════════════════════════
                          Khu vực 4: Action Bar (Thao tác - Chỉ khách)
                          ═══════════════════════════════════════════════════════════ */}
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "flex-end",
                          gap: 1.5,
                        }}
                      ></Box>
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
