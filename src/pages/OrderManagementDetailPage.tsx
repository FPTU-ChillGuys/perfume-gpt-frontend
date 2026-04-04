import { Fragment, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Select,
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
  AssignmentReturn,
  CancelOutlined,
  ExpandLess,
  ExpandMore,
  LocalShipping,
  MoveToInbox,
  Payments,
  Person,
  Phone,
  Receipt,
  Sync,
  StarBorder,
  LocationOn,
} from "@mui/icons-material";
import { AdminLayout } from "@/layouts/AdminLayout";
import { orderService } from "@/services/orderService";
import { useToast } from "@/hooks/useToast";
import type { PaymentMethod } from "@/types/checkout";
import type { CarrierName, OrderResponse, OrderStatus } from "@/types/order";
import {
  getOrderStatusChipSx,
  orderStatusColors,
  orderStatusLabels,
  orderTypeColors,
  orderTypeLabels,
  paymentStatusColors,
  paymentStatusLabels,
} from "@/utils/orderStatus";

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

const STATUS_TO_STEP: Record<OrderStatus, number> = {
  Pending: 0,
  Processing: 1,
  Delivering: 3,
  Delivered: 4,
  Returning: -2,
  Cancelled: -1,
  Partial_Returned: -2,
  Returned: -2,
};

const STEPS = [
  { label: "Đơn Hàng Đã Đặt", Icon: Receipt },
  { label: "Đơn Hàng Đã Thanh Toán", Icon: Payments },
  { label: "Đã Giao Cho ĐVVC", Icon: LocalShipping },
  { label: "Đang Giao Hàng", Icon: MoveToInbox },
  { label: "Hoàn tất", Icon: StarBorder },
];

const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  Pending: ["Processing", "Cancelled"],
  Processing: ["Cancelled"],
  Delivering: ["Delivered", "Returned"],
  Delivered: [],
  Returning: ["Returned"],
  Cancelled: [],
  Partial_Returned: [],
  Returned: [],
};

const fmt = (value?: number | null) =>
  `${new Intl.NumberFormat("vi-VN").format(Number(value ?? 0))}đ`;

const fmtDateShort = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("vi-VN");
};

const fmtDate = (s?: string | null) => {
  if (!s) return null;
  const d = new Date(s);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")} ${d.getDate().toString().padStart(2, "0")}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getFullYear()}`;
};

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
  const baseStep = STATUS_TO_STEP[status] ?? 0;
  const activeStep = paidAt && baseStep < 1 ? 1 : baseStep;
  const isCanceled = status === "Cancelled";
  const isReturned = status === "Returned";
  const isSpecial = isCanceled || isReturned;

  const stepDates: (string | null)[] = [
    fmtDate(createdAt),
    fmtDate(paidAt),
    null,
    null,
    status === "Delivered" ? fmtDate(updatedAt) : null,
  ];

  const stepSubLabels: (string | null)[] = [
    null,
    paidAt && totalAmount ? `(${fmt(totalAmount)})` : null,
    null,
    null,
    null,
  ];

  const green = "#26aa99";
  const gray = "#ccc";

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

      <Box
        display="flex"
        alignItems="flex-start"
        sx={{ overflowX: "auto", pt: "6px", pb: 1 }}
      >
        {STEPS.map((step, idx) => {
          const completed = !isSpecial && idx <= activeStep;
          const isCurrent = !isSpecial && idx === activeStep;
          const circleColor = completed ? green : gray;
          const lineColor = !isSpecial && idx < activeStep ? green : gray;

          return (
            <Box
              key={step.label}
              display="flex"
              alignItems="flex-start"
              sx={{ flex: idx < STEPS.length - 1 ? 1 : "none" }}
            >
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                sx={{ minWidth: 80 }}
              >
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    border: `2px solid ${circleColor}`,
                    bgcolor: completed ? green : "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: isCurrent ? `0 0 0 4px ${green}33` : "none",
                    transition: "all 0.2s",
                  }}
                >
                  <step.Icon
                    sx={{
                      fontSize: 26,
                      color: completed ? "#fff" : gray,
                    }}
                  />
                </Box>

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

                {stepDates[idx] && (
                  <Typography
                    variant="caption"
                    align="center"
                    sx={{ color: "text.secondary", mt: 0.25, fontSize: 11 }}
                  >
                    {stepDates[idx]}
                  </Typography>
                )}

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

interface FulfillInputItem {
  orderDetailId: string;
  scannedBatchCode: string;
  quantity: string;
}

interface AutoFulfillItem {
  id: string;
  variantName?: string;
  orderQuantity: number;
  reservedQuantity: number;
  scannedBatchCode: string;
  quantity: number;
}

export const OrderManagementDetailPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const backStatus =
    (location.state as { status?: OrderStatus | "" } | null)?.status ?? "";
  const defaultBackPath = location.pathname.startsWith("/staff")
    ? "/staff/orders"
    : "/admin/orders";
  const backPath =
    (location.state as { fromPath?: string } | null)?.fromPath ??
    defaultBackPath;

  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | "">("");
  const [note, setNote] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isFulfilling, setIsFulfilling] = useState(false);
  const [expandedBatches, setExpandedBatches] = useState<
    Record<string, boolean>
  >({});
  const [isPackagingConfirmed, setIsPackagingConfirmed] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isSyncingShipping, setIsSyncingShipping] = useState(false);

  const loadOrder = async () => {
    if (!orderId) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await orderService.getOrderById(orderId);
      setOrder(data);
      setSelectedStatus("");
      setNote("");
      setIsPackagingConfirmed(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể tải chi tiết đơn hàng",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const availableStatuses = useMemo(() => {
    if (!order?.status) return [];
    return allowedTransitions[order.status] ?? [];
  }, [order?.status]);

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

  const autoFulfillItems = useMemo<AutoFulfillItem[]>(() => {
    if (order?.status !== "Processing") {
      return [];
    }

    return (order.orderDetails ?? [])
      .filter((detail) => Boolean(detail.id))
      .map((detail) => ({
        id: detail.id!,
        variantName: detail.variantName,
        orderQuantity: Number(detail.quantity ?? 0),
        reservedQuantity: Number(
          (detail.reservedBatches ?? []).reduce(
            (sum, batch) => sum + Number(batch.reservedQuantity ?? 0),
            0,
          ),
        ),
        scannedBatchCode:
          (detail.reservedBatches ?? [])
            .find(
              (batch) =>
                Boolean(batch.batchCode) &&
                Number(batch.reservedQuantity ?? 0) > 0,
            )
            ?.batchCode?.trim() ||
          (detail.reservedBatches ?? [])
            .find((batch) => Boolean(batch.batchCode))
            ?.batchCode?.trim() ||
          "",
        quantity: Number(detail.quantity ?? 0),
      }));
  }, [order?.orderDetails, order?.status]);

  const autoFulfillError = useMemo(() => {
    if (order?.status !== "Processing") {
      return null;
    }

    if (autoFulfillItems.length === 0) {
      return "Không tìm thấy order detail để đóng gói";
    }

    const missingBatch = autoFulfillItems.find(
      (item) => !item.scannedBatchCode,
    );
    if (missingBatch) {
      return `Không tìm thấy mã batch giữ hàng cho sản phẩm ${missingBatch.variantName || missingBatch.id}`;
    }

    const invalidQuantity = autoFulfillItems.find(
      (item) => !Number.isFinite(item.quantity) || item.quantity <= 0,
    );
    if (invalidQuantity) {
      return `Số lượng đóng gói không hợp lệ cho sản phẩm ${invalidQuantity.variantName || invalidQuantity.id}`;
    }

    const insufficientReserved = autoFulfillItems.find(
      (item) =>
        item.reservedQuantity > 0 && item.quantity > item.reservedQuantity,
    );
    if (insufficientReserved) {
      return `Số lượng giữ hàng không đủ cho sản phẩm ${insufficientReserved.variantName || insufficientReserved.id}`;
    }

    return null;
  }, [autoFulfillItems, order?.status]);

  const handleBack = () => {
    navigate(backPath, {
      state: { status: backStatus },
    });
  };

  const executeUpdateStatus = async () => {
    if (!order?.id || !selectedStatus) return;

    try {
      setIsUpdating(true);
      await orderService.updateOrderStatus(
        order.id,
        selectedStatus,
        note || undefined,
      );
      showToast("Cập nhật trạng thái đơn hàng thành công", "success");
      await loadOrder();
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : "Không thể cập nhật trạng thái đơn hàng",
        "error",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (selectedStatus === "Cancelled") {
      setIsCancelDialogOpen(true);
      return;
    }

    await executeUpdateStatus();
  };

  const handleConfirmCancelStatus = async () => {
    setIsCancelDialogOpen(false);
    await executeUpdateStatus();
  };

  const handleFulfillOrder = async () => {
    if (!order?.id) {
      return;
    }

    if (order.status !== "Processing") {
      showToast(
        "Chỉ có thể đóng gói khi đơn đang ở trạng thái Đang xử lý",
        "warning",
      );
      return;
    }

    if (!isPackagingConfirmed) {
      showToast(
        "Vui lòng xác nhận đã đóng gói đúng số lô và số lượng trước khi bàn giao",
        "warning",
      );
      return;
    }

    if (autoFulfillError) {
      showToast(autoFulfillError, "error");
      return;
    }

    const fulfillPayload = autoFulfillItems.map((item) => ({
      orderDetailId: item.id,
      scannedBatchCode: item.scannedBatchCode,
      quantity: item.quantity,
    }));

    try {
      setIsFulfilling(true);
      await orderService.fulfillOrder(order.id, {
        items: fulfillPayload,
      });
      showToast(
        "Đóng gói thành công, đơn hàng đã chuyển sang Đang giao hàng",
        "success",
      );
      await loadOrder();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Không thể đóng gói đơn hàng",
        "error",
      );
    } finally {
      setIsFulfilling(false);
    }
  };

  const handleSyncShippingStatus = async () => {
    if (!orderId) {
      return;
    }

    try {
      setIsSyncingShipping(true);
      await orderService.syncMyShippingStatus();
      await loadOrder();
      showToast("Đã đồng bộ trạng thái vận chuyển", "success");
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : "Không thể đồng bộ trạng thái vận chuyển",
        "error",
      );
    } finally {
      setIsSyncingShipping(false);
    }
  };

  const toggleBatchDetails = (detailId?: string) => {
    if (!detailId) return;
    setExpandedBatches((prev) => ({
      ...prev,
      [detailId]: !prev[detailId],
    }));
  };

  return (
    <AdminLayout>
      <Box>
        <Paper sx={{ overflow: "hidden", borderRadius: 2 }}>
          {isLoading ? (
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              minHeight={420}
            >
              <CircularProgress />
            </Box>
          ) : error || !order ? (
            <Box sx={{ p: 3 }}>
              <Alert severity="error" sx={{ mb: 2 }}>
                {error ?? "Không tìm thấy đơn hàng"}
              </Alert>
              <Button variant="outlined" onClick={handleBack}>
                TRỞ LẠI
              </Button>
            </Box>
          ) : (
            <Box>
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
                  startIcon={<ArrowBack />}
                  onClick={handleBack}
                  sx={{ color: "text.secondary", textTransform: "none" }}
                >
                  TRỞ LẠI
                </Button>

                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  flexWrap="wrap"
                >
                  <IconButton
                    size="small"
                    onClick={handleSyncShippingStatus}
                    disabled={isSyncingShipping}
                    aria-label="Đồng bộ trạng thái vận chuyển"
                  >
                    <Sync
                      sx={{
                        animation: isSyncingShipping
                          ? "sync-spin 0.9s linear infinite"
                          : "none",
                        "@keyframes sync-spin": {
                          from: { transform: "rotate(0deg)" },
                          to: { transform: "rotate(360deg)" },
                        },
                      }}
                    />
                  </IconButton>
                  <Typography variant="body2" color="text.secondary">
                    Mã đơn:{" "}
                    <b>
                      {(order.code || order.id || orderId || "-").toUpperCase()}
                    </b>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    |
                  </Typography>
                  {order.type && (
                    <Chip
                      label={orderTypeLabels[order.type]}
                      color={orderTypeColors[order.type]}
                      size="small"
                      variant="outlined"
                    />
                  )}
                  {order.status && (
                    <Chip
                      label={orderStatusLabels[order.status]}
                      color={orderStatusColors[order.status]}
                      size="small"
                      sx={getOrderStatusChipSx(order.status)}
                    />
                  )}
                  {order.paymentStatus && (
                    <Chip
                      label={paymentStatusLabels[order.paymentStatus]}
                      color={paymentStatusColors[order.paymentStatus]}
                      size="small"
                    />
                  )}
                </Stack>
              </Box>

              <Box sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
                <OrderStepper
                  status={order.status!}
                  createdAt={order.createdAt}
                  paidAt={order.paidAt}
                  updatedAt={order.updatedAt}
                  totalAmount={order.totalAmount}
                />
              </Box>

              <Box
                sx={{
                  p: 3,
                  display: "grid",
                  gap: 3,
                  gridTemplateColumns: { xs: "1fr", lg: "2fr 1fr" },
                }}
              >
                <Stack spacing={3}>
                  {(order.recipientInfo || order.shippingInfo) && (
                    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                      <Typography
                        variant="subtitle1"
                        fontWeight={700}
                        mb={2}
                        color="#ee4d2d"
                      >
                        Địa chỉ nhận hàng
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
                            <Box display="flex" alignItems="flex-start" gap={1}>
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
                            <TableCell align="left">Batch giữ hàng</TableCell>
                            <TableCell align="left"></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {order.orderDetails?.map((item, index) => {
                            const batches = item.reservedBatches || [];
                            const rowKey =
                              item.id || `${item.variantName}-${index}`;
                            const isExpandable =
                              Boolean(item.id) && batches.length > 0;
                            const isExpanded = item.id
                              ? Boolean(expandedBatches[item.id])
                              : false;

                            return (
                              <Fragment key={rowKey}>
                                <TableRow hover>
                                  <TableCell>
                                    <Box
                                      display="flex"
                                      alignItems="center"
                                      gap={1.5}
                                    >
                                      {item.imageUrl ? (
                                        <Box
                                          component="img"
                                          src={item.imageUrl}
                                          alt={item.variantName}
                                          sx={{
                                            width: 56,
                                            height: 56,
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
                                            width: 56,
                                            height: 56,
                                            bgcolor: "grey.100",
                                            borderRadius: 1,
                                            flexShrink: 0,
                                          }}
                                        />
                                      )}
                                      <Typography
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
                                  <TableCell align="center">
                                    {batches.length === 0 ? (
                                      <Typography
                                        variant="body2"
                                        color="text.secondary"
                                      >
                                        Không có dữ liệu batch
                                      </Typography>
                                    ) : (
                                      <Stack
                                        direction="row"
                                        spacing={1}
                                        alignItems="center"
                                        flexWrap="wrap"
                                      >
                                        <Chip
                                          size="small"
                                          label={`${batches.length} Batch`}
                                          color="info"
                                          variant={
                                            batches.length > 1
                                              ? "filled"
                                              : "outlined"
                                          }
                                        />
                                      </Stack>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {isExpandable ? (
                                      <Button
                                        size="small"
                                        variant="text"
                                        onClick={() =>
                                          toggleBatchDetails(item.id)
                                        }
                                        endIcon={
                                          isExpanded ? (
                                            <ExpandLess />
                                          ) : (
                                            <ExpandMore />
                                          )
                                        }
                                        sx={{
                                          px: 0,
                                          minWidth: 0,
                                          textTransform: "none",
                                        }}
                                      >
                                        {isExpanded
                                          ? "Ẩn chi tiết"
                                          : "Xem chi tiết"}
                                      </Button>
                                    ) : null}
                                  </TableCell>
                                </TableRow>

                                {isExpanded && (
                                  <TableRow>
                                    <TableCell
                                      colSpan={5}
                                      sx={{ py: 0, px: 0 }}
                                    >
                                      <Box
                                        sx={{
                                          mx: 2,
                                          mb: 2,
                                          mt: 0.5,
                                          border: "1px solid",
                                          borderColor: "divider",
                                          borderRadius: 1.5,
                                          overflow: "hidden",
                                        }}
                                      >
                                        <Box
                                          sx={{
                                            px: 2,
                                            py: 1,
                                            bgcolor: "grey.50",
                                            borderBottom: "1px solid",
                                            borderColor: "divider",
                                          }}
                                        >
                                          <Typography
                                            variant="body2"
                                            fontWeight={600}
                                          >
                                            Chi tiết batch giữ hàng
                                          </Typography>
                                        </Box>
                                        <Table size="small">
                                          <TableHead>
                                            <TableRow
                                              sx={{ bgcolor: "#fcfcfc" }}
                                            >
                                              <TableCell>Mã batch</TableCell>
                                              <TableCell align="right">
                                                SL giữ
                                              </TableCell>
                                              <TableCell align="right">
                                                Hạn sử dụng
                                              </TableCell>
                                            </TableRow>
                                          </TableHead>
                                          <TableBody>
                                            {batches.map(
                                              (batch, batchIndex) => (
                                                <TableRow
                                                  key={
                                                    batch.batchId ||
                                                    batch.batchCode ||
                                                    `${rowKey}-batch-${batchIndex}`
                                                  }
                                                >
                                                  <TableCell>
                                                    <Typography
                                                      variant="body2"
                                                      fontWeight={500}
                                                    >
                                                      {batch.batchCode || "-"}
                                                    </Typography>
                                                  </TableCell>
                                                  <TableCell align="right">
                                                    {batch.reservedQuantity ??
                                                      0}
                                                  </TableCell>
                                                  <TableCell align="right">
                                                    {fmtDateShort(
                                                      batch.expiryDate,
                                                    )}
                                                  </TableCell>
                                                </TableRow>
                                              ),
                                            )}
                                          </TableBody>
                                        </Table>
                                      </Box>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </Fragment>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </Stack>

                <Stack spacing={3}>
                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                    <Typography variant="subtitle1" fontWeight={700} mb={2}>
                      Cập nhật trạng thái
                    </Typography>

                    {availableStatuses.length === 0 ? (
                      <Alert severity="info">
                        Đơn hàng đã ở trạng thái cuối, không thể cập nhật thêm.
                      </Alert>
                    ) : (
                      <Stack spacing={2}>
                        {order.status === "Processing" && (
                          <Alert severity="info">
                            Đơn đang ở trạng thái Đang xử lý. Hệ thống sẽ tự
                            động sử dụng batch giữ hàng và số lượng của đơn,
                            Staff chỉ cần xác nhận đã đóng gói đúng trước khi
                            bàn giao vận chuyển.
                          </Alert>
                        )}

                        {order.status === "Processing" && (
                          <Stack spacing={1.5}>
                            <Box
                              sx={{
                                p: 1.5,
                                border: "1px solid",
                                borderColor: "divider",
                                borderRadius: 1,
                              }}
                            >
                              <FormControlLabel
                                control={
                                  <Checkbox
                                    checked={isPackagingConfirmed}
                                    onChange={(e) =>
                                      setIsPackagingConfirmed(e.target.checked)
                                    }
                                    disabled={isUpdating || isFulfilling}
                                  />
                                }
                                label="Tôi đã đóng gói sản phẩm với đúng số lô và đủ số lượng"
                              />
                              {autoFulfillError && (
                                <Typography
                                  variant="caption"
                                  color="error.main"
                                >
                                  {autoFulfillError}
                                </Typography>
                              )}
                            </Box>

                            <Button
                              variant="contained"
                              onClick={handleFulfillOrder}
                              disabled={
                                isFulfilling ||
                                isUpdating ||
                                !isPackagingConfirmed ||
                                Boolean(autoFulfillError)
                              }
                              sx={{
                                bgcolor: "#1976d2",
                                "&:hover": { bgcolor: "#115293" },
                              }}
                            >
                              {isFulfilling
                                ? "Đang đóng gói..."
                                : "Đóng gói & bàn giao vận chuyển"}
                            </Button>
                          </Stack>
                        )}

                        <Select
                          value={selectedStatus}
                          displayEmpty
                          onChange={(e) =>
                            setSelectedStatus(e.target.value as OrderStatus)
                          }
                          size="small"
                          disabled={isUpdating}
                        >
                          <MenuItem value="">
                            <em>Chọn trạng thái mới</em>
                          </MenuItem>
                          {availableStatuses.map((next) => (
                            <MenuItem key={next} value={next}>
                              {orderStatusLabels[next]}
                            </MenuItem>
                          ))}
                        </Select>

                        <TextField
                          label="Ghi chú"
                          placeholder="Nhập ghi chú (không bắt buộc)"
                          multiline
                          rows={3}
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          disabled={isUpdating}
                        />

                        <Button
                          variant="contained"
                          disabled={!selectedStatus || isUpdating}
                          onClick={handleUpdateStatus}
                          sx={{
                            bgcolor: "#ee4d2d",
                            "&:hover": { bgcolor: "#d03e27" },
                          }}
                        >
                          {isUpdating
                            ? "Đang cập nhật..."
                            : "Cập nhật trạng thái"}
                        </Button>
                      </Stack>
                    )}
                  </Paper>

                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                    <Typography variant="subtitle1" fontWeight={700} mb={2}>
                      Chi tiết thanh toán
                    </Typography>

                    <Stack spacing={1}>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          Tổng tiền hàng
                        </Typography>
                        <Typography variant="body2">{fmt(subtotal)}</Typography>
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
                </Stack>
              </Box>
            </Box>
          )}
        </Paper>
      </Box>

      <Dialog
        open={isCancelDialogOpen}
        onClose={() => setIsCancelDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Xác nhận hủy đơn hàng</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Bạn có chắc chắn muốn chuyển đơn hàng sang trạng thái Đã hủy không?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCancelDialogOpen(false)}>Đóng</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleConfirmCancelStatus}
            disabled={isUpdating || selectedStatus !== "Cancelled"}
          >
            {isUpdating ? "Đang hủy..." : "Xác nhận hủy"}
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
};

export default OrderManagementDetailPage;
