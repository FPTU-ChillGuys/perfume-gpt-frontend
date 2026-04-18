import { useState, useEffect } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Button,
  Paper,
  Divider,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Autocomplete,
  Stack,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import {
  LocalShipping,
  Store,
  CheckCircle,
  ArrowBack,
  LocalOffer,
} from "@mui/icons-material";
import { MainLayout } from "@/layouts/MainLayout";
import { orderService } from "@/services/orderService";
import { addressService } from "@/services/addressService";
import { cartService } from "@/services/cartService";
import { aiAcceptanceService } from "@/services/ai/aiAcceptanceService";
import { useToast } from "@/hooks/useToast";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import {
  voucherService,
  type ApplicableVoucherCartItemRequest,
} from "@/services/voucherService";
import { VoucherPickerDialog } from "@/components/common/VoucherPickerDialog";
import type {
  AddressResponse,
  ProvinceResponse,
  DistrictResponse,
  WardResponse,
} from "@/types/address";
import type { PaymentMethod, CreateOrderRequest } from "@/types/checkout";
import type { CartItem, CartTotals, ApplyVoucherResponse } from "@/types/cart";
import codIcon from "@/assets/cod.png";
import storeIcon from "@/assets/store.png";
import vnpayIcon from "@/assets/vnpay.jpg";
import momoIcon from "@/assets/momo.png";
import payOsIcon from "@/assets/payos.png";

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat("vi-VN").format(Number(value ?? 0)) + "đ";

const PAYMENT_METHODS: {
  value: PaymentMethod;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    value: "CashOnDelivery",
    label: "Thanh toán khi nhận hàng",
    description: "Thanh toán bằng tiền mặt khi nhận hàng",
    icon: codIcon,
  },
  {
    value: "CashInStore",
    label: "Thanh toán tại cửa hàng",
    description: "Thanh toán trực tiếp tại cửa hàng",
    icon: storeIcon,
  },
  {
    value: "VnPay",
    label: "VNPay",
    description: "Thanh toán qua VNPay",
    icon: vnpayIcon,
  },
  {
    value: "Momo",
    label: "MoMo",
    description: "Thanh toán qua MoMo",
    icon: momoIcon,
  },
  {
    value: "PayOs",
    label: "PayOS",
    description: "Thanh toán qua PayOS",
    icon: payOsIcon,
  },
];

export const CheckoutPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { refreshCart } = useCart();
  const { user } = useAuth();

  const selectedFromCart =
    (
      location.state as
        | {
            selectedCartItemIds?: string[];
            voucherCode?: string;
          }
        | undefined
    )?.selectedCartItemIds || [];

  const voucherCodeFromCart = (
    location.state as
      | {
          voucherCode?: string;
        }
      | undefined
  )?.voucherCode;

  // State
  const [isPickupInStore, setIsPickupInStore] = useState(false);
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("CashOnDelivery");
  const [addresses, setAddresses] = useState<AddressResponse[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] =
    useState<ApplyVoucherResponse | null>(null);

  // New address form
  const [newAddress, setNewAddress] = useState({
    recipientName: "",
    recipientPhoneNumber: "",
    street: "",
    provinceId: undefined as number | undefined,
    provinceName: "",
    districtId: undefined as number | undefined,
    districtName: "",
    wardCode: "",
    wardName: "",
  });

  // Location data
  const [provinces, setProvinces] = useState<ProvinceResponse[]>([]);
  const [districts, setDistricts] = useState<DistrictResponse[]>([]);
  const [wards, setWards] = useState<WardResponse[]>([]);
  const [selectedProvince, setSelectedProvince] =
    useState<ProvinceResponse | null>(null);
  const [selectedDistrict, setSelectedDistrict] =
    useState<DistrictResponse | null>(null);
  const [selectedWard, setSelectedWard] = useState<WardResponse | null>(null);

  // Cart data
  const [items, setItems] = useState<CartItem[]>([]);
  const [allCartItemIds, setAllCartItemIds] = useState<string[]>([]);
  const [selectedCartItemIds, setSelectedCartItemIds] = useState<string[]>([]);
  const [totals, setTotals] = useState<CartTotals>({
    subtotal: 0,
    shippingFee: 0,
    discount: 0,
    totalPrice: 0,
  });
  const [totalsWarningMessage, setTotalsWarningMessage] = useState<
    string | null
  >(null);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);
  const [isLoadingWards, setIsLoadingWards] = useState(false);
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [voucherPickerOpen, setVoucherPickerOpen] = useState(false);
  const [loadingMyVouchers, setLoadingMyVouchers] = useState(false);

  useEffect(() => {
    loadData();
    loadProvinces();
    // Load voucher from navigation state or sessionStorage
    const sessionVoucher = sessionStorage.getItem("appliedVoucherCode");
    if (voucherCodeFromCart) {
      setVoucherCode(voucherCodeFromCart);
    } else if (sessionVoucher) {
      setVoucherCode(sessionVoucher);
    }

    // Cleanup: Remove voucher when leaving checkout (unless going back to cart)
    return () => {
      // Small delay to check where we're navigating
      setTimeout(() => {
        const currentPath = window.location.pathname;
        // Only keep voucher if navigating to cart
        if (!currentPath.includes("/cart")) {
          sessionStorage.removeItem("appliedVoucherCode");
        }
      }, 100);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPaymentMethod(isPickupInStore ? "CashInStore" : "CashOnDelivery");
  }, [isPickupInStore]);

  const allowedPaymentMethods: PaymentMethod[] = isPickupInStore
    ? ["CashInStore", "VnPay", "Momo", "PayOs"]
    : ["CashOnDelivery", "VnPay", "Momo", "PayOs"];

  // Update totals khi địa chỉ hoặc các thông tin liên quan thay đổi
  useEffect(() => {
    // Chỉ update nếu không đang loading ban đầu và có items trong cart
    if (!isLoading && items.length > 0) {
      updateTotalsWithAddress();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isPickupInStore,
    selectedCartItemIds,
    selectedAddressId,
    useNewAddress,
    newAddress.districtId,
    newAddress.wardCode,
  ]);

  // Auto-apply voucher from cart or sessionStorage
  useEffect(() => {
    if (
      !isLoading &&
      items.length > 0 &&
      !appliedVoucher &&
      voucherCode.trim()
    ) {
      // Check if voucher is from cart or session
      const hasVoucherToApply =
        voucherCodeFromCart || sessionStorage.getItem("appliedVoucherCode");
      if (hasVoucherToApply) {
        setTimeout(() => {
          void applyVoucher();
        }, 300);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, voucherCode, items.length]);

  const shouldQuerySelectedItems = (
    allItemIds: string[],
    selectedIds: string[],
  ) => selectedIds.length > 0 && selectedIds.length < allItemIds.length;

  const loadProvinces = async () => {
    setIsLoadingProvinces(true);
    try {
      const data = await addressService.getProvinces();
      setProvinces(data);
    } catch (err) {
      console.error("Failed to load provinces:", err);
    } finally {
      setIsLoadingProvinces(false);
    }
  };

  const loadDistricts = async (provinceId: number) => {
    setIsLoadingDistricts(true);
    try {
      const data = await addressService.getDistricts(provinceId);
      setDistricts(data);
    } catch (err) {
      console.error("Failed to load districts:", err);
    } finally {
      setIsLoadingDistricts(false);
    }
  };

  const loadWards = async (districtId: number) => {
    setIsLoadingWards(true);
    try {
      const data = await addressService.getWards(districtId);
      setWards(data);
    } catch (err) {
      console.error("Failed to load wards:", err);
    } finally {
      setIsLoadingWards(false);
    }
  };

  const handleProvinceChange = (_: any, newValue: ProvinceResponse | null) => {
    setSelectedProvince(newValue);
    setSelectedDistrict(null);
    setSelectedWard(null);
    setDistricts([]);
    setWards([]);

    if (newValue) {
      setNewAddress((prev) => ({
        ...prev,
        provinceName: newValue.ProvinceName || "",
        provinceId: newValue.ProvinceID,
        districtName: "",
        districtId: undefined,
        wardName: "",
        wardCode: "",
      }));
      if (newValue.ProvinceID) {
        loadDistricts(newValue.ProvinceID);
      }
    } else {
      setNewAddress((prev) => ({
        ...prev,
        provinceName: "",
        provinceId: undefined,
        districtName: "",
        districtId: undefined,
        wardName: "",
        wardCode: "",
      }));
    }
  };

  const handleDistrictChange = (_: any, newValue: DistrictResponse | null) => {
    setSelectedDistrict(newValue);
    setSelectedWard(null);
    setWards([]);

    if (newValue) {
      setNewAddress((prev) => ({
        ...prev,
        districtName: newValue.DistrictName || "",
        districtId: newValue.DistrictID,
        wardName: "",
        wardCode: "",
      }));
      if (newValue.DistrictID) {
        loadWards(newValue.DistrictID);
      }
    } else {
      setNewAddress((prev) => ({
        ...prev,
        districtName: "",
        districtId: undefined,
        wardName: "",
        wardCode: "",
      }));
    }
  };

  const handleWardChange = (_: any, newValue: WardResponse | null) => {
    setSelectedWard(newValue);

    if (newValue) {
      setNewAddress((prev) => ({
        ...prev,
        wardName: newValue.WardName || "",
        wardCode: newValue.WardCode || "",
      }));
    } else {
      setNewAddress((prev) => ({
        ...prev,
        wardName: "",
        wardCode: "",
      }));
    }
  };

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Load addresses and cart
      const [addressList, cartItems] = await Promise.all([
        addressService.getAddresses().catch(() => [] as AddressResponse[]),
        cartService.getItems(),
      ]);

      const allItemIds = cartItems
        .map((item) => item.cartItemId)
        .filter(Boolean) as string[];
      const validSelectedIds = selectedFromCart.filter((id) =>
        allItemIds.includes(id),
      );
      const effectiveSelectedIds =
        validSelectedIds.length > 0 ? validSelectedIds : allItemIds;
      const visibleItems = cartItems.filter((item) =>
        item.cartItemId
          ? effectiveSelectedIds.includes(item.cartItemId)
          : false,
      );

      // Set default address if exists (before fetching totals so we can pass address info to API)
      const defaultAddr = addressList.find((addr) => addr.isDefault);
      const defaultAddressId = defaultAddr?.id || "";

      // Build address params for initial totals fetch
      const addressParams = {
        savedAddressId:
          defaultAddr && defaultAddressId ? defaultAddressId : undefined,
        districtId: undefined as number | undefined,
        wardCode: undefined as string | undefined,
      };

      const itemIdsForQuery = shouldQuerySelectedItems(
        allItemIds,
        effectiveSelectedIds,
      )
        ? effectiveSelectedIds
        : undefined;

      const totalsData = await cartService.getTotals(
        undefined,
        itemIdsForQuery,
        addressParams.districtId,
        addressParams.wardCode,
        addressParams.savedAddressId,
      );

      setAddresses(addressList);
      setAllCartItemIds(allItemIds);
      setItems(visibleItems);
      setSelectedCartItemIds(effectiveSelectedIds);
      setTotals(totalsData);

      // Set default address or enable new address form for new users
      if (defaultAddressId) {
        setSelectedAddressId(defaultAddressId);
      } else if (addressList.length === 0) {
        // Auto-enable new address form for users with no saved addresses
        setUseNewAddress(true);
      }
    } catch (error) {
      showToast("Không thể tải dữ liệu. Vui lòng thử lại.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Update totals bằng /api/cart/total; gửi thông tin địa chỉ để tính shipping fee
  const updateTotalsWithAddress = async (
    voucherCodeOverride?: string | null,
  ): Promise<CartTotals | null> => {
    const activeVoucher =
      voucherCodeOverride !== undefined
        ? voucherCodeOverride || undefined
        : appliedVoucher?.voucherCode || undefined;
    try {
      if (selectedCartItemIds.length === 0) {
        setTotals({ subtotal: 0, shippingFee: 0, discount: 0, totalPrice: 0 });
        setTotalsWarningMessage(null);
        return null;
      }

      const itemIdsForQuery = shouldQuerySelectedItems(
        allCartItemIds,
        selectedCartItemIds,
      )
        ? selectedCartItemIds
        : undefined;

      // Xác định tham số địa chỉ dựa trên phương thức giao hàng
      const addressParams = !isPickupInStore
        ? useNewAddress
          ? {
              savedAddressId: undefined,
              districtId: newAddress.districtId,
              wardCode: newAddress.wardCode,
            }
          : selectedAddressId
            ? {
                savedAddressId: selectedAddressId,
                districtId: undefined,
                wardCode: undefined,
              }
            : {
                savedAddressId: undefined,
                districtId: undefined,
                wardCode: undefined,
              }
        : {
            // Nếu isPickupInStore = true, không gửi address info
            savedAddressId: undefined,
            districtId: undefined,
            wardCode: undefined,
          };

      const totalsData = await cartService.getTotals(
        activeVoucher,
        itemIdsForQuery,
        addressParams.districtId,
        addressParams.wardCode,
        addressParams.savedAddressId,
      );
      setTotals(totalsData);
      setTotalsWarningMessage(totalsData.warningMessage || null);
      return totalsData;
    } catch (error) {
      console.error("Error updating totals with address:", error);
      setTotalsWarningMessage(null);
      // Đối với voucher error, throw lại để preserve message từ server
      if (voucherCodeOverride !== undefined) {
        throw error;
      }
      // Không hiển thị toast để tránh spam khi user đang nhập
      return null;
    }
  };

  const getCartItemsForVoucher = (): ApplicableVoucherCartItemRequest[] => {
    return items
      .filter((item) => selectedCartItemIds.includes(item.cartItemId!))
      .map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
        price: item.variantPrice,
      }));
  };

  const applyVoucher = async (code?: string) => {
    const normalizedVoucher = (code || voucherCode).trim();

    if (!normalizedVoucher) {
      return;
    }

    if (
      appliedVoucher &&
      appliedVoucher.voucherCode.toLowerCase() ===
        normalizedVoucher.toLowerCase()
    ) {
      return;
    }

    setVoucherError(null);
    setIsApplyingVoucher(true);
    try {
      const updatedTotals = await updateTotalsWithAddress(normalizedVoucher);

      if (!updatedTotals) {
        setAppliedVoucher(null);
        setVoucherError("Mã giảm giá không khả dụng. Vui lòng thử lại.");
        return;
      }

      setAppliedVoucher({
        voucherCode: normalizedVoucher,
        discountAmount: updatedTotals?.discount ?? 0,
        finalAmount: updatedTotals?.totalPrice ?? 0,
        message: "", // No message to avoid display
      });
      setVoucherCode(normalizedVoucher);
      // Save to sessionStorage for sync with cart
      sessionStorage.setItem("appliedVoucherCode", normalizedVoucher);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Mã giảm giá không hợp lệ";
      setVoucherError(msg || "Mã giảm giá không khả dụng. Vui lòng thử lại.");
    } finally {
      setIsApplyingVoucher(false);
    }
  };

  const removeVoucher = async () => {
    setIsApplyingVoucher(true);
    try {
      // Reset voucher state
      setAppliedVoucher(null);
      setVoucherCode("");
      setVoucherError(null);
      // Remove from sessionStorage when user manually removes voucher
      sessionStorage.removeItem("appliedVoucherCode");

      // Update totals - truyền null để tránh stale closure
      await updateTotalsWithAddress(null);
    } catch (error) {
      // Silent error
    } finally {
      setIsApplyingVoucher(false);
    }
  };

  const handleCheckout = async () => {
    try {
      setIsSubmitting(true);

      // Validate delivery address
      if (!isPickupInStore) {
        if (!useNewAddress && !selectedAddressId) {
          showToast("Vui lòng chọn địa chỉ giao hàng", "warning");
          return;
        }
      }

      if (
        useNewAddress &&
        (!newAddress.recipientName ||
          !newAddress.recipientPhoneNumber ||
          !newAddress.street ||
          !newAddress.provinceId ||
          !newAddress.districtId ||
          !newAddress.wardCode)
      ) {
        showToast("Vui lòng điền đầy đủ thông tin địa chỉ", "warning");
        return;
      }

      if (selectedCartItemIds.length === 0) {
        showToast("Vui lòng chọn sản phẩm để thanh toán", "warning");
        return;
      }

      // Build request following API nullable contract.
      const request: CreateOrderRequest = {
        voucherCode: voucherCode || null,
        itemIds: selectedCartItemIds,
        expectedTotalPrice: totals.totalPrice ?? null,
        deliveryMethod: isPickupInStore ? "PickupInStore" : "Delivery",
        savedAddressId: null,
        recipient: null,
        payment: {
          method: paymentMethod,
          posSessionId: null,
        },
      };

      // Add recipient info based on delivery method
      if (!isPickupInStore) {
        // Giao hàng tận nơi
        if (useNewAddress) {
          // Nhập địa chỉ mới -> truyền đầy đủ thông tin recipient
          request.savedAddressId = null;
          request.recipient = {
            contactName: newAddress.recipientName,
            contactPhoneNumber: newAddress.recipientPhoneNumber,
            districtId: newAddress.districtId || 0,
            districtName: newAddress.districtName,
            wardCode: newAddress.wardCode,
            wardName: newAddress.wardName,
            provinceId: newAddress.provinceId || 0,
            provinceName: newAddress.provinceName,
            fullAddress: newAddress.street,
          };
        } else {
          // Chọn địa chỉ có sẵn -> truyền savedAddressId để backend resolve địa chỉ
          request.savedAddressId = selectedAddressId || null;
          request.recipient = null;
        }
      } else {
        // Nhận tại cửa hàng -> không cần thông tin địa chỉ giao hàng
        request.savedAddressId = null;
        request.recipient = null;
      }

      // Call checkout API
      const response = await orderService.checkout(request);

      // Update AI acceptance for all cart items with status = true
      if (user?.id) {
        try {
          for (const item of items) {
            const cartItemId = item.cartItemId;
            if (cartItemId) {
              await aiAcceptanceService.updateCheckoutAcceptance(
                user.id,
                cartItemId,
                true,
              );
            }
          }
        } catch (e) {
          console.error("Failed to update AI acceptance on checkout:", e);
          // Don't fail the checkout if acceptance update fails
        }
      }

      // Clear cart
      await refreshCart();

      // Clear applied voucher from sessionStorage
      sessionStorage.removeItem("appliedVoucherCode");

      // Handle payment redirect
      if (
        paymentMethod === "VnPay" ||
        paymentMethod === "Momo" ||
        paymentMethod === "PayOs"
      ) {
        if (response.url) {
          window.location.href = response.url;
        } else {
          showToast("Không thể chuyển đến trang thanh toán", "error");
        }
      } else {
        const successParams = new URLSearchParams();
        if (response.orderId) {
          successParams.set("orderId", response.orderId);
        }
        successParams.set("source", "checkout");
        navigate(`/payment/success?${successParams.toString()}`);
      }
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Đặt hàng thất bại",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="50vh"
          >
            <CircularProgress />
          </Box>
        </Container>
      </MainLayout>
    );
  }

  if (items.length === 0) {
    return (
      <MainLayout>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="info">
            Giỏ hàng trống. Vui lòng thêm sản phẩm trước khi thanh toán.
          </Alert>
          <Button
            variant="contained"
            component={RouterLink}
            to="/"
            sx={{ mt: 2 }}
          >
            Tiếp tục mua sắm
          </Button>
        </Container>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" alignItems="center" gap={2} mb={4}>
          <Button
            startIcon={<ArrowBack />}
            component={RouterLink}
            to="/cart"
            variant="outlined"
            sx={{ minWidth: "auto" }}
          >
            Quay lại
          </Button>
          <Typography variant="h4" fontWeight="bold">
            Thanh toán
          </Typography>
        </Box>

        <Box
          display="grid"
          gridTemplateColumns={{ xs: "1fr", md: "2fr 1fr" }}
          gap={4}
        >
          {/* Left: Checkout Form */}
          <Box>
            {/* Delivery Method */}
            <Box mb={3}>
              <Typography variant="h6" fontWeight={600} mb={2}>
                Phương thức nhận hàng
              </Typography>
              <Box
                display="grid"
                gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr" }}
                gap={2}
              >
                <Card
                  onClick={() => setIsPickupInStore(false)}
                  sx={{
                    cursor: "pointer",
                    border: 2,
                    borderColor: !isPickupInStore ? "primary.main" : "divider",
                    bgcolor: !isPickupInStore
                      ? "primary.50"
                      : "background.paper",
                    transition: "all 0.2s ease",
                    position: "relative",
                    "&:hover": {
                      borderColor: "primary.main",
                      boxShadow: 2,
                    },
                  }}
                >
                  <CardContent sx={{ textAlign: "center", py: 3 }}>
                    <LocalShipping
                      sx={{
                        fontSize: 48,
                        color: !isPickupInStore
                          ? "primary.main"
                          : "text.secondary",
                        mb: 1,
                      }}
                    />
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      Giao hàng tận nơi
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Giao hàng đến địa chỉ của bạn
                    </Typography>
                    {!isPickupInStore && (
                      <CheckCircle
                        sx={{
                          position: "absolute",
                          top: 12,
                          right: 12,
                          color: "primary.main",
                        }}
                      />
                    )}
                  </CardContent>
                </Card>

                <Card
                  onClick={() => setIsPickupInStore(true)}
                  sx={{
                    cursor: "pointer",
                    border: 2,
                    borderColor: isPickupInStore ? "primary.main" : "divider",
                    bgcolor: isPickupInStore
                      ? "primary.50"
                      : "background.paper",
                    transition: "all 0.2s ease",
                    position: "relative",
                    "&:hover": {
                      borderColor: "primary.main",
                      boxShadow: 2,
                    },
                  }}
                >
                  <CardContent sx={{ textAlign: "center", py: 3 }}>
                    <Store
                      sx={{
                        fontSize: 48,
                        color: isPickupInStore
                          ? "primary.main"
                          : "text.secondary",
                        mb: 1,
                      }}
                    />
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      Nhận tại cửa hàng
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Nhận hàng trực tiếp tại cửa hàng
                    </Typography>
                    {isPickupInStore && (
                      <CheckCircle
                        sx={{
                          position: "absolute",
                          top: 12,
                          right: 12,
                          color: "primary.main",
                        }}
                      />
                    )}
                  </CardContent>
                </Card>
              </Box>
            </Box>

            {/* Address Selection - Only show if delivery */}
            {!isPickupInStore && (
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" fontWeight={600} mb={2}>
                  Địa chỉ giao hàng
                </Typography>

                {addresses.length > 0 && (
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <Select
                      value={useNewAddress ? "new" : selectedAddressId}
                      onChange={(e) => {
                        if (e.target.value === "new") {
                          setUseNewAddress(true);
                          setSelectedAddressId("");
                        } else {
                          setUseNewAddress(false);
                          setSelectedAddressId(e.target.value);
                        }
                      }}
                    >
                      {addresses.map((addr) => (
                        <MenuItem key={addr.id} value={addr.id}>
                          {addr.street}, {addr.ward}, {addr.district},{" "}
                          {addr.city} {addr.isDefault && "(Mặc định)"}
                        </MenuItem>
                      ))}
                      <MenuItem value="new">+ Nhập địa chỉ mới</MenuItem>
                    </Select>
                  </FormControl>
                )}

                {(useNewAddress || addresses.length === 0) && (
                  <Stack spacing={2}>
                    <TextField
                      label="Tên người nhận *"
                      value={newAddress.recipientName}
                      onChange={(e) =>
                        setNewAddress({
                          ...newAddress,
                          recipientName: e.target.value,
                        })
                      }
                      required
                      fullWidth
                    />

                    <TextField
                      label="Số điện thoại *"
                      value={newAddress.recipientPhoneNumber}
                      onChange={(e) =>
                        setNewAddress({
                          ...newAddress,
                          recipientPhoneNumber: e.target.value,
                        })
                      }
                      required
                      fullWidth
                    />

                    <Autocomplete
                      options={provinces}
                      getOptionLabel={(option) => option.ProvinceName || ""}
                      value={selectedProvince}
                      onChange={handleProvinceChange}
                      loading={isLoadingProvinces}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Tỉnh/Thành phố *"
                          required
                          InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                              <>
                                {isLoadingProvinces ? (
                                  <CircularProgress color="inherit" size={20} />
                                ) : null}
                                {params.InputProps.endAdornment}
                              </>
                            ),
                          }}
                        />
                      )}
                    />

                    <Autocomplete
                      options={districts}
                      getOptionLabel={(option) => option.DistrictName || ""}
                      value={selectedDistrict}
                      onChange={handleDistrictChange}
                      loading={isLoadingDistricts}
                      disabled={!selectedProvince}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Quận/Huyện *"
                          required
                          InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                              <>
                                {isLoadingDistricts ? (
                                  <CircularProgress color="inherit" size={20} />
                                ) : null}
                                {params.InputProps.endAdornment}
                              </>
                            ),
                          }}
                        />
                      )}
                    />

                    <Autocomplete
                      options={wards}
                      getOptionLabel={(option) => option.WardName || ""}
                      value={selectedWard}
                      onChange={handleWardChange}
                      loading={isLoadingWards}
                      disabled={!selectedDistrict}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Phường/Xã *"
                          required
                          InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                              <>
                                {isLoadingWards ? (
                                  <CircularProgress color="inherit" size={20} />
                                ) : null}
                                {params.InputProps.endAdornment}
                              </>
                            ),
                          }}
                        />
                      )}
                    />

                    <TextField
                      label="Địa chỉ cụ thể (Số nhà, tên đường) *"
                      value={newAddress.street}
                      onChange={(e) =>
                        setNewAddress({
                          ...newAddress,
                          street: e.target.value,
                        })
                      }
                      required
                      fullWidth
                      multiline
                      rows={2}
                      placeholder="VD: 123 Nguyễn Trãi"
                    />
                  </Stack>
                )}
              </Paper>
            )}

            {/* Payment Method */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={600} mb={2}>
                Phương thức thanh toán
              </Typography>
              <RadioGroup
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(e.target.value as PaymentMethod)
                }
              >
                {PAYMENT_METHODS.filter((m) =>
                  allowedPaymentMethods.includes(m.value),
                ).map((method) => (
                  <FormControlLabel
                    key={method.value}
                    value={method.value}
                    control={<Radio />}
                    label={
                      <Box
                        display="flex"
                        alignItems="center"
                        gap={1.5}
                        py={0.5}
                      >
                        <Box
                          component="img"
                          src={method.icon}
                          alt={method.label}
                          sx={{
                            width: 40,
                            height: 40,
                            objectFit: "contain",
                            borderRadius: 1,
                            border: "1px solid",
                            borderColor: "divider",
                            bgcolor: "background.paper",
                            p: 0.5,
                            flexShrink: 0,
                          }}
                        />
                        <Box>
                          <Typography fontWeight={500}>
                            {method.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {method.description}
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                ))}
              </RadioGroup>
            </Paper>
          </Box>

          {/* Right: Order Summary */}
          <Box>
            <Paper sx={{ p: 3, position: "sticky", top: 80 }}>
              <Typography variant="h6" fontWeight={600} mb={2}>
                Đơn hàng
              </Typography>

              {/* Items */}
              <Box mb={2}>
                {items.map((item) => {
                  // Strict check: only true if discount exists AND is greater than 0
                  const hasDiscount = !!(
                    item.discount &&
                    Number(item.discount) > 0 &&
                    item.subTotal &&
                    Number(item.subTotal) > 0
                  );
                  const percentage = hasDiscount
                    ? Math.round(
                        (Number(item.discount) / Number(item.subTotal)) * 100,
                      )
                    : 0;
                  const displayPrice = item.finalTotal
                    ? Number(item.finalTotal)
                    : item.subTotal
                      ? Number(item.subTotal)
                      : Number(item.variantPrice ?? 0) * (item.quantity ?? 1);

                  return (
                    <Box key={item.cartItemId} display="flex" gap={2} mb={2}>
                      <Box
                        component="img"
                        src={item.imageUrl || ""}
                        alt={item.variantName}
                        sx={{
                          width: 60,
                          height: 60,
                          objectFit: "cover",
                          borderRadius: 1,
                        }}
                      />
                      <Box flex={1}>
                        <Box
                          display="flex"
                          alignItems="flex-start"
                          gap={1}
                          mb={0.5}
                        >
                          <Typography
                            variant="body2"
                            fontWeight={500}
                            flex={1}
                            sx={{ lineHeight: 1.4 }}
                          >
                            {item.variantName}
                          </Typography>
                          {hasDiscount && (
                            <Chip
                              icon={<LocalOffer fontSize="small" />}
                              label={`-${percentage}%`}
                              color="error"
                              size="small"
                              sx={{ height: 20, fontSize: "0.7rem", mt: 0.25 }}
                            />
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          x{item.quantity}
                        </Typography>
                        <Box
                          display="flex"
                          alignItems="center"
                          gap={1}
                          mt={0.5}
                        >
                          {hasDiscount && item.subTotal && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ textDecoration: "line-through" }}
                            >
                              {formatCurrency(item.subTotal)}
                            </Typography>
                          )}
                          <Typography
                            variant="body2"
                            color="error"
                            fontWeight={600}
                          >
                            {formatCurrency(displayPrice)}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  );
                })}
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Voucher */}
              <Box mb={2}>
                <Box display="flex" gap={1} alignItems="stretch">
                  <TextField
                    size="small"
                    placeholder="Mã giảm giá"
                    value={voucherCode}
                    onChange={(e) => {
                      setVoucherCode(e.target.value);
                      if (voucherError) setVoucherError(null);
                    }}
                    disabled={!!appliedVoucher || isApplyingVoucher}
                    error={!!voucherError}
                    fullWidth
                  />
                  {!appliedVoucher && (
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => applyVoucher()}
                      disabled={isApplyingVoucher || !voucherCode.trim()}
                      sx={{
                        minWidth: 110,
                        whiteSpace: "nowrap",
                        px: 2,
                      }}
                    >
                      {isApplyingVoucher ? "Xử lý..." : "Áp dụng"}
                    </Button>
                  )}
                </Box>
                {!appliedVoucher && (
                  <Button
                    variant="outlined"
                    size="small"
                    fullWidth
                    startIcon={<LocalOffer />}
                    onClick={async () => {
                      setVoucherPickerOpen(true);
                      setLoadingMyVouchers(true);
                    }}
                    disabled={isApplyingVoucher}
                    sx={{ mt: 1 }}
                  >
                    Chọn voucher
                  </Button>
                )}
                {voucherError && (
                  <Typography
                    variant="caption"
                    color="error"
                    sx={{ mt: 0.5, display: "block" }}
                  >
                    {voucherError}
                  </Typography>
                )}
                {appliedVoucher && (
                  <Box
                    sx={{
                      mt: 1,
                      p: 1.5,
                      bgcolor: "success.lighter",
                      borderRadius: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Box display="flex" flexDirection="column" gap={0.5}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography
                          variant="body2"
                          color="success.main"
                          fontWeight={600}
                        >
                          ✓ {appliedVoucher.voucherCode}
                        </Typography>
                        {totals.discount > 0 && (
                          <Typography variant="caption" color="success.main">
                            -{formatCurrency(totals.discount)}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    <Button
                      size="small"
                      color="error"
                      onClick={removeVoucher}
                      disabled={isApplyingVoucher}
                      sx={{ minWidth: 50, fontSize: "0.75rem" }}
                    >
                      Xóa
                    </Button>
                  </Box>
                )}
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Totals */}
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography>Tạm tính</Typography>
                <Typography fontWeight={600}>
                  {formatCurrency(totals.subtotal)}
                </Typography>
              </Box>

              {totals.discount > 0 && (
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography>Giảm giá</Typography>
                  <Typography color="success.main" fontWeight={600}>
                    -{formatCurrency(totals.discount)}
                  </Typography>
                </Box>
              )}
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography>Phí vận chuyển</Typography>
                <Typography fontWeight={500} color="success.main">
                  {formatCurrency(totals.shippingFee)}
                </Typography>
              </Box>
              <Divider sx={{ my: 1.5 }} />
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="h6" fontWeight={600}>
                  Tổng cộng
                </Typography>
                <Typography variant="h6" fontWeight={700} color="error">
                  {formatCurrency(totals.totalPrice)}
                </Typography>
              </Box>

              <Button
                fullWidth
                variant="contained"
                color="error"
                size="large"
                onClick={handleCheckout}
                disabled={isSubmitting}
                sx={{ py: 1.5 }}
              >
                {isSubmitting ? <CircularProgress size={24} /> : "Đặt hàng"}
              </Button>
            </Paper>
          </Box>
        </Box>
      </Container>

      {/* Voucher Picker Dialog */}
      <VoucherPickerDialog
        open={voucherPickerOpen}
        onClose={() => setVoucherPickerOpen(false)}
        onApplyVoucher={applyVoucher}
        cartItems={getCartItemsForVoucher()}
        isApplying={isApplyingVoucher}
      />
    </MainLayout>
  );
};
