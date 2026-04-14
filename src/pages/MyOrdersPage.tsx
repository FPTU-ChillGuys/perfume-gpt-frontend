import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Alert,
  Autocomplete,
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
  Tooltip,
  IconButton,
  Typography,
  FormControlLabel,
  Radio,
  RadioGroup,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ImageNotSupportedOutlinedIcon from "@mui/icons-material/ImageNotSupportedOutlined";
import { MainLayout } from "@/layouts/MainLayout";
import { orderService } from "@/services/orderService";
import type {
  ReturnRequestStatus,
  OrderReturnRequest,
  OrderCancelRequest,
} from "@/services/orderService";
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
import type { PaymentMethod } from "@/types/checkout";
import type { ReviewDialogTarget, ReviewResponse } from "@/types/review";
import {
  orderStatusLabels,
  orderStatusColors,
  getOrderStatusChipSx,
  paymentStatusLabels,
  paymentStatusColors,
  orderTypeLabels,
  orderTypeColors,
} from "@/utils/orderStatus";
import {
  CUSTOMER_CANCEL_ORDER_REASON_OPTIONS,
  mapCancelReasonInputToEnum,
} from "@/utils/cancelOrderReason";
import { formatDateTimeCompactVN } from "@/utils/dateTime";
import { ReviewEditorDialog } from "@/components/review/ReviewEditorDialog";
import { UserProfileSidebar } from "@/components/profile/UserProfileSidebar";
import codIcon from "@/assets/cod.png";
import storeIcon from "@/assets/store.png";
import vnpayIcon from "@/assets/vnpay.jpg";
import momoIcon from "@/assets/momo.png";
import transericon from "@/assets/transfer.png";

type OrderListItemWithReturnable = OrderListItem & {
  isReturnable?: boolean;
};

const PAYMENT_METHOD_LABELS: Record<NonNullable<PaymentMethod>, string> = {
  CashOnDelivery: "Thanh toán khi nhận hàng",
  CashInStore: "Thanh toán tiền mặt tại quầy",
  VnPay: "Thanh toán qua VNPay",
  Momo: "Thanh toán qua MoMo",
  ExternalBankTransfer: "Chuyển khoản ngân hàng",
  PayOs: "Thanh toán qua PayOS",
};

const PAYMENT_METHOD_ICONS: Record<NonNullable<PaymentMethod>, string> = {
  CashOnDelivery: codIcon,
  CashInStore: storeIcon,
  VnPay: vnpayIcon,
  Momo: momoIcon,
  ExternalBankTransfer: transericon,
  PayOs: transericon,
};

const RETRY_PAYMENT_METHOD_OPTIONS: NonNullable<PaymentMethod>[] = [
  "CashOnDelivery",
  "CashInStore",
  "VnPay",
  "Momo",
];

const STATUS_TABS: { label: string; value: OrderStatus | "" }[] = [
  { label: "Tất cả", value: "" },
  { label: orderStatusLabels["Pending"], value: "Pending" },
  { label: orderStatusLabels["Preparing"], value: "Preparing" },
  { label: orderStatusLabels["ReadyToPick"], value: "ReadyToPick" },
  { label: orderStatusLabels["Delivering"], value: "Delivering" },
  { label: orderStatusLabels["Delivered"], value: "Delivered" },
  { label: orderStatusLabels["Cancelled"], value: "Cancelled" },
  { label: orderStatusLabels["Returning"], value: "Returning" },
  { label: orderStatusLabels["Partial_Returned"], value: "Partial_Returned" },
  { label: orderStatusLabels["Returned"], value: "Returned" },
];

const formatCurrency = (value?: number | null) => {
  if (!value) return "0 ₫";
  return `${new Intl.NumberFormat("vi-VN").format(value)} ₫`;
};

const formatUnitPrice = (unitPrice?: number | null, total?: number | null) => {
  if (!unitPrice || !total || unitPrice === total) {
    return null;
  }

  return formatCurrency(unitPrice);
};

const toIsoString = (value: string) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const formatDateTime = (value?: string | null) => {
  return formatDateTimeCompactVN(value);
};

const RETURN_REQUEST_BLOCKED_STATUSES = new Set<ReturnRequestStatus>([
  "Pending",
  "ApprovedForReturn",
  "RequestMoreInfo",
  "Inspecting",
  "ReadyForRefund",
  "Refunded",
]);

const CANCEL_REQUEST_BLOCKED_STATUSES = new Set(["Pending"]);

const returnRequestStatusLabel = (status?: string | null) => {
  if (!status) return "Đã gửi yêu cầu trả hàng";
  if (status === "Pending") return "Yêu cầu đang chờ duyệt";
  if (status === "ApprovedForReturn") return "Yêu cầu đã được duyệt trả hàng";
  if (status === "RequestMoreInfo") return "Cần bổ sung thông tin trả hàng";
  if (status === "Inspecting") return "Shop đang kiểm tra hàng hoàn";
  if (status === "ReadyForRefund") return "Chờ hoàn tiền";
  if (status === "Refunded") return "Đã hoàn tiền";
  if (status === "Completed") return "Yêu cầu trả hàng đã hoàn tất";
  if (status === "Rejected") return "Yêu cầu trả hàng đã bị từ chối";
  return `Yêu cầu trả hàng: ${status}`;
};

const cancelRequestStatusLabel = (status?: string | null) => {
  if (!status) return "Đã gửi yêu cầu hủy đơn";
  if (status === "Pending") return "Yêu cầu hủy đơn đang chờ xử lý";
  if (status === "Approved") return "Yêu cầu hủy đơn đã được duyệt";
  if (status === "Rejected") return "Yêu cầu hủy đơn đã bị từ chối";
  return `Yêu cầu hủy đơn: ${status}`;
};

const isSupportedPaymentMethod = (
  value?: string | null,
): value is PaymentMethod =>
  value === "CashOnDelivery" ||
  value === "CashInStore" ||
  value === "VnPay" ||
  value === "Momo";

interface VietQrBank {
  id: number;
  name: string;
  shortName?: string;
  short_name?: string;
  logo?: string;
}

const stripVietnameseDiacritics = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");

const normalizeRefundAccountNumber = (value: string) =>
  stripVietnameseDiacritics(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const normalizeRefundAccountName = (value: string) =>
  stripVietnameseDiacritics(value)
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trimStart();

const getBankDisplayName = (bank: VietQrBank) => {
  const shortName = (bank.shortName || bank.short_name || "").trim();
  return shortName ? `${shortName} - ${bank.name}` : bank.name;
};

export const MyOrdersPage = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [userInfo, setUserInfo] = useState<UserCredentials | null>(null);
  const [orders, setOrders] = useState<OrderListItemWithReturnable[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [isLoading, setIsLoading] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const initialStatus =
    (location.state as { status?: OrderStatus | "" } | null)?.status ?? "";
  const [status, setStatus] = useState<OrderStatus | "">(initialStatus);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | "">("");
  const [type, setType] = useState<OrderType | "">("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewDialogMode, setReviewDialogMode] = useState<"create" | "edit">(
    "create",
  );
  const [reviewDialogTarget, setReviewDialogTarget] =
    useState<ReviewDialogTarget | null>(null);
  const [selectedReview, setSelectedReview] = useState<ReviewResponse | null>(
    null,
  );
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [selectedCancelRefundBank, setSelectedCancelRefundBank] =
    useState<VietQrBank | null>(null);
  const [cancelRefundBankName, setCancelRefundBankName] = useState("");
  const [cancelRefundAccountNumber, setCancelRefundAccountNumber] =
    useState("");
  const [cancelRefundAccountName, setCancelRefundAccountName] = useState("");
  const [vietQrBanks, setVietQrBanks] = useState<VietQrBank[]>([]);
  const [isLoadingVietQrBanks, setIsLoadingVietQrBanks] = useState(false);
  const [vietQrBankError, setVietQrBankError] = useState<string | null>(null);
  const [retryOrderId, setRetryOrderId] = useState<string | null>(null);
  const [retryPaymentId, setRetryPaymentId] = useState<string | null>(null);
  const [selectedRetryMethod, setSelectedRetryMethod] =
    useState<NonNullable<PaymentMethod>>("CashOnDelivery");
  const [isRetryingPayment, setIsRetryingPayment] = useState(false);
  const [returnRequestStatusByOrderId, setReturnRequestStatusByOrderId] =
    useState<Record<string, ReturnRequestStatus>>({});
  const [cancelRequestStatusByOrderId, setCancelRequestStatusByOrderId] =
    useState<Record<string, string>>({});
  const [reviewedOrderDetailIds, setReviewedOrderDetailIds] =
    useState<Set<string>>(new Set());

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const [
        { items, totalCount: count },
        returnRequestResult,
        cancelRequestResult,
        myReviews,
      ] = await Promise.all([
        orderService.getMyOrders({
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
        }),
        orderService
          .getMyReturnRequests({
            PageNumber: 1,
            PageSize: 200,
            SortBy: "CreatedAt",
            SortOrder: "desc",
          })
          .catch(() => ({ items: [] as OrderReturnRequest[] })),
        orderService
          .getMyCancelRequests({
            PageNumber: 1,
            PageSize: 200,
            SortBy: "CreatedAt",
            SortOrder: "desc",
          })
          .catch(() => ({ items: [] as OrderCancelRequest[] })),
        productReviewService
          .getMyReviews()
          .catch(() => []),
      ]);

      const latestStatusByOrderId: Record<string, ReturnRequestStatus> = {};
      returnRequestResult.items.forEach((request) => {
        if (!request.orderId || !request.status) {
          return;
        }

        if (!latestStatusByOrderId[request.orderId]) {
          latestStatusByOrderId[request.orderId] = request.status;
        }
      });

      const latestCancelStatusByOrderId: Record<string, string> = {};
      cancelRequestResult.items.forEach((request) => {
        if (!request.orderId || !request.status) {
          return;
        }

        if (!latestCancelStatusByOrderId[request.orderId]) {
          latestCancelStatusByOrderId[request.orderId] = request.status;
        }
      });

      const reviewedDetailIds = new Set<string>();
      myReviews.forEach((review) => {
        if (review.orderDetailId) {
          reviewedDetailIds.add(review.orderDetailId);
        }
      });

      setOrders(items as OrderListItemWithReturnable[]);
      setTotalCount(count);
      setReturnRequestStatusByOrderId(latestStatusByOrderId);
      setCancelRequestStatusByOrderId(latestCancelStatusByOrderId);
      setReviewedOrderDetailIds(reviewedDetailIds);
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

  useEffect(() => {
    void userService.getUserMe().then(setUserInfo).catch(console.error);
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

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
    navigate(`/my-orders/${orderId}`, { state: { status } });
  };

  const handleOpenReturnRequest = (orderId?: string | null) => {
    if (!orderId) return;

    const existingStatus = returnRequestStatusByOrderId[orderId];
    if (existingStatus && RETURN_REQUEST_BLOCKED_STATUSES.has(existingStatus)) {
      showToast(
        `Đơn hàng này đã có yêu cầu trả hàng. ${returnRequestStatusLabel(existingStatus)}`,
        "info",
      );
      return;
    }

    navigate(`/my-orders/${orderId}`, {
      state: { status, requestReturn: true },
    });
  };

  const getDisplayOrderCode = (order?: OrderListItemWithReturnable | null) =>
    order?.code || order?.id || "-";

  const getOrderReviewStatus = (order: OrderListItemWithReturnable) => {
    const orderDetails = order.orderDetails ?? [];
    if (orderDetails.length === 0) return null;

    let reviewedCount = 0;
    orderDetails.forEach((detail) => {
      if (detail.id && reviewedOrderDetailIds.has(detail.id)) {
        reviewedCount++;
      }
    });

    if (reviewedCount === 0) {
      return null; // No reviews yet
    }

    if (reviewedCount === orderDetails.length) {
      return "fully"; // All items reviewed
    }

    return "partial"; // Some items reviewed
  };

  const handleCopyOrderCode = async (orderCode?: string | null) => {
    if (!orderCode) return;

    try {
      await navigator.clipboard.writeText(orderCode);
      showToast("Đã sao chép mã đơn hàng", "success");
    } catch {
      showToast("Không thể sao chép mã đơn hàng", "error");
    }
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
    // Reload orders to update review status
    void loadOrders();
    handleReviewDialogClose();
  };

  const handleConfirmCancelOrder = async () => {
    if (!cancelOrderId) return;

    const reason = cancelReason.trim();
    if (!reason) {
      showToast("Vui lòng nhập lý do hủy đơn hàng", "warning");
      return;
    }

    const cancelReasonEnum = mapCancelReasonInputToEnum(reason);
    if (!cancelReasonEnum) {
      showToast("Lý do hủy không hợp lệ", "warning");
      return;
    }

    const trimmedCancelRefundBankName = cancelRefundBankName.trim();
    const trimmedCancelRefundAccountNumber = cancelRefundAccountNumber.trim();
    const trimmedCancelRefundAccountName = cancelRefundAccountName.trim();

    if (
      shouldRequireCancelRefundInfo &&
      (!trimmedCancelRefundBankName ||
        !trimmedCancelRefundAccountNumber ||
        !trimmedCancelRefundAccountName)
    ) {
      showToast(
        "Vui lòng điền đầy đủ thông tin tài khoản hoàn tiền",
        "warning",
      );
      return;
    }

    try {
      setActionOrderId(cancelOrderId);
      await orderService.cancelOrder(cancelOrderId, cancelReasonEnum, {
        refundBankName: shouldRequireCancelRefundInfo
          ? trimmedCancelRefundBankName
          : null,
        refundAccountNumber: shouldRequireCancelRefundInfo
          ? trimmedCancelRefundAccountNumber
          : null,
        refundAccountName: shouldRequireCancelRefundInfo
          ? trimmedCancelRefundAccountName
          : null,
      });
      showToast(
        cancelBehavior?.mode === "direct"
          ? "Đã hủy đơn hàng thành công"
          : "Đã gửi yêu cầu hủy đơn thành công",
        "success",
      );
      await loadOrders();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Không thể hủy đơn hàng",
        "error",
      );
    } finally {
      setActionOrderId(null);
      setCancelOrderId(null);
      setCancelReason("");
      setSelectedCancelRefundBank(null);
      setCancelRefundBankName("");
      setCancelRefundAccountNumber("");
      setCancelRefundAccountName("");
    }
  };

  const openCancelDialog = (orderId?: string | null) => {
    if (!orderId) return;

    const cancelRequestStatus = cancelRequestStatusByOrderId[orderId];
    if (
      cancelRequestStatus &&
      CANCEL_REQUEST_BLOCKED_STATUSES.has(cancelRequestStatus)
    ) {
      showToast(
        `Đơn hàng này đã có yêu cầu hủy. ${cancelRequestStatusLabel(cancelRequestStatus)}`,
        "info",
      );
      return;
    }

    setCancelOrderId(orderId);
    setCancelReason("");
    setSelectedCancelRefundBank(null);
    setCancelRefundBankName("");
    setCancelRefundAccountNumber("");
    setCancelRefundAccountName("");
  };

  const getCancelBehavior = (order: OrderListItem) => {
    const isPending = order.status === "Pending";
    const isPreparingOrReadyToPick =
      order.status === "Preparing" || order.status === "ReadyToPick";
    const isPaid = order.paymentStatus === "Paid";

    if (isPending && !isPaid) {
      return {
        mode: "direct" as const,
        buttonLabel: "Hủy đơn hàng",
        note: "Đơn hàng đang ở trạng thái chờ xử lý và chưa thanh toán, hệ thống sẽ hủy ngay sau khi bạn xác nhận.",
      };
    }

    if ((isPending && isPaid) || isPreparingOrReadyToPick) {
      return {
        mode: "request" as const,
        buttonLabel: "Yêu cầu hủy đơn hàng",
        note: "Đơn hàng này cần duyệt yêu cầu hủy. Sau khi gửi, Staff/Admin sẽ xem xét và phản hồi.",
      };
    }

    return null;
  };

  const isOrderReturnable = (order: OrderListItemWithReturnable) => {
    return Boolean(order.isReturnable ?? order.isReturnalbe);
  };

  const selectedOrder = useMemo(
    () => orders.find((item) => item.id === cancelOrderId) ?? null,
    [orders, cancelOrderId],
  );
  const cancelBehavior = selectedOrder
    ? getCancelBehavior(selectedOrder)
    : null;
  const selectedOrderPaymentMethod = useMemo(() => {
    return [...(selectedOrder?.paymentTransactions ?? [])]
      .reverse()
      .find((transaction) => transaction?.paymentMethod)?.paymentMethod;
  }, [selectedOrder?.paymentTransactions]);
  const isSelectedOrderOnlineMethod =
    selectedOrderPaymentMethod === "VnPay" ||
    selectedOrderPaymentMethod === "Momo";
  const shouldRequireCancelRefundInfo =
    cancelBehavior?.mode === "request" && isSelectedOrderOnlineMethod;
  const canSubmitCancelRequest =
    cancelReason.trim().length > 0 &&
    (!shouldRequireCancelRefundInfo ||
      (cancelRefundBankName.trim() &&
        cancelRefundAccountNumber.trim() &&
        cancelRefundAccountName.trim()));

  const retryOrder = useMemo(
    () => orders.find((item) => item.id === retryOrderId) ?? null,
    [orders, retryOrderId],
  );

  const retryPaymentExpiresAtLabel = useMemo(
    () => formatDateTime(retryOrder?.paymentExpiresAt),
    [retryOrder?.paymentExpiresAt],
  );

  const allowedRetryMethods = useMemo(() => {
    if (!retryOrder) {
      return RETRY_PAYMENT_METHOD_OPTIONS;
    }

    return RETRY_PAYMENT_METHOD_OPTIONS.filter((method) =>
      retryOrder.type === "Offline"
        ? method !== "CashOnDelivery"
        : method !== "CashInStore",
    );
  }, [retryOrder]);

  useEffect(() => {
    if (
      !cancelOrderId ||
      !shouldRequireCancelRefundInfo ||
      vietQrBanks.length
    ) {
      return;
    }

    const controller = new AbortController();

    const loadVietQrBanks = async () => {
      try {
        setIsLoadingVietQrBanks(true);
        setVietQrBankError(null);

        const response = await fetch("https://api.vietqr.io/v2/banks", {
          method: "GET",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Không thể tải danh sách ngân hàng");
        }

        const json = (await response.json()) as { data?: VietQrBank[] };
        setVietQrBanks(Array.isArray(json.data) ? json.data : []);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setVietQrBankError("Không tải được danh sách ngân hàng từ VietQR");
      } finally {
        setIsLoadingVietQrBanks(false);
      }
    };

    void loadVietQrBanks();

    return () => {
      controller.abort();
    };
  }, [cancelOrderId, shouldRequireCancelRefundInfo, vietQrBanks.length]);

  const openRetryPaymentDialog = (order: OrderListItemWithReturnable) => {
    const latestPayment = [...(order.paymentTransactions ?? [])]
      .reverse()
      .find((transaction) => transaction?.id);

    if (!latestPayment?.id) {
      showToast("Không tìm thấy giao dịch thanh toán", "error");
      return;
    }

    const currentMethod = isSupportedPaymentMethod(latestPayment.paymentMethod)
      ? latestPayment.paymentMethod
      : null;

    const availableMethods = RETRY_PAYMENT_METHOD_OPTIONS.filter((method) =>
      order.type === "Offline"
        ? method !== "CashOnDelivery"
        : method !== "CashInStore",
    );

    setSelectedRetryMethod(
      currentMethod && availableMethods.includes(currentMethod)
        ? currentMethod
        : (availableMethods[0] ?? "VnPay"),
    );
    setRetryOrderId(order.id ?? null);
    setRetryPaymentId(latestPayment.id ?? null);
  };

  const closeRetryPaymentDialog = () => {
    if (isRetryingPayment) {
      return;
    }
    setRetryOrderId(null);
    setRetryPaymentId(null);
  };

  const handleRetryPayment = async () => {
    if (!retryPaymentId) {
      showToast("Không tìm thấy giao dịch thanh toán", "error");
      return;
    }

    try {
      setIsRetryingPayment(true);
      const response = await orderService.retryPayment(
        retryPaymentId,
        selectedRetryMethod,
      );

      if (selectedRetryMethod === "VnPay" || selectedRetryMethod === "Momo") {
        if (!response.url) {
          throw new Error("Không lấy được đường dẫn thanh toán");
        }

        window.location.href = response.url;
        return;
      }

      showToast("Đơn hàng đã được xác nhận!", "success");
      closeRetryPaymentDialog();
      await loadOrders();
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Không thể thanh toán lại đơn hàng",
        "error",
      );
    } finally {
      setIsRetryingPayment(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

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

            {/* Main content */}
            <Box
              sx={{
                flex: 1,
                bgcolor: "background.paper",
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
                    {orders.map((order) =>
                      (() => {
                        const latestPayment = [
                          ...(order.paymentTransactions ?? []),
                        ]
                          .reverse()
                          .find((transaction) => transaction?.id);
                        const currentMethod = isSupportedPaymentMethod(
                          latestPayment?.paymentMethod,
                        )
                          ? latestPayment?.paymentMethod
                          : null;
                        const isOnlineMethod =
                          currentMethod === "VnPay" || currentMethod === "Momo";
                        const isPendingUnpaid =
                          order.status === "Pending" &&
                          order.paymentStatus === "Unpaid";
                        const paymentExpiresAtLabel = formatDateTime(
                          order.paymentExpiresAt,
                        );
                        const returnRequestStatus = order.id
                          ? returnRequestStatusByOrderId[order.id]
                          : undefined;
                        const cancelRequestStatus = order.id
                          ? cancelRequestStatusByOrderId[order.id]
                          : undefined;
                        const hasBlockingReturnRequest = Boolean(
                          returnRequestStatus &&
                          RETURN_REQUEST_BLOCKED_STATUSES.has(
                            returnRequestStatus,
                          ),
                        );
                        const hasBlockingCancelRequest = Boolean(
                          cancelRequestStatus &&
                          CANCEL_REQUEST_BLOCKED_STATUSES.has(
                            cancelRequestStatus,
                          ),
                        );

                        return (
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
                                <Tooltip title={getDisplayOrderCode(order)}>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ fontFamily: "monospace" }}
                                  >
                                    #{getDisplayOrderCode(order)}
                                  </Typography>
                                </Tooltip>
                                {!!(order.code || order.id) && (
                                  <Tooltip title="Sao chép mã đơn">
                                    <IconButton
                                      size="small"
                                      onClick={() =>
                                        handleCopyOrderCode(
                                          order.code || order.id,
                                        )
                                      }
                                    >
                                      <ContentCopyIcon sx={{ fontSize: 14 }} />
                                    </IconButton>
                                  </Tooltip>
                                )}
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  ·
                                </Typography>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  {order.createdAt
                                    ? new Date(
                                        order.createdAt,
                                      ).toLocaleDateString("vi-VN")
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
                                {order.status && (
                                  <Chip
                                    label={orderStatusLabels[order.status]}
                                    color={orderStatusColors[order.status]}
                                    variant="filled"
                                    size="small"
                                    sx={getOrderStatusChipSx(order.status)}
                                  />
                                )}
                                {order.paymentStatus && (
                                  <Chip
                                    label={
                                      paymentStatusLabels[order.paymentStatus]
                                    }
                                    color={
                                      paymentStatusColors[order.paymentStatus]
                                    }
                                    variant="filled"
                                    size="small"
                                  />
                                )}
                              </Stack>
                            </Stack>

                            <Divider sx={{ mb: 1.5 }} />
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              paddingBottom={1.5}
                            >
                              {order.itemCount || 0} sản phẩm
                            </Typography>

                            {(order.orderDetails || []).length > 0 && (
                              <Stack spacing={1.25} sx={{ mb: 1.5 }}>
                                {order.orderDetails.map((detail, idx) => {
                                  const quantity = Number(detail.quantity ?? 0);
                                  const itemTotal = Number(detail.total ?? 0);
                                  const unitPriceLabel = formatUnitPrice(
                                    detail.unitPrice,
                                    detail.total,
                                  );

                                  return (
                                    <Box
                                      key={
                                        detail.id ||
                                        `${order.id || "order"}-${idx}`
                                      }
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1.5,
                                      }}
                                    >
                                      {detail.imageUrl ? (
                                        <Box
                                          component="img"
                                          src={detail.imageUrl}
                                          alt={detail.variantName}
                                          sx={{
                                            width: 56,
                                            height: 56,
                                            borderRadius: 1,
                                            objectFit: "cover",
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
                                            borderRadius: 1,
                                            border: "1px solid",
                                            borderColor: "divider",
                                            bgcolor: "grey.100",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexShrink: 0,
                                          }}
                                        >
                                          <ImageNotSupportedOutlinedIcon
                                            sx={{
                                              color: "text.disabled",
                                              fontSize: 22,
                                            }}
                                          />
                                        </Box>
                                      )}

                                      <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography
                                          variant="body2"
                                          fontWeight={500}
                                          noWrap
                                          title={detail.variantName}
                                        >
                                          {detail.variantName}
                                        </Typography>
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                        >
                                          x{quantity}
                                        </Typography>
                                      </Box>

                                      <Box
                                        sx={{
                                          textAlign: "right",
                                          minWidth: 110,
                                        }}
                                      >
                                        {unitPriceLabel && (
                                          <Typography
                                            variant="caption"
                                            color="text.disabled"
                                            sx={{
                                              textDecoration: "line-through",
                                            }}
                                          >
                                            {unitPriceLabel}
                                          </Typography>
                                        )}
                                        <Typography
                                          variant="body2"
                                          fontWeight={600}
                                          sx={{ color: "#ee4d2d" }}
                                        >
                                          {formatCurrency(itemTotal)}
                                        </Typography>
                                      </Box>
                                    </Box>
                                  );
                                })}
                              </Stack>
                            )}

                            {/* Order summary row */}
                            <Stack
                              direction={{ xs: "column", sm: "row" }}
                              justifyContent="space-between"
                              alignItems={{ xs: "flex-start", sm: "center" }}
                              spacing={1}
                            >
                              <Stack spacing={0.5}>
                                <Stack
                                  direction="row"
                                  spacing={1}
                                  alignItems="center"
                                >
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
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

                                {isPendingUnpaid &&
                                  isOnlineMethod &&
                                  paymentExpiresAtLabel && (
                                    <Typography
                                      variant="caption"
                                      color="error.main"
                                    >
                                      Hạn thanh toán: {paymentExpiresAtLabel}
                                    </Typography>
                                  )}
                              </Stack>
                            </Stack>

                            <Divider sx={{ my: 1.5 }} />

                            {/* Actions */}
                            <Stack
                              direction="row"
                              justifyContent="flex-end"
                              spacing={1}
                            >
                              {isPendingUnpaid && latestPayment?.id && (
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="warning"
                                  disabled={actionOrderId === order.id}
                                  onClick={() => openRetryPaymentDialog(order)}
                                >
                                  Thanh toán lại
                                </Button>
                              )}

                              {getCancelBehavior(order) && (
                                <Tooltip
                                  title={
                                    hasBlockingCancelRequest
                                      ? cancelRequestStatusLabel(
                                          cancelRequestStatus,
                                        )
                                      : ""
                                  }
                                >
                                  <span>
                                    <Button
                                      size="small"
                                      color={
                                        getCancelBehavior(order)?.mode ===
                                        "direct"
                                          ? "error"
                                          : "warning"
                                      }
                                      variant="outlined"
                                      disabled={
                                        actionOrderId === order.id ||
                                        hasBlockingCancelRequest
                                      }
                                      onClick={() => openCancelDialog(order.id)}
                                    >
                                      {hasBlockingCancelRequest
                                        ? "Đã gửi yêu cầu hủy đơn"
                                        : getCancelBehavior(order)?.buttonLabel}
                                    </Button>
                                  </span>
                                </Tooltip>
                              )}

                              {order.status === "Delivered" &&
                                isOrderReturnable(order) && (
                                  <Tooltip
                                    title={
                                      hasBlockingReturnRequest
                                        ? returnRequestStatusLabel(
                                            returnRequestStatus,
                                          )
                                        : ""
                                    }
                                  >
                                    <span>
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        color="warning"
                                        onClick={() =>
                                          handleOpenReturnRequest(order.id)
                                        }
                                        disabled={hasBlockingReturnRequest}
                                      >
                                        {hasBlockingReturnRequest
                                          ? "Đã gửi yêu cầu trả hàng"
                                          : "Yêu cầu trả hàng"}
                                      </Button>
                                    </span>
                                  </Tooltip>
                                )}
                              {order.status === "Delivered" && (
                                <Button
                                  size="small"
                                  variant={getOrderReviewStatus(order) === "fully" ? "outlined" : "contained"}
                                  onClick={() => handleOpenDetail(order.id)}
                                  sx={{
                                    ...(getOrderReviewStatus(order) === "fully"
                                      ? {
                                          borderColor: "#999",
                                          color: "#999",
                                          "&:hover": {
                                            borderColor: "#666",
                                            bgcolor: "rgba(0,0,0,0.04)",
                                          },
                                        }
                                      : {
                                          bgcolor: "#ee4d2d",
                                          "&:hover": { bgcolor: "#d03e27" },
                                        }),
                                  }}
                                >
                                  {getOrderReviewStatus(order) === "fully"
                                    ? "Đã đánh giá"
                                    : "Đánh giá"}
                                </Button>
                              )}
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
                            </Stack>
                          </Paper>
                        );
                      })(),
                    )}
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

      <ReviewEditorDialog
        open={isReviewDialogOpen}
        mode={reviewDialogMode}
        target={reviewDialogTarget}
        initialReview={selectedReview}
        onClose={handleReviewDialogClose}
        onSuccess={handleReviewSuccess}
      />

      <Dialog
        open={Boolean(cancelOrderId)}
        onClose={() => {
          if (actionOrderId === cancelOrderId) return;
          setCancelOrderId(null);
          setCancelReason("");
          setSelectedCancelRefundBank(null);
          setCancelRefundBankName("");
          setCancelRefundAccountNumber("");
          setCancelRefundAccountName("");
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {cancelBehavior?.mode === "direct"
            ? "Xác nhận hủy đơn hàng"
            : "Gửi yêu cầu hủy đơn"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              {cancelBehavior?.note ||
                "Vui lòng chọn hoặc nhập lý do để tiếp tục."}
            </Typography>
            <TextField
              label="Lý do hủy *"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              fullWidth
              multiline
              minRows={3}
              size="small"
              placeholder="Nhập lý do hủy đơn hàng"
            />

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {CUSTOMER_CANCEL_ORDER_REASON_OPTIONS.map((option) => {
                const isSelected = cancelReason.trim() === option.label;
                return (
                  <Chip
                    key={option.value}
                    clickable
                    label={option.label}
                    color={isSelected ? "warning" : "default"}
                    onClick={() => setCancelReason(option.label)}
                    sx={{ maxWidth: "100%" }}
                  />
                );
              })}
            </Stack>

            {shouldRequireCancelRefundInfo && (
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                <Stack spacing={1.25}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    Thông tin tài khoản nhận hoàn tiền
                  </Typography>
                  <Alert severity="info" sx={{ py: 0.5 }}>
                    Đơn thanh toán online cần thông tin tài khoản để hỗ trợ hoàn
                    tiền linh hoạt khi cổng hoàn tự động lỗi hoặc cần chuyển
                    khoản thủ công.
                  </Alert>
                  <Autocomplete
                    options={vietQrBanks}
                    value={selectedCancelRefundBank}
                    inputValue={cancelRefundBankName}
                    loading={isLoadingVietQrBanks}
                    getOptionLabel={(option) =>
                      typeof option === "string"
                        ? option
                        : getBankDisplayName(option)
                    }
                    isOptionEqualToValue={(option, value) =>
                      option.id === value.id
                    }
                    onInputChange={() => {
                      // Prevent free input - only allow selection from list
                    }}
                    onChange={(_, bank) => {
                      if (!bank) {
                        setSelectedCancelRefundBank(null);
                        setCancelRefundBankName("");
                        return;
                      }

                      if (typeof bank === "string") {
                        return;
                      }

                      setSelectedCancelRefundBank(bank);
                      setCancelRefundBankName(getBankDisplayName(bank));
                    }}
                    renderOption={(props, option) => (
                      <Box component="li" {...props}>
                        <Stack
                          direction="row"
                          spacing={1.25}
                          alignItems="center"
                        >
                          {option.logo ? (
                            <Box
                              component="img"
                              src={option.logo}
                              alt={
                                option.shortName ||
                                option.short_name ||
                                option.name
                              }
                              sx={{
                                width: 28,
                                height: 28,
                                objectFit: "contain",
                                borderRadius: 0.5,
                              }}
                            />
                          ) : (
                            <Box
                              sx={{
                                width: 28,
                                height: 28,
                                borderRadius: 0.5,
                                bgcolor: "grey.100",
                              }}
                            />
                          )}
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {option.shortName ||
                                option.short_name ||
                                option.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {option.name}
                            </Typography>
                          </Box>
                        </Stack>
                      </Box>
                    )}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Ngân hàng nhận tiền *"
                        size="small"
                        error={Boolean(vietQrBankError)}
                        helperText={
                          vietQrBankError ||
                          "Chọn ngân hàng từ danh sách VietQR"
                        }
                        inputProps={{
                          ...params.inputProps,
                          readOnly: true,
                        }}
                      />
                    )}
                  />
                  <TextField
                    label="Số tài khoản *"
                    value={cancelRefundAccountNumber}
                    onChange={(e) =>
                      setCancelRefundAccountNumber(
                        normalizeRefundAccountNumber(e.target.value),
                      )
                    }
                    fullWidth
                    size="small"
                    inputProps={{
                      inputMode: "text",
                      autoCapitalize: "characters",
                    }}
                    helperText="Tự động viết HOA, không dấu, không khoảng trắng, không ký tự đặc biệt"
                  />
                  <TextField
                    label="Tên chủ tài khoản *"
                    value={cancelRefundAccountName}
                    onChange={(e) =>
                      setCancelRefundAccountName(
                        normalizeRefundAccountName(e.target.value),
                      )
                    }
                    fullWidth
                    size="small"
                    inputProps={{ autoCapitalize: "characters" }}
                    helperText="Tự động viết HOA, không dấu, không ký tự đặc biệt"
                  />
                </Stack>
              </Paper>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setCancelOrderId(null);
              setCancelReason("");
              setSelectedCancelRefundBank(null);
              setCancelRefundBankName("");
              setCancelRefundAccountNumber("");
              setCancelRefundAccountName("");
            }}
            disabled={actionOrderId === cancelOrderId}
          >
            Đóng
          </Button>
          <Button
            color={cancelBehavior?.mode === "direct" ? "error" : "warning"}
            variant="contained"
            onClick={handleConfirmCancelOrder}
            disabled={
              !cancelOrderId ||
              actionOrderId === cancelOrderId ||
              !canSubmitCancelRequest
            }
          >
            {actionOrderId === cancelOrderId
              ? "Đang gửi..."
              : cancelBehavior?.mode === "direct"
                ? "Xác nhận hủy"
                : "Gửi yêu cầu"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(retryOrderId)}
        onClose={closeRetryPaymentDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Thanh toán lại đơn hàng</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              Chọn phương thức thanh toán để tiếp tục.
            </Typography>

            {retryOrder?.paymentStatus === "Unpaid" &&
              retryPaymentExpiresAtLabel &&
              (() => {
                const method = [...(retryOrder.paymentTransactions ?? [])]
                  .reverse()
                  .find((transaction) => transaction?.id)?.paymentMethod;
                const isOnlineMethod = method === "VnPay" || method === "Momo";

                if (!isOnlineMethod) {
                  return null;
                }

                return (
                  <Alert severity="warning">
                    Giao dịch hiện tại sẽ hết hạn lúc{" "}
                    <b>{retryPaymentExpiresAtLabel}</b>.
                  </Alert>
                );
              })()}

            <RadioGroup
              value={selectedRetryMethod}
              onChange={(e) =>
                setSelectedRetryMethod(
                  e.target.value as NonNullable<PaymentMethod>,
                )
              }
            >
              {allowedRetryMethods.map((method) => (
                <FormControlLabel
                  key={method}
                  value={method}
                  control={<Radio size="small" />}
                  label={
                    <Box
                      display="flex"
                      alignItems="center"
                      gap={1.25}
                      py={0.25}
                    >
                      <Box
                        component="img"
                        src={PAYMENT_METHOD_ICONS[method]}
                        alt={PAYMENT_METHOD_LABELS[method]}
                        sx={{
                          width: 28,
                          height: 28,
                          objectFit: "contain",
                          borderRadius: 1,
                          border: "1px solid",
                          borderColor: "divider",
                          bgcolor: "#fff",
                          p: 0.4,
                          flexShrink: 0,
                        }}
                      />
                      <Typography variant="body2" fontWeight={500}>
                        {PAYMENT_METHOD_LABELS[method]}
                      </Typography>
                    </Box>
                  }
                  sx={{
                    m: 0,
                    mb: 0.75,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                    px: 1.25,
                    py: 0.25,
                  }}
                />
              ))}
            </RadioGroup>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={closeRetryPaymentDialog}
            disabled={isRetryingPayment}
          >
            Đóng
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleRetryPayment}
            disabled={
              isRetryingPayment ||
              !retryPaymentId ||
              !allowedRetryMethods.includes(selectedRetryMethod)
            }
          >
            {isRetryingPayment ? "Đang xử lý..." : "Thanh toán ngay"}
          </Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
};

export default MyOrdersPage;
