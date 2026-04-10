import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import {
  Add,
  CheckCircleRounded,
  Delete,
  OpenInNew,
  Remove,
  Search,
  Print as PrintIcon,
} from "@mui/icons-material";
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
  FormControlLabel,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  MenuItem,
  Radio,
  RadioGroup,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { QRCodeSVG } from "qrcode.react";
import { BatchSelectionModal } from "@/components/checkout/BatchSelectionModal";
import { ReceiptTemplate } from "@/components/checkout/ReceiptTemplate";
import { useDebounce } from "@/hooks/useDebounce";
import { useGlobalBarcodeScanner } from "@/hooks/useGlobalBarcodeScanner";
import { POS_HUB_URL, useSignalR } from "@/hooks/useSignalR";
import { useToast } from "@/hooks/useToast";
import { MainLayout } from "@/layouts/MainLayout";
import {
  posService,
  type PosBatchDetail,
  type PosCustomerForLookup,
  type PosPreviewRequest,
  type PosPreviewResponse,
  type PosProductVariant,
} from "@/services/posService";

import { orderService, type OrderInvoice } from "@/services/orderService";
import { addressService } from "@/services/addressService";
import type {
  CreateInStoreOrderRequest,
  PaymentMethod,
} from "@/types/checkout";
import { STAFF_CANCEL_ORDER_REASON_OPTIONS } from "@/utils/cancelOrderReason";
import type { CancelOrderReason } from "@/services/orderService";
import type {
  DistrictResponse,
  ProvinceResponse,
  WardResponse,
} from "@/types/address";
import storeIcon from "@/assets/store.png";
import codIcon from "@/assets/cod.png";
import vnpayIcon from "@/assets/vnpay.jpg";
import momoIcon from "@/assets/momo.png";
import transferIcon from "@/assets/transfer.png";
import payOsIcon from "@/assets/payos.png";

const formatCurrency = (value?: number) =>
  `${new Intl.NumberFormat("vi-VN").format(Number(value ?? 0))}đ`;

const panelSx = {
  p: 3,
  borderRadius: 3,
  border: "1px solid",
  borderColor: "divider",
  boxShadow: "0 8px 30px rgba(15, 23, 42, 0.06)",
  bgcolor: "background.paper",
};

const PICKUP_PAYMENT_METHODS: PaymentMethod[] = [
  "CashInStore",
  "VnPay",
  "Momo",
  "PayOs",
];
const DELIVERY_PAYMENT_METHODS: PaymentMethod[] = [
  "CashOnDelivery",
  "VnPay",
  "Momo",
  "PayOs",
];

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  CashOnDelivery: "Thanh toán khi nhận hàng",
  VnPay: "VNPay",
  Momo: "MoMo",
  CashInStore: "Tiền mặt tại quầy",
  ExternalBankTransfer: "Chuyển khoản",
  PayOs: "PayOS",
};

const PAYMENT_METHOD_ICON: Partial<Record<PaymentMethod, string>> = {
  CashInStore: storeIcon,
  CashOnDelivery: codIcon,
  VnPay: vnpayIcon,
  Momo: momoIcon,
  ExternalBankTransfer: transferIcon,
  PayOs: payOsIcon,
};

interface PosCartItem {
  key: string;
  variantId: string;
  variantName: string;
  sku: string;
  barcode: string;
  imageUrl?: string | null;
  unitPrice: number;
  batchId?: string;
  batchCode: string;
  maxQuantity: number;
  quantity: number;
}

interface GroupedCartItem {
  groupKey: string;
  variantId: string;
  variantName: string;
  sku: string;
  barcode: string;
  imageUrl?: string | null;
  unitPrice: number;
  totalQuantity: number;
  batchItems: PosCartItem[];
}

type BatchModalMode = "add" | "switch";

const getVariantKey = (variant: PosProductVariant) =>
  variant.id || `${variant.sku}-${variant.barcode}`;

const EMPTY_GUID = "00000000-0000-0000-0000-000000000000";
const GUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const POS_SESSION_ID = "COUNTER_01";

type CartDisplaySyncItem = {
  variantId: string;
  batchId: string;
  variantName: string;
  batchCode: string;
  imageUrl: string;
  quantity: number;
  unitPrice: number;
  subTotal: number;
  discount: number;
  finalTotal: number;
};

type CartDisplaySyncPayload = {
  items: CartDisplaySyncItem[];
  subTotal: number;
  discount: number;
  totalPrice: number;
  paymentUrl?: string | null;
};

type FailedPaymentAction = {
  orderId: string;
  paymentId?: string;
  message: string;
};

const toGuidOrEmpty = (value?: string | null) => {
  const raw = (value || "").trim();
  return GUID_REGEX.test(raw) ? raw : EMPTY_GUID;
};

const toSafeNumber = (value: unknown) => {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
};

const isHttpUrl = (value?: string | null) =>
  /^https?:\/\//i.test((value || "").trim());

const extractPaymentIdFromRetryUrl = (url?: string) => {
  const raw = (url || "").trim();
  if (!raw || !isHttpUrl(raw)) return "";

  try {
    const parsed = new URL(raw);
    const candidates = [
      parsed.searchParams.get("paymentId"),
      parsed.searchParams.get("PaymentId"),
      parsed.searchParams.get("orderId"),
      parsed.searchParams.get("OrderId"),
      parsed.searchParams.get("txnRef"),
      parsed.searchParams.get("TxnRef"),
      parsed.searchParams.get("vnp_TxnRef"),
    ];

    const matched = candidates
      .map((value) => (value || "").trim())
      .find((value) => GUID_REGEX.test(value));

    return matched || "";
  } catch {
    return "";
  }
};

const createDebugCallId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const CounterCheckoutStaffPage = () => {
  const { showToast } = useToast();
  const {
    syncCartToCustomer,
    paymentCompletedData,
    paymentFailedData,
    paymentLinkUpdatedData,
    notifyPaymentSuccess,
    clearPaymentSignalREvents,
  } = useSignalR<PosPreviewResponse>({
    hubUrl: POS_HUB_URL,
    sessionId: POS_SESSION_ID,
  });

  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchResults, setSearchResults] = useState<PosProductVariant[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [selectedVariant, setSelectedVariant] =
    useState<PosProductVariant | null>(null);
  const [editingCartItemKey, setEditingCartItemKey] = useState<string | null>(
    null,
  );
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);
  const [batchOptions, setBatchOptions] = useState<PosBatchDetail[]>([]);
  const [batchModalMode, setBatchModalMode] = useState<BatchModalMode>("add");
  const [modalCurrentBatchCode, setModalCurrentBatchCode] = useState<
    string | undefined
  >(undefined);

  const [voucherInput, setVoucherInput] = useState("");
  const [appliedVoucherCode, setAppliedVoucherCode] = useState("");
  const [cartItems, setCartItems] = useState<PosCartItem[]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [previewData, setPreviewData] = useState<PosPreviewResponse | null>(
    null,
  );

  const [isPickupInStore, setIsPickupInStore] = useState(true);
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("CashInStore");
  const [customerLookupKeyword, setCustomerLookupKeyword] = useState("");
  const [customerLookupResults, setCustomerLookupResults] = useState<
    PosCustomerForLookup[]
  >([]);
  const [selectedCustomer, setSelectedCustomer] =
    useState<PosCustomerForLookup | null>(null);
  const [isLookingUpCustomer, setIsLookingUpCustomer] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [provinces, setProvinces] = useState<ProvinceResponse[]>([]);
  const [districts, setDistricts] = useState<DistrictResponse[]>([]);
  const [wards, setWards] = useState<WardResponse[]>([]);
  const [selectedProvince, setSelectedProvince] =
    useState<ProvinceResponse | null>(null);
  const [selectedDistrict, setSelectedDistrict] =
    useState<DistrictResponse | null>(null);
  const [selectedWard, setSelectedWard] = useState<WardResponse | null>(null);
  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);
  const [isLoadingWards, setIsLoadingWards] = useState(false);
  const [isSubmittingCheckout, setIsSubmittingCheckout] = useState(false);
  const [isCheckoutConfirmOpen, setIsCheckoutConfirmOpen] = useState(false);
  const [paymentQrUrl, setPaymentQrUrl] = useState<string | null>(null);
  const paymentQrUrlRef = useRef<string | null>(null);
  const handledPaymentEventsRef = useRef<Set<string>>(new Set());
  const handledPaymentFailedEventRef = useRef<string>("");
  const lastPaidOrderIdRef = useRef<string>("");
  const latestRetryOrderIdRef = useRef<string>("");
  const latestRetryPaymentIdRef = useRef<string>("");
  // Flag to prevent processing failed events during retry operation
  const isRetryInProgressRef = useRef(false);
  const syncCartToCustomerRef = useRef(syncCartToCustomer);
  const [failedPaymentAction, setFailedPaymentAction] =
    useState<FailedPaymentAction | null>(null);
  const [isRetryingPayment, setIsRetryingPayment] = useState(false);
  const [isStaffCancelDialogOpen, setIsStaffCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState<CancelOrderReason | "">("");
  const [cancelNote, setCancelNote] = useState("");
  const [isCancellingOrder, setIsCancellingOrder] = useState(false);

  // Cash Payment Dialog states
  const [isCashPaymentDialogOpen, setIsCashPaymentDialogOpen] = useState(false);
  const [cashReceived, setCashReceived] = useState("");
  const [pendingCheckoutPayload, setPendingCheckoutPayload] =
    useState<CreateInStoreOrderRequest | null>(null);
  const [cashDialogMode, setCashDialogMode] = useState<"checkout" | "retry">(
    "checkout",
  );

  // Handler cho numpad
  const handleNumpadClick = useCallback((value: string) => {
    setCashReceived((prev) => {
      if (value === "C") return "";
      if (value === "⌫") return prev.slice(0, -1);

      // Chỉ cho nhập số
      if (!/^\d+$/.test(value)) return prev;

      const newValue = prev + value;
      // Giới hạn 15 chữ số
      if (newValue.length > 15) return prev;

      return newValue;
    });
  }, []);

  // Success & Print Dialog states
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);
  const [orderInvoice, setOrderInvoice] = useState<OrderInvoice | null>(null);
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);
  const previewDataRef = useRef<PosPreviewResponse | null>(null);
  const cartItemsRef = useRef<PosCartItem[]>([]);
  const openSuccessDialogRef = useRef<(orderId: string) => Promise<void>>(
    async () => {
      // initialized in effect below
    },
  );
  // Refs for cart sync callbacks to avoid re-triggering SignalR effects
  const toCartDisplaySyncPayloadRef = useRef<
    (data: PosPreviewResponse) => CartDisplaySyncPayload
  >(() => ({
    items: [],
    subTotal: 0,
    discount: 0,
    totalPrice: 0,
    paymentUrl: null,
  }));
  const toFallbackCartDisplaySyncPayloadRef = useRef<
    () => CartDisplaySyncPayload
  >(() => ({
    items: [],
    subTotal: 0,
    discount: 0,
    totalPrice: 0,
    paymentUrl: null,
  }));
  // Ref for failedPaymentAction to avoid dependency in SignalR effects
  const failedPaymentActionRef = useRef<FailedPaymentAction | null>(null);

  const totalQuantityInCart = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [cartItems],
  );

  const paymentMethodsByMode = isPickupInStore
    ? PICKUP_PAYMENT_METHODS
    : DELIVERY_PAYMENT_METHODS;

  const selectablePaymentMethods = useMemo(
    () =>
      paymentMethodsByMode.filter(
        (method) => method !== "ExternalBankTransfer",
      ),
    [paymentMethodsByMode],
  );

  const cashChangeAmount = useMemo(() => {
    const total = pendingCheckoutPayload?.expectedTotalPrice ?? 0;
    const received = Number(cashReceived) || 0;
    return Math.max(0, received - total);
  }, [cashReceived, pendingCheckoutPayload?.expectedTotalPrice]);

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `Hoa-don-${successOrderId || "ORDER"}`,
  });

  const loadOrderInvoice = useCallback(
    async (orderId: string) => {
      try {
        setIsLoadingInvoice(true);
        const invoice = await orderService.getOrderInvoice(orderId);
        setOrderInvoice(invoice);
      } catch (error) {
        showToast(
          error instanceof Error ? error.message : "Không thể tải hóa đơn",
          "error",
        );
      } finally {
        setIsLoadingInvoice(false);
      }
    },
    [showToast],
  );

  const openSuccessDialog = useCallback(
    async (orderId: string) => {
      // Tránh mở dialog nhiều lần cho cùng orderId
      if (isSuccessDialogOpen && successOrderId === orderId) {
        return;
      }

      setSuccessOrderId(orderId);
      setIsSuccessDialogOpen(true);
      await loadOrderInvoice(orderId);

      // Auto print sau 500ms
      setTimeout(() => {
        if (receiptRef.current) {
          handlePrint();
        }
      }, 500);
    },
    [handlePrint, loadOrderInvoice, isSuccessDialogOpen, successOrderId],
  );

  useEffect(() => {
    openSuccessDialogRef.current = openSuccessDialog;
  }, [openSuccessDialog]);

  const handleStartNewCustomer = useCallback(() => {
    // CHỈ KHI bấm "Đóng & Đón khách mới" mới clear cart và customer display
    setCartItems([]);
    setSearchResults([]);
    setSearchKeyword("");
    setVoucherInput("");
    setAppliedVoucherCode("");
    setCustomerLookupKeyword("");
    setCustomerLookupResults([]);
    setSelectedCustomer(null);
    setRecipientName("");
    setRecipientPhone("");
    setStreetAddress("");
    setSelectedProvince(null);
    setSelectedDistrict(null);
    setSelectedWard(null);
    setDistricts([]);
    setWards([]);
    handleClearSelectedCustomer();

    setIsSuccessDialogOpen(false);
    setSuccessOrderId(null);
    setOrderInvoice(null);

    // Clear payment states
    paymentQrUrlRef.current = null;
    setPaymentQrUrl(null);
    setFailedPaymentAction(null);
    handledPaymentFailedEventRef.current = "";
    latestRetryOrderIdRef.current = "";
    latestRetryPaymentIdRef.current = "";
    lastPaidOrderIdRef.current = "";
    isRetryInProgressRef.current = false;
    clearPaymentSignalREvents();

    // Clear customer display ONLY when closing dialog
    void syncCartToCustomerRef.current({
      items: [],
      subTotal: 0,
      discount: 0,
      totalPrice: 0,
      paymentUrl: null,
    } satisfies CartDisplaySyncPayload);
  }, [clearPaymentSignalREvents]);

  const handleCashPaymentConfirm = useCallback(async () => {
    if (!pendingCheckoutPayload) return;

    const total = pendingCheckoutPayload.expectedTotalPrice ?? 0;
    const received = Number(cashReceived) || 0;

    if (received < total) {
      showToast("Số tiền nhận chưa đủ", "warning");
      return;
    }

    try {
      setIsSubmittingCheckout(true);
      setIsCashPaymentDialogOpen(false);

      // Mode retry: Gọi retry payment thay vì checkout mới
      if (cashDialogMode === "retry") {
        if (!failedPaymentAction?.paymentId) {
          showToast("Không tìm thấy paymentId để retry", "warning");
          return;
        }

        const retryCallId = createDebugCallId("pos-retry");

        const result = await orderService.retryPayment(
          failedPaymentAction.paymentId,
          "CashInStore",
        );

        const paymentIdFromRetryResponse = (result.paymentId || "").trim();
        const paymentIdFromRetryUrl = extractPaymentIdFromRetryUrl(result.url);
        const paymentIdForRetry =
          paymentIdFromRetryResponse ||
          paymentIdFromRetryUrl ||
          failedPaymentAction.paymentId;

        await orderService.confirmPayment(
          paymentIdForRetry,
          true,
          undefined,
        );

        // Clear payment failed states
        paymentQrUrlRef.current = null;
        setPaymentQrUrl(null);
        lastPaidOrderIdRef.current = failedPaymentAction.orderId;
        setFailedPaymentAction(null);

        // Mở success dialog - KHÔNG clear cart, để handleStartNewCustomer xử lý
        showToast("Đã xác nhận thanh toán tiền mặt", "success");
        void openSuccessDialog(failedPaymentAction.orderId);
        void notifyPaymentSuccess({
          orderId: failedPaymentAction.orderId,
          paymentId: paymentIdForRetry,
          status: "Success",
          message: "Thanh toán thành công",
        }).catch((error) => {
          console.error("[POS][CashRetry] notifyPaymentSuccess failed", error);
        });

        setCashReceived("");
        setPendingCheckoutPayload(null);
        setIsCashPaymentDialogOpen(false);
        return;
      }

      // Mode checkout: Tạo order mới
      const result = await orderService.checkoutInStore(pendingCheckoutPayload);

      // Lấy paymentId để confirm payment và orderId để in hóa đơn
      const paymentIdForConfirm = (
        result.paymentId ||
        result.orderId ||
        ""
      ).trim();
      const orderIdForInvoice = (result.orderId || "").trim();

      if (!paymentIdForConfirm) {
        showToast(
          "Checkout thành công nhưng thiếu payment/order ID",
          "warning",
        );
        return;
      }

      if (!orderIdForInvoice) {
        showToast(
          "Checkout thành công nhưng thiếu orderId để in hóa đơn",
          "warning",
        );
        return;
      }

      await orderService.confirmPayment(paymentIdForConfirm, true);

      // Mở success dialog với orderId để in hóa đơn
      showToast("Thanh toán tiền mặt thành công!", "success");
      void openSuccessDialog(orderIdForInvoice);
      void notifyPaymentSuccess({
        orderId: orderIdForInvoice,
        paymentId: paymentIdForConfirm,
        status: "Success",
        message: "Thanh toán thành công",
      }).catch((error) => {
        console.error("[POS][CashCheckout] notifyPaymentSuccess failed", error);
      });

      // Reset cash payment states
      setCashReceived("");
      setPendingCheckoutPayload(null);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Thanh toán thất bại",
        "error",
      );
    } finally {
      setIsSubmittingCheckout(false);
    }
  }, [
    pendingCheckoutPayload,
    cashReceived,
    cashDialogMode,
    failedPaymentAction,
    notifyPaymentSuccess,
    showToast,
    openSuccessDialog,
  ]);

  useEffect(() => {
    if (!selectablePaymentMethods.some((method) => method === paymentMethod)) {
      setPaymentMethod(selectablePaymentMethods[0] ?? "CashInStore");
    }
  }, [paymentMethod, selectablePaymentMethods]);

  useEffect(() => {
    paymentQrUrlRef.current = paymentQrUrl;
  }, [paymentQrUrl]);

  useEffect(() => {
    previewDataRef.current = previewData;
  }, [previewData]);

  useEffect(() => {
    cartItemsRef.current = cartItems;
  }, [cartItems]);

  useEffect(() => {
    syncCartToCustomerRef.current = syncCartToCustomer;
  }, [syncCartToCustomer]);

  useEffect(() => {
    if (!paymentCompletedData) return;

    // Hỗ trợ cả camelCase lẫn PascalCase từ backend C#
    const rawStatus =
      paymentCompletedData.status ||
      (paymentCompletedData as { Status?: string }).Status ||
      "";
    const rawOrderId =
      paymentCompletedData.orderId ||
      (paymentCompletedData as { OrderId?: string }).OrderId ||
      "";
    const rawPaymentId =
      paymentCompletedData.paymentId ||
      (paymentCompletedData as { PaymentId?: string }).PaymentId ||
      "";

    const status = rawStatus.toLowerCase();
    if (status !== "success" && status !== "paid" && status !== "completed") {
      return;
    }

    if (!rawOrderId) {
      return;
    }

    const eventKey = `${rawOrderId}:${rawPaymentId}:${status}`;

    if (handledPaymentEventsRef.current.has(eventKey)) {
      return;
    }

    handledPaymentEventsRef.current.add(eventKey);

    paymentQrUrlRef.current = null;
    setPaymentQrUrl(null);
    lastPaidOrderIdRef.current = rawOrderId;

    setFailedPaymentAction(null);

    // Clear QR khỏi customer display - giữ cart nhưng xóa QR
    // Inline sync để tránh dependency issue
    const preview = previewDataRef.current;
    const currentCartItems = cartItemsRef.current;

    if (preview) {
      const mappedItems = currentCartItems.map((cartItem) => {
        const matchedPreviewItem = preview.items?.find(
          (previewItem) =>
            previewItem.batchCode === cartItem.batchCode &&
            (previewItem.variantId === cartItem.variantId ||
              previewItem.variantName === cartItem.variantName),
        );

        const unitPrice = toSafeNumber(
          matchedPreviewItem?.unitPrice ?? cartItem.unitPrice,
        );
        const subTotal = toSafeNumber(
          matchedPreviewItem?.subTotal ?? unitPrice * cartItem.quantity,
        );
        const discount = toSafeNumber(matchedPreviewItem?.discount ?? 0);
        const finalTotal = toSafeNumber(
          matchedPreviewItem?.finalTotal ?? subTotal - discount,
        );

        return {
          variantId: toGuidOrEmpty(cartItem.variantId),
          batchId: toGuidOrEmpty(cartItem.batchId),
          variantName: cartItem.variantName,
          batchCode: cartItem.batchCode,
          imageUrl: cartItem.imageUrl || "",
          quantity: Math.max(0, Number(cartItem.quantity || 0)),
          unitPrice,
          subTotal,
          discount,
          finalTotal,
        };
      });

      void syncCartToCustomerRef.current({
        items: mappedItems,
        subTotal: toSafeNumber(preview.subTotal),
        discount: toSafeNumber(preview.discount),
        totalPrice: toSafeNumber(preview.totalPrice),
        paymentUrl: null, // Clear QR
      });
    } else {
      const mappedItems = currentCartItems.map((item) => {
        const subTotal = toSafeNumber(item.unitPrice * item.quantity);
        return {
          variantId: toGuidOrEmpty(item.variantId),
          batchId: toGuidOrEmpty(item.batchId),
          variantName: item.variantName,
          batchCode: item.batchCode,
          imageUrl: item.imageUrl || "",
          quantity: Math.max(0, Number(item.quantity || 0)),
          unitPrice: toSafeNumber(item.unitPrice),
          subTotal,
          discount: 0,
          finalTotal: subTotal,
        };
      });

      const fallbackSubTotal = mappedItems.reduce(
        (sum, item) => sum + item.subTotal,
        0,
      );
      const fallbackTotal = mappedItems.reduce(
        (sum, item) => sum + item.finalTotal,
        0,
      );

      void syncCartToCustomerRef.current({
        items: mappedItems,
        subTotal: toSafeNumber(fallbackSubTotal),
        discount: 0,
        totalPrice: toSafeNumber(fallbackTotal),
        paymentUrl: null,
      });
    }

    // Mở Success Dialog thay vì clear cart ngay
    void openSuccessDialogRef.current(rawOrderId);
  }, [paymentCompletedData]);

  const openStaffCancelDialog = () => {
    if (!failedPaymentAction?.orderId) {
      showToast("Không tìm thấy đơn hàng để hủy", "warning");
      return;
    }

    setCancelReason("");
    setCancelNote("");
    setIsStaffCancelDialogOpen(true);
  };

  const handleStaffCancelFailedOrder = async () => {
    if (!failedPaymentAction?.orderId) {
      showToast("Không tìm thấy đơn hàng để hủy", "warning");
      return;
    }

    if (!cancelReason) {
      showToast("Vui lòng chọn lý do hủy", "warning");
      return;
    }

    try {
      setIsCancellingOrder(true);
      await orderService.staffCancelOrder(
        failedPaymentAction.orderId,
        cancelReason,
        cancelNote.trim() || undefined,
      );
      setIsStaffCancelDialogOpen(false);
      setFailedPaymentAction(null);
      paymentQrUrlRef.current = null;
      setPaymentQrUrl(null);
      showToast("Đã hủy đơn hàng", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Không thể hủy đơn hàng",
        "error",
      );
    } finally {
      setIsCancellingOrder(false);
    }
  };

  const validateCheckoutInputs = () => {
    if (cartItems.length === 0) {
      showToast("Vui lòng thêm sản phẩm trước khi checkout", "warning");
      return false;
    }

    if (!isPickupInStore) {
      if (
        !recipientName.trim() ||
        !recipientPhone.trim() ||
        !streetAddress.trim()
      ) {
        showToast("Vui lòng điền đầy đủ thông tin người nhận", "warning");
        return false;
      }

      if (!selectedProvince || !selectedDistrict || !selectedWard) {
        showToast("Vui lòng chọn đầy đủ tỉnh/quận/phường", "warning");
        return false;
      }
    }

    return true;
  };

  const renderPaymentMethodOption = (method: PaymentMethod) => {
    const icon = PAYMENT_METHOD_ICON[method];

    return (
      <Stack direction="row" spacing={1} alignItems="center">
        {icon && (
          <Box
            component="img"
            src={icon}
            alt={PAYMENT_METHOD_LABEL[method]}
            sx={{ width: 20, height: 20, objectFit: "contain" }}
          />
        )}
        <span>{PAYMENT_METHOD_LABEL[method]}</span>
      </Stack>
    );
  };

  const handleSearch = useCallback(
    async (keyword?: string) => {
      const value = (keyword ?? searchKeyword).trim();
      if (!value) {
        showToast("Vui lòng nhập từ khoá tìm kiếm", "warning");
        return;
      }

      try {
        setIsSearching(true);
        const found = await posService.searchVariantsForPos(value);

        if (!found) {
          setSearchResults([]);
          showToast("Không tìm thấy sản phẩm phù hợp", "info");
          return;
        }

        setSearchResults([found]);
      } catch (error) {
        showToast(
          error instanceof Error ? error.message : "Không thể tìm sản phẩm",
          "error",
        );
      } finally {
        setIsSearching(false);
      }
    },
    [searchKeyword, showToast],
  );

  // Global USB barcode scanner listener — works without focusing the search input
  const handleBarcodeDetected = useCallback(
    (barcode: string) => {
      setSearchKeyword(barcode);
      handleSearch(barcode);
    },
    [handleSearch],
  );

  useGlobalBarcodeScanner({ onDetected: handleBarcodeDetected });

  const handleOpenBatchModal = async (variant: PosProductVariant) => {
    if (!variant.id) {
      showToast("Sản phẩm không hợp lệ", "error");
      return;
    }

    try {
      setBatchModalMode("add");
      setModalCurrentBatchCode(undefined);
      setEditingCartItemKey(null);
      setSelectedVariant(variant);
      setBatchOptions([]);
      setIsBatchModalOpen(true);
      setIsLoadingBatches(true);

      const batches = await posService.getBatchesByVariant(variant.id);
      setBatchOptions(batches);
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Không thể tải danh sách batch",
        "error",
      );
      setIsBatchModalOpen(false);
    } finally {
      setIsLoadingBatches(false);
    }
  };

  const handleEditBatchInCart = async (item: PosCartItem) => {
    if (!item.variantId) {
      showToast("Không thể đổi batch cho sản phẩm này", "warning");
      return;
    }

    try {
      setBatchModalMode("switch");
      setModalCurrentBatchCode(item.batchCode);
      setEditingCartItemKey(item.key);
      setSelectedVariant({
        id: item.variantId,
        barcode: item.barcode,
        sku: item.sku,
        name: item.variantName,
        displayName: item.variantName,
        basePrice: item.unitPrice,
        concentrationName: "",
      });
      setBatchOptions([]);
      setIsBatchModalOpen(true);
      setIsLoadingBatches(true);

      const batches = await posService.getBatchesByVariant(item.variantId);
      setBatchOptions(batches);
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Không thể tải danh sách batch",
        "error",
      );
      setIsBatchModalOpen(false);
      setEditingCartItemKey(null);
    } finally {
      setIsLoadingBatches(false);
    }
  };

  const handleAddAnotherBatchInCart = async (group: GroupedCartItem) => {
    if (!group.variantId) {
      showToast("Không thể thêm batch cho sản phẩm này", "warning");
      return;
    }

    try {
      setBatchModalMode("add");
      setModalCurrentBatchCode(undefined);
      setEditingCartItemKey(null);
      setSelectedVariant({
        id: group.variantId,
        barcode: group.barcode,
        sku: group.sku,
        name: group.variantName,
        displayName: group.variantName,
        basePrice: group.unitPrice,
        concentrationName: "",
      });
      setBatchOptions([]);
      setIsBatchModalOpen(true);
      setIsLoadingBatches(true);

      const batches = await posService.getBatchesByVariant(group.variantId);
      setBatchOptions(batches);
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Không thể tải danh sách batch",
        "error",
      );
      setIsBatchModalOpen(false);
    } finally {
      setIsLoadingBatches(false);
    }
  };

  const handleSelectBatch = (batch: PosBatchDetail) => {
    if (!selectedVariant) return;

    const variantId = selectedVariant.id || "";
    const batchKey = batch.id || batch.batchCode;
    const key = `${variantId}:${batchKey}`;
    const rawMax = Number(batch.remainingQuantity ?? 0);
    const maxQuantity = rawMax > 0 ? rawMax : Number.MAX_SAFE_INTEGER;
    let outOfStockWarning = false;

    setCartItems((prev) => {
      if (editingCartItemKey) {
        const target = prev.find((item) => item.key === editingCartItemKey);
        if (!target) return prev;

        if (target.key === key) {
          const nextQuantity = Math.min(target.quantity, maxQuantity);
          if (nextQuantity < target.quantity) {
            outOfStockWarning = true;
          }

          return prev.map((item) =>
            item.key === target.key
              ? {
                  ...item,
                  batchId: batch.id,
                  batchCode: batch.batchCode,
                  maxQuantity,
                  quantity: nextQuantity,
                }
              : item,
          );
        }

        const duplicate = prev.find((item) => item.key === key);
        if (duplicate) {
          const mergedQuantity = duplicate.quantity + target.quantity;
          const nextQuantity = Math.min(mergedQuantity, maxQuantity);
          if (nextQuantity < mergedQuantity) {
            outOfStockWarning = true;
          }

          return prev
            .filter((item) => item.key !== target.key)
            .map((item) =>
              item.key === key
                ? {
                    ...item,
                    quantity: nextQuantity,
                    batchId: batch.id,
                    batchCode: batch.batchCode,
                    maxQuantity,
                  }
                : item,
            );
        }

        const nextQuantity = Math.min(target.quantity, maxQuantity);
        if (nextQuantity < target.quantity) {
          outOfStockWarning = true;
        }

        return prev.map((item) =>
          item.key === target.key
            ? {
                ...item,
                key,
                batchId: batch.id,
                batchCode: batch.batchCode,
                maxQuantity,
                quantity: nextQuantity,
              }
            : item,
        );
      }

      const existed = prev.find((item) => item.key === key);
      if (existed) {
        const nextQuantity = Math.min(
          existed.quantity + 1,
          existed.maxQuantity,
        );
        if (nextQuantity === existed.quantity) {
          outOfStockWarning = true;
        }

        return prev.map((item) =>
          item.key === key
            ? {
                ...item,
                quantity: nextQuantity,
              }
            : item,
        );
      }

      return [
        ...prev,
        {
          key,
          variantId,
          variantName: selectedVariant.displayName || selectedVariant.name,
          sku: selectedVariant.sku,
          barcode: selectedVariant.barcode,
          imageUrl: selectedVariant.primaryImageUrl,
          unitPrice: Number(selectedVariant.basePrice ?? 0),
          batchId: batch.id,
          batchCode: batch.batchCode,
          maxQuantity,
          quantity: 1,
        },
      ];
    });

    if (outOfStockWarning) {
      showToast("Số lượng đã đạt tối đa theo tồn kho của batch", "warning");
    }

    setIsBatchModalOpen(false);
    setSelectedVariant(null);
    setEditingCartItemKey(null);
    setSearchResults([]);
    setSearchKeyword("");
  };

  const updateQuantity = (key: string, quantity: number) => {
    if (quantity <= 0) return;
    let outOfStockWarning = false;

    setCartItems((prev) => {
      const current = prev.find((item) => item.key === key);
      if (!current) return prev;

      const nextQuantity = Math.min(quantity, current.maxQuantity);
      if (nextQuantity < quantity) {
        outOfStockWarning = true;
      }

      return prev.map((item) =>
        item.key === key ? { ...item, quantity: nextQuantity } : item,
      );
    });

    if (outOfStockWarning) {
      showToast("Không thể vượt quá số lượng còn lại của batch", "warning");
    }
  };

  const removeCartItem = (key: string) => {
    setCartItems((prev) => prev.filter((item) => item.key !== key));
  };

  const handleApplyVoucher = () => {
    const nextCode = voucherInput.trim();
    setAppliedVoucherCode(nextCode);

    if (nextCode) {
      showToast("Đã áp dụng mã giảm giá", "success");
      return;
    }

    showToast("Đã bỏ mã giảm giá", "info");
  };

  const localSubtotal = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) => sum + Number(item.unitPrice ?? 0) * item.quantity,
        0,
      ),
    [cartItems],
  );

  const groupedCartItems = useMemo<GroupedCartItem[]>(() => {
    const map = new Map<string, GroupedCartItem>();

    cartItems.forEach((item) => {
      const groupKey = item.variantId || `${item.sku}:${item.variantName}`;
      const current = map.get(groupKey);

      if (!current) {
        map.set(groupKey, {
          groupKey,
          variantId: item.variantId,
          variantName: item.variantName,
          sku: item.sku,
          barcode: item.barcode,
          imageUrl: item.imageUrl,
          unitPrice: item.unitPrice,
          totalQuantity: item.quantity,
          batchItems: [item],
        });
        return;
      }

      current.totalQuantity += item.quantity;
      current.batchItems.push(item);
    });

    return Array.from(map.values());
  }, [cartItems]);

  const variantDiscountMap = useMemo(() => {
    const map = new Map<string, { discount: number; finalTotal: number }>();
    if (!previewData?.items) return map;

    previewData.items.forEach((item) => {
      const key = item.variantId || "";
      const existing = map.get(key);
      const discount = Number(item.discount ?? 0);
      const finalTotal = Number(item.finalTotal ?? 0);

      if (!existing) {
        map.set(key, { discount, finalTotal });
      } else {
        existing.discount += discount;
        existing.finalTotal += finalTotal;
      }
    });

    return map;
  }, [previewData]);

  const previewPayload = useMemo<PosPreviewRequest>(
    () => ({
      scannedItems: cartItems.map((item) => ({
        barcode: item.barcode,
        batchCode: item.batchCode,
        quantity: item.quantity,
      })),
      voucherCode: appliedVoucherCode.trim() || null,
    }),
    [appliedVoucherCode, cartItems],
  );

  const debouncedPreviewPayload = useDebounce(previewPayload, 500);

  const toCartDisplaySyncPayload = useCallback(
    (data: PosPreviewResponse): CartDisplaySyncPayload => {
      const mappedItems = cartItems.map((cartItem) => {
        const matchedPreviewItem = data.items?.find(
          (previewItem) =>
            previewItem.batchCode === cartItem.batchCode &&
            (previewItem.variantId === cartItem.variantId ||
              previewItem.variantName === cartItem.variantName),
        );

        const unitPrice = toSafeNumber(
          matchedPreviewItem?.unitPrice ?? cartItem.unitPrice,
        );
        const subTotal = toSafeNumber(
          matchedPreviewItem?.subTotal ?? unitPrice * cartItem.quantity,
        );
        const discount = toSafeNumber(matchedPreviewItem?.discount ?? 0);
        const finalTotal = toSafeNumber(
          matchedPreviewItem?.finalTotal ?? subTotal - discount,
        );

        return {
          variantId: toGuidOrEmpty(
            matchedPreviewItem?.variantId ?? cartItem.variantId,
          ),
          batchId: toGuidOrEmpty(
            matchedPreviewItem?.batchId ?? cartItem.batchId,
          ),
          variantName:
            matchedPreviewItem?.variantName?.trim() || cartItem.variantName,
          batchCode: matchedPreviewItem?.batchCode || cartItem.batchCode,
          imageUrl: matchedPreviewItem?.imageUrl || cartItem.imageUrl || "",
          quantity: Math.max(0, Number(cartItem.quantity || 0)),
          unitPrice,
          subTotal,
          discount,
          finalTotal,
        };
      });

      const computedSubTotal = mappedItems.reduce(
        (sum, item) => sum + item.subTotal,
        0,
      );
      const computedDiscount = mappedItems.reduce(
        (sum, item) => sum + item.discount,
        0,
      );
      const computedTotal = mappedItems.reduce(
        (sum, item) => sum + item.finalTotal,
        0,
      );

      return {
        items: mappedItems,
        subTotal: toSafeNumber(data.subTotal ?? computedSubTotal),
        discount: toSafeNumber(data.discount ?? computedDiscount),
        totalPrice: toSafeNumber(data.totalPrice ?? computedTotal),
        paymentUrl: paymentQrUrlRef.current,
      };
    },
    [cartItems],
  );

  const toFallbackCartDisplaySyncPayload =
    useCallback((): CartDisplaySyncPayload => {
      const mappedItems = cartItems.map((item) => {
        const subTotal = toSafeNumber(item.unitPrice * item.quantity);
        return {
          variantId: toGuidOrEmpty(item.variantId),
          batchId: toGuidOrEmpty(item.batchId),
          variantName: item.variantName,
          batchCode: item.batchCode,
          imageUrl: item.imageUrl || "",
          quantity: Math.max(0, Number(item.quantity || 0)),
          unitPrice: toSafeNumber(item.unitPrice),
          subTotal,
          discount: 0,
          finalTotal: subTotal,
        };
      });

      return {
        items: mappedItems,
        subTotal: toSafeNumber(localSubtotal),
        discount: 0,
        totalPrice: toSafeNumber(localSubtotal),
        paymentUrl: paymentQrUrlRef.current,
      };
    }, [cartItems, localSubtotal]);

  // Keep callback refs in sync - placed after callbacks are defined
  useEffect(() => {
    toCartDisplaySyncPayloadRef.current = toCartDisplaySyncPayload;
  }, [toCartDisplaySyncPayload]);

  useEffect(() => {
    toFallbackCartDisplaySyncPayloadRef.current =
      toFallbackCartDisplaySyncPayload;
  }, [toFallbackCartDisplaySyncPayload]);

  // Keep failedPaymentAction ref in sync
  useEffect(() => {
    failedPaymentActionRef.current = failedPaymentAction;
  }, [failedPaymentAction]);

  const executeRetryFailedPayment = useCallback(
    async (requiresCashConfirm: boolean) => {
      if (!failedPaymentAction?.paymentId) {
        showToast("Không tìm thấy paymentId để thử lại", "warning");
        return;
      }

      try {
        setIsRetryingPayment(true);
        // Set flag to prevent processing failed events during retry
        isRetryInProgressRef.current = true;
        // Allow re-processing the same fail/success DTO after a new retry attempt.
        handledPaymentFailedEventRef.current = "";

        const retryCallId = createDebugCallId("pos-retry");

        const result = await orderService.retryPayment(
          failedPaymentAction.paymentId,
          paymentMethod,
        );

        const paymentIdFromRetryResponse = (result.paymentId || "").trim();
        const paymentIdFromRetryUrl = extractPaymentIdFromRetryUrl(result.url);
        const paymentIdForRetry =
          paymentIdFromRetryResponse ||
          paymentIdFromRetryUrl ||
          failedPaymentAction.paymentId;

        latestRetryOrderIdRef.current = failedPaymentAction.orderId;
        latestRetryPaymentIdRef.current = paymentIdForRetry;

        if (paymentIdForRetry !== failedPaymentAction.paymentId) {
          setFailedPaymentAction((prev) => {
            if (!prev || prev.orderId !== failedPaymentAction.orderId) {
              return prev;
            }

            return {
              ...prev,
              paymentId: paymentIdForRetry,
            };
          });
        }

        if (requiresCashConfirm) {
          await orderService.confirmPayment(
            paymentIdForRetry,
            true,
            undefined,
          );

          // Clear payment failed states - để SignalR event tự động mở success dialog
          paymentQrUrlRef.current = null;
          setPaymentQrUrl(null);
          lastPaidOrderIdRef.current = failedPaymentAction.orderId;
          setFailedPaymentAction(null);

          showToast("Đã xác nhận thanh toán tiền mặt", "success");
          // SignalR event sẽ tự động trigger openSuccessDialog
          return;
        }

        // Nếu chọn thanh toán tiền mặt nhưng không require confirm
        if (paymentMethod === "CashInStore") {
          // Clear payment failed states
          paymentQrUrlRef.current = null;
          setPaymentQrUrl(null);
          lastPaidOrderIdRef.current = failedPaymentAction.orderId;
          setFailedPaymentAction(null);

          showToast("Đã chuyển sang thanh toán tiền mặt", "success");
          // SignalR event sẽ tự động trigger openSuccessDialog
          return;
        }

        const retryPayload = (result.url || result.orderId || "").trim();
        const isOnlineRedirect = isHttpUrl(retryPayload);

        if (isOnlineRedirect) {
          paymentQrUrlRef.current = retryPayload;
          setPaymentQrUrl(retryPayload);

          const currentPayload = previewData
            ? toCartDisplaySyncPayload(previewData)
            : {
                items: cartItems.map((item) => {
                  const subTotal = toSafeNumber(item.unitPrice * item.quantity);
                  return {
                    variantId: toGuidOrEmpty(item.variantId),
                    batchId: toGuidOrEmpty(item.batchId),
                    variantName: item.variantName,
                    batchCode: item.batchCode,
                    imageUrl: item.imageUrl || "",
                    quantity: Math.max(0, Number(item.quantity || 0)),
                    unitPrice: toSafeNumber(item.unitPrice),
                    subTotal,
                    discount: 0,
                    finalTotal: subTotal,
                  };
                }),
                subTotal: toSafeNumber(localSubtotal),
                discount: 0,
                totalPrice: toSafeNumber(localSubtotal),
                paymentUrl: null,
              };

          void syncCartToCustomerRef.current({
            ...currentPayload,
            paymentUrl: retryPayload,
          } satisfies CartDisplaySyncPayload);

          showToast("Đã tạo lại giao dịch thanh toán", "success");
          return;
        }

        showToast(
          "Đã gửi yêu cầu thanh toán lại. Vui lòng chờ hệ thống xác nhận.",
          "info",
        );
      } catch (error) {
        showToast(
          error instanceof Error ? error.message : "Thanh toán lại thất bại",
          "error",
        );
      } finally {
        setIsRetryingPayment(false);
        // Delay clearing the flag to allow SignalR events to settle
        setTimeout(() => {
          isRetryInProgressRef.current = false;
        }, 1000);
      }
    },
    [
      cartItems,
      failedPaymentAction,
      localSubtotal,
      paymentMethod,
      previewData,
      showToast,
      toCartDisplaySyncPayload,
    ],
  );

  useEffect(() => {
    if (!paymentFailedData) return;

    const rawStatus =
      paymentFailedData.status ||
      (paymentFailedData as { Status?: string }).Status ||
      "";
    const rawMessage =
      paymentFailedData.message ||
      (paymentFailedData as { Message?: string }).Message ||
      "Giao dịch thất bại hoặc bị hủy.";
    const rawOrderId =
      paymentFailedData.orderId ||
      (paymentFailedData as { OrderId?: string }).OrderId ||
      "";
    const rawPaymentId =
      paymentFailedData.paymentId ||
      (paymentFailedData as { PaymentId?: string }).PaymentId ||
      "";
    const status = rawStatus.toLowerCase();
    const failedEventKey = [
      rawOrderId,
      rawPaymentId,
      rawStatus,
      rawMessage,
    ].join(":");

    if (handledPaymentFailedEventRef.current === failedEventKey) {
      return;
    }

    // Skip processing failed events while retry is in progress
    // This prevents showing error toast when user clicks retry button
    if (isRetryInProgressRef.current) {
      return;
    }

    // Use refs to avoid dependencies on state that changes with cart
    const activeRetryOrderId =
      latestRetryOrderIdRef.current ||
      failedPaymentActionRef.current?.orderId ||
      "";
    const activeRetryPaymentId =
      latestRetryPaymentIdRef.current ||
      failedPaymentActionRef.current?.paymentId ||
      "";

    if (
      rawOrderId &&
      activeRetryOrderId &&
      rawOrderId === activeRetryOrderId &&
      rawPaymentId &&
      activeRetryPaymentId &&
      rawPaymentId !== activeRetryPaymentId
    ) {
      handledPaymentFailedEventRef.current = failedEventKey;
      return;
    }

    if (rawOrderId && rawOrderId === lastPaidOrderIdRef.current) {
      handledPaymentFailedEventRef.current = failedEventKey;
      return;
    }

    handledPaymentFailedEventRef.current = failedEventKey;

    paymentQrUrlRef.current = null;
    setPaymentQrUrl(null);

    const vietnameseMessage =
      rawMessage.includes("cancelled") || rawMessage.includes("canceled")
        ? "Giao dịch đã bị hủy"
        : rawMessage.includes("failed") || rawMessage.includes("error")
          ? "Thanh toán thất bại"
          : rawMessage || "Giao dịch thất bại hoặc bị hủy";

    showToast(vietnameseMessage, "error");

    if (status === "failed" || status === "error" || status === "cancelled") {
      if (rawOrderId) {
        setFailedPaymentAction({
          orderId: rawOrderId,
          paymentId: rawPaymentId || undefined,
          message: rawMessage,
        });

        latestRetryOrderIdRef.current = rawOrderId;
        latestRetryPaymentIdRef.current = rawPaymentId || "";
      }
    }

    // Use refs to access current preview data and callbacks
    // This prevents effect re-runs when cart changes
    const currentPreview = previewDataRef.current;
    if (currentPreview) {
      void syncCartToCustomerRef.current(
        toCartDisplaySyncPayloadRef.current(currentPreview),
      );
    } else {
      void syncCartToCustomerRef.current({
        ...toFallbackCartDisplaySyncPayloadRef.current(),
        paymentUrl: null,
      });
    }
  }, [paymentFailedData, showToast]);

  useEffect(() => {
    if (!paymentLinkUpdatedData) return;

    const rawOrderId =
      paymentLinkUpdatedData.orderId ||
      (paymentLinkUpdatedData as { OrderId?: string }).OrderId ||
      "";
    const rawPaymentId =
      paymentLinkUpdatedData.paymentId ||
      (paymentLinkUpdatedData as { PaymentId?: string }).PaymentId ||
      "";
    const rawPaymentUrl =
      paymentLinkUpdatedData.paymentUrl ||
      (paymentLinkUpdatedData as { PaymentUrl?: string }).PaymentUrl ||
      "";

    if (!rawOrderId || !rawPaymentId || !rawPaymentUrl) {
      return;
    }

    if (rawOrderId === lastPaidOrderIdRef.current) {
      return;
    }

    latestRetryOrderIdRef.current = rawOrderId;
    latestRetryPaymentIdRef.current = rawPaymentId;

    paymentQrUrlRef.current = rawPaymentUrl;
    setPaymentQrUrl(rawPaymentUrl);

    setFailedPaymentAction((prev) => {
      if (prev && prev.orderId !== rawOrderId) {
        return prev;
      }

      return {
        orderId: rawOrderId,
        paymentId: rawPaymentId,
        message: prev?.message || "Đã tạo lại link thanh toán",
      };
    });

    // Use refs to access current preview data and callbacks
    // This prevents effect re-runs when cart changes
    const currentPreview = previewDataRef.current;
    const currentPayload = currentPreview
      ? toCartDisplaySyncPayloadRef.current(currentPreview)
      : toFallbackCartDisplaySyncPayloadRef.current();

    void syncCartToCustomerRef.current({
      ...currentPayload,
      paymentUrl: rawPaymentUrl,
    });
  }, [paymentLinkUpdatedData]);

  useEffect(() => {
    if (debouncedPreviewPayload.scannedItems.length === 0) {
      setPreviewData(null);
      setPreviewError("");
      setIsPreviewLoading(false);
      void syncCartToCustomerRef.current({
        items: [],
        subTotal: 0,
        discount: 0,
        totalPrice: 0,
        paymentUrl: null,
      } satisfies CartDisplaySyncPayload);
      return;
    }

    // Sync local cart ngay khi thay đổi để màn khách hiển thị tức thì.
    void syncCartToCustomerRef.current(toFallbackCartDisplaySyncPayload());

    let isCancelled = false;

    const loadPreview = async () => {
      try {
        setIsPreviewLoading(true);
        const data = await posService.previewOrder(debouncedPreviewPayload);
        if (!isCancelled) {
          setPreviewData(data);
          setPreviewError("");
          void syncCartToCustomerRef.current(toCartDisplaySyncPayload(data));
        }
      } catch (error) {
        if (!isCancelled) {
          setPreviewData(null);
          setPreviewError(
            error instanceof Error ? error.message : "Không thể tính tổng tiền",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsPreviewLoading(false);
        }
      }
    };

    loadPreview();

    return () => {
      isCancelled = true;
    };
  }, [
    debouncedPreviewPayload,
    toCartDisplaySyncPayload,
    toFallbackCartDisplaySyncPayload,
  ]);

  useEffect(() => {
    setPaymentMethod(isPickupInStore ? "CashInStore" : "CashOnDelivery");
  }, [isPickupInStore]);

  useEffect(() => {
    const loadProvinces = async () => {
      try {
        setIsLoadingProvinces(true);
        const data = await addressService.getProvinces();
        setProvinces(data);
      } catch {
        showToast("Không thể tải danh sách tỉnh/thành", "warning");
      } finally {
        setIsLoadingProvinces(false);
      }
    };

    loadProvinces();
  }, [showToast]);

  const loadDistricts = async (provinceId: number) => {
    try {
      setIsLoadingDistricts(true);
      const data = await addressService.getDistricts(provinceId);
      setDistricts(data);
    } catch {
      showToast("Không thể tải quận/huyện", "warning");
    } finally {
      setIsLoadingDistricts(false);
    }
  };

  const loadWards = async (districtId: number) => {
    try {
      setIsLoadingWards(true);
      const data = await addressService.getWards(districtId);
      setWards(data);
    } catch {
      showToast("Không thể tải phường/xã", "warning");
    } finally {
      setIsLoadingWards(false);
    }
  };

  const handleLookupCustomer = async () => {
    const keyword = customerLookupKeyword.trim();
    if (!keyword) {
      setCustomerLookupResults([]);
      return;
    }

    try {
      setIsLookingUpCustomer(true);
      const customers = await posService.lookupCustomerByPhoneOrEmail(keyword);
      setCustomerLookupResults(customers);

      if (customers.length === 0) {
        showToast("Không tìm thấy khách hàng", "info");
        return;
      }
    } finally {
      setIsLookingUpCustomer(false);
    }
  };

  const handleSelectCustomer = (customer: PosCustomerForLookup) => {
    setSelectedCustomer(customer);
    if (!recipientPhone) {
      setRecipientPhone(customer.phoneNumber || "");
    }
    if (!recipientName) {
      setRecipientName(customer.fullName || "");
    }
  };

  const handleClearSelectedCustomer = () => {
    setSelectedCustomer(null);
  };

  const handleOpenCheckoutConfirm = () => {
    if (!validateCheckoutInputs()) return;

    // Nếu là CashInStore -> Mở luôn cash payment dialog
    if (paymentMethod === "CashInStore") {
      const expectedTotal = Number(previewData?.totalPrice ?? localSubtotal);
      const payload: CreateInStoreOrderRequest = {
        scannedItems: cartItems.map((item) => ({
          barcode: item.barcode,
          batchCode: item.batchCode,
          quantity: item.quantity,
        })),
        voucherCode: appliedVoucherCode.trim() || null,
        customerId: selectedCustomer?.id || null,
        isPickupInStore,
        payment: {
          method: paymentMethod,
        },
        expectedTotalPrice: expectedTotal,
        posSessionId: POS_SESSION_ID,
        recipient: isPickupInStore
          ? null
          : {
              contactName: recipientName.trim(),
              contactPhoneNumber: recipientPhone.trim(),
              districtId: selectedDistrict?.DistrictID || 0,
              districtName: selectedDistrict?.DistrictName || "",
              wardCode: selectedWard?.WardCode || "",
              wardName: selectedWard?.WardName || "",
              provinceId: selectedProvince?.ProvinceID || 0,
              provinceName: selectedProvince?.ProvinceName || "",
              fullAddress: streetAddress.trim(),
            },
      };
      setPendingCheckoutPayload(payload);
      setCashDialogMode("checkout");
      setIsCashPaymentDialogOpen(true);
      return;
    }

    // Các payment method khác mở modal confirm
    setIsCheckoutConfirmOpen(true);
  };

  const handleRetryFailedPayment = () => {
    if (!failedPaymentAction?.paymentId) {
      showToast("Không tìm thấy paymentId để thử lại", "warning");
      return;
    }

    if (paymentMethod === "ExternalBankTransfer") {
      showToast(
        "Checkout tại quầy không hỗ trợ phương thức Chuyển khoản cho thanh toán lại",
        "warning",
      );
      return;
    }

    if (paymentMethod === "CashInStore") {
      // Mở cash payment dialog cho retry
      const expectedTotal = Number(previewData?.totalPrice ?? localSubtotal);
      setPendingCheckoutPayload({
        scannedItems: [],
        payment: { method: "CashInStore" },
        expectedTotalPrice: expectedTotal,
        posSessionId: POS_SESSION_ID,
      } as CreateInStoreOrderRequest);
      setCashDialogMode("retry");
      setIsCashPaymentDialogOpen(true);
      return;
    }

    void executeRetryFailedPayment(false);
  };

  const handleCheckoutInStore = async () => {
    if (!validateCheckoutInputs()) return;

    const paymentMethodAtCheckout = paymentMethod;
    const expectedTotal = Number(previewData?.totalPrice ?? localSubtotal);
    const payload: CreateInStoreOrderRequest = {
      scannedItems: cartItems.map((item) => ({
        barcode: item.barcode,
        batchCode: item.batchCode,
        quantity: item.quantity,
      })),
      voucherCode: appliedVoucherCode.trim() || null,
      customerId: selectedCustomer?.id || null,
      isPickupInStore,
      payment: {
        method: paymentMethod,
      },
      expectedTotalPrice: expectedTotal,
      posSessionId: POS_SESSION_ID,
      recipient: isPickupInStore
        ? null
        : {
            contactName: recipientName.trim(),
            contactPhoneNumber: recipientPhone.trim(),
            districtId: selectedDistrict?.DistrictID || 0,
            districtName: selectedDistrict?.DistrictName || "",
            wardCode: selectedWard?.WardCode || "",
            wardName: selectedWard?.WardName || "",
            provinceId: selectedProvince?.ProvinceID || 0,
            provinceName: selectedProvince?.ProvinceName || "",
            fullAddress: streetAddress.trim(),
          },
    };

    // KIỂM TRA PAYMENT METHOD TRƯỚC KHI GỌI API
    if (paymentMethodAtCheckout === "CashInStore") {
      // Mở dialog xác nhận tiền mặt TRƯỚC, chưa tạo order
      setPendingCheckoutPayload(payload);
      setIsCashPaymentDialogOpen(true);
      return;
    }

    // Các payment method khác (VnPay, Momo, ...) mới gọi API để tạo order
    try {
      setIsSubmittingCheckout(true);
      const result = await orderService.checkoutInStore(payload);

      // 1. NẾU LÀ VNPAY/MOMO (CÓ LINK QR)
      if (result.url) {
        paymentQrUrlRef.current = result.url;
        setPaymentQrUrl(result.url);
        const currentPayload = previewData
          ? toCartDisplaySyncPayload(previewData)
          : {
              items: cartItems.map((item) => {
                const subTotal = toSafeNumber(item.unitPrice * item.quantity);
                return {
                  variantId: toGuidOrEmpty(item.variantId),
                  batchId: toGuidOrEmpty(item.batchId),
                  variantName: item.variantName,
                  batchCode: item.batchCode,
                  imageUrl: item.imageUrl || "",
                  quantity: Math.max(0, Number(item.quantity || 0)),
                  unitPrice: toSafeNumber(item.unitPrice),
                  subTotal,
                  discount: 0,
                  finalTotal: subTotal,
                };
              }),
              subTotal: toSafeNumber(localSubtotal),
              discount: 0,
              totalPrice: toSafeNumber(localSubtotal),
              paymentUrl: null,
            };

        void syncCartToCustomerRef.current({
          ...currentPayload,
          paymentUrl: result.url,
        } satisfies CartDisplaySyncPayload);
        // Không được xóa giỏ hàng, để yên đó chờ SignalR gọi về!
        setIsSubmittingCheckout(false);
        return;
      }

      // 2. Payment thành công không có QR: giữ cart, báo success 2 màn
      paymentQrUrlRef.current = null;
      setPaymentQrUrl(null);

      const orderIdForSuccess = (result.orderId || "").trim();
      const paymentIdForSuccess = (
        result.paymentId ||
        result.orderId ||
        ""
      ).trim();

      if (!orderIdForSuccess || !paymentIdForSuccess) {
        showToast(
          "Checkout thành công nhưng thiếu order/payment ID",
          "warning",
        );
        return;
      }

      showToast("Thanh toán thành công!", "success");
      void openSuccessDialog(orderIdForSuccess);
      void notifyPaymentSuccess({
        orderId: orderIdForSuccess,
        paymentId: paymentIdForSuccess,
        status: "Success",
        message: "Thanh toán thành công",
      }).catch((error) => {
        console.error("[POS][Checkout] notifyPaymentSuccess failed", error);
      });
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Checkout thất bại",
        "error",
      );
    } finally {
      setIsSubmittingCheckout(false);
    }
  };

  return (
    <MainLayout>
      <Container maxWidth="xl" sx={{ py: { xs: 2.5, md: 4 } }}>
        <Typography variant="h4" fontWeight={800} mb={4}>
          Tính tiền tại quầy (POS)
        </Typography>
        <Stack
          direction={{ xs: "column", lg: "row" }}
          spacing={2.5}
          alignItems={{ xs: "stretch", lg: "stretch" }}
        >
          <Box flex={1} width="100%" display="flex" flexDirection="column">
            <Paper
              sx={{
                ...panelSx,
                display: "flex",
                flexDirection: "column",
                flex: 1,
              }}
            >
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                mb={2}
              >
                <Typography variant="h6" fontWeight={700}>
                  Giỏ hàng tại quầy
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {groupedCartItems.length} sản phẩm
                </Typography>
              </Stack>

              <Box
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  px: 2,
                  py: 1.5,
                  bgcolor: "grey.50",
                  flex: 1,
                  minHeight: 180,
                  overflow: "auto",
                }}
              >
                {cartItems.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Chưa có sản phẩm trong giỏ. Hãy thêm sản phẩm từ cột tìm
                    kiếm/quét mã.
                  </Typography>
                ) : (
                  <List
                    disablePadding
                    sx={{ maxHeight: "100%", overflowY: "auto" }}
                  >
                    {groupedCartItems.map((group, groupIndex) => (
                      <Box key={group.groupKey}>
                        <ListItem
                          disableGutters
                          sx={{ py: 1.25, alignItems: "flex-start" }}
                        >
                          <ListItemAvatar sx={{ minWidth: 56 }}>
                            {group.imageUrl ? (
                              <Box
                                component="img"
                                src={group.imageUrl}
                                alt={group.variantName}
                                sx={{
                                  width: 44,
                                  height: 44,
                                  borderRadius: 1.5,
                                  objectFit: "cover",
                                  border: "1px solid",
                                  borderColor: "divider",
                                }}
                              />
                            ) : (
                              <Box
                                sx={{
                                  width: 44,
                                  height: 44,
                                  borderRadius: 1.5,
                                  bgcolor: "grey.100",
                                  border: "1px solid",
                                  borderColor: "divider",
                                }}
                              />
                            )}
                          </ListItemAvatar>

                          <ListItemText
                            primary={
                              <Typography fontWeight={700}>
                                {group.variantName}
                              </Typography>
                            }
                            secondaryTypographyProps={{ component: "div" }}
                            secondary={
                              <Stack
                                direction="row"
                                alignItems="center"
                                spacing={1}
                                flexWrap="wrap"
                              >
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  SKU: {group.sku} | Tổng SL:{" "}
                                  {group.totalQuantity}
                                </Typography>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() =>
                                    handleAddAnotherBatchInCart(group)
                                  }
                                  sx={{ py: 0, minHeight: 24 }}
                                >
                                  + Batch khác
                                </Button>
                              </Stack>
                            }
                          />

                          {(() => {
                            const discountInfo = variantDiscountMap.get(
                              group.variantId,
                            );
                            const hasDiscount =
                              discountInfo && discountInfo.discount > 0;

                            return hasDiscount ? (
                              <Stack alignItems="flex-end" spacing={0.25}>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    textDecoration: "line-through",
                                    color: "text.disabled",
                                  }}
                                >
                                  {formatCurrency(
                                    group.unitPrice * group.totalQuantity,
                                  )}
                                </Typography>
                                <Typography fontWeight={800} color="error.main">
                                  {formatCurrency(discountInfo.finalTotal)}
                                </Typography>
                                <Chip
                                  label={`-${formatCurrency(discountInfo.discount)}`}
                                  size="small"
                                  color="error"
                                  variant="outlined"
                                  sx={{
                                    height: 20,
                                    fontSize: "0.7rem",
                                    fontWeight: 700,
                                  }}
                                />
                              </Stack>
                            ) : (
                              <Typography fontWeight={800} color="text.primary">
                                {formatCurrency(
                                  group.unitPrice * group.totalQuantity,
                                )}
                              </Typography>
                            );
                          })()}
                        </ListItem>

                        <Stack spacing={1} sx={{ mb: 1.25, ml: 7 }}>
                          {group.batchItems.map((item) => (
                            <Stack
                              key={item.key}
                              direction="row"
                              alignItems="center"
                              justifyContent="space-between"
                              spacing={1}
                            >
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Batch: {item.batchCode}
                                <Button
                                  size="small"
                                  variant="text"
                                  onClick={() => handleEditBatchInCart(item)}
                                  sx={{ ml: 1, minWidth: 0, px: 0.5 }}
                                >
                                  Đổi
                                </Button>
                              </Typography>

                              <Stack
                                direction="row"
                                spacing={0.5}
                                alignItems="center"
                                sx={{
                                  border: "1px solid",
                                  borderColor: "divider",
                                  borderRadius: 1.5,
                                  px: 0.5,
                                  py: 0.25,
                                  bgcolor: "background.paper",
                                }}
                              >
                                <IconButton
                                  size="small"
                                  onClick={() =>
                                    updateQuantity(item.key, item.quantity - 1)
                                  }
                                  disabled={item.quantity <= 1}
                                >
                                  <Remove fontSize="small" />
                                </IconButton>
                                <TextField
                                  size="small"
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const value = Number(e.target.value);
                                    if (Number.isFinite(value) && value > 0) {
                                      updateQuantity(item.key, value);
                                    }
                                  }}
                                  sx={{ width: 58 }}
                                />
                                <IconButton
                                  size="small"
                                  onClick={() =>
                                    updateQuantity(item.key, item.quantity + 1)
                                  }
                                >
                                  <Add fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => removeCartItem(item.key)}
                                >
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Stack>
                            </Stack>
                          ))}
                        </Stack>

                        {groupIndex < groupedCartItems.length - 1 && (
                          <Divider />
                        )}
                      </Box>
                    ))}
                  </List>
                )}
              </Box>

              <Stack direction="row" spacing={1.25} sx={{ mt: 2 }}>
                <TextField
                  placeholder="Mã giảm giá"
                  value={voucherInput}
                  onChange={(e) => setVoucherInput(e.target.value)}
                  fullWidth
                />
                <Button
                  variant="contained"
                  onClick={handleApplyVoucher}
                  disabled={voucherInput.trim() === appliedVoucherCode.trim()}
                  sx={{ minWidth: 112 }}
                >
                  Áp dụng
                </Button>
              </Stack>

              <Box
                sx={{
                  mt: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  p: 2,
                  bgcolor: "background.default",
                }}
              >
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography color="text.secondary">Tạm tính</Typography>
                    <Typography>
                      {formatCurrency(
                        Number(previewData?.subTotal ?? localSubtotal),
                      )}
                    </Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography color="text.secondary">Giảm giá</Typography>
                    <Typography>
                      {formatCurrency(Number(previewData?.discount ?? 0))}
                    </Typography>
                  </Stack>
                  <Divider sx={{ my: 0.5 }} />
                  <Stack direction="row" justifyContent="space-between">
                    <Typography fontWeight={800}>Tổng tiền</Typography>
                    <Typography fontWeight={800} color="error.main">
                      {formatCurrency(
                        Number(
                          previewData?.totalPrice ??
                            previewData?.subTotal ??
                            localSubtotal,
                        ),
                      )}
                    </Typography>
                  </Stack>

                  {isPreviewLoading && (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CircularProgress size={16} />
                      <Typography variant="body2" color="text.secondary">
                        Đang tính tổng tiền...
                      </Typography>
                    </Stack>
                  )}

                  {previewError && (
                    <Alert severity="warning">{previewError}</Alert>
                  )}
                </Stack>
              </Box>
            </Paper>
          </Box>

          <Box flex={1} width="100%">
            <Paper
              sx={{
                ...panelSx,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Typography variant="h6" fontWeight={700} mb={2}>
                Tìm kiếm sản phẩm
              </Typography>

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.25}
                mb={2}
              >
                <TextField
                  label="Quét mã vạch / Nhập SKU, barcode hoặc tên"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                  fullWidth
                />
                <Button
                  variant="contained"
                  aria-label="Tìm kiếm sản phẩm"
                  startIcon={
                    isSearching ? (
                      <CircularProgress color="inherit" size={16} />
                    ) : (
                      <Search />
                    )
                  }
                  onClick={() => handleSearch()}
                  disabled={isSearching}
                  sx={{ minWidth: 52, px: 1.5 }}
                ></Button>
              </Stack>

              <Box
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  p: 2,
                  mb: 2,
                  minHeight: 120,
                  bgcolor: "grey.50",
                }}
              >
                <Typography variant="subtitle1" fontWeight={700} mb={1}>
                  Kết quả sản phẩm
                </Typography>

                {searchResults.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Chưa có kết quả. Hãy nhập từ khoá hoặc quét mã vạch để tìm.
                  </Typography>
                ) : (
                  <List disablePadding>
                    {searchResults.map((variant) => (
                      <ListItem
                        key={getVariantKey(variant)}
                        disableGutters
                        secondaryAction={
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleOpenBatchModal(variant)}
                          >
                            Add
                          </Button>
                        }
                        sx={{ pr: 10 }}
                      >
                        <ListItemAvatar sx={{ minWidth: 56 }}>
                          {variant.primaryImageUrl ? (
                            <Box
                              component="img"
                              src={variant.primaryImageUrl}
                              alt={variant.displayName || variant.name}
                              sx={{
                                width: 44,
                                height: 44,
                                borderRadius: 1.5,
                                objectFit: "cover",
                                border: "1px solid",
                                borderColor: "divider",
                              }}
                            />
                          ) : (
                            <Box
                              sx={{
                                width: 44,
                                height: 44,
                                borderRadius: 1.5,
                                bgcolor: "grey.100",
                                border: "1px solid",
                                borderColor: "divider",
                              }}
                            />
                          )}
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography fontWeight={700}>
                              {variant.displayName || variant.name}
                            </Typography>
                          }
                          secondaryTypographyProps={{ component: "div" }}
                          secondary={
                            <>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                SKU: {variant.sku}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Giá:{" "}
                                {formatCurrency(Number(variant.basePrice ?? 0))}
                              </Typography>
                            </>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
            </Paper>

            <Paper
              sx={{
                ...panelSx,
                mt: 2.5,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  p: 2,
                  bgcolor: "background.paper",
                }}
              >
                <Typography fontWeight={700} mb={1.25}>
                  Checkout tại quầy
                </Typography>

                {!failedPaymentAction && (
                  <>
                    <RadioGroup
                      row
                      value={isPickupInStore ? "pickup" : "delivery"}
                      onChange={(e) =>
                        setIsPickupInStore(e.target.value === "pickup")
                      }
                    >
                      <FormControlLabel
                        value="pickup"
                        control={<Radio size="small" />}
                        label="Khách lấy tại quầy"
                      />
                      <FormControlLabel
                        value="delivery"
                        control={<Radio size="small" />}
                        label="Giao về địa chỉ khách"
                      />
                    </RadioGroup>

                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1}
                      alignItems="stretch"
                      sx={{ mt: 1.5 }}
                    >
                      <TextField
                        label="SĐT khách hàng (nếu có tài khoản)"
                        value={customerLookupKeyword}
                        onChange={(e) =>
                          setCustomerLookupKeyword(e.target.value)
                        }
                        fullWidth
                      />
                      <Button
                        variant="outlined"
                        onClick={handleLookupCustomer}
                        disabled={isLookingUpCustomer}
                        aria-label="Tìm khách hàng"
                        sx={{
                          minWidth: { xs: "100%", sm: 52 },
                          width: { xs: "100%", sm: 52 },
                          px: 0,
                        }}
                      >
                        {isLookingUpCustomer ? (
                          <CircularProgress size={18} />
                        ) : (
                          <Search fontSize="small" />
                        )}
                      </Button>
                    </Stack>

                    {customerLookupResults.length > 0 && (
                      <Box
                        sx={{
                          mt: 1,
                          border: "1px solid",
                          borderColor: "divider",
                          borderRadius: 1.5,
                          maxHeight: 160,
                          overflowY: "auto",
                          bgcolor: "grey.50",
                        }}
                      >
                        {customerLookupResults.map((customer) => {
                          const isSelected =
                            selectedCustomer?.id === customer.id;
                          return (
                            <Button
                              key={customer.id}
                              fullWidth
                              variant="text"
                              onClick={() => handleSelectCustomer(customer)}
                              sx={{
                                justifyContent: "flex-start",
                                textTransform: "none",
                                px: 1.5,
                                py: 1,
                                borderRadius: 0,
                                bgcolor: isSelected
                                  ? "action.selected"
                                  : "transparent",
                                borderBottom: "1px solid",
                                borderColor: "divider",
                              }}
                            >
                              <Typography
                                variant="body2"
                                sx={{ textAlign: "left", width: "100%" }}
                              >
                                {customer.fullName} - {customer.phoneNumber}
                              </Typography>
                            </Button>
                          );
                        })}
                      </Box>
                    )}

                    {selectedCustomer && (
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        spacing={1}
                        sx={{ mt: 1 }}
                      >
                        <Typography variant="body2" color="success.main">
                          Khách hàng đã chọn: {selectedCustomer.fullName} -{" "}
                          {selectedCustomer.phoneNumber}
                        </Typography>
                        <Button
                          size="small"
                          variant="text"
                          color="inherit"
                          onClick={handleClearSelectedCustomer}
                          sx={{ whiteSpace: "nowrap" }}
                        >
                          Bỏ chọn
                        </Button>
                      </Stack>
                    )}

                    {!isPickupInStore && (
                      <Stack spacing={1.25} sx={{ mt: 1.5 }}>
                        <TextField
                          label="Tên người nhận"
                          value={recipientName}
                          onChange={(e) => setRecipientName(e.target.value)}
                          fullWidth
                        />
                        <TextField
                          label="Số điện thoại người nhận"
                          value={recipientPhone}
                          onChange={(e) => setRecipientPhone(e.target.value)}
                          fullWidth
                        />
                        <Autocomplete
                          options={provinces}
                          getOptionLabel={(option) => option.ProvinceName || ""}
                          value={selectedProvince}
                          onChange={(_, value) => {
                            setSelectedProvince(value);
                            setSelectedDistrict(null);
                            setSelectedWard(null);
                            setDistricts([]);
                            setWards([]);
                            if (value?.ProvinceID) {
                              loadDistricts(value.ProvinceID);
                            }
                          }}
                          loading={isLoadingProvinces}
                          renderInput={(params) => (
                            <TextField {...params} label="Tỉnh/Thành phố" />
                          )}
                        />
                        <Autocomplete
                          options={districts}
                          getOptionLabel={(option) => option.DistrictName || ""}
                          value={selectedDistrict}
                          onChange={(_, value) => {
                            setSelectedDistrict(value);
                            setSelectedWard(null);
                            setWards([]);
                            if (value?.DistrictID) {
                              loadWards(value.DistrictID);
                            }
                          }}
                          loading={isLoadingDistricts}
                          disabled={!selectedProvince}
                          renderInput={(params) => (
                            <TextField {...params} label="Quận/Huyện" />
                          )}
                        />
                        <Autocomplete
                          options={wards}
                          getOptionLabel={(option) => option.WardName || ""}
                          value={selectedWard}
                          onChange={(_, value) => setSelectedWard(value)}
                          loading={isLoadingWards}
                          disabled={!selectedDistrict}
                          renderInput={(params) => (
                            <TextField {...params} label="Phường/Xã" />
                          )}
                        />
                        <TextField
                          label="Địa chỉ cụ thể"
                          value={streetAddress}
                          onChange={(e) => setStreetAddress(e.target.value)}
                          fullWidth
                        />
                      </Stack>
                    )}
                  </>
                )}

                <TextField
                  select
                  fullWidth
                  label="Phương thức thanh toán"
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(e.target.value as PaymentMethod)
                  }
                  SelectProps={{
                    renderValue: (selected) =>
                      renderPaymentMethodOption(selected as PaymentMethod),
                  }}
                  sx={{ mt: 1.5 }}
                >
                  {selectablePaymentMethods.map((method) => (
                    <MenuItem key={method} value={method}>
                      {renderPaymentMethodOption(method)}
                    </MenuItem>
                  ))}
                </TextField>

                {failedPaymentAction ? (
                  <>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 1 }}
                    >
                      Đơn {failedPaymentAction.orderId} thanh toán lỗi. Bạn có
                      thể đổi phương thức và thử lại hoặc hủy đơn.
                    </Typography>
                    {!failedPaymentAction.paymentId && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mt: 0.75, display: "block" }}
                      >
                        Chưa nhận được paymentId từ hub, vui lòng chờ sự kiện
                        cập nhật.
                      </Typography>
                    )}
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1.25}
                      sx={{ mt: 1.5 }}
                    >
                      <Button
                        variant="contained"
                        size="large"
                        fullWidth
                        onClick={handleRetryFailedPayment}
                        disabled={
                          isRetryingPayment ||
                          isCancellingOrder ||
                          !failedPaymentAction.paymentId
                        }
                      >
                        {isRetryingPayment
                          ? "Đang thanh toán lại..."
                          : " Thanh toán lại"}
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        size="large"
                        fullWidth
                        onClick={openStaffCancelDialog}
                        disabled={isRetryingPayment || isCancellingOrder}
                      >
                        Hủy đơn
                      </Button>
                    </Stack>
                  </>
                ) : (
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    sx={{ mt: 1.75 }}
                    onClick={handleOpenCheckoutConfirm}
                    disabled={isSubmittingCheckout || cartItems.length === 0}
                  >
                    {isSubmittingCheckout ? "Đang checkout..." : "Checkout"}
                  </Button>
                )}

                {paymentQrUrl && (
                  <Box
                    sx={{
                      mt: 1.5,
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 2,
                      p: 1.5,
                      bgcolor: "grey.50",
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight={700} mb={1}>
                      Mã QR thanh toán (màn hình staff)
                    </Typography>
                    <Stack spacing={1.25} alignItems="center">
                      <Box
                        sx={{
                          border: "1px solid",
                          borderColor: "divider",
                          borderRadius: 2,
                          p: 1,
                          bgcolor: "white",
                        }}
                      >
                        <QRCodeSVG value={paymentQrUrl} size={200} />
                      </Box>

                      <Typography
                        variant="caption"
                        color="text.secondary"
                        textAlign="center"
                      >
                        QR sẽ tự hiển thị popup ở màn hình khách khi checkout có
                        link thanh toán.
                      </Typography>

                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        width="100%"
                      >
                        <Button
                          variant="outlined"
                          startIcon={<OpenInNew />}
                          fullWidth
                          onClick={() =>
                            window.open(
                              paymentQrUrl,
                              "_blank",
                              "noopener,noreferrer",
                            )
                          }
                        >
                          Mở link thanh toán
                        </Button>
                      </Stack>
                    </Stack>
                  </Box>
                )}
              </Box>
            </Paper>
          </Box>
        </Stack>

        <Dialog
          open={isCheckoutConfirmOpen}
          onClose={() => setIsCheckoutConfirmOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Xác nhận thông tin checkout</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={1.25}>
              <Stack direction="row" justifyContent="space-between">
                <Typography color="text.secondary">Hình thức nhận</Typography>
                <Typography fontWeight={600}>
                  {isPickupInStore
                    ? "Khách lấy tại quầy"
                    : "Giao về địa chỉ khách"}
                </Typography>
              </Stack>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography color="text.secondary">
                  Phương thức thanh toán
                </Typography>
                {renderPaymentMethodOption(paymentMethod)}
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography color="text.secondary">Khách hàng</Typography>
                <Typography fontWeight={600} textAlign="right">
                  {selectedCustomer
                    ? `${selectedCustomer.fullName} - ${selectedCustomer.phoneNumber}`
                    : "Khách lẻ"}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography color="text.secondary">Số sản phẩm</Typography>
                <Typography fontWeight={600}>
                  {groupedCartItems.length} dòng / {totalQuantityInCart} món
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography color="text.secondary">Mã giảm giá</Typography>
                <Typography fontWeight={600}>
                  {appliedVoucherCode || "Không áp dụng"}
                </Typography>
              </Stack>

              {!isPickupInStore && (
                <>
                  <Divider sx={{ my: 0.5 }} />
                  <Typography variant="subtitle2" fontWeight={700}>
                    Thông tin giao hàng
                  </Typography>
                  <Typography variant="body2">
                    {recipientName} - {recipientPhone}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {streetAddress}, {selectedWard?.WardName},{" "}
                    {selectedDistrict?.DistrictName},{" "}
                    {selectedProvince?.ProvinceName}
                  </Typography>
                </>
              )}

              <Divider sx={{ my: 0.5 }} />
              <Stack direction="row" justifyContent="space-between">
                <Typography color="text.secondary">Tổng thanh toán</Typography>
                <Typography fontWeight={800} color="error.main">
                  {formatCurrency(
                    Number(previewData?.totalPrice ?? localSubtotal),
                  )}
                </Typography>
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setIsCheckoutConfirmOpen(false)}
              disabled={isSubmittingCheckout}
            >
              Quay lại
            </Button>
            <Button
              variant="contained"
              onClick={async () => {
                setIsCheckoutConfirmOpen(false);
                await handleCheckoutInStore();
              }}
              disabled={isSubmittingCheckout}
            >
              Xác nhận checkout
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={isStaffCancelDialogOpen}
          onClose={() => setIsStaffCancelDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Hủy đơn hàng thất bại thanh toán</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={1.5}>
              <Typography variant="body2" color="text.secondary">
                Chọn lý do hủy phù hợp để cập nhật cho đơn hàng.
              </Typography>
              <TextField
                select
                fullWidth
                label="Lý do hủy"
                value={cancelReason}
                onChange={(e) =>
                  setCancelReason(e.target.value as CancelOrderReason)
                }
              >
                {STAFF_CANCEL_ORDER_REASON_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Ghi chú thêm (tuỳ chọn)"
                value={cancelNote}
                onChange={(e) => setCancelNote(e.target.value)}
                multiline
                minRows={3}
                fullWidth
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setIsStaffCancelDialogOpen(false)}
              disabled={isCancellingOrder}
            >
              Đóng
            </Button>
            <Button
              color="error"
              variant="contained"
              onClick={handleStaffCancelFailedOrder}
              disabled={isCancellingOrder}
            >
              {isCancellingOrder ? "Đang hủy..." : "Xác nhận hủy đơn"}
            </Button>
          </DialogActions>
        </Dialog>

        <BatchSelectionModal
          open={isBatchModalOpen}
          loading={isLoadingBatches}
          mode={batchModalMode}
          currentBatchCode={modalCurrentBatchCode}
          variantName={
            selectedVariant?.displayName || selectedVariant?.name || ""
          }
          batches={batchOptions}
          onClose={() => {
            setIsBatchModalOpen(false);
            setSelectedVariant(null);
            setEditingCartItemKey(null);
            setModalCurrentBatchCode(undefined);
          }}
          onSelectBatch={handleSelectBatch}
        />

        {/* Dialog 1: Xác nhận tiền mặt */}
        <Dialog
          open={isCashPaymentDialogOpen}
          onClose={() => {
            if (!isSubmittingCheckout) {
              setIsCashPaymentDialogOpen(false);
              setCashReceived("");
            }
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {cashDialogMode === "retry"
              ? "Thanh toán lại bằng tiền mặt"
              : "Xác nhận thanh toán tiền mặt"}
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between">
                <Typography color="text.secondary">Tổng tiền:</Typography>
                <Typography fontWeight={700} fontSize="1.1rem">
                  {formatCurrency(
                    pendingCheckoutPayload?.expectedTotalPrice ?? 0,
                  )}
                </Typography>
              </Stack>

              {/* Display số tiền khách đưa */}
              <Box>
                <Typography variant="caption" color="text.secondary" mb={0.5}>
                  Số tiền khách đưa
                </Typography>
                <Box
                  sx={{
                    border: 2,
                    borderColor: "primary.main",
                    borderRadius: 1,
                    p: 2,
                    bgcolor: "grey.50",
                    textAlign: "right",
                    minHeight: 56,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                  }}
                >
                  <Typography variant="h5" fontWeight={700} color="primary">
                    {cashReceived
                      ? new Intl.NumberFormat("vi-VN").format(
                          Number(cashReceived),
                        ) + "đ"
                      : "0đ"}
                  </Typography>
                </Box>
              </Box>

              {/* Numpad */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 1,
                }}
              >
                {[
                  "1",
                  "2",
                  "3",
                  "4",
                  "5",
                  "6",
                  "7",
                  "8",
                  "9",
                  "C",
                  "0",
                  "⌫",
                ].map((key) => (
                  <Button
                    key={key}
                    variant={key === "C" ? "outlined" : "contained"}
                    color={key === "C" ? "error" : "primary"}
                    size="large"
                    onClick={() => handleNumpadClick(key)}
                    sx={{
                      height: 56,
                      fontSize: "1.25rem",
                      fontWeight: 700,
                    }}
                  >
                    {key}
                  </Button>
                ))}
              </Box>

              {/* Shortcuts cho số tiền tròn */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 1,
                }}
              >
                {[
                  { label: "+10K", value: 10000 },
                  { label: "+50K", value: 50000 },
                  { label: "+100K", value: 100000 },
                  { label: "+200K", value: 200000 },
                  { label: "+500K", value: 500000 },
                  { label: "+1M", value: 1000000 },
                ].map((shortcut) => (
                  <Button
                    key={shortcut.value}
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      const current = Number(cashReceived) || 0;
                      setCashReceived(String(current + shortcut.value));
                    }}
                    sx={{ textTransform: "none" }}
                  >
                    {shortcut.label}
                  </Button>
                ))}
              </Box>

              {cashChangeAmount >= 0 && cashReceived && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Tiền thừa:</Typography>
                  <Typography fontWeight={700} fontSize="1.1rem" color="error">
                    {formatCurrency(cashChangeAmount)}
                  </Typography>
                </Stack>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setIsCashPaymentDialogOpen(false);
                setCashReceived("");
              }}
              disabled={isSubmittingCheckout}
            >
              Hủy
            </Button>
            <Button
              variant="contained"
              onClick={handleCashPaymentConfirm}
              disabled={
                isSubmittingCheckout ||
                !cashReceived ||
                Number(cashReceived) <
                  (pendingCheckoutPayload?.expectedTotalPrice ?? 0)
              }
            >
              {isSubmittingCheckout ? "Đang xử lý..." : "Xác nhận"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog 2: Thanh toán thành công & In hóa đơn */}
        <Dialog
          open={isSuccessDialogOpen}
          onClose={(_, reason) => {
            // Chỉ cho phép đóng bằng nút "Đóng & Đón khách mới"
            if (reason === "backdropClick" || reason === "escapeKeyDown") {
              return;
            }
          }}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Thanh toán thành công!</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} alignItems="center">
              <CheckCircleRounded
                sx={{ fontSize: 64, color: "success.main" }}
              />
              {successOrderId && (
                <Typography variant="body2" color="text.secondary">
                  Mã đơn hàng: <strong>{successOrderId}</strong>
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                Hóa đơn đã được in tự động.
              </Typography>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ justifyContent: "center", gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<PrintIcon />}
              onClick={handlePrint}
              disabled={isLoadingInvoice || !orderInvoice}
            >
              In lại
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={handleStartNewCustomer}
            >
              Đóng &amp; Đón khách mới
            </Button>
          </DialogActions>
        </Dialog>

        {/* Hidden ReceiptTemplate for printing */}
        <div style={{ display: "none" }}>
          <ReceiptTemplate ref={receiptRef} invoice={orderInvoice} />
        </div>
      </Container>
    </MainLayout>
  );
};
