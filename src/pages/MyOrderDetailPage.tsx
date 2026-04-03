import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  Alert,
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
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  ArrowBack,
  ArrowBackIosNew,
  ArrowForwardIos,
  Receipt,
  Payments,
  LocalShipping,
  MoveToInbox,
  StarBorder,
  LocationOn,
  Phone,
  Person,
  CancelOutlined,
  AssignmentReturn,
} from "@mui/icons-material";
import { MainLayout } from "@/layouts/MainLayout";
import { AppBreadcrumbs } from "@/components/common/AppBreadcrumbs";
import { orderService } from "@/services/orderService";
import { productReviewService } from "@/services/reviewService";
import { productService } from "@/services/productService";
import { userService } from "@/services/userService";
import { useToast } from "@/hooks/useToast";
import type { UserCredentials } from "@/services/userService";
import type { PaymentMethod } from "@/types/checkout";
import type { OrderResponse, CarrierName, OrderStatus } from "@/types/order";
import {
  getReviewStatus,
  type ReviewResponse,
  type ReviewStatus,
  type ReviewDialogTarget,
} from "@/types/review";
import { orderStatusLabels } from "@/utils/orderStatus";
import { UserProfileSidebar } from "@/components/profile/UserProfileSidebar";
import { ReviewEditorDialog } from "@/components/review/ReviewEditorDialog";

// ─── Constants ──────────────────────────────────────────────────────────────

const CARRIER_LABELS: Record<CarrierName, string> = {
  GHN: "Giao Hàng Nhanh",
  GHTK: "Giao Hàng Tiết Kiệm",
};

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CashOnDelivery: "Thanh toán khi nhận hàng",
  CashInStore: "Thanh toán tiền mặt tại quầy",
  VnPay: "Thanh toán qua VNPay",
  Momo: "Thanh toán qua MoMo",
};

const REVIEW_STATUS_CHIP: Record<
  ReviewStatus,
  { label: string; color: "default" | "warning" | "success" | "error" }
> = {
  Pending: { label: "Chờ duyệt", color: "warning" },
  Approved: { label: "Đã duyệt", color: "success" },
  Rejected: { label: "Từ chối", color: "error" },
};

/** Maps OrderStatus → active stepper index (0-based, -1 = canceled/returned) */
const STATUS_TO_STEP: Record<OrderStatus, number> = {
  Pending: 0,
  Processing: 1,
  Delivering: 3,
  Delivered: 4,
  Returning: -2,
  Cancelled: -1,
  Returned: -2,
};

const STEPS = [
  { label: "Đơn Hàng Đã Đặt", Icon: Receipt },
  { label: "Đơn Hàng Đã Thanh Toán", Icon: Payments },
  { label: "Đã Giao Cho ĐVVC", Icon: LocalShipping },
  { label: "Chờ Giao Hàng", Icon: MoveToInbox },
  { label: "Đánh Giá", Icon: StarBorder },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmt = (v?: number | null) =>
  `${new Intl.NumberFormat("vi-VN").format(Number(v ?? 0))}đ`;

const fmtDate = (s?: string | null) => {
  if (!s) return null;
  const d = new Date(s);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")} ${d.getDate().toString().padStart(2, "0")}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getFullYear()}`;
};

// ─── Order Stepper ──────────────────────────────────────────────────────────

interface StepperProps {
  status: OrderStatus;
  createdAt?: string | null;
  paidAt?: string | null;
  updatedAt?: string | null;
  totalAmount?: number | null;
}

const OrderStepper = ({
  status,
  createdAt,
  paidAt,
  updatedAt,
  totalAmount,
}: StepperProps) => {
  // If already paid, ensure at least step 1 is active regardless of status
  const baseStep = STATUS_TO_STEP[status] ?? 0;
  const activeStep = paidAt && baseStep < 1 ? 1 : baseStep;
  const isCanceled = status === "Cancelled";
  const isReturned = status === "Returned";
  const isSpecial = isCanceled || isReturned;

  /** Date label shown below each step */
  const stepDates: (string | null)[] = [
    fmtDate(createdAt),
    fmtDate(paidAt),
    null,
    null,
    status === "Delivered" ? fmtDate(updatedAt) : null,
  ];

  /** Sub-label shown below the date (e.g. amount paid) */
  const stepSubLabels: (string | null)[] = [
    null,
    paidAt && totalAmount ? `(${fmt(totalAmount)})` : null,
    null,
    null,
    null,
  ];

  const GREEN = "#26aa99";
  const GRAY = "#ccc";

  return (
    <Box sx={{ py: 3, px: { xs: 2, sm: 4 } }}>
      {isSpecial && (
        <Box
          display="flex"
          alignItems="center"
          gap={1}
          mb={2}
          sx={{
            bgcolor: isCanceled ? "#fff3f3" : "#fff8e1",
            border: `1px solid ${isCanceled ? "#f5c6c6" : "#ffe082"}`,
            borderRadius: 1,
            p: 1.5,
          }}
        >
          {isCanceled ? (
            <CancelOutlined sx={{ color: "#e53935" }} />
          ) : (
            <AssignmentReturn sx={{ color: "#f57c00" }} />
          )}
          <Typography
            fontWeight={600}
            color={isCanceled ? "error" : "warning.dark"}
          >
            {isCanceled ? "Đơn hàng đã bị hủy" : "Đơn hàng đã được hoàn trả"}
          </Typography>
        </Box>
      )}

      {/* Stepper row */}
      <Box
        display="flex"
        alignItems="flex-start"
        sx={{ overflowX: "auto", pt: "6px", pb: 1 }}
      >
        {STEPS.map((step, idx) => {
          const completed = !isSpecial && idx <= activeStep;
          const isCurrent = !isSpecial && idx === activeStep;
          const circleColor = completed ? GREEN : GRAY;
          const lineColor = !isSpecial && idx < activeStep ? GREEN : GRAY;

          return (
            <Box
              key={step.label}
              display="flex"
              alignItems="flex-start"
              sx={{ flex: idx < STEPS.length - 1 ? 1 : "none" }}
            >
              {/* Step column */}
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                sx={{ minWidth: 80 }}
              >
                {/* Circle icon */}
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    border: `2px solid ${circleColor}`,
                    bgcolor: completed ? GREEN : "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: isCurrent ? `0 0 0 4px ${GREEN}33` : "none",
                    transition: "all 0.2s",
                  }}
                >
                  <step.Icon
                    sx={{
                      fontSize: 26,
                      color: completed ? "#fff" : GRAY,
                    }}
                  />
                </Box>

                {/* Label */}
                <Typography
                  variant="caption"
                  align="center"
                  fontWeight={isCurrent ? 700 : 500}
                  sx={{
                    mt: 1,
                    color: completed ? "#333" : "text.disabled",
                    maxWidth: 90,
                    lineHeight: 1.3,
                  }}
                >
                  {step.label}
                </Typography>

                {/* Date */}
                {stepDates[idx] && (
                  <Typography
                    variant="caption"
                    align="center"
                    sx={{ color: "text.secondary", mt: 0.25, fontSize: 11 }}
                  >
                    {stepDates[idx]}
                  </Typography>
                )}

                {/* Sub label */}
                {stepSubLabels[idx] && (
                  <Typography
                    variant="caption"
                    align="center"
                    sx={{ color: "text.secondary", fontSize: 11 }}
                  >
                    {stepSubLabels[idx]}
                  </Typography>
                )}
              </Box>

              {/* Connector line — mt: 27px centers on the 56px circle */}
              {idx < STEPS.length - 1 && (
                <Box
                  sx={{
                    flex: 1,
                    height: 2,
                    bgcolor: lineColor,
                    mt: "27px",
                    mx: 0.5,
                    minWidth: 20,
                  }}
                />
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

// ─── Main Page ───────────────────────────────────────────────────────────────

export const MyOrderDetailPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state as {
    status?: string;
    requestReturn?: boolean;
  } | null) ?? { status: "", requestReturn: false };
  const backStatus: string = locationState.status ?? "";

  const { showToast } = useToast();
  const [userInfo, setUserInfo] = useState<UserCredentials | null>(null);
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [myReviews, setMyReviews] = useState<ReviewResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewDialogMode, setReviewDialogMode] = useState<"create" | "edit">(
    "create",
  );
  const [reviewDialogTarget, setReviewDialogTarget] =
    useState<ReviewDialogTarget | null>(null);
  const [selectedReview, setSelectedReview] = useState<ReviewResponse | null>(
    null,
  );
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const [isReturnRequestMode, setIsReturnRequestMode] = useState(
    Boolean(locationState.requestReturn),
  );
  const [returnReason, setReturnReason] = useState("");
  const [returnNote, setReturnNote] = useState("");
  const [returnImages, setReturnImages] = useState<File[]>([]);
  const [activeReturnImageIndex, setActiveReturnImageIndex] = useState(0);
  const [isSubmittingReturnRequest, setIsSubmittingReturnRequest] =
    useState(false);

  useEffect(() => {
    if (locationState.requestReturn) {
      setIsReturnRequestMode(true);
    }
  }, [locationState.requestReturn]);

  useEffect(() => {
    void userService.getUserMe().then(setUserInfo).catch(console.error);
  }, []);

  useEffect(() => {
    if (!orderId) return;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [orderData, reviewData] = await Promise.all([
          orderService.getMyOrderById(orderId),
          productReviewService.getMyReviews().catch(() => []),
        ]);
        setOrder(orderData);
        setMyReviews(reviewData);
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "Không thể tải chi tiết đơn hàng",
        );
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [orderId]);

  const reviewsIndex = useMemo(() => {
    const map: Record<string, ReviewResponse> = {};
    myReviews.forEach((r) => {
      if (r.orderDetailId) map[r.orderDetailId] = r;
    });
    return map;
  }, [myReviews]);

  const canReview = order?.status === "Delivered";
  const isOrderReturnable = Boolean(
    (
      order as
        | (OrderResponse & { isReturnable?: boolean; isReturnalbe?: boolean })
        | null
    )?.isReturnable ??
    (
      order as
        | (OrderResponse & { isReturnable?: boolean; isReturnalbe?: boolean })
        | null
    )?.isReturnalbe,
  );

  const getCancelBehavior = (currentOrder: OrderResponse | null) => {
    if (!currentOrder?.status) {
      return null;
    }

    const isPending = currentOrder.status === "Pending";
    const isProcessing = currentOrder.status === "Processing";
    const isPaid = currentOrder.paymentStatus === "Paid";

    if (isPending && !isPaid) {
      return {
        mode: "direct" as const,
        buttonLabel: "Hủy đơn hàng",
        note: "Đơn chưa thanh toán nên sẽ bị hủy ngay sau khi xác nhận.",
      };
    }

    if ((isPending && isPaid) || isProcessing) {
      return {
        mode: "request" as const,
        buttonLabel: "Yêu cầu hủy đơn hàng",
        note: "Đơn hàng này sẽ tạo yêu cầu hủy và chờ Staff/Admin duyệt.",
      };
    }

    return null;
  };

  const cancelBehavior = getCancelBehavior(order);

  const handleProductClick = async (variantId?: string | null) => {
    if (!variantId) return;
    try {
      const variant = await productService.getVariantById(variantId);
      if (variant.productId) {
        navigate(`/products/${variant.productId}`);
      }
    } catch {
      // silently ignore
    }
  };

  const handleReviewAction = (
    orderDetailId: string,
    variantId: string,
    variantName?: string,
    imageUrl?: string | null,
    existing?: ReviewResponse | null,
  ) => {
    if (!orderDetailId || !variantId) return;
    setReviewDialogMode(existing ? "edit" : "create");
    setReviewDialogTarget({
      orderDetailId,
      variantId,
      variantName,
      productName: variantName,
      thumbnailUrl: imageUrl ?? null,
    });
    setSelectedReview(existing ?? null);
    setIsReviewDialogOpen(true);
  };

  // ── Derived values ──────────────────────────────────────────────────────
  const subtotal = useMemo(
    () =>
      order?.orderDetails?.reduce((sum, item) => sum + (item.total ?? 0), 0) ??
      0,
    [order],
  );
  const shippingFee = order?.shippingInfo?.shippingFee ?? 0;
  const total = order?.totalAmount ?? 0;
  const voucherDiscount = subtotal + shippingFee - total;
  const paymentMethodLabel = useMemo(() => {
    const paymentMethod = [...(order?.paymentTransactions ?? [])]
      .reverse()
      .find((transaction) => transaction?.paymentMethod)?.paymentMethod;

    return paymentMethod ? PAYMENT_METHOD_LABELS[paymentMethod] : "N/A";
  }, [order?.paymentTransactions]);

  const requestedRefundAmount = useMemo(
    () => Number(order?.totalAmount ?? 0),
    [order?.totalAmount],
  );

  const returnImagePreviews = useMemo(
    () =>
      returnImages.map((file) => ({
        name: file.name,
        url: URL.createObjectURL(file),
      })),
    [returnImages],
  );

  useEffect(() => {
    return () => {
      returnImagePreviews.forEach((preview) =>
        URL.revokeObjectURL(preview.url),
      );
    };
  }, [returnImagePreviews]);

  useEffect(() => {
    if (!returnImagePreviews.length) {
      setActiveReturnImageIndex(0);
      return;
    }

    if (activeReturnImageIndex > returnImagePreviews.length - 1) {
      setActiveReturnImageIndex(returnImagePreviews.length - 1);
    }
  }, [returnImagePreviews.length, activeReturnImageIndex]);

  const handleCancelOrder = async () => {
    if (!order?.id) return;

    const reason = cancelReason.trim();
    if (!reason) {
      showToast("Vui lòng nhập lý do hủy đơn hàng", "warning");
      return;
    }

    try {
      setIsCancelling(true);
      await orderService.cancelOrder(order.id, reason);
      showToast(
        cancelBehavior?.mode === "direct"
          ? "Đã hủy đơn hàng thành công"
          : "Đã gửi yêu cầu hủy đơn thành công",
        "success",
      );
      setIsCancelDialogOpen(false);
      setCancelReason("");
      if (orderId) {
        const refreshed = await orderService.getMyOrderById(orderId);
        setOrder(refreshed);
      }
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Không thể hủy đơn hàng",
        "error",
      );
    } finally {
      setIsCancelling(false);
    }
  };

  const handleReturnImagesChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const fileList = Array.from(event.target.files || []);
    if (!fileList.length) {
      return;
    }

    setReturnImages((prev) => [...prev, ...fileList].slice(0, 8));
    event.target.value = "";
  };

  const handleRemoveReturnImage = (index: number) => {
    setReturnImages((prev) =>
      prev.filter((_, currentIndex) => currentIndex !== index),
    );
  };

  const handleSubmitReturnRequest = async () => {
    if (!order?.id) {
      return;
    }

    const reason = returnReason.trim();
    if (!reason) {
      showToast("Vui lòng nhập lý do trả hàng", "warning");
      return;
    }

    try {
      setIsSubmittingReturnRequest(true);

      const uploadedMedias = returnImages.length
        ? await orderService.uploadTemporaryReturnImages(returnImages)
        : [];
      const temporaryMediaIds = uploadedMedias
        .map((media) => media.id)
        .filter((id): id is string => Boolean(id));

      await orderService.createReturnRequest({
        orderId: order.id,
        reason,
        customerNote: returnNote.trim() || null,
        requestedRefundAmount: requestedRefundAmount || undefined,
        temporaryMediaIds: temporaryMediaIds.length ? temporaryMediaIds : null,
      });

      showToast("Đã gửi yêu cầu trả hàng thành công", "success");
      setIsReturnRequestMode(false);
      setReturnReason("");
      setReturnNote("");
      setReturnImages([]);
      if (orderId) {
        const refreshed = await orderService.getMyOrderById(orderId);
        setOrder(refreshed);
      }
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Không thể gửi yêu cầu trả hàng",
        "error",
      );
    } finally {
      setIsSubmittingReturnRequest(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <MainLayout>
      <Box sx={{ bgcolor: "white", py: 4, flex: 1 }}>
        <Container maxWidth="lg">
          <AppBreadcrumbs
            items={[
              { label: "Trang chủ", href: "/" },
              { label: "Đơn hàng của tôi", href: "/my-orders" },
              { label: "Chi tiết đơn hàng" },
            ]}
            sx={{ mb: 2 }}
          />
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
            <Box sx={{ flex: 1, bgcolor: "#fff", minWidth: 0 }}>
              {isLoading ? (
                <Box
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                  minHeight={400}
                >
                  <CircularProgress sx={{ color: "#ee4d2d" }} />
                </Box>
              ) : error || !order ? (
                <Box textAlign="center" py={8}>
                  <Typography color="error">
                    {error ?? "Không tìm thấy đơn hàng"}
                  </Typography>
                  <Button
                    sx={{ mt: 2 }}
                    variant="outlined"
                    onClick={() => navigate("/my-orders")}
                  >
                    Quay lại
                  </Button>
                </Box>
              ) : (
                <Box>
                  {/* ── Top bar ─────────────────────────────────────────── */}
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{
                      px: 3,
                      py: 2,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Button
                        startIcon={<ArrowBack />}
                        onClick={() =>
                          navigate("/my-orders", {
                            state: { status: backStatus },
                          })
                        }
                        sx={{ color: "text.secondary", textTransform: "none" }}
                      >
                        TRỞ LẠI
                      </Button>
                    </Stack>

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
                        <b style={{ color: "#333" }}>
                          {(order.id ?? "").toUpperCase()}
                        </b>
                      </Typography>
                      <Divider orientation="vertical" flexItem />
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        sx={{ color: "#ee4d2d", textTransform: "uppercase" }}
                      >
                        {orderStatusLabels[order.status!]}
                      </Typography>
                    </Box>
                  </Box>

                  {/* ── Progress stepper ──────────────────────────────────── */}
                  <Box
                    sx={{ borderBottom: "1px solid", borderColor: "divider" }}
                  >
                    <OrderStepper
                      status={order.status!}
                      createdAt={order.createdAt}
                      paidAt={order.paidAt}
                      updatedAt={order.updatedAt}
                      totalAmount={order.totalAmount}
                    />
                  </Box>

                  {(cancelBehavior ||
                    (order.status === "Delivered" && isOrderReturnable)) && (
                    <Box
                      sx={{
                        px: 3,
                        py: 2,
                        borderBottom: "1px solid",
                        borderColor: "divider",
                        bgcolor: "#fffaf7",
                      }}
                    >
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1.5}
                        justifyContent="space-between"
                        alignItems={{ xs: "flex-start", sm: "center" }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          {isReturnRequestMode
                            ? "Bạn đang tạo yêu cầu trả hàng cho đơn này."
                            : "Bạn có thể xử lý hủy đơn hoặc yêu cầu trả hàng ngay tại trang chi tiết."}
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          {cancelBehavior && (
                            <Button
                              size="small"
                              variant="outlined"
                              color={
                                cancelBehavior.mode === "direct"
                                  ? "error"
                                  : "warning"
                              }
                              onClick={() => setIsCancelDialogOpen(true)}
                            >
                              {cancelBehavior.buttonLabel}
                            </Button>
                          )}
                          {order.status === "Delivered" &&
                            isOrderReturnable && (
                              <Button
                                size="small"
                                variant={
                                  isReturnRequestMode ? "contained" : "outlined"
                                }
                                color="warning"
                                onClick={() =>
                                  setIsReturnRequestMode((prev) => !prev)
                                }
                              >
                                {isReturnRequestMode
                                  ? "Ẩn yêu cầu trả hàng"
                                  : "Yêu cầu trả hàng"}
                              </Button>
                            )}
                        </Stack>
                      </Stack>
                    </Box>
                  )}

                  <Box
                    sx={{
                      p: 3,
                      display: "flex",
                      flexDirection: "column",
                      gap: 3,
                    }}
                  >
                    {isReturnRequestMode && order.status === "Delivered" && (
                      <Paper
                        variant="outlined"
                        sx={{ p: 2.5, borderRadius: 2 }}
                      >
                        <Typography
                          variant="subtitle1"
                          fontWeight={700}
                          mb={2}
                          color="#ee4d2d"
                        >
                          Tạo yêu cầu trả hàng
                        </Typography>

                        <Box
                          display="grid"
                          gridTemplateColumns={{
                            xs: "1fr",
                            md: "1.25fr 0.75fr",
                          }}
                          gap={2}
                        >
                          <Stack spacing={1.5}>
                            <Alert severity="info" sx={{ mb: 0.5 }}>
                              Yêu cầu trả hàng hiện áp dụng cho toàn bộ đơn. Hệ
                              thống sẽ gửi theo mã đơn hàng và xử lý toàn bộ sản
                              phẩm trong đơn.
                            </Alert>

                            <Box
                              sx={{
                                p: 1.5,
                                border: "1px solid",
                                borderColor: "divider",
                                borderRadius: 1.5,
                                bgcolor: "#fafafa",
                              }}
                            >
                              <Typography variant="body2" fontWeight={700}>
                                Mã đơn: {order.id?.slice(0, 8) || "-"}...
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Tổng sản phẩm: {order.orderDetails?.length || 0}
                              </Typography>
                            </Box>

                            <TextField
                              label="Lý do trả hàng *"
                              value={returnReason}
                              onChange={(e) => setReturnReason(e.target.value)}
                              fullWidth
                              multiline
                              minRows={2}
                            />

                            <TextField
                              label="Ghi chú thêm (tuỳ chọn)"
                              value={returnNote}
                              onChange={(e) => setReturnNote(e.target.value)}
                              fullWidth
                              multiline
                              minRows={2}
                            />
                          </Stack>

                          <Paper
                            variant="outlined"
                            sx={{
                              p: 1.5,
                              borderRadius: 1.5,
                              bgcolor: "#fcfcfc",
                            }}
                          >
                            <Stack spacing={1.25}>
                              <Typography
                                variant="body2"
                                fontWeight={700}
                                color="#ee4d2d"
                              >
                                Ảnh tình trạng sản phẩm
                              </Typography>

                              <Button
                                variant="outlined"
                                component="label"
                                size="small"
                              >
                                Tải ảnh
                                <input
                                  hidden
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  onChange={handleReturnImagesChange}
                                />
                              </Button>

                              {returnImagePreviews.length > 0 && (
                                <Stack spacing={1}>
                                  <Box
                                    sx={{
                                      position: "relative",
                                      borderRadius: 1.25,
                                      overflow: "hidden",
                                      border: "1px solid",
                                      borderColor: "divider",
                                      bgcolor: "#fff",
                                      height: 190,
                                    }}
                                  >
                                    <Box
                                      component="img"
                                      src={
                                        returnImagePreviews[
                                          activeReturnImageIndex
                                        ]?.url
                                      }
                                      alt={
                                        returnImagePreviews[
                                          activeReturnImageIndex
                                        ]?.name
                                      }
                                      sx={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                      }}
                                    />

                                    {returnImagePreviews.length > 1 && (
                                      <>
                                        <IconButton
                                          size="small"
                                          onClick={() =>
                                            setActiveReturnImageIndex((prev) =>
                                              prev === 0
                                                ? returnImagePreviews.length - 1
                                                : prev - 1,
                                            )
                                          }
                                          sx={{
                                            position: "absolute",
                                            left: 6,
                                            top: "50%",
                                            transform: "translateY(-50%)",
                                            bgcolor: "rgba(255,255,255,0.9)",
                                          }}
                                        >
                                          <ArrowBackIosNew fontSize="small" />
                                        </IconButton>
                                        <IconButton
                                          size="small"
                                          onClick={() =>
                                            setActiveReturnImageIndex((prev) =>
                                              prev ===
                                              returnImagePreviews.length - 1
                                                ? 0
                                                : prev + 1,
                                            )
                                          }
                                          sx={{
                                            position: "absolute",
                                            right: 6,
                                            top: "50%",
                                            transform: "translateY(-50%)",
                                            bgcolor: "rgba(255,255,255,0.9)",
                                          }}
                                        >
                                          <ArrowForwardIos fontSize="small" />
                                        </IconButton>
                                      </>
                                    )}
                                  </Box>

                                  <Stack
                                    direction="row"
                                    spacing={1}
                                    sx={{ overflowX: "auto", pb: 0.5 }}
                                  >
                                    {returnImagePreviews.map(
                                      (preview, index) => (
                                        <Box
                                          key={`${preview.name}-${index}`}
                                          sx={{
                                            width: 52,
                                            height: 52,
                                            borderRadius: 1,
                                            overflow: "hidden",
                                            border: "2px solid",
                                            borderColor:
                                              activeReturnImageIndex === index
                                                ? "#ee4d2d"
                                                : "transparent",
                                            flexShrink: 0,
                                            cursor: "pointer",
                                          }}
                                          onClick={() =>
                                            setActiveReturnImageIndex(index)
                                          }
                                        >
                                          <Box
                                            component="img"
                                            src={preview.url}
                                            alt={preview.name}
                                            sx={{
                                              width: "100%",
                                              height: "100%",
                                              objectFit: "cover",
                                            }}
                                          />
                                        </Box>
                                      ),
                                    )}
                                  </Stack>

                                  <Stack
                                    direction="row"
                                    spacing={1}
                                    flexWrap="wrap"
                                    useFlexGap
                                  >
                                    {returnImagePreviews.map(
                                      (preview, index) => (
                                        <Chip
                                          key={`name-${preview.name}-${index}`}
                                          label={preview.name}
                                          onDelete={() =>
                                            handleRemoveReturnImage(index)
                                          }
                                          size="small"
                                          sx={{ maxWidth: 220 }}
                                        />
                                      ),
                                    )}
                                  </Stack>
                                </Stack>
                              )}

                              <Divider />

                              <Box
                                display="flex"
                                justifyContent="space-between"
                                alignItems="center"
                              >
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  Số tiền hoàn dự kiến
                                </Typography>
                                <Typography
                                  variant="subtitle1"
                                  fontWeight={700}
                                  color="#ee4d2d"
                                >
                                  {fmt(requestedRefundAmount)}
                                </Typography>
                              </Box>

                              <Stack
                                direction="row"
                                spacing={1}
                                justifyContent="flex-end"
                                pt={0.5}
                              >
                                <Button
                                  variant="text"
                                  onClick={() => setIsReturnRequestMode(false)}
                                  disabled={isSubmittingReturnRequest}
                                >
                                  Huỷ
                                </Button>
                                <Button
                                  variant="contained"
                                  color="warning"
                                  onClick={handleSubmitReturnRequest}
                                  disabled={isSubmittingReturnRequest}
                                >
                                  {isSubmittingReturnRequest
                                    ? "Đang gửi yêu cầu..."
                                    : "Gửi yêu cầu trả hàng"}
                                </Button>
                              </Stack>
                            </Stack>
                          </Paper>
                        </Box>
                      </Paper>
                    )}

                    {/* ── Delivery & carrier ──────────────────────────────── */}
                    {(order.recipientInfo || order.shippingInfo) && (
                      <Paper
                        variant="outlined"
                        sx={{ p: 2.5, borderRadius: 2 }}
                      >
                        <Typography
                          variant="subtitle1"
                          fontWeight={700}
                          mb={2}
                          color="#ee4d2d"
                        >
                          ĐỊA CHỈ NHẬN HÀNG
                        </Typography>
                        <Box
                          display="grid"
                          gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr" }}
                          gap={2}
                        >
                          {order.recipientInfo && (
                            <Stack spacing={1}>
                              <Box display="flex" alignItems="center" gap={1}>
                                <Person
                                  fontSize="small"
                                  sx={{ color: "text.secondary" }}
                                />
                                <Typography variant="body2" fontWeight={600}>
                                  {order.recipientInfo.recipientName}
                                </Typography>
                              </Box>
                              <Box display="flex" alignItems="center" gap={1}>
                                <Phone
                                  fontSize="small"
                                  sx={{ color: "text.secondary" }}
                                />
                                <Typography variant="body2">
                                  {order.recipientInfo.recipientPhoneNumber}
                                </Typography>
                              </Box>
                              <Box
                                display="flex"
                                alignItems="flex-start"
                                gap={1}
                              >
                                <LocationOn
                                  fontSize="small"
                                  sx={{ color: "text.secondary", mt: 0.2 }}
                                />
                                <Typography variant="body2">
                                  {order.recipientInfo.fullAddress},{" "}
                                  {order.recipientInfo.wardName},{" "}
                                  {order.recipientInfo.districtName},{" "}
                                  {order.recipientInfo.provinceName}
                                </Typography>
                              </Box>
                            </Stack>
                          )}

                          {order.shippingInfo && (
                            <Stack spacing={1}>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                fontWeight={600}
                              >
                                Đơn vị vận chuyển
                              </Typography>
                              <Typography variant="body2" fontWeight={600}>
                                {order.shippingInfo.carrierName
                                  ? (CARRIER_LABELS[
                                      order.shippingInfo.carrierName
                                    ] ?? order.shippingInfo.carrierName)
                                  : "N/A"}
                              </Typography>
                              {order.shippingInfo.trackingNumber && (
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  Mã vận đơn:{" "}
                                  <b>{order.shippingInfo.trackingNumber}</b>
                                </Typography>
                              )}
                            </Stack>
                          )}
                        </Box>
                      </Paper>
                    )}

                    {/* ── Product items ────────────────────────────────────── */}
                    <Paper variant="outlined" sx={{ borderRadius: 2 }}>
                      <Box
                        sx={{
                          px: 2.5,
                          py: 1.5,
                          borderBottom: "1px solid",
                          borderColor: "divider",
                        }}
                      >
                        <Typography variant="subtitle1" fontWeight={700}>
                          Sản phẩm
                        </Typography>
                      </Box>
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow sx={{ bgcolor: "#fafafa" }}>
                              <TableCell>Sản phẩm</TableCell>
                              <TableCell align="center">Số lượng</TableCell>
                              <TableCell align="right">Đơn giá</TableCell>
                              <TableCell align="right">Thành tiền</TableCell>
                              {canReview && (
                                <TableCell align="center">Đánh giá</TableCell>
                              )}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {order.orderDetails?.map((item) => {
                              const orderDetailId = item.id ?? "";
                              const existing = reviewsIndex[orderDetailId];
                              const existingStatus = getReviewStatus(existing);
                              const statusCfg = existingStatus
                                ? REVIEW_STATUS_CHIP[existingStatus]
                                : undefined;

                              return (
                                <TableRow key={item.id}>
                                  <TableCell>
                                    <Box
                                      display="flex"
                                      alignItems="center"
                                      gap={1.5}
                                      onClick={() =>
                                        void handleProductClick(item.variantId)
                                      }
                                      sx={{
                                        cursor: "pointer",
                                        "&:hover .product-name": {
                                          color: "primary.main",
                                          textDecoration: "underline",
                                        },
                                      }}
                                    >
                                      {item.imageUrl ? (
                                        <Box
                                          component="img"
                                          src={item.imageUrl}
                                          alt={item.variantName}
                                          sx={{
                                            width: 60,
                                            height: 60,
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
                                            width: 60,
                                            height: 60,
                                            bgcolor: "grey.100",
                                            borderRadius: 1,
                                            flexShrink: 0,
                                          }}
                                        />
                                      )}
                                      <Typography
                                        className="product-name"
                                        variant="body2"
                                        fontWeight={500}
                                      >
                                        {item.variantName}
                                      </Typography>
                                    </Box>
                                  </TableCell>
                                  <TableCell align="center">
                                    x{item.quantity}
                                  </TableCell>
                                  <TableCell align="right">
                                    {fmt(item.unitPrice)}
                                  </TableCell>
                                  <TableCell
                                    align="right"
                                    sx={{ fontWeight: 600 }}
                                  >
                                    {fmt(item.total)}
                                  </TableCell>
                                  {canReview && (
                                    <TableCell
                                      align="center"
                                      sx={{ minWidth: 160 }}
                                    >
                                      <Stack spacing={0.5} alignItems="center">
                                        {existing && statusCfg && (
                                          <Chip
                                            label={statusCfg.label}
                                            color={statusCfg.color}
                                            size="small"
                                            variant={
                                              existingStatus === "Approved"
                                                ? "filled"
                                                : "outlined"
                                            }
                                          />
                                        )}
                                        <Button
                                          size="small"
                                          variant={
                                            existing ? "outlined" : "contained"
                                          }
                                          sx={
                                            existing
                                              ? {}
                                              : {
                                                  bgcolor: "#ee4d2d",
                                                  "&:hover": {
                                                    bgcolor: "#d03e27",
                                                  },
                                                }
                                          }
                                          onClick={() =>
                                            handleReviewAction(
                                              orderDetailId,
                                              item.variantId ?? "",
                                              item.variantName,
                                              item.imageUrl,
                                              existing,
                                            )
                                          }
                                        >
                                          {existing ? "Chỉnh sửa" : "Đánh giá"}
                                        </Button>
                                      </Stack>
                                    </TableCell>
                                  )}
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Paper>

                    {/* ── Price summary ─────────────────────────────────────── */}
                    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                      <Typography variant="subtitle1" fontWeight={700} mb={2}>
                        Chi tiết thanh toán
                      </Typography>

                      <Stack spacing={1}>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2" color="text.secondary">
                            Tổng tiền hàng
                          </Typography>
                          <Typography variant="body2">
                            {fmt(subtotal)}
                          </Typography>
                        </Box>

                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2" color="text.secondary">
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
                          <Box display="flex" justifyContent="space-between">
                            <Typography variant="body2" color="text.secondary">
                              Giảm giá voucher
                              {order.voucherCode ? (
                                <Chip
                                  label={order.voucherCode}
                                  size="small"
                                  sx={{ ml: 1, fontSize: 11 }}
                                />
                              ) : null}
                            </Typography>
                            <Typography variant="body2" color="success.main">
                              -{fmt(voucherDiscount)}
                            </Typography>
                          </Box>
                        )}

                        <Divider />

                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="subtitle1" fontWeight={700}>
                            Tổng thanh toán
                          </Typography>
                          <Typography
                            variant="subtitle1"
                            fontWeight={700}
                            sx={{ color: "#ee4d2d" }}
                          >
                            {fmt(total)}
                          </Typography>
                        </Box>

                        <Divider />

                        <Box
                          display="flex"
                          justifyContent="space-between"
                          gap={2}
                        >
                          <Typography variant="body2" color="text.secondary">
                            Phương thức thanh toán
                          </Typography>
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            textAlign="right"
                          >
                            {paymentMethodLabel}
                          </Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  </Box>
                </Box>
              )}
            </Box>
          </Paper>
        </Container>
      </Box>

      <ReviewEditorDialog
        open={isReviewDialogOpen}
        mode={reviewDialogMode}
        target={reviewDialogTarget}
        initialReview={selectedReview}
        onClose={() => {
          setIsReviewDialogOpen(false);
          setReviewDialogTarget(null);
          setSelectedReview(null);
        }}
        onSuccess={() => {
          void productReviewService
            .getMyReviews()
            .then(setMyReviews)
            .catch(console.error);
        }}
      />
    </MainLayout>
  );
};

export default MyOrderDetailPage;
