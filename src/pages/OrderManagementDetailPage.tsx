import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
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
  Add,
  ArrowBack,
  AssignmentReturn,
  CancelOutlined,
  ExpandLess,
  ExpandMore,
  HighlightOff,
  Inventory,
  CheckCircle,
  LocalShipping,
  Storage,
  Payments,
  Person,
  Phone,
  Receipt,
  Remove,
  Search,
  SwapHoriz,
  StarBorder,
  Sync,
  LocationOn,
} from "@mui/icons-material";
import { AdminLayout } from "@/layouts/AdminLayout";
import {
  orderService,
  type PickListBatchInfo,
  type PickListItemResponse,
  type PickListResponse,
} from "@/services/orderService";
import { useToast } from "@/hooks/useToast";
import type { PaymentMethod } from "@/types/checkout";
import type { CarrierName, OrderResponse, OrderStatus } from "@/types/order";
import {
  CANCEL_ORDER_REASON_OPTIONS,
  type CancelOrderReason,
} from "@/utils/cancelOrderReason";
import {
  getOrderStatusChipSx,
  orderStatusColors,
  orderStatusLabels,
  orderTypeColors,
  orderTypeLabels,
  paymentStatusColors,
  paymentStatusLabels,
} from "@/utils/orderStatus";
import { formatDateTimeCompactVN, formatDateVN } from "@/utils/dateTime";

const CARRIER_LABELS: Record<CarrierName, string> = {
  GHN: "Giao Hàng Nhanh",
  GHTK: "Giao Hàng Tiết Kiệm",
};

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CashOnDelivery: "Thanh toán khi nhận hàng",
  CashInStore: "Thanh toán tiền mặt tại quầy",
  VnPay: "Thanh toán qua VNPay",
  Momo: "Thanh toán qua MoMo",
  ExternalBankTransfer: "Chuyển khoản ngân hàng",
};

const STATUS_TO_STEP: Record<OrderStatus, number> = {
  Pending: 0,
  Preparing: 2,
  ReadyToPick: 3,
  Delivering: 4,
  Delivered: 5,
  Returning: -2,
  Cancelled: -1,
  Partial_Returned: -2,
  Returned: -2,
};

const STEPS = [
  { label: "Đơn Hàng Đã Đặt", Icon: Receipt },
  { label: "Đơn Hàng Đã Thanh Toán", Icon: Payments },
  { label: "Đang Chuẩn Bị", Icon: Inventory },
  { label: "Chờ Lấy Hàng", Icon: Storage },
  { label: "Đang Giao Hàng", Icon: LocalShipping },
  { label: "Hoàn tất", Icon: StarBorder },
];

const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  Pending: ["Preparing", "Cancelled"],
  Preparing: ["Cancelled"],
  ReadyToPick: ["Cancelled"],
  Delivering: [],
  Delivered: [],
  Returning: ["Returned"],
  Cancelled: [],
  Partial_Returned: [],
  Returned: [],
};

const fmt = (value?: number | null) =>
  `${new Intl.NumberFormat("vi-VN").format(Number(value ?? 0))}đ`;

const fmtDateShort = (value?: string | null) => {
  return formatDateVN(value);
};

const fmtDate = (s?: string | null) => {
  return formatDateTimeCompactVN(s);
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
                    height: 3,
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

interface FulfillRowValidation {
  orderDetailId: string;
  isBatchMatched: boolean;
  isQuantityValid: boolean;
  isValid: boolean;
  selectedBatchReserved: number;
  message?: string;
}

interface DisplayBatchInfo {
  reservationId?: string;
  batchId?: string;
  batchCode: string;
  note?: string | null;
  reservedQuantity?: number;
  expiryDate?: string;
}

const STAFF_CANCELABLE_STATUSES: OrderStatus[] = [
  "Pending",
  "Preparing",
  "ReadyToPick",
];

const SWAP_DAMAGE_NOTE_SUGGESTIONS = [
  "Hàng móp méo, không đạt chất lượng",
  "Bao bì rách/tem niêm phong bị lỗi",
  "Sản phẩm có dấu hiệu chảy nước hoặc biến đổi mùi",
  "Batch này lỗi khi kiểm tra ngoại quan",
  "Cần đổi batch để đảm bảo chất lượng giao khách",
];

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
  const [cancelReason, setCancelReason] = useState<CancelOrderReason | "">("");
  const [cancelNote, setCancelNote] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isFulfilling, setIsFulfilling] = useState(false);
  const [expandedBatches, setExpandedBatches] = useState<
    Record<string, boolean>
  >({});
  const [isPackagingConfirmed, setIsPackagingConfirmed] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isSyncingShipping, setIsSyncingShipping] = useState(false);
  const [pickList, setPickList] = useState<PickListResponse | null>(null);
  const [isPickListLoading, setIsPickListLoading] = useState(false);
  const [fulfillInputs, setFulfillInputs] = useState<FulfillInputItem[]>([]);
  const [isSwapDialogOpen, setIsSwapDialogOpen] = useState(false);
  const [damagedReservationId, setDamagedReservationId] = useState("");
  const [swapDamageNote, setSwapDamageNote] = useState("");
  const [swappingBatchCode, setSwappingBatchCode] = useState("");
  const [isSwappingBatch, setIsSwappingBatch] = useState(false);

  const loadOrder = async () => {
    if (!orderId) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await orderService.getOrderById(orderId);
      setOrder(data);
      setCancelReason("");
      setCancelNote("");
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

  useEffect(() => {
    const loadPickList = async () => {
      if (!order?.id || order.status !== "Preparing") {
        setPickList(null);
        return;
      }

      try {
        setIsPickListLoading(true);
        const data = await orderService.getOrderPickList(order.id);
        setPickList(data);
      } catch (err) {
        setPickList(null);
        showToast(
          err instanceof Error ? err.message : "Không thể tải dữ liệu picklist",
          "warning",
        );
      } finally {
        setIsPickListLoading(false);
      }
    };

    void loadPickList();
    // `showToast` can be unstable across renders; avoid reloading picklist unnecessarily.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id, order?.status]);

  const isShippingManagedStatus = order?.status === "Delivering";
  const hasTrackingNumber = Boolean(order?.shippingInfo?.trackingNumber);
  const canPrepareOrder = order?.status === "Pending";
  const canCancelOrder =
    !!order?.status && STAFF_CANCELABLE_STATUSES.includes(order.status);

  const pickListItemMap = useMemo(() => {
    const map = new Map<string, PickListItemResponse>();
    (pickList?.items || []).forEach((item) => {
      if (item.orderDetailId) {
        map.set(item.orderDetailId, item);
      }
    });
    return map;
  }, [pickList?.items]);

  const getDetailBatches = useCallback(
    (
      orderDetailId?: string,
      fallbackBatches?: Array<
        Partial<{
          batchId: string;
          batchCode: string;
          reservedQuantity: number;
          expiryDate: string;
        }>
      >,
    ): DisplayBatchInfo[] => {
      if (orderDetailId) {
        const pickListItem = pickListItemMap.get(orderDetailId);
        if (pickListItem?.batches?.length) {
          return pickListItem.batches.map((batch: PickListBatchInfo) => ({
            reservationId: batch.reservationId,
            batchId: batch.batchId,
            batchCode: batch.batchCode,
            note: batch.note,
            reservedQuantity: batch.reservedQuantity,
            expiryDate: batch.expiryDate || undefined,
          }));
        }
      }

      return (fallbackBatches || []).map((batch) => ({
        batchId: batch.batchId,
        batchCode: batch.batchCode || "-",
        reservedQuantity: batch.reservedQuantity,
        expiryDate: batch.expiryDate,
      }));
    },
    [pickListItemMap],
  );

  useEffect(() => {
    if (order?.status !== "Preparing") {
      setFulfillInputs([]);
      return;
    }

    setFulfillInputs((prev) => {
      const prevMap = new Map(prev.map((item) => [item.orderDetailId, item]));

      return (order.orderDetails || [])
        .filter((detail) => Boolean(detail.id))
        .map((detail) => {
          const existing = prevMap.get(detail.id!);

          return {
            orderDetailId: detail.id!,
            // Keep already-scanned value if user has entered one.
            scannedBatchCode: existing?.scannedBatchCode ?? "",
            quantity:
              existing?.quantity ?? String(Number(detail.quantity ?? 0)),
          };
        });
    });
  }, [getDetailBatches, order?.status, order?.orderDetails, pickListItemMap]);

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
    if (order?.status !== "Preparing") {
      return [];
    }

    const fulfillMap = new Map(
      fulfillInputs.map((input) => [input.orderDetailId, input]),
    );

    return (order.orderDetails ?? [])
      .filter((detail) => Boolean(detail.id))
      .map((detail) => {
        const detailBatches = getDetailBatches(
          detail.id,
          detail.reservedBatches,
        );
        const selectedInput = detail.id ? fulfillMap.get(detail.id) : undefined;
        const quantity = Number(
          selectedInput?.quantity ?? detail.quantity ?? 0,
        );
        const selectedBatchCode = selectedInput?.scannedBatchCode?.trim() || "";
        const selectedBatch = detailBatches.find(
          (batch) => batch.batchCode === selectedBatchCode,
        );

        return {
          id: detail.id!,
          variantName: detail.variantName,
          orderQuantity: Number(detail.quantity ?? 0),
          reservedQuantity: Number(selectedBatch?.reservedQuantity ?? 0),
          scannedBatchCode: selectedBatchCode,
          quantity,
        };
      });
  }, [fulfillInputs, getDetailBatches, order?.orderDetails, order?.status]);

  const fulfillRowValidations = useMemo<FulfillRowValidation[]>(() => {
    if (order?.status !== "Preparing") {
      return [];
    }

    return autoFulfillItems.map((item) => {
      const isBatchMatched = Boolean(item.scannedBatchCode);
      const isQuantityValid =
        Number.isFinite(item.quantity) &&
        item.quantity > 0 &&
        item.quantity <= Math.max(item.reservedQuantity, 0);

      if (!isBatchMatched) {
        return {
          orderDetailId: item.id,
          isBatchMatched,
          isQuantityValid: false,
          isValid: false,
          selectedBatchReserved: item.reservedQuantity,
          message: "Mã lô không khớp",
        };
      }

      if (!isQuantityValid) {
        return {
          orderDetailId: item.id,
          isBatchMatched,
          isQuantityValid,
          isValid: false,
          selectedBatchReserved: item.reservedQuantity,
          message:
            item.reservedQuantity <= 0
              ? "Batch đã chọn không còn số lượng giữ"
              : `Số lượng vượt quá SL giữ (${item.reservedQuantity})`,
        };
      }

      return {
        orderDetailId: item.id,
        isBatchMatched,
        isQuantityValid,
        isValid: true,
        selectedBatchReserved: item.reservedQuantity,
      };
    });
  }, [autoFulfillItems, order?.status]);

  const isAllFulfillRowsValid = useMemo(
    () =>
      fulfillRowValidations.length > 0 &&
      fulfillRowValidations.every((item) => item.isValid),
    [fulfillRowValidations],
  );

  const autoFulfillError = useMemo(() => {
    if (order?.status !== "Preparing") {
      return null;
    }

    if (autoFulfillItems.length === 0) {
      return "Không tìm thấy order detail để đóng gói";
    }

    const missingBatch = autoFulfillItems.find(
      (item) => !item.scannedBatchCode,
    );
    if (missingBatch) {
      return `Mã lô không khớp cho sản phẩm ${missingBatch.variantName || missingBatch.id}`;
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

  const handlePrepareOrder = async () => {
    if (!order?.id || order.status !== "Pending") {
      return;
    }

    try {
      setIsUpdating(true);
      await orderService.staffPrepareOrder(order.id);
      showToast("Đã chuyển đơn hàng sang trạng thái Đang chuẩn bị", "success");
      await loadOrder();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Không thể xác nhận đơn hàng",
        "error",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const openCancelDialog = () => {
    if (!canCancelOrder) {
      return;
    }

    setCancelReason("");
    setCancelNote("");
    setIsCancelDialogOpen(true);
  };

  const handleConfirmCancelStatus = async () => {
    if (!order?.id) {
      return;
    }

    if (!cancelReason) {
      showToast("Vui lòng chọn lý do hủy đơn", "warning");
      return;
    }

    setIsCancelDialogOpen(false);

    try {
      setIsUpdating(true);
      await orderService.staffCancelOrder(
        order.id,
        cancelReason,
        cancelNote || undefined,
      );
      showToast("Đã hủy đơn hàng thành công", "success");
      await loadOrder();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Không thể hủy đơn hàng",
        "error",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFulfillOrder = async () => {
    if (!order?.id) {
      return;
    }

    if (order.status !== "Preparing") {
      showToast(
        "Chỉ có thể đóng gói khi đơn đang ở trạng thái Đang chuẩn bị",
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
        "Đóng gói thành công, đơn hàng đã chuyển sang Sẵn sàng bàn giao",
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

  const handleBatchCodeChange = (orderDetailId: string, value: string) => {
    const normalizedValue = value.trim();
    setFulfillInputs((prev) => {
      const exists = prev.some((item) => item.orderDetailId === orderDetailId);

      if (!exists) {
        return [
          ...prev,
          {
            orderDetailId,
            scannedBatchCode: normalizedValue,
            quantity: "1",
          },
        ];
      }

      return prev.map((item) =>
        item.orderDetailId === orderDetailId
          ? { ...item, scannedBatchCode: normalizedValue }
          : item,
      );
    });
  };

  const handleQuantityChange = (orderDetailId: string, value: string) => {
    const digitsOnly = value.replace(/\D/g, "");
    setFulfillInputs((prev) =>
      prev.map((item) =>
        item.orderDetailId === orderDetailId
          ? { ...item, quantity: digitsOnly || "0" }
          : item,
      ),
    );
  };

  const handleAdjustQuantity = (orderDetailId: string, delta: number) => {
    setFulfillInputs((prev) =>
      prev.map((item) => {
        if (item.orderDetailId !== orderDetailId) {
          return item;
        }

        const nextValue = Math.max(0, Number(item.quantity || 0) + delta);
        return { ...item, quantity: String(nextValue) };
      }),
    );
  };

  useEffect(() => {
    if (!isAllFulfillRowsValid && isPackagingConfirmed) {
      setIsPackagingConfirmed(false);
    }
  }, [isAllFulfillRowsValid, isPackagingConfirmed]);

  const handleSimulateScanBatch = (
    orderDetailId: string,
    batchCode: string,
  ) => {
    handleBatchCodeChange(orderDetailId, batchCode);
    showToast(`Đã điền mã batch ${batchCode}`, "success");
  };

  const openSwapDamagedDialog = (reservationId: string, batchCode: string) => {
    setDamagedReservationId(reservationId);
    setSwappingBatchCode(batchCode);
    setSwapDamageNote("");
    setIsSwapDialogOpen(true);
  };

  const handleConfirmSwapDamagedBatch = async () => {
    if (!order?.id || !damagedReservationId) {
      return;
    }

    try {
      setIsSwappingBatch(true);
      const result = await orderService.swapDamagedOrderReservation(order.id, {
        damagedReservationId,
        damageNote: swapDamageNote.trim() || null,
      });

      setIsSwapDialogOpen(false);
      showToast(
        result.newBatchCode
          ? `Đã đổi sang batch mới ${result.newBatchCode}`
          : result.message || "Đổi batch thành công",
        "success",
      );

      await loadOrder();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Không thể đổi batch lỗi",
        "error",
      );
    } finally {
      setIsSwappingBatch(false);
    }
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
                            {order.status === "Delivering" &&
                              order.shippingInfo.estimatedDeliveryDate && (
                                <Typography
                                  variant="body2"
                                  color="info.main"
                                  fontWeight={600}
                                >
                                  Dự kiến nhận hàng:{" "}
                                  {fmtDateShort(
                                    order.shippingInfo.estimatedDeliveryDate,
                                  )}
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
                          <TableRow sx={{ bgcolor: "action.hover" }}>
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
                            const batches = getDetailBatches(
                              item.id,
                              item.reservedBatches,
                            );
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
                                              <TableCell align="right">
                                                Thao tác
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
                                                  <TableCell align="right">
                                                    {item.id ? (
                                                      <Stack
                                                        direction="row"
                                                        spacing={0.5}
                                                        justifyContent="flex-end"
                                                      >
                                                        <IconButton
                                                          size="small"
                                                          color="primary"
                                                          onClick={() =>
                                                            handleSimulateScanBatch(
                                                              item.id!,
                                                              batch.batchCode,
                                                            )
                                                          }
                                                          title="Quét batch này"
                                                          disabled={
                                                            order.status !==
                                                              "Preparing" ||
                                                            isFulfilling ||
                                                            isUpdating
                                                          }
                                                        >
                                                          <Search fontSize="small" />
                                                        </IconButton>

                                                        {order.status ===
                                                          "Preparing" &&
                                                          batch.reservationId && (
                                                            <IconButton
                                                              size="small"
                                                              color="warning"
                                                              onClick={() =>
                                                                openSwapDamagedDialog(
                                                                  batch.reservationId!,
                                                                  batch.batchCode,
                                                                )
                                                              }
                                                              title="Swap batch lỗi"
                                                              disabled={
                                                                isSwappingBatch ||
                                                                isUpdating ||
                                                                isFulfilling
                                                              }
                                                            >
                                                              <SwapHoriz fontSize="small" />
                                                            </IconButton>
                                                          )}
                                                      </Stack>
                                                    ) : null}
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

                    {!canPrepareOrder &&
                    !canCancelOrder &&
                    !isShippingManagedStatus ? (
                      <Alert severity="info">
                        Đơn hàng đã ở trạng thái cuối, không thể cập nhật thêm.
                      </Alert>
                    ) : (
                      <Stack spacing={2}>
                        {isShippingManagedStatus && (
                          <Alert severity="info">
                            Đơn hàng đang được đơn vị vận chuyển xử lý. Trạng
                            thái sẽ được cập nhật qua đồng bộ vận chuyển.
                          </Alert>
                        )}

                        {canPrepareOrder && (
                          <Button
                            variant="contained"
                            onClick={handlePrepareOrder}
                            disabled={isUpdating || isFulfilling}
                            sx={{
                              bgcolor: "#2e7d32",
                              "&:hover": { bgcolor: "#1b5e20" },
                            }}
                          >
                            {isUpdating
                              ? "Đang xác nhận..."
                              : "Xác nhận đơn hàng"}
                          </Button>
                        )}

                        {order.status === "Preparing" && !hasTrackingNumber && (
                          <Alert severity="info">
                            Đơn đang ở trạng thái Đang chuẩn bị. Hệ thống sẽ tự
                            động sử dụng batch giữ hàng và số lượng của đơn,
                            Staff chỉ cần xác nhận đã đóng gói đúng để chuyển
                            đơn sang trạng thái Sẵn sàng bàn giao.
                          </Alert>
                        )}

                        {order.status === "Preparing" && !hasTrackingNumber && (
                          <Box
                            sx={{
                              p: 1.5,
                              border: "1px solid",
                              borderColor: "divider",
                              borderRadius: 1,
                            }}
                          >
                            <Typography variant="body2" fontWeight={600} mb={1}>
                              Batch code khi fulfill
                            </Typography>

                            <Stack spacing={1}>
                              {fulfillInputs.map((input) => {
                                const detail = order.orderDetails?.find(
                                  (item) => item.id === input.orderDetailId,
                                );
                                const rowValidation =
                                  fulfillRowValidations.find(
                                    (row) =>
                                      row.orderDetailId === input.orderDetailId,
                                  );

                                const statusColor = rowValidation?.isValid
                                  ? "success.main"
                                  : rowValidation?.message
                                    ? "error.main"
                                    : "divider";

                                return (
                                  <Box
                                    key={input.orderDetailId}
                                    sx={{
                                      p: 1,
                                      border: "1px solid",
                                      borderColor: statusColor,
                                      borderRadius: 1,
                                    }}
                                  >
                                    <TextField
                                      label={
                                        detail?.variantName
                                          ? `Batch code - ${detail.variantName}`
                                          : "Batch code"
                                      }
                                      value={input.scannedBatchCode}
                                      onChange={(event) =>
                                        handleBatchCodeChange(
                                          input.orderDetailId,
                                          event.target.value,
                                        )
                                      }
                                      placeholder="Nhập hoặc bấm icon kính lúp ở bảng batch"
                                      size="small"
                                      fullWidth
                                      disabled={isUpdating || isFulfilling}
                                      InputProps={{
                                        endAdornment: rowValidation?.isValid ? (
                                          <CheckCircle
                                            sx={{
                                              color: "success.main",
                                              fontSize: 20,
                                            }}
                                          />
                                        ) : rowValidation?.message ? (
                                          <HighlightOff
                                            sx={{
                                              color: "error.main",
                                              fontSize: 20,
                                            }}
                                          />
                                        ) : undefined,
                                      }}
                                    />

                                    <Stack
                                      direction="row"
                                      alignItems="center"
                                      spacing={1}
                                      mt={1}
                                    >
                                      <IconButton
                                        size="small"
                                        onClick={() =>
                                          handleAdjustQuantity(
                                            input.orderDetailId,
                                            -1,
                                          )
                                        }
                                        disabled={isUpdating || isFulfilling}
                                      >
                                        <Remove fontSize="small" />
                                      </IconButton>

                                      <TextField
                                        size="small"
                                        label="Số lượng"
                                        value={input.quantity}
                                        onChange={(event) =>
                                          handleQuantityChange(
                                            input.orderDetailId,
                                            event.target.value,
                                          )
                                        }
                                        inputProps={{
                                          inputMode: "numeric",
                                          pattern: "[0-9]*",
                                        }}
                                        sx={{ width: 120 }}
                                        disabled={isUpdating || isFulfilling}
                                      />

                                      <IconButton
                                        size="small"
                                        onClick={() =>
                                          handleAdjustQuantity(
                                            input.orderDetailId,
                                            1,
                                          )
                                        }
                                        disabled={isUpdating || isFulfilling}
                                      >
                                        <Add fontSize="small" />
                                      </IconButton>

                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                      >
                                        SL giữ:{" "}
                                        {rowValidation?.selectedBatchReserved ??
                                          0}
                                      </Typography>
                                    </Stack>

                                    {rowValidation?.message && (
                                      <Typography
                                        variant="caption"
                                        color="error.main"
                                        mt={0.75}
                                        display="block"
                                      >
                                        {rowValidation.message}
                                      </Typography>
                                    )}
                                  </Box>
                                );
                              })}
                            </Stack>

                            {isPickListLoading && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                mt={1}
                                display="block"
                              >
                                Đang tải picklist...
                              </Typography>
                            )}
                          </Box>
                        )}

                        {order.status === "Preparing" && !hasTrackingNumber && (
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
                                    disabled={
                                      isUpdating ||
                                      isFulfilling ||
                                      !isAllFulfillRowsValid
                                    }
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

                        {canCancelOrder && (
                          <>
                            <Divider />
                            <Stack alignItems="flex-end">
                              <Button
                                variant="outlined"
                                color="error"
                                onClick={openCancelDialog}
                                disabled={isUpdating || isFulfilling}
                                sx={{ minWidth: 160 }}
                              >
                                Hủy đơn hàng
                              </Button>
                            </Stack>
                          </>
                        )}
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
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Xác nhận hủy đơn hàng</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 1.5 }}>
            Vui lòng chọn lý do hủy đơn theo quy định trước khi xác nhận.
          </DialogContentText>

          <TextField
            select
            fullWidth
            label="Lý do hủy *"
            value={cancelReason}
            onChange={(event) =>
              setCancelReason(event.target.value as CancelOrderReason)
            }
            sx={{ mb: 1.5 }}
          >
            {CANCEL_ORDER_REASON_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
            useFlexGap
            mb={1.5}
          >
            {CANCEL_ORDER_REASON_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                clickable
                label={option.label}
                color={cancelReason === option.value ? "primary" : "default"}
                onClick={() => setCancelReason(option.value)}
                sx={{ maxWidth: "100%" }}
              />
            ))}
          </Stack>

          <TextField
            fullWidth
            multiline
            minRows={2}
            label="Ghi chú (tuỳ chọn)"
            placeholder="Nhập thêm ghi chú nếu cần"
            value={cancelNote}
            onChange={(event) => setCancelNote(event.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCancelDialogOpen(false)}>Đóng</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleConfirmCancelStatus}
            disabled={isUpdating || !cancelReason}
          >
            {isUpdating ? "Đang hủy..." : "Xác nhận hủy"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isSwapDialogOpen}
        onClose={() => !isSwappingBatch && setIsSwapDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Swap batch bị lỗi</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 1.5 }}>
            Xác nhận đổi batch cho mã <b>{swappingBatchCode || "-"}</b>. Hệ
            thống sẽ tự điều phối sang batch phù hợp khác.
          </DialogContentText>

          <TextField
            fullWidth
            multiline
            minRows={2}
            label="Ghi chú lỗi batch (tuỳ chọn)"
            placeholder="Nhập mô tả lỗi hàng"
            value={swapDamageNote}
            onChange={(event) => setSwapDamageNote(event.target.value)}
            sx={{ mb: 1.5 }}
          />

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {SWAP_DAMAGE_NOTE_SUGGESTIONS.map((suggestion) => (
              <Chip
                key={suggestion}
                clickable
                label={suggestion}
                color={
                  swapDamageNote.trim() === suggestion ? "primary" : "default"
                }
                onClick={() => setSwapDamageNote(suggestion)}
                sx={{ maxWidth: "100%" }}
              />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setIsSwapDialogOpen(false)}
            disabled={isSwappingBatch}
          >
            Đóng
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleConfirmSwapDamagedBatch}
            disabled={isSwappingBatch || !damagedReservationId}
          >
            {isSwappingBatch ? "Đang đổi batch..." : "Xác nhận swap"}
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
};

export default OrderManagementDetailPage;
