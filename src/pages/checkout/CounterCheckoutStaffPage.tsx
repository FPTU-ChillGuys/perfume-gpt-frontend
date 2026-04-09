import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Add,
  CheckCircleRounded,
  Delete,
  OpenInNew,
  Remove,
  Search,
} from "@mui/icons-material";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
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
import { PosBarcodeScanner } from "@/components/checkout/PosBarcodeScanner";
import { useDebounce } from "@/hooks/useDebounce";
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
import { orderService } from "@/services/orderService";
import { addressService } from "@/services/addressService";
import type {
  CreateInStoreOrderRequest,
  PaymentMethod,
} from "@/types/checkout";
import { CANCEL_ORDER_REASON_OPTIONS } from "@/utils/cancelOrderReason";
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
  "ExternalBankTransfer",
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
  const [checkoutSuccessRef, setCheckoutSuccessRef] = useState<string | null>(
    null,
  );
  const [paymentQrUrl, setPaymentQrUrl] = useState<string | null>(null);
  const paymentQrUrlRef = useRef<string | null>(null);
  const handledPaymentEventRef = useRef<string>("");
  const handledPaymentFailedEventRef = useRef<string>("");
  const lastPaidOrderIdRef = useRef<string>("");
  const latestRetryOrderIdRef = useRef<string>("");
  const latestRetryPaymentIdRef = useRef<string>("");
  const syncCartToCustomerRef = useRef(syncCartToCustomer);
  const [failedPaymentAction, setFailedPaymentAction] =
    useState<FailedPaymentAction | null>(null);
  const [isRetryingPayment, setIsRetryingPayment] = useState(false);
  const [isCashRetryConfirmOpen, setIsCashRetryConfirmOpen] = useState(false);
  const [isStaffCancelDialogOpen, setIsStaffCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState<CancelOrderReason | "">("");
  const [cancelNote, setCancelNote] = useState("");
  const [isCancellingOrder, setIsCancellingOrder] = useState(false);

  const totalQuantityInCart = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [cartItems],
  );

  const paymentMethodsByMode = isPickupInStore
    ? PICKUP_PAYMENT_METHODS
    : DELIVERY_PAYMENT_METHODS;

  useEffect(() => {
    if (!checkoutSuccessRef) return;

    const timerId = window.setTimeout(() => {
      setCheckoutSuccessRef(null);
    }, 3200);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [checkoutSuccessRef]);

  useEffect(() => {
    paymentQrUrlRef.current = paymentQrUrl;
  }, [paymentQrUrl]);

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
    const rawMessage =
      paymentCompletedData.message ||
      (paymentCompletedData as { Message?: string }).Message ||
      "Đã xác nhận thanh toán thành công";
    const rawOrderId =
      paymentCompletedData.orderId ||
      (paymentCompletedData as { OrderId?: string }).OrderId ||
      "PAID";
    const rawPaymentId =
      paymentCompletedData.paymentId ||
      (paymentCompletedData as { PaymentId?: string }).PaymentId ||
      "";

    const status = rawStatus.toLowerCase();
    const eventKey = [rawOrderId, rawPaymentId, rawStatus, rawMessage].join(
      ":",
    );

    console.log("[POS][PAYMENT_COMPLETED_EVENT]", {
      orderId: rawOrderId,
      paymentId: rawPaymentId || null,
      status: rawStatus,
      message: rawMessage,
      eventKey,
    });

    if (handledPaymentEventRef.current === eventKey) return;
    handledPaymentEventRef.current = eventKey;

    if (status !== "success" && status !== "paid" && status !== "completed") {
      return;
    }

    paymentQrUrlRef.current = null;
    setPaymentQrUrl(null);
    setCheckoutSuccessRef(rawOrderId);
    lastPaidOrderIdRef.current = rawOrderId;

    void syncCartToCustomerRef.current({
      items: [],
      subTotal: 0,
      discount: 0,
      totalPrice: 0,
      paymentUrl: null,
    } satisfies CartDisplaySyncPayload);

    setFailedPaymentAction(null);

    // Dọn giỏ khi thanh toán thành công để bắt đầu ca mới
    setCartItems([]);
    setSearchResults([]);
    setSearchKeyword("");
    setVoucherInput("");
    setAppliedVoucherCode("");
    handleClearSelectedCustomer();
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

  const handleSearch = async () => {
    const value = searchKeyword.trim();
    if (!value) {
      showToast("Vui lòng nhập SKU hoặc tên sản phẩm", "warning");
      return;
    }

    try {
      setIsSearching(true);
      const found = await posService.searchVariantsForPos(value);

      if (found.length === 0) {
        setSearchResults([]);
        showToast("Không tìm thấy sản phẩm phù hợp", "info");
        return;
      }

      setSearchResults(found);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Không thể tìm sản phẩm",
        "error",
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleBarcodeDetected = useCallback(
    async (barcode: string) => {
      try {
        setIsSearching(true);
        const variant = await posService.getVariantByBarcode(barcode);

        if (!variant) {
          setSearchResults([]);
          showToast(`Không tìm thấy sản phẩm cho mã ${barcode}`, "warning");
          return;
        }

        setSearchResults([variant]);
        setSearchKeyword(barcode);
      } catch (error) {
        showToast(
          error instanceof Error ? error.message : "Không thể xử lý mã quét",
          "error",
        );
      } finally {
        setIsSearching(false);
      }
    },
    [showToast],
  );

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

  const finalizeRetryAsPaid = useCallback(
    (orderId: string, paymentId: string) => {
      paymentQrUrlRef.current = null;
      setPaymentQrUrl(null);
      setCheckoutSuccessRef(orderId);
      lastPaidOrderIdRef.current = orderId;
      setFailedPaymentAction(null);

      // Đồng bộ state local như luồng thanh toán thành công thông thường.
      setCartItems([]);
      setSearchResults([]);
      setSearchKeyword("");
      setVoucherInput("");
      setAppliedVoucherCode("");
      setCustomerLookupKeyword("");
      setCustomerLookupResults([]);
      setRecipientName("");
      setRecipientPhone("");
      setStreetAddress("");
      setSelectedProvince(null);
      setSelectedDistrict(null);
      setSelectedWard(null);
      setDistricts([]);
      setWards([]);
      handleClearSelectedCustomer();

      void syncCartToCustomerRef.current({
        items: [],
        subTotal: 0,
        discount: 0,
        totalPrice: 0,
        paymentUrl: null,
      } satisfies CartDisplaySyncPayload);

      console.log("[POS][NOTIFY_SUCCESS] Start", {
        orderId,
        paymentId,
        posSessionId: POS_SESSION_ID,
      });

      void notifyPaymentSuccess({
        orderId,
        paymentId,
        status: "Success",
        message: "Thanh toán thành công",
      })
        .then(() => {
          console.log("[POS][NOTIFY_SUCCESS] Success", {
            orderId,
            paymentId,
          });
        })
        .catch((error) => {
          console.warn("[POS][NOTIFY_SUCCESS] Failed", {
            orderId,
            paymentId,
            error:
              error instanceof Error
                ? error.message
                : "Unknown notifyPaymentSuccess error",
          });
        });
    },
    [notifyPaymentSuccess],
  );

  const executeRetryFailedPayment = useCallback(
    async (requiresCashConfirm: boolean) => {
      if (!failedPaymentAction?.paymentId) {
        showToast("Không tìm thấy paymentId để thử lại", "warning");
        return;
      }

      try {
        setIsRetryingPayment(true);
        // Allow re-processing the same fail/success DTO after a new retry attempt.
        handledPaymentFailedEventRef.current = "";
        handledPaymentEventRef.current = "";

        const retryCallId = createDebugCallId("pos-retry");
        console.log("[POS][RETRY] Start", {
          retryCallId,
          orderId: failedPaymentAction.orderId,
          previousPaymentId: failedPaymentAction.paymentId,
          method: paymentMethod,
          requiresCashConfirm,
          posSessionId: POS_SESSION_ID,
        });

        const result = await orderService.retryPayment(
          failedPaymentAction.paymentId,
          paymentMethod,
          POS_SESSION_ID,
          retryCallId,
        );

        console.log("[POS][RETRY] Response", {
          retryCallId,
          result,
        });

        const paymentIdFromRetryResponse = (result.paymentId || "").trim();
        const paymentIdFromRetryUrl = extractPaymentIdFromRetryUrl(result.url);
        const paymentIdForRetry =
          paymentIdFromRetryResponse ||
          paymentIdFromRetryUrl ||
          failedPaymentAction.paymentId;

        latestRetryOrderIdRef.current = failedPaymentAction.orderId;
        latestRetryPaymentIdRef.current = paymentIdForRetry;

        console.log("[POS][RETRY] PaymentId resolution", {
          retryCallId,
          previousPaymentId: failedPaymentAction.paymentId,
          paymentIdFromRetryResult: paymentIdFromRetryResponse || null,
          paymentIdFromRetryUrl: paymentIdFromRetryUrl || null,
          paymentIdUsedForNextStep: paymentIdForRetry,
        });

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
          const confirmCallId = `${retryCallId}-confirm`;
          console.log("[POS][CONFIRM] Start", {
            confirmCallId,
            fromRetryCallId: retryCallId,
            orderId: failedPaymentAction.orderId,
            paymentIdUsedForConfirm: paymentIdForRetry,
            payload: {
              isSuccess: true,
              failureReason: undefined,
            },
          });

          await orderService.confirmPayment(
            paymentIdForRetry,
            true,
            undefined,
            confirmCallId,
          );

          console.log("[POS][CONFIRM] Success", {
            confirmCallId,
            paymentIdUsedForConfirm: paymentIdForRetry,
          });

          finalizeRetryAsPaid(failedPaymentAction.orderId, paymentIdForRetry);
          showToast("Đã xác nhận thanh toán tiền mặt", "success");
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
      }
    },
    [
      cartItems,
      failedPaymentAction,
      finalizeRetryAsPaid,
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

    console.log("[POS][PAYMENT_FAILED_EVENT]", {
      orderId: rawOrderId,
      paymentId: rawPaymentId || null,
      status,
      message: rawMessage,
      failedEventKey,
    });

    const activeRetryOrderId =
      latestRetryOrderIdRef.current || failedPaymentAction?.orderId || "";
    const activeRetryPaymentId =
      latestRetryPaymentIdRef.current || failedPaymentAction?.paymentId || "";

    if (
      rawOrderId &&
      activeRetryOrderId &&
      rawOrderId === activeRetryOrderId &&
      rawPaymentId &&
      activeRetryPaymentId &&
      rawPaymentId !== activeRetryPaymentId
    ) {
      console.log(
        "[POS][PAYMENT_FAILED_EVENT] Ignored stale fail for previous paymentId",
        {
          orderId: rawOrderId,
          stalePaymentId: rawPaymentId,
          activePaymentId: activeRetryPaymentId,
          activeRetryOrderId,
        },
      );
      handledPaymentFailedEventRef.current = failedEventKey;
      return;
    }

    if (rawOrderId && rawOrderId === lastPaidOrderIdRef.current) {
      console.log(
        "[POS][PAYMENT_FAILED_EVENT] Ignored stale fail after success",
        {
          orderId: rawOrderId,
          paymentId: rawPaymentId || null,
          lastPaidOrderId: lastPaidOrderIdRef.current,
        },
      );
      handledPaymentFailedEventRef.current = failedEventKey;
      return;
    }

    handledPaymentFailedEventRef.current = failedEventKey;

    paymentQrUrlRef.current = null;
    setPaymentQrUrl(null);

    showToast(rawMessage, "error");

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

    if (previewData) {
      void syncCartToCustomerRef.current(toCartDisplaySyncPayload(previewData));
    } else {
      void syncCartToCustomerRef.current({
        ...toFallbackCartDisplaySyncPayload(),
        paymentUrl: null,
      });
    }
  }, [
    failedPaymentAction?.orderId,
    failedPaymentAction?.paymentId,
    paymentFailedData,
    previewData,
    showToast,
    toCartDisplaySyncPayload,
    toFallbackCartDisplaySyncPayload,
  ]);

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
      console.log("[POS][PAYMENT_LINK_UPDATED_EVENT] Ignored after success", {
        orderId: rawOrderId,
        paymentId: rawPaymentId,
        lastPaidOrderId: lastPaidOrderIdRef.current,
      });
      return;
    }

    console.log("[POS][PAYMENT_LINK_UPDATED_EVENT]", {
      orderId: rawOrderId,
      paymentId: rawPaymentId,
      paymentUrl: rawPaymentUrl,
    });

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

    const currentPayload = previewData
      ? toCartDisplaySyncPayload(previewData)
      : toFallbackCartDisplaySyncPayload();

    void syncCartToCustomerRef.current({
      ...currentPayload,
      paymentUrl: rawPaymentUrl,
    });
  }, [
    paymentLinkUpdatedData,
    previewData,
    toCartDisplaySyncPayload,
    toFallbackCartDisplaySyncPayload,
  ]);

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
    setIsCheckoutConfirmOpen(true);
  };

  const handleRetryFailedPayment = () => {
    if (!failedPaymentAction?.paymentId) {
      showToast("Không tìm thấy paymentId để thử lại", "warning");
      return;
    }

    if (paymentMethod === "CashInStore") {
      setIsCashRetryConfirmOpen(true);
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
      // 2. NẾU LÀ TIỀN MẶT TẠI QUẦY (KHÔNG CÓ QR) -> Chạy logic như cũ
      paymentQrUrlRef.current = null;
      setPaymentQrUrl(null);
      setCheckoutSuccessRef(result.orderId ?? "");
      if (paymentMethodAtCheckout === "CashInStore") {
        void (async () => {
          try {
            const paymentId = result.orderId?.trim();

            if (!paymentId) {
              showToast(
                "Checkout tiền mặt thành công nhưng thiếu paymentId để xác nhận tự động",
                "warning",
              );
              return;
            }
            setCartItems([]);
            setSearchResults([]);
            await orderService.confirmPayment(paymentId, true);
          } catch {
            showToast(
              "Đơn đã tạo nhưng xác nhận thanh toán tiền mặt tự động thất bại",
              "warning",
            );
          }
        })();
      }

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
          alignItems={{ xs: "stretch", lg: "flex-start" }}
        >
          <Box flex={1} width="100%">
            <Paper
              sx={{
                ...panelSx,
                display: "flex",
                flexDirection: "column",
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
                  maxHeight: { xs: 380, lg: 320 },
                  overflow: "auto",
                  minHeight: 180,
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

                          <Typography fontWeight={800} color="text.primary">
                            {formatCurrency(
                              group.unitPrice * group.totalQuantity,
                            )}
                          </Typography>
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
                    <Typography>{formatCurrency(localSubtotal)}</Typography>
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

              <Box
                sx={{
                  mt: 2,
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
                  {paymentMethodsByMode.map((method) => (
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

          <Box flex={1} width="100%">
            <Paper
              sx={{
                ...panelSx,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Typography variant="h6" fontWeight={700} mb={2}>
                Tìm kiếm và quét mã
              </Typography>

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.25}
                mb={2}
              >
                <TextField
                  label="Nhập SKU hoặc tên sản phẩm"
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
                  aria-label="Tìm kiếm theo SKU hoặc tên sản phẩm"
                  startIcon={
                    isSearching ? (
                      <CircularProgress color="inherit" size={16} />
                    ) : (
                      <Search />
                    )
                  }
                  onClick={handleSearch}
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

              <PosBarcodeScanner onDetected={handleBarcodeDetected} />
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

        {checkoutSuccessRef && (
          <Box
            sx={{
              position: "fixed",
              inset: 0,
              zIndex: (theme) => theme.zIndex.modal + 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "rgba(2, 6, 23, 0.45)",
              backdropFilter: "blur(2px)",
            }}
          >
            <Box
              sx={{
                width: "min(92vw, 440px)",
                borderRadius: 3,
                bgcolor: "background.paper",
                textAlign: "center",
                px: 4,
                py: 4.5,
                boxShadow: "0 24px 60px rgba(2, 6, 23, 0.28)",
                "@keyframes checkoutSuccessCard": {
                  "0%": {
                    transform: "translateY(10px) scale(0.94)",
                    opacity: 0,
                  },
                  "100%": { transform: "translateY(0) scale(1)", opacity: 1 },
                },
                animation: "checkoutSuccessCard 260ms ease-out",
              }}
            >
              <Box
                sx={{
                  position: "relative",
                  width: 104,
                  height: 104,
                  mx: "auto",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  "@keyframes checkoutSuccessPop": {
                    "0%": { transform: "scale(0.7)", opacity: 0 },
                    "60%": { transform: "scale(1.08)", opacity: 1 },
                    "100%": { transform: "scale(1)", opacity: 1 },
                  },
                  "@keyframes checkoutSuccessRipple": {
                    "0%": { transform: "scale(0.6)", opacity: 0.55 },
                    "100%": { transform: "scale(1.45)", opacity: 0 },
                  },
                  "&::before, &::after": {
                    content: '""',
                    position: "absolute",
                    inset: 8,
                    borderRadius: "50%",
                    border: "2px solid",
                    borderColor: "success.light",
                    animation: "checkoutSuccessRipple 1.25s ease-out infinite",
                  },
                  "&::after": {
                    animationDelay: "0.45s",
                  },
                }}
              >
                <CheckCircleRounded
                  sx={{
                    fontSize: 84,
                    color: "success.main",
                    animation: "checkoutSuccessPop 520ms ease-out",
                  }}
                />
              </Box>
              <Typography variant="h5" fontWeight={800} mt={1.5}>
                Thanh toán thành công
              </Typography>
              {checkoutSuccessRef && (
                <Typography variant="body2" color="text.secondary" mt={0.75}>
                  Mã tham chiếu: {checkoutSuccessRef}
                </Typography>
              )}
            </Box>
          </Box>
        )}

        <Dialog
          open={isCashRetryConfirmOpen}
          onClose={() => setIsCashRetryConfirmOpen(false)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Xác nhận đã nhận tiền mặt</DialogTitle>
          <DialogContent dividers>
            <Typography variant="body2" color="text.secondary">
              Bạn xác nhận đã nhận đủ tiền từ khách hàng cho đơn này? Sau khi
              xác nhận, hệ thống sẽ gọi retry thanh toán bằng tiền mặt và
              confirm payment ngay lập tức.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setIsCashRetryConfirmOpen(false)}
              disabled={isRetryingPayment}
            >
              Chưa
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                setIsCashRetryConfirmOpen(false);
                void executeRetryFailedPayment(true);
              }}
              disabled={isRetryingPayment}
            >
              {isRetryingPayment ? "Đang xử lý..." : "Đã nhận tiền"}
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
                {CANCEL_ORDER_REASON_OPTIONS.map((option) => (
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
      </Container>
    </MainLayout>
  );
};
