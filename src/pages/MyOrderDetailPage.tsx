import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
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
  Tooltip,
} from "@mui/material";
import {
  ArrowBack,
  PhotoCameraOutlined,
  VideocamOutlined,
  DeleteOutline,
  PlayCircleOutline,
  Receipt,
  Payments,
  CheckCircle,
  LocalShipping,
  Storage,
  StarBorder,
  Person,
  Sync,
  LocationOn,
  Phone,
  CancelOutlined,
  AssignmentReturn,
  Add,
  Remove,
  RadioButtonUnchecked,
  Inventory,
} from "@mui/icons-material";
import { MainLayout } from "@/layouts/MainLayout";
import { orderService } from "@/services/orderService";
import type {
  OrderCancelRequest,
  OrderReturnRequest,
  ReturnOrderReason,
} from "@/services/orderService";
import { productReviewService } from "@/services/reviewService";
import { productService } from "@/services/productService";
import { userService } from "@/services/userService";
import { addressService } from "@/services/addressService";
import { useToast } from "@/hooks/useToast";
import type { UserCredentials } from "@/services/userService";
import type { PaymentMethod } from "@/types/checkout";
import type { OrderResponse, CarrierName, OrderStatus } from "@/types/order";
import type { components } from "@/types/api/v1";
import type {
  AddressResponse,
  DistrictResponse,
  ProvinceResponse,
  WardResponse,
} from "@/types/address";
import {
  getReviewStatus,
  type ReviewResponse,
  type ReviewStatus,
  type ReviewDialogTarget,
} from "@/types/review";
import { orderStatusLabels } from "@/utils/orderStatus";
import {
  CANCEL_ORDER_REASON_OPTIONS,
  mapCancelReasonInputToEnum,
} from "@/utils/cancelOrderReason";
import { formatDateTimeCompactVN, formatDateVN } from "@/utils/dateTime";
import { UserProfileSidebar } from "@/components/profile/UserProfileSidebar";
import { ReviewEditorDialog } from "@/components/review/ReviewEditorDialog";
import codIcon from "@/assets/cod.png";
import storeIcon from "@/assets/store.png";
import vnpayIcon from "@/assets/vnpay.jpg";
import momoIcon from "@/assets/momo.png";
import transericon from "@/assets/transfer.png";

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
  ExternalBankTransfer: "Chuyển khoản ngân hàng",
  PayOs: "Thanh toán qua PayOS",
};

const PAYMENT_METHOD_ICONS: Record<PaymentMethod, string> = {
  CashOnDelivery: codIcon,
  CashInStore: storeIcon,
  VnPay: vnpayIcon,
  Momo: momoIcon,
  ExternalBankTransfer: transericon,
  PayOs: transericon,
};

const RETRY_PAYMENT_METHOD_OPTIONS: PaymentMethod[] = [
  "CashOnDelivery",
  "CashInStore",
  "VnPay",
  "Momo",
];

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
  { label: "Đánh Giá", Icon: StarBorder },
];

const RETURN_STEPS = [
  { label: "Đã tạo yêu cầu trả hàng", Icon: AssignmentReturn },
  { label: "Đang gửi hàng hoàn về shop", Icon: LocalShipping },
  { label: "Shop đã nhận hàng hoàn", Icon: Inventory },
  { label: "Hoàn tiền hoàn tất", Icon: Payments },
];

const RETURN_REASON_OPTIONS: { value: ReturnOrderReason; label: string }[] = [
  { value: "DamagedProduct", label: "Hàng bể vỡ / hư hỏng" },
  { value: "WrongItemReceived", label: "Người bán gửi sai hàng" },
  { value: "ItemNotAsDescribed", label: "Hàng không đúng mô tả" },
  { value: "AllergicReaction", label: "Không phù hợp / kích ứng" },
  { value: "ChangedMind", label: "Đổi ý, không còn nhu cầu" },
];

interface VietQrBank {
  id: number;
  name: string;
  shortName?: string;
  short_name?: string;
  logo?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmt = (v?: number | null) =>
  `${new Intl.NumberFormat("vi-VN").format(Number(v ?? 0))}đ`;

const fmtDate = (s?: string | null) => {
  return formatDateTimeCompactVN(s);
};

const fmtDateShort = (s?: string | null) => {
  return formatDateVN(s);
};

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

const returnShippingStatusLabel = (status?: string | null) => {
  if (!status) return "Chưa có thông tin vận chuyển hoàn trả";
  if (status === "Pending") return "Chờ lấy hàng hoàn";
  if (status === "Confirmed") return "Đã xác nhận lấy hàng hoàn";
  if (status === "ReadyToPick") return "Chờ lấy hàng hoàn";
  if (status === "PickedUp") return "Đã lấy hàng hoàn";
  if (status === "InTransit") return "Đang vận chuyển hàng hoàn";
  if (status === "Delivering") return "Đang giao hàng hoàn về shop";
  if (status === "OutForDelivery") return "Đang giao hàng hoàn về shop";
  if (status === "Delivered") return "Shop đã nhận hàng hoàn";
  if (status === "DeliveryFailed") return "Giao hàng hoàn thất bại";
  if (status === "Returned") return "Hàng hoàn đã trả về";
  if (status === "Cancelled") return "Đơn vận chuyển hoàn đã hủy";
  return status;
};

const returnRequestStatusLabel = (status?: string | null) => {
  if (!status) return "Đã gửi yêu cầu trả hàng";
  if (status === "Pending") return "Yêu cầu đang chờ duyệt";
  if (status === "ApprovedForReturn") return "Yêu cầu đã được duyệt trả hàng";
  if (status === "Inspecting") return "Shop đang kiểm tra hàng hoàn";
  if (status === "ReadyForRefund") return "Sẵn sàng hoàn tiền";
  if (status === "Completed") return "Yêu cầu trả hàng đã hoàn tất";
  if (status === "Rejected") return "Yêu cầu trả hàng đã bị từ chối";
  if (status === "RequestMoreInfo") return "Cần bổ sung thông tin trả hàng";
  return `Yêu cầu trả hàng: ${status}`;
};

const isSupportedPaymentMethod = (
  value?: string | null,
): value is PaymentMethod =>
  value === "CashOnDelivery" ||
  value === "CashInStore" ||
  value === "VnPay" ||
  value === "Momo";

const RETURN_REQUEST_BLOCKED_STATUSES = new Set([
  "Pending",
  "ApprovedForReturn",
  "RequestMoreInfo",
]);

const CANCEL_REQUEST_BLOCKED_STATUSES = new Set(["Pending"]);

const cancelRequestStatusLabel = (status?: string | null) => {
  if (!status) return "Đã gửi yêu cầu hủy đơn";
  if (status === "Pending") return "Yêu cầu hủy đơn đang chờ xử lý";
  if (status === "Approved") return "Yêu cầu hủy đơn đã được duyệt";
  if (status === "Rejected") return "Yêu cầu hủy đơn đã bị từ chối";
  return `Yêu cầu hủy đơn: ${status}`;
};

// ─── Order Stepper ──────────────────────────────────────────────────────────

interface StepperProps {
  status: OrderStatus;
  createdAt?: string | null;
  paidAt?: string | null;
  updatedAt?: string | null;
  totalAmount?: number | null;
  returnShippingStatus?: string | null;
  returnRequestStatus?: string | null;
}

const OrderStepper = ({
  status,
  createdAt,
  paidAt,
  updatedAt,
  totalAmount,
  returnShippingStatus,
  returnRequestStatus,
}: StepperProps) => {
  const baseStep = STATUS_TO_STEP[status] ?? 0;
  const isReturnFlow =
    status === "Returning" ||
    status === "Partial_Returned" ||
    status === "Returned";

  const returnActiveStep =
    status === "Returned" ||
    returnRequestStatus === "Completed" ||
    returnRequestStatus === "Refunded"
      ? 3
      : returnShippingStatus === "Delivered" ||
          returnRequestStatus === "Inspecting" ||
          returnRequestStatus === "ReadyForRefund"
        ? 2
        : returnShippingStatus
          ? 1
          : 0;

  // If already paid, ensure at least step 1 is active for normal order flow.
  const activeStep = paidAt && baseStep >= 0 && baseStep < 1 ? 1 : baseStep;
  const isCanceled = status === "Cancelled";
  const isSpecial = isCanceled;

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

  if (isReturnFlow) {
    return (
      <Box sx={{ py: 3, px: { xs: 2, sm: 4 } }}>
        <Box
          display="flex"
          alignItems="center"
          gap={1}
          mb={2}
          sx={{
            bgcolor: "#fff8e1",
            border: "1px solid #ffe082",
            borderRadius: 1,
            p: 1.5,
          }}
        >
          <AssignmentReturn sx={{ color: "#f57c00" }} />
          <Typography fontWeight={600} color="warning.dark">
            Đơn hàng đang trong quá trình hoàn trả
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Trạng thái hoàn trả hiện tại:{" "}
          <b>{returnShippingStatusLabel(returnShippingStatus)}</b>
        </Typography>

        <Box
          display="flex"
          alignItems="flex-start"
          sx={{ overflowX: "auto", pt: "6px", pb: 1 }}
        >
          {RETURN_STEPS.map((step, idx) => {
            const completed = idx <= returnActiveStep;
            const isCurrent = idx === returnActiveStep;
            const circleColor = completed ? GREEN : GRAY;
            const lineColor = idx < returnActiveStep ? GREEN : GRAY;

            return (
              <Box
                key={step.label}
                display="flex"
                alignItems="flex-start"
                sx={{ flex: idx < RETURN_STEPS.length - 1 ? 1 : "none" }}
              >
                <Box
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  sx={{ minWidth: 100 }}
                >
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

                  <Typography
                    variant="caption"
                    align="center"
                    fontWeight={isCurrent ? 700 : 500}
                    sx={{
                      mt: 1,
                      color: completed ? "#333" : "text.disabled",
                      maxWidth: 120,
                      lineHeight: 1.3,
                    }}
                  >
                    {step.label}
                  </Typography>

                  {idx === 0 && createdAt && (
                    <Typography
                      variant="caption"
                      align="center"
                      sx={{ color: "text.secondary", mt: 0.25, fontSize: 11 }}
                    >
                      {fmtDate(createdAt)}
                    </Typography>
                  )}

                  {idx === RETURN_STEPS.length - 1 &&
                    status === "Returned" &&
                    updatedAt && (
                      <Typography
                        variant="caption"
                        align="center"
                        sx={{
                          color: "text.secondary",
                          mt: 0.25,
                          fontSize: 11,
                        }}
                      >
                        {fmtDate(updatedAt)}
                      </Typography>
                    )}
                </Box>

                {idx < RETURN_STEPS.length - 1 && (
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
  }

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
  const [orderReturnRequest, setOrderReturnRequest] =
    useState<OrderReturnRequest | null>(null);
  const [orderCancelRequest, setOrderCancelRequest] =
    useState<OrderCancelRequest | null>(null);
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
  const [selectedCancelRefundBank, setSelectedCancelRefundBank] =
    useState<VietQrBank | null>(null);
  const [cancelRefundBankName, setCancelRefundBankName] = useState("");
  const [cancelRefundAccountNumber, setCancelRefundAccountNumber] =
    useState("");
  const [cancelRefundAccountName, setCancelRefundAccountName] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [isSyncingShipping, setIsSyncingShipping] = useState(false);
  const [isRetryPaymentDialogOpen, setIsRetryPaymentDialogOpen] =
    useState(false);
  const [isRetryingPayment, setIsRetryingPayment] = useState(false);
  const [selectedRetryPaymentMethod, setSelectedRetryPaymentMethod] =
    useState<PaymentMethod>("CashOnDelivery");

  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [returnReason, setReturnReason] = useState<ReturnOrderReason | "">("");
  const [isRefundOnly, setIsRefundOnly] = useState(false);
  const [returnNote, setReturnNote] = useState("");
  const [vietQrBanks, setVietQrBanks] = useState<VietQrBank[]>([]);
  const [isLoadingVietQrBanks, setIsLoadingVietQrBanks] = useState(false);
  const [vietQrBankError, setVietQrBankError] = useState<string | null>(null);
  const [selectedRefundBank, setSelectedRefundBank] =
    useState<VietQrBank | null>(null);
  const [refundBankName, setRefundBankName] = useState("");
  const [refundAccountNumber, setRefundAccountNumber] = useState("");
  const [refundAccountName, setRefundAccountName] = useState("");
  const [returnMediaFiles, setReturnMediaFiles] = useState<File[]>([]);
  const [returnItemQuantities, setReturnItemQuantities] = useState<
    Record<string, number>
  >({});
  const [pickupAddressMode, setPickupAddressMode] = useState<
    "saved" | "custom"
  >("saved");
  const [savedAddresses, setSavedAddresses] = useState<AddressResponse[]>([]);
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState("");
  const [provinces, setProvinces] = useState<ProvinceResponse[]>([]);
  const [districts, setDistricts] = useState<DistrictResponse[]>([]);
  const [wards, setWards] = useState<WardResponse[]>([]);
  const [selectedProvince, setSelectedProvince] =
    useState<ProvinceResponse | null>(null);
  const [selectedDistrict, setSelectedDistrict] =
    useState<DistrictResponse | null>(null);
  const [selectedWard, setSelectedWard] = useState<WardResponse | null>(null);
  const [customRecipient, setCustomRecipient] = useState({
    contactName: "",
    contactPhoneNumber: "",
    fullAddress: "",
  });
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);
  const [isLoadingWards, setIsLoadingWards] = useState(false);
  const [returnFormError, setReturnFormError] = useState("");
  const [isSubmittingReturnRequest, setIsSubmittingReturnRequest] =
    useState(false);

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

        try {
          const myReturnRequests = await orderService.getMyReturnRequests({
            PageNumber: 1,
            PageSize: 100,
            SortBy: "CreatedAt",
            SortOrder: "desc",
          });

          const matchedRequest = myReturnRequests.items
            .filter((item) => item.orderId === orderData.id)
            .sort(
              (a, b) =>
                new Date(b.createdAt || 0).getTime() -
                new Date(a.createdAt || 0).getTime(),
            )[0];

          const latestRequest = matchedRequest ?? null;
          setOrderReturnRequest(latestRequest);

          if (locationState.requestReturn) {
            const latestStatus = latestRequest?.status;
            const hasBlockingRequest = Boolean(
              latestStatus && RETURN_REQUEST_BLOCKED_STATUSES.has(latestStatus),
            );

            if (hasBlockingRequest) {
              showToast(
                `Đơn hàng này đã có yêu cầu trả hàng. ${returnRequestStatusLabel(latestStatus)}`,
                "info",
              );
            } else {
              setIsReturnDialogOpen(true);
              setReturnFormError("");
            }
          }
        } catch {
          setOrderReturnRequest(null);

          if (locationState.requestReturn) {
            setIsReturnDialogOpen(true);
            setReturnFormError("");
          }
        }

        try {
          const myCancelRequests = await orderService.getMyCancelRequests({
            PageNumber: 1,
            PageSize: 100,
            SortBy: "CreatedAt",
            SortOrder: "desc",
          });

          const matchedCancelRequest = myCancelRequests.items
            .filter((item) => item.orderId === orderData.id)
            .sort(
              (a, b) =>
                new Date(b.createdAt || 0).getTime() -
                new Date(a.createdAt || 0).getTime(),
            )[0];

          setOrderCancelRequest(matchedCancelRequest ?? null);
        } catch {
          setOrderCancelRequest(null);
        }
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
  }, [locationState.requestReturn, orderId, showToast]);

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
  const hasBlockingReturnRequest = Boolean(
    orderReturnRequest?.id &&
    RETURN_REQUEST_BLOCKED_STATUSES.has(orderReturnRequest.status ?? ""),
  );
  const hasBlockingCancelRequest = Boolean(
    orderCancelRequest?.id &&
    CANCEL_REQUEST_BLOCKED_STATUSES.has(orderCancelRequest.status ?? ""),
  );

  const getCancelBehavior = (currentOrder: OrderResponse | null) => {
    if (!currentOrder?.status) {
      return null;
    }

    const isPending = currentOrder.status === "Pending";
    const isPreparingOrReadyToPick =
      currentOrder.status === "Preparing" ||
      currentOrder.status === "ReadyToPick";
    const isPaid = currentOrder.paymentStatus === "Paid";

    if (isPending && !isPaid) {
      return {
        mode: "direct" as const,
        buttonLabel: "Hủy đơn hàng",
        note: "Đơn chưa thanh toán nên sẽ bị hủy ngay sau khi xác nhận.",
      };
    }

    if ((isPending && isPaid) || isPreparingOrReadyToPick) {
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

  const latestPaymentTransaction = useMemo(
    () =>
      [...(order?.paymentTransactions ?? [])]
        .reverse()
        .find((transaction) => transaction?.id),
    [order?.paymentTransactions],
  );

  const latestPaymentMethod = useMemo(
    () =>
      [...(order?.paymentTransactions ?? [])]
        .reverse()
        .find((transaction) => transaction?.paymentMethod)?.paymentMethod,
    [order?.paymentTransactions],
  );

  const currentPaymentMethod = useMemo<PaymentMethod | null>(() => {
    const value = latestPaymentMethod;
    return isSupportedPaymentMethod(value) ? value : null;
  }, [latestPaymentMethod]);

  const paymentId = latestPaymentTransaction?.id ?? null;
  const isCodPaymentOrder = currentPaymentMethod === "CashOnDelivery";

  const isPendingUnpaid =
    order?.status === "Pending" && order?.paymentStatus === "Unpaid";

  const isPickupInStoreOrder = Boolean(
    order &&
    (order.type === "Offline" || (!order.recipientInfo && !order.shippingInfo)),
  );

  const allowedRetryPaymentMethods = useMemo(
    () =>
      RETRY_PAYMENT_METHOD_OPTIONS.filter((method) =>
        isPickupInStoreOrder
          ? method !== "CashOnDelivery"
          : method !== "CashInStore",
      ),
    [isPickupInStoreOrder],
  );

  const canRetryPaymentInDetail = isPendingUnpaid && Boolean(paymentId);

  const isCurrentOnlineMethod =
    currentPaymentMethod === "VnPay" || currentPaymentMethod === "Momo";

  const shouldRequireCancelRefundInfo =
    cancelBehavior?.mode === "request" && isCurrentOnlineMethod;

  const canSubmitCancelRequest =
    cancelReason.trim().length > 0 &&
    (!shouldRequireCancelRefundInfo ||
      (cancelRefundBankName.trim() &&
        cancelRefundAccountNumber.trim() &&
        cancelRefundAccountName.trim()));

  const paymentExpiresAtLabel = useMemo(() => {
    const rawExpiresAt = order?.paymentExpiresAt;
    if (!rawExpiresAt) {
      return null;
    }

    const formatted = fmtDate(rawExpiresAt);
    return formatted || null;
  }, [order?.paymentExpiresAt]);

  useEffect(() => {
    if (!canRetryPaymentInDetail) {
      return;
    }

    if (
      currentPaymentMethod &&
      allowedRetryPaymentMethods.includes(currentPaymentMethod)
    ) {
      setSelectedRetryPaymentMethod(currentPaymentMethod);
      return;
    }

    setSelectedRetryPaymentMethod(allowedRetryPaymentMethods[0] ?? "VnPay");
  }, [
    allowedRetryPaymentMethods,
    canRetryPaymentInDetail,
    currentPaymentMethod,
  ]);

  const returnMediaPreviews = useMemo(
    () =>
      returnMediaFiles.map((file, index) => ({
        index,
        name: file.name,
        isVideo: file.type.startsWith("video/"),
        url: URL.createObjectURL(file),
      })),
    [returnMediaFiles],
  );

  const returnImageFiles = useMemo(
    () => returnMediaFiles.filter((file) => file.type.startsWith("image/")),
    [returnMediaFiles],
  );

  const returnVideoFiles = useMemo(
    () => returnMediaFiles.filter((file) => file.type.startsWith("video/")),
    [returnMediaFiles],
  );

  useEffect(() => {
    const shouldLoadVietQrBanks =
      isReturnDialogOpen ||
      (isCancelDialogOpen && shouldRequireCancelRefundInfo);

    if (!shouldLoadVietQrBanks || vietQrBanks.length > 0) {
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
  }, [
    isCancelDialogOpen,
    isReturnDialogOpen,
    shouldRequireCancelRefundInfo,
    vietQrBanks.length,
  ]);

  const selectedReturnItems = useMemo(
    () =>
      (order?.orderDetails ?? [])
        .map((item) => {
          const id = item.id ?? "";
          const max = Number(item.quantity ?? 0);
          const refundableUnitPrice = Number(
            item.refunablePrice ?? item.unitPrice ?? 0,
          );
          const requested = Math.min(
            Math.max(0, Number(returnItemQuantities[id] ?? 0)),
            max,
          );
          return {
            orderDetailId: id,
            requested,
            max,
            refundableUnitPrice,
            item,
          };
        })
        .filter((entry) => Boolean(entry.orderDetailId) && entry.requested > 0),
    [order?.orderDetails, returnItemQuantities],
  );

  const estimatedRefundAmount = useMemo(
    () =>
      selectedReturnItems.reduce(
        (sum, entry) =>
          sum + entry.refundableUnitPrice * Number(entry.requested),
        0,
      ),
    [selectedReturnItems],
  );

  const isReturnAddressValid = useMemo(() => {
    if (isRefundOnly) {
      return true;
    }

    if (pickupAddressMode === "saved") {
      return Boolean(selectedSavedAddressId);
    }

    return Boolean(
      customRecipient.contactName.trim() &&
      customRecipient.contactPhoneNumber.trim() &&
      customRecipient.fullAddress.trim() &&
      selectedProvince?.ProvinceID &&
      selectedProvince.ProvinceName &&
      selectedDistrict?.DistrictID &&
      selectedDistrict.DistrictName &&
      selectedWard?.WardCode &&
      selectedWard.WardName,
    );
  }, [
    customRecipient.contactName,
    customRecipient.contactPhoneNumber,
    customRecipient.fullAddress,
    pickupAddressMode,
    selectedDistrict?.DistrictID,
    selectedDistrict?.DistrictName,
    selectedProvince?.ProvinceID,
    selectedProvince?.ProvinceName,
    selectedSavedAddressId,
    selectedWard?.WardCode,
    selectedWard?.WardName,
    isRefundOnly,
  ]);

  const canSubmitReturnRequest = useMemo(
    () =>
      Boolean(
        returnReason &&
        selectedReturnItems.length > 0 &&
        returnVideoFiles.length > 0 &&
        refundBankName.trim() &&
        refundAccountNumber.trim() &&
        refundAccountName.trim() &&
        isReturnAddressValid,
      ),
    [
      isReturnAddressValid,
      refundAccountName,
      refundAccountNumber,
      refundBankName,
      returnVideoFiles.length,
      returnReason,
      selectedReturnItems.length,
    ],
  );

  useEffect(() => {
    return () => {
      returnMediaPreviews.forEach((preview) =>
        URL.revokeObjectURL(preview.url),
      );
    };
  }, [returnMediaPreviews]);

  useEffect(() => {
    if (!isReturnDialogOpen) {
      return;
    }

    const loadAddressData = async () => {
      setIsLoadingAddresses(true);
      setIsLoadingProvinces(true);
      try {
        const [addresses, provinceData] = await Promise.all([
          addressService.getAddresses().catch(() => [] as AddressResponse[]),
          addressService.getProvinces().catch(() => [] as ProvinceResponse[]),
        ]);
        setSavedAddresses(addresses);
        setProvinces(provinceData);

        const defaultAddress =
          addresses.find((address) => address.isDefault) ?? addresses[0];
        setSelectedSavedAddressId(defaultAddress?.id ?? "");

        if (!addresses.length) {
          setPickupAddressMode("custom");
        }
      } finally {
        setIsLoadingAddresses(false);
        setIsLoadingProvinces(false);
      }
    };

    void loadAddressData();
  }, [isReturnDialogOpen]);

  const handleCancelOrder = async () => {
    if (!order?.id) return;

    if (hasBlockingCancelRequest) {
      showToast(
        `Đơn hàng này đã có yêu cầu hủy. ${cancelRequestStatusLabel(orderCancelRequest?.status)}`,
        "info",
      );
      return;
    }

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
      setIsCancelling(true);
      await orderService.cancelOrder(order.id, cancelReasonEnum, {
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
      setIsCancelDialogOpen(false);
      setCancelReason("");
      setSelectedCancelRefundBank(null);
      setCancelRefundBankName("");
      setCancelRefundAccountNumber("");
      setCancelRefundAccountName("");
      if (orderId) {
        const [refreshed, myCancelRequests] = await Promise.all([
          orderService.getMyOrderById(orderId),
          orderService.getMyCancelRequests({
            PageNumber: 1,
            PageSize: 100,
            SortBy: "CreatedAt",
            SortOrder: "desc",
          }),
        ]);
        setOrder(refreshed);

        const latestCancelRequest = myCancelRequests.items
          .filter((item) => item.orderId === refreshed.id)
          .sort(
            (a, b) =>
              new Date(b.createdAt || 0).getTime() -
              new Date(a.createdAt || 0).getTime(),
          )[0];
        setOrderCancelRequest(latestCancelRequest ?? null);
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

  const handleOpenRetryPaymentDialog = () => {
    if (!canRetryPaymentInDetail) {
      showToast("Đơn hàng hiện không thể thanh toán lại", "warning");
      return;
    }

    setIsRetryPaymentDialogOpen(true);
  };

  const handleRetryPaymentFromDetail = async () => {
    if (!paymentId) {
      showToast("Không tìm thấy giao dịch thanh toán", "error");
      return;
    }

    try {
      setIsRetryingPayment(true);
      const response = await orderService.retryPayment(
        paymentId,
        selectedRetryPaymentMethod,
      );

      if (
        selectedRetryPaymentMethod === "VnPay" ||
        selectedRetryPaymentMethod === "Momo"
      ) {
        if (!response.url) {
          throw new Error("Không lấy được đường dẫn thanh toán");
        }

        window.location.href = response.url;
        return;
      }

      showToast("Đơn hàng đã được xác nhận!", "success");
      setIsRetryPaymentDialogOpen(false);

      if (orderId) {
        const refreshedOrder = await orderService.getMyOrderById(orderId);
        setOrder(refreshedOrder);
      }
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

  const resetReturnDialogState = () => {
    setReturnReason("");
    setIsRefundOnly(false);
    setReturnNote("");
    setSelectedRefundBank(null);
    setRefundBankName("");
    setRefundAccountNumber("");
    setRefundAccountName("");
    setReturnMediaFiles([]);
    setReturnItemQuantities({});
    setPickupAddressMode(savedAddresses.length ? "saved" : "custom");
    setReturnFormError("");
    setSelectedProvince(null);
    setSelectedDistrict(null);
    setSelectedWard(null);
    setDistricts([]);
    setWards([]);
    setCustomRecipient({
      contactName: "",
      contactPhoneNumber: "",
      fullAddress: "",
    });
  };

  const openReturnRequestDialog = async () => {
    if (hasBlockingReturnRequest) {
      showToast(
        `Đơn hàng này đã có yêu cầu trả hàng. ${returnRequestStatusLabel(orderReturnRequest?.status)}`,
        "info",
      );
      return;
    }

    const currentOrderId = order?.id ?? orderId;
    if (!currentOrderId) {
      return;
    }

    try {
      const myReturnRequests = await orderService.getMyReturnRequests({
        PageNumber: 1,
        PageSize: 100,
        SortBy: "CreatedAt",
        SortOrder: "desc",
      });

      const latestRequest = myReturnRequests.items
        .filter((item) => item.orderId === currentOrderId)
        .sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime(),
        )[0];

      if (latestRequest) {
        setOrderReturnRequest(latestRequest);

        if (RETURN_REQUEST_BLOCKED_STATUSES.has(latestRequest.status ?? "")) {
          showToast(
            `Đơn hàng này đã có yêu cầu trả hàng. ${returnRequestStatusLabel(latestRequest.status)}`,
            "info",
          );
          return;
        }
      }
    } catch {
      // keep local state fallback if this pre-check request fails
    }

    setIsReturnDialogOpen(true);
    setReturnFormError("");
  };

  const openCancelDialog = () => {
    if (hasBlockingCancelRequest) {
      showToast(
        `Đơn hàng này đã có yêu cầu hủy. ${cancelRequestStatusLabel(orderCancelRequest?.status)}`,
        "info",
      );
      return;
    }

    setIsCancelDialogOpen(true);
    setSelectedCancelRefundBank(null);
    setCancelRefundBankName("");
    setCancelRefundAccountNumber("");
    setCancelRefundAccountName("");
  };

  const closeReturnRequestDialog = () => {
    setIsReturnDialogOpen(false);
    resetReturnDialogState();
  };

  const handleReturnImageChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const fileList = Array.from(event.target.files || []).filter((file) =>
      file.type.startsWith("image/"),
    );
    if (!fileList.length) {
      return;
    }

    setReturnMediaFiles((prev) => {
      const existingImages = prev.filter((file) =>
        file.type.startsWith("image/"),
      );
      const existingVideos = prev.filter((file) =>
        file.type.startsWith("video/"),
      );
      const nextImages = [...existingImages, ...fileList];

      return [...nextImages, ...existingVideos];
    });
    event.target.value = "";
  };

  const handleReturnVideoChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const fileList = Array.from(event.target.files || []).filter((file) =>
      file.type.startsWith("video/"),
    );
    if (!fileList.length) {
      return;
    }

    setReturnMediaFiles((prev) => {
      const existingImages = prev.filter((file) =>
        file.type.startsWith("image/"),
      );
      const existingVideos = prev.filter((file) =>
        file.type.startsWith("video/"),
      );
      const nextVideos = [...existingVideos, ...fileList];

      return [...existingImages, ...nextVideos];
    });
    event.target.value = "";
  };

  const handleRemoveReturnMedia = (index: number) => {
    setReturnMediaFiles((prev) =>
      prev.filter((_, currentIndex) => currentIndex !== index),
    );
  };

  const handleReturnQuantityChange = (
    orderDetailId: string,
    max: number,
    value: string,
  ) => {
    const numeric = Number(value);
    const nextValue = Number.isFinite(numeric)
      ? Math.min(Math.max(0, Math.floor(numeric)), max)
      : 0;
    setReturnItemQuantities((prev) => ({
      ...prev,
      [orderDetailId]: nextValue,
    }));
  };

  const handleToggleReturnItem = (orderDetailId: string, max: number) => {
    setReturnItemQuantities((prev) => {
      const current = Math.min(
        Math.max(0, Number(prev[orderDetailId] ?? 0)),
        max,
      );

      return {
        ...prev,
        [orderDetailId]: current > 0 ? 0 : Math.min(1, max),
      };
    });
  };

  const handleIncreaseReturnQuantity = (orderDetailId: string, max: number) => {
    setReturnItemQuantities((prev) => {
      const current = Math.min(
        Math.max(0, Number(prev[orderDetailId] ?? 0)),
        max,
      );
      return {
        ...prev,
        [orderDetailId]: Math.min(max, current + 1),
      };
    });
  };

  const handleDecreaseReturnQuantity = (orderDetailId: string) => {
    setReturnItemQuantities((prev) => {
      const current = Math.max(0, Number(prev[orderDetailId] ?? 0));
      return {
        ...prev,
        [orderDetailId]: Math.max(0, current - 1),
      };
    });
  };

  const handleProvinceChange = async (
    _: unknown,
    newValue: ProvinceResponse | null,
  ) => {
    setSelectedProvince(newValue);
    setSelectedDistrict(null);
    setSelectedWard(null);
    setDistricts([]);
    setWards([]);

    if (!newValue?.ProvinceID) {
      return;
    }

    setIsLoadingDistricts(true);
    try {
      const data = await addressService.getDistricts(newValue.ProvinceID);
      setDistricts(data);
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Không thể tải danh sách quận/huyện",
        "error",
      );
    } finally {
      setIsLoadingDistricts(false);
    }
  };

  const handleDistrictChange = async (
    _: unknown,
    newValue: DistrictResponse | null,
  ) => {
    setSelectedDistrict(newValue);
    setSelectedWard(null);
    setWards([]);

    if (!newValue?.DistrictID) {
      return;
    }

    setIsLoadingWards(true);
    try {
      const data = await addressService.getWards(newValue.DistrictID);
      setWards(data);
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Không thể tải danh sách phường/xã",
        "error",
      );
    } finally {
      setIsLoadingWards(false);
    }
  };

  const handleWardChange = (_: unknown, newValue: WardResponse | null) => {
    setSelectedWard(newValue);
  };

  const handleSyncShippingStatus = async () => {
    if (!orderId) {
      return;
    }

    try {
      setIsSyncingShipping(true);
      await orderService.syncMyShippingStatus();
      const refreshed = await orderService.getMyOrderById(orderId);
      setOrder(refreshed);
      showToast("Đã đồng bộ trạng thái vận chuyển", "success");
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Không thể đồng bộ trạng thái vận chuyển",
        "error",
      );
    } finally {
      setIsSyncingShipping(false);
    }
  };

  const handleSubmitReturnRequest = async () => {
    if (!order?.id) {
      return;
    }

    if (!returnReason) {
      setReturnFormError("Vui lòng chọn lý do trả hàng");
      return;
    }

    if (!selectedReturnItems.length) {
      setReturnFormError(
        "Vui lòng chọn ít nhất 1 sản phẩm và số lượng muốn trả",
      );
      return;
    }

    if (!returnVideoFiles.length) {
      setReturnFormError("Vui lòng tải lên ít nhất 1 video");
      return;
    }

    const trimmedRefundBankName = refundBankName.trim();
    const trimmedRefundAccountNumber = refundAccountNumber.trim();
    const trimmedRefundAccountName = refundAccountName.trim();

    if (
      !trimmedRefundBankName ||
      !trimmedRefundAccountNumber ||
      !trimmedRefundAccountName
    ) {
      setReturnFormError(
        "Vui lòng điền đầy đủ thông tin tài khoản nhận hoàn tiền",
      );
      return;
    }

    let savedAddressId: string | null | undefined = null;
    let recipient: components["schemas"]["ContactAddressInformation"] | null =
      null;

    if (isRefundOnly) {
      savedAddressId = null;
      recipient = null;
    } else if (pickupAddressMode === "saved") {
      if (!selectedSavedAddressId) {
        setReturnFormError("Vui lòng chọn địa chỉ lấy hàng");
        return;
      }
      savedAddressId = selectedSavedAddressId;
    } else {
      if (
        !customRecipient.contactName.trim() ||
        !customRecipient.contactPhoneNumber.trim() ||
        !customRecipient.fullAddress.trim() ||
        !selectedProvince?.ProvinceID ||
        !selectedProvince.ProvinceName ||
        !selectedDistrict?.DistrictID ||
        !selectedDistrict.DistrictName ||
        !selectedWard?.WardCode ||
        !selectedWard.WardName
      ) {
        setReturnFormError("Vui lòng điền đầy đủ địa chỉ lấy hàng");
        return;
      }

      recipient = {
        contactName: customRecipient.contactName.trim(),
        contactPhoneNumber: customRecipient.contactPhoneNumber.trim(),
        fullAddress: customRecipient.fullAddress.trim(),
        provinceId: selectedProvince.ProvinceID,
        provinceName: selectedProvince.ProvinceName,
        districtId: selectedDistrict.DistrictID,
        districtName: selectedDistrict.DistrictName,
        wardCode: selectedWard.WardCode,
        wardName: selectedWard.WardName,
      };
    }

    try {
      setIsSubmittingReturnRequest(true);
      setReturnFormError("");

      const uploadedMedias = returnMediaFiles.length
        ? await orderService.uploadTemporaryReturnMedia(returnMediaFiles)
        : [];
      const temporaryMediaIds = uploadedMedias
        .map((media) => media.id)
        .filter((id): id is string => Boolean(id));

      await orderService.createReturnRequest({
        orderId: order.id,
        reason: returnReason,
        isRefundOnly,
        returnItems: selectedReturnItems.map((entry) => ({
          orderDetailId: entry.orderDetailId,
          quantity: entry.requested,
        })),
        customerNote: returnNote.trim() || null,
        refundBankName: trimmedRefundBankName,
        refundAccountNumber: trimmedRefundAccountNumber,
        refundAccountName: trimmedRefundAccountName,
        savedAddressId,
        recipient,
        temporaryMediaIds: temporaryMediaIds.length ? temporaryMediaIds : null,
      });

      showToast("Đã gửi yêu cầu trả hàng thành công", "success");
      setIsReturnDialogOpen(false);
      resetReturnDialogState();

      if (orderId) {
        try {
          const refreshed = await orderService.getMyOrderById(orderId);
          setOrder(refreshed);
        } catch {
          // Keep the dialog closed even if refresh fails.
        }
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
            <Box sx={{ flex: 1, bgcolor: "background.paper", minWidth: 0 }}>
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
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ letterSpacing: 0.5 }}
                      >
                        MÃ ĐƠN HÀNG:{" "}
                        <b style={{ color: "inherit" }}>
                          {(
                            order.code ||
                            order.id ||
                            orderId ||
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
                      returnShippingStatus={
                        orderReturnRequest?.returnShippingInfo?.status
                      }
                      returnRequestStatus={orderReturnRequest?.status}
                    />
                  </Box>

                  {canRetryPaymentInDetail && (
                    <Alert severity="warning" sx={{ mx: 3, mt: 2 }}>
                      <Stack spacing={0.5}>
                        <Typography variant="body2" fontWeight={600}>
                          Đơn hàng đang chờ xử lý và chưa thanh toán.
                        </Typography>
                        <Typography variant="body2">
                          Bạn có thể thanh toán lại hoặc đổi phương thức thanh
                          toán.
                        </Typography>
                        {isCurrentOnlineMethod && paymentExpiresAtLabel && (
                          <Typography variant="body2" color="error.main">
                            Hạn thanh toán: {paymentExpiresAtLabel}
                          </Typography>
                        )}
                        <Box>
                          <Button
                            size="small"
                            variant="contained"
                            color="warning"
                            onClick={handleOpenRetryPaymentDialog}
                            sx={{ mt: 0.5 }}
                          >
                            Thanh toán lại ngay
                          </Button>
                        </Box>
                      </Stack>
                    </Alert>
                  )}

                  <Box
                    sx={{
                      p: 3,
                      display: "flex",
                      flexDirection: "column",
                      gap: 3,
                    }}
                  >
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
                            <TableRow sx={{ bgcolor: "action.hover" }}>
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

                        {isPendingUnpaid &&
                          isCurrentOnlineMethod &&
                          paymentExpiresAtLabel && (
                            <Box
                              display="flex"
                              justifyContent="space-between"
                              gap={2}
                            >
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Hạn thanh toán
                              </Typography>
                              <Typography
                                variant="body2"
                                fontWeight={600}
                                color="error.main"
                                textAlign="right"
                              >
                                {paymentExpiresAtLabel}
                              </Typography>
                            </Box>
                          )}
                      </Stack>
                    </Paper>

                    {(cancelBehavior ||
                      canRetryPaymentInDetail ||
                      (order.status === "Delivered" && isOrderReturnable)) && (
                      <Box display="flex" justifyContent="flex-end">
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          {canRetryPaymentInDetail && (
                            <Button
                              variant="contained"
                              color="warning"
                              onClick={handleOpenRetryPaymentDialog}
                            >
                              Thanh toán lại
                            </Button>
                          )}

                          {cancelBehavior && (
                            <Tooltip
                              title={
                                hasBlockingCancelRequest
                                  ? cancelRequestStatusLabel(
                                      orderCancelRequest?.status,
                                    )
                                  : ""
                              }
                            >
                              <span>
                                <Button
                                  variant="outlined"
                                  color={
                                    cancelBehavior.mode === "direct"
                                      ? "error"
                                      : "warning"
                                  }
                                  onClick={openCancelDialog}
                                  disabled={hasBlockingCancelRequest}
                                >
                                  {hasBlockingCancelRequest
                                    ? "Đã gửi yêu cầu hủy đơn"
                                    : cancelBehavior.buttonLabel}
                                </Button>
                              </span>
                            </Tooltip>
                          )}

                          {order.status === "Delivered" &&
                            isOrderReturnable && (
                              <Tooltip
                                title={
                                  hasBlockingReturnRequest
                                    ? returnRequestStatusLabel(
                                        orderReturnRequest?.status,
                                      )
                                    : ""
                                }
                              >
                                <span>
                                  <Button
                                    variant="contained"
                                    color="warning"
                                    onClick={openReturnRequestDialog}
                                    disabled={hasBlockingReturnRequest}
                                  >
                                    {hasBlockingReturnRequest
                                      ? "Đã gửi yêu cầu trả hàng"
                                      : "Yêu cầu trả hàng"}
                                  </Button>
                                </span>
                              </Tooltip>
                            )}
                        </Stack>
                      </Box>
                    )}
                  </Box>
                </Box>
              )}
            </Box>
          </Paper>
        </Container>
      </Box>

      <Dialog
        open={isCancelDialogOpen}
        onClose={() => {
          if (isCancelling) return;
          setIsCancelDialogOpen(false);
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
              {CANCEL_ORDER_REASON_OPTIONS.map((option) => {
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
                    freeSolo
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
                    onInputChange={(_, value) => {
                      setCancelRefundBankName(value);
                      if (
                        selectedCancelRefundBank &&
                        getBankDisplayName(selectedCancelRefundBank) !== value
                      ) {
                        setSelectedCancelRefundBank(null);
                      }
                    }}
                    onChange={(_, bank) => {
                      if (!bank) {
                        setSelectedCancelRefundBank(null);
                        return;
                      }

                      if (typeof bank === "string") {
                        setSelectedCancelRefundBank(null);
                        setCancelRefundBankName(bank);
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
              setIsCancelDialogOpen(false);
              setCancelReason("");
              setSelectedCancelRefundBank(null);
              setCancelRefundBankName("");
              setCancelRefundAccountNumber("");
              setCancelRefundAccountName("");
            }}
            disabled={isCancelling}
          >
            Đóng
          </Button>
          <Button
            color={cancelBehavior?.mode === "direct" ? "error" : "warning"}
            variant="contained"
            onClick={handleCancelOrder}
            disabled={isCancelling || !canSubmitCancelRequest}
          >
            {isCancelling
              ? "Đang xử lý..."
              : cancelBehavior?.mode === "direct"
                ? "Xác nhận hủy"
                : "Gửi yêu cầu"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isRetryPaymentDialogOpen}
        onClose={() => {
          if (isRetryingPayment) return;
          setIsRetryPaymentDialogOpen(false);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Thanh toán lại đơn hàng</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              Chọn phương thức thanh toán để tiếp tục.
            </Typography>

            {isCurrentOnlineMethod && paymentExpiresAtLabel && (
              <Alert severity="warning">
                Giao dịch hiện tại sẽ hết hạn lúc <b>{paymentExpiresAtLabel}</b>
                .
              </Alert>
            )}

            <RadioGroup
              value={selectedRetryPaymentMethod}
              onChange={(e) =>
                setSelectedRetryPaymentMethod(e.target.value as PaymentMethod)
              }
            >
              {allowedRetryPaymentMethods.map((method) => (
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
            onClick={() => setIsRetryPaymentDialogOpen(false)}
            disabled={isRetryingPayment}
          >
            Đóng
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleRetryPaymentFromDetail}
            disabled={
              isRetryingPayment ||
              !allowedRetryPaymentMethods.includes(selectedRetryPaymentMethod)
            }
          >
            {isRetryingPayment ? "Đang xử lý..." : "Thanh toán ngay"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isReturnDialogOpen}
        onClose={closeReturnRequestDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Tạo yêu cầu trả hàng</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {returnFormError && (
              <Alert severity="warning">{returnFormError}</Alert>
            )}

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} mb={1.25}>
                1. Chọn sản phẩm và số lượng muốn trả
              </Typography>
              <Stack spacing={1.25}>
                {(order?.orderDetails ?? []).map((item, index) => {
                  const detailId = item.id ?? "";
                  const maxQty = Number(item.quantity ?? 0);
                  const refundableUnitPrice = Number(
                    item.refunablePrice ?? item.unitPrice ?? 0,
                  );
                  const selectedQty = Math.min(
                    maxQty,
                    Math.max(0, Number(returnItemQuantities[detailId] ?? 0)),
                  );
                  const isSelected = selectedQty > 0;

                  return (
                    <Box
                      key={detailId || `${item.variantName}-${index}`}
                      sx={{
                        p: 1.25,
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1.5,
                      }}
                    >
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1.25}
                        justifyContent="space-between"
                        alignItems={{ xs: "flex-start", sm: "center" }}
                      >
                        <Stack
                          direction="row"
                          spacing={1.25}
                          alignItems="center"
                        >
                          <Checkbox
                            checked={isSelected}
                            disabled={!detailId || maxQty <= 0}
                            onChange={() =>
                              handleToggleReturnItem(detailId, maxQty)
                            }
                            icon={<RadioButtonUnchecked />}
                            checkedIcon={<CheckCircle />}
                          />

                          {item.imageUrl ? (
                            <Box
                              component="img"
                              src={item.imageUrl}
                              alt={item.variantName}
                              sx={{
                                width: 52,
                                height: 52,
                                borderRadius: 1,
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <Box
                              sx={{
                                width: 52,
                                height: 52,
                                borderRadius: 1,
                                bgcolor: "grey.100",
                              }}
                            />
                          )}
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {item.variantName}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Đã mua: {maxQty}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                            >
                              Đơn giá hoàn tiền: {fmt(refundableUnitPrice)}
                            </Typography>
                          </Box>
                        </Stack>

                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={0.75}
                          sx={{ width: { xs: "100%", sm: "auto" } }}
                        >
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ minWidth: 72 }}
                          >
                            Số lượng trả
                          </Typography>

                          <IconButton
                            size="small"
                            onClick={() =>
                              handleDecreaseReturnQuantity(detailId)
                            }
                            disabled={!detailId || selectedQty <= 0}
                            sx={{ border: "1px solid", borderColor: "divider" }}
                          >
                            <Remove fontSize="small" />
                          </IconButton>

                          <TextField
                            size="small"
                            type="number"
                            value={selectedQty}
                            onChange={(e) =>
                              handleReturnQuantityChange(
                                detailId,
                                maxQty,
                                e.target.value,
                              )
                            }
                            disabled={!detailId}
                            inputProps={{
                              min: 0,
                              max: maxQty,
                              style: { textAlign: "center" },
                            }}
                            sx={{ width: 90 }}
                          />

                          <IconButton
                            size="small"
                            onClick={() =>
                              handleIncreaseReturnQuantity(detailId, maxQty)
                            }
                            disabled={!detailId || selectedQty >= maxQty}
                            sx={{ border: "1px solid", borderColor: "divider" }}
                          >
                            <Add fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>

              <Divider sx={{ my: 1.5 }} />
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="body2" color="text.secondary">
                  Tạm tính hoàn tiền
                </Typography>
                <Typography
                  variant="subtitle1"
                  fontWeight={700}
                  color="#ee4d2d"
                >
                  {fmt(estimatedRefundAmount)}
                </Typography>
              </Box>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>
                2. Lý do trả hàng
              </Typography>
              <RadioGroup
                value={returnReason}
                onChange={(e) =>
                  setReturnReason(e.target.value as ReturnOrderReason)
                }
              >
                {RETURN_REASON_OPTIONS.map((option) => (
                  <FormControlLabel
                    key={option.value}
                    value={option.value}
                    control={<Radio />}
                    label={option.label}
                  />
                ))}
              </RadioGroup>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>
                3. Phương án giải quyết
              </Typography>
              <RadioGroup
                value={isRefundOnly ? "refund-only" : "return-and-refund"}
                onChange={(e) =>
                  setIsRefundOnly(e.target.value === "refund-only")
                }
              >
                <FormControlLabel
                  value="return-and-refund"
                  control={<Radio />}
                  label="Trả hàng & Hoàn tiền"
                />
                <FormControlLabel
                  value="refund-only"
                  control={<Radio />}
                  label="Hoàn tiền (Không trả hàng)"
                />
              </RadioGroup>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>
                4. Mô tả thêm và bằng chứng (ảnh/video)
              </Typography>
              <Stack spacing={1.25}>
                <TextField
                  label="Mô tả thêm (tuỳ chọn)"
                  value={returnNote}
                  onChange={(e) => setReturnNote(e.target.value)}
                  fullWidth
                  multiline
                  minRows={3}
                />
                <Stack direction="row" spacing={1.5}>
                  <Box
                    component="label"
                    sx={{
                      border: "1px dashed",
                      borderColor: "divider",
                      borderRadius: 2,
                      p: 1.5,
                      width: 164,
                      textAlign: "center",
                      cursor: "pointer",
                      bgcolor: "#fafafa",
                    }}
                  >
                    <PhotoCameraOutlined sx={{ color: "text.secondary" }} />
                    <Typography variant="body2" mt={0.5}>
                      Thêm Hình ảnh
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {returnImageFiles.length}
                    </Typography>
                    <input
                      hidden
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleReturnImageChange}
                    />
                  </Box>

                  <Box
                    component="label"
                    sx={{
                      border: "1px dashed",
                      borderColor: "divider",
                      borderRadius: 2,
                      p: 1.5,
                      width: 164,
                      textAlign: "center",
                      cursor: "pointer",
                      bgcolor: "#fafafa",
                    }}
                  >
                    <VideocamOutlined sx={{ color: "text.secondary" }} />
                    <Typography variant="body2" mt={0.5}>
                      Thêm Video
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {returnVideoFiles.length}
                    </Typography>
                    <input
                      hidden
                      type="file"
                      accept="video/*"
                      onChange={handleReturnVideoChange}
                    />
                  </Box>
                </Stack>

                {!!returnMediaPreviews.length && (
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {returnMediaPreviews.map((preview) => (
                      <Box
                        key={`${preview.name}-${preview.index}`}
                        sx={{
                          position: "relative",
                          width: 100,
                          height: 100,
                          borderRadius: 1.5,
                          overflow: "hidden",
                          border: "2px solid",
                          borderColor: "divider",
                          bgcolor: "grey.100",
                        }}
                      >
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveReturnMedia(preview.index)}
                          sx={{
                            position: "absolute",
                            top: 4,
                            right: 4,
                            zIndex: 2,
                            bgcolor: "rgba(0,0,0,0.6)",
                            color: "white",
                            "&:hover": {
                              bgcolor: "rgba(0,0,0,0.8)",
                            },
                          }}
                        >
                          <DeleteOutline fontSize="small" />
                        </IconButton>

                        {preview.isVideo ? (
                          <>
                            <Box
                              component="video"
                              src={preview.url}
                              muted
                              playsInline
                              preload="metadata"
                              sx={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                display: "block",
                              }}
                            />
                            <PlayCircleOutline
                              sx={{
                                fontSize: 36,
                                color: "common.white",
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                transform: "translate(-50%, -50%)",
                              }}
                            />
                          </>
                        ) : (
                          <Box
                            component="img"
                            src={preview.url}
                            alt={preview.name}
                            sx={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                        )}
                      </Box>
                    ))}
                  </Stack>
                )}
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>
                Thông tin tài khoản nhận hoàn tiền
              </Typography>
              <Stack spacing={1.25}>
                <Alert severity="info" sx={{ mb: 0.5 }}>
                  Vui lòng nhập chính xác thông tin tài khoản để hệ thống hỗ trợ
                  hoàn tiền linh hoạt khi cần chuyển khoản thủ công hoặc cổng
                  hoàn tiền tự động gặp lỗi.
                </Alert>
                <Autocomplete
                  options={vietQrBanks}
                  freeSolo
                  value={selectedRefundBank}
                  inputValue={refundBankName}
                  loading={isLoadingVietQrBanks}
                  getOptionLabel={(option) =>
                    typeof option === "string"
                      ? option
                      : getBankDisplayName(option)
                  }
                  isOptionEqualToValue={(option, value) =>
                    option.id === value.id
                  }
                  onInputChange={(_, value) => {
                    setRefundBankName(value);
                    if (
                      selectedRefundBank &&
                      getBankDisplayName(selectedRefundBank) !== value
                    ) {
                      setSelectedRefundBank(null);
                    }
                  }}
                  onChange={(_, bank) => {
                    if (!bank) {
                      setSelectedRefundBank(null);
                      return;
                    }

                    if (typeof bank === "string") {
                      setSelectedRefundBank(null);
                      setRefundBankName(bank);
                      return;
                    }

                    setSelectedRefundBank(bank);
                    setRefundBankName(getBankDisplayName(bank));
                  }}
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
                      <Stack direction="row" spacing={1.25} alignItems="center">
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
                          <Typography variant="caption" color="text.secondary">
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
                        vietQrBankError || "Chọn ngân hàng từ danh sách VietQR"
                      }
                    />
                  )}
                />
                <TextField
                  label="Số tài khoản *"
                  value={refundAccountNumber}
                  onChange={(e) =>
                    setRefundAccountNumber(
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
                  value={refundAccountName}
                  onChange={(e) =>
                    setRefundAccountName(
                      normalizeRefundAccountName(e.target.value),
                    )
                  }
                  fullWidth
                  size="small"
                  inputProps={{
                    autoCapitalize: "characters",
                  }}
                  helperText="Tự động viết HOA, không dấu, không ký tự đặc biệt"
                />
              </Stack>
            </Paper>

            {!isRefundOnly && (
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle2" fontWeight={700} mb={1}>
                  5. Địa chỉ lấy hàng
                </Typography>
                <Stack spacing={1.25}>
                  <RadioGroup
                    row
                    value={pickupAddressMode}
                    onChange={(e) =>
                      setPickupAddressMode(e.target.value as "saved" | "custom")
                    }
                  >
                    <FormControlLabel
                      value="saved"
                      control={<Radio />}
                      label="Chọn địa chỉ hiện có"
                    />
                    <FormControlLabel
                      value="custom"
                      control={<Radio />}
                      label="Nhập địa chỉ mới"
                    />
                  </RadioGroup>

                  {pickupAddressMode === "saved" ? (
                    <>
                      {isLoadingAddresses ? (
                        <CircularProgress size={20} />
                      ) : (
                        <Select
                          fullWidth
                          size="small"
                          value={selectedSavedAddressId}
                          onChange={(e) =>
                            setSelectedSavedAddressId(e.target.value)
                          }
                          displayEmpty
                        >
                          <MenuItem value="" disabled>
                            Chọn địa chỉ lấy hàng
                          </MenuItem>
                          {savedAddresses.map((address) => (
                            <MenuItem key={address.id} value={address.id || ""}>
                              {`${address.recipientName} | ${address.recipientPhoneNumber} | ${address.street}, ${address.ward}, ${address.district}, ${address.city}`}
                            </MenuItem>
                          ))}
                        </Select>
                      )}
                    </>
                  ) : (
                    <Stack spacing={1.25}>
                      <TextField
                        label="Tên liên hệ *"
                        size="small"
                        value={customRecipient.contactName}
                        onChange={(e) =>
                          setCustomRecipient((prev) => ({
                            ...prev,
                            contactName: e.target.value,
                          }))
                        }
                      />
                      <TextField
                        label="Số điện thoại *"
                        size="small"
                        value={customRecipient.contactPhoneNumber}
                        onChange={(e) =>
                          setCustomRecipient((prev) => ({
                            ...prev,
                            contactPhoneNumber: e.target.value,
                          }))
                        }
                      />
                      <Autocomplete
                        options={provinces}
                        value={selectedProvince}
                        loading={isLoadingProvinces}
                        getOptionLabel={(option) => option.ProvinceName || ""}
                        onChange={handleProvinceChange}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Tỉnh/Thành phố *"
                            size="small"
                          />
                        )}
                      />
                      <Autocomplete
                        options={districts}
                        value={selectedDistrict}
                        loading={isLoadingDistricts}
                        disabled={!selectedProvince}
                        getOptionLabel={(option) => option.DistrictName || ""}
                        onChange={handleDistrictChange}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Quận/Huyện *"
                            size="small"
                          />
                        )}
                      />
                      <Autocomplete
                        options={wards}
                        value={selectedWard}
                        loading={isLoadingWards}
                        disabled={!selectedDistrict}
                        getOptionLabel={(option) => option.WardName || ""}
                        onChange={handleWardChange}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Phường/Xã *"
                            size="small"
                          />
                        )}
                      />
                      <TextField
                        label="Số nhà, tên đường *"
                        size="small"
                        value={customRecipient.fullAddress}
                        onChange={(e) =>
                          setCustomRecipient((prev) => ({
                            ...prev,
                            fullAddress: e.target.value,
                          }))
                        }
                      />
                    </Stack>
                  )}
                </Stack>
              </Paper>
            )}
          </Stack>
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
          <Button
            onClick={closeReturnRequestDialog}
            disabled={isSubmittingReturnRequest}
          >
            Đóng
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleSubmitReturnRequest}
            disabled={isSubmittingReturnRequest || !canSubmitReturnRequest}
          >
            {isSubmittingReturnRequest ? "Đang gửi..." : "Gửi yêu cầu"}
          </Button>
        </DialogActions>
      </Dialog>

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
          setIsReviewDialogOpen(false);
          setReviewDialogTarget(null);
          setSelectedReview(null);
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
