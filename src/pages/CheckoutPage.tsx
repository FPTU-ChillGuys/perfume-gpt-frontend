import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
} from "@mui/material";
import {
  LocalShipping,
  Store,
  CheckCircle,
  ArrowBack,
} from "@mui/icons-material";
import { MainLayout } from "@/layouts/MainLayout";
import { orderService } from "@/services/orderService";
import { addressService } from "@/services/addressService";
import { cartService } from "@/services/cartService";
import { voucherService } from "@/services/voucherService";
import { aiAcceptanceService } from "@/services/ai/aiAcceptanceService";
import { useToast } from "@/hooks/useToast";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
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
];

export const CheckoutPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { refreshCart } = useCart();
  const { user } = useAuth();

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
    fullName: "",
    phone: "",
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
  const [totals, setTotals] = useState<CartTotals>({
    subtotal: 0,
    shippingFee: 0,
    discount: 0,
    totalPrice: 0,
  });

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);
  const [isLoadingWards, setIsLoadingWards] = useState(false);
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false);
  const [voucherError, setVoucherError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    loadProvinces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPaymentMethod(isPickupInStore ? "CashInStore" : "CashOnDelivery");
  }, [isPickupInStore]);

  // Update totals khi địa chỉ hoặc các thông tin liên quan thay đổi
  useEffect(() => {
    // Chỉ update nếu không đang loading ban đầu và có items trong cart
    if (!isLoading && items.length > 0) {
      updateTotalsWithAddress();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isPickupInStore,
    selectedAddressId,
    useNewAddress,
    newAddress.districtId,
    newAddress.wardCode,
  ]);

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
      const [addressList, cartData] = await Promise.all([
        addressService.getAddresses().catch(() => [] as AddressResponse[]),
        cartService.getCartWithTotals(),
      ]);

      setAddresses(addressList);
      setItems(cartData.items);
      setTotals(cartData.totals);

      // Set default address if exists
      const defaultAddr = addressList.find((addr) => addr.isDefault);
      if (defaultAddr?.id) {
        setSelectedAddressId(defaultAddr.id);
      }
    } catch (error) {
      showToast("Không thể tải dữ liệu. Vui lòng thử lại.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Update totals khi địa chỉ hoặc voucher thay đổi
  const updateTotalsWithAddress = async (
    voucherCodeOverride?: string | null,
  ) => {
    const activeVoucher =
      voucherCodeOverride !== undefined
        ? voucherCodeOverride || undefined
        : appliedVoucher?.voucherCode || undefined;
    try {
      // Nếu là pickup in store, không cần địa chỉ
      if (isPickupInStore) {
        const totalsData = await cartService.getTotals(activeVoucher);
        setTotals(totalsData);
        return;
      }

      // Lấy districtId và wardCode từ địa chỉ hiện tại
      let districtId: number | undefined;
      let wardCode: string | undefined;

      if (useNewAddress) {
        // Dùng địa chỉ mới đang nhập
        districtId = newAddress.districtId;
        wardCode = newAddress.wardCode;
      } else if (selectedAddressId) {
        // Dùng địa chỉ đã chọn
        const selectedAddr = addresses.find(
          (addr) => addr.id === selectedAddressId,
        );
        if (selectedAddr) {
          districtId = selectedAddr.districtId;
          wardCode = selectedAddr.wardCode;
        }
      }

      // Chỉ call API nếu có đủ thông tin địa chỉ
      if (districtId && wardCode) {
        const totalsData = await cartService.getTotals(
          activeVoucher,
          districtId,
          wardCode,
        );
        setTotals(totalsData);
      }
    } catch (error) {
      console.error("Error updating totals with address:", error);
      // Không hiển thị toast để tránh spam khi user đang nhập
    }
  };

  const applyVoucher = async () => {
    const normalizedVoucher = voucherCode.trim();

    if (!normalizedVoucher) {
      showToast("Vui lòng nhập mã giảm giá", "warning");
      return;
    }

    if (
      appliedVoucher &&
      appliedVoucher.voucherCode.toLowerCase() ===
        normalizedVoucher.toLowerCase()
    ) {
      showToast("Mã giảm giá đã được áp dụng", "info");
      return;
    }

    setVoucherError(null);
    setIsApplyingVoucher(true);
    try {
      // Call API apply voucher để validate
      const voucherResult = await voucherService.applyVoucher({
        voucherCode: normalizedVoucher,
        orderAmount: totals.subtotal,
      });

      // Lưu thông tin voucher đã apply
      setAppliedVoucher(voucherResult);
      setVoucherCode(voucherResult.voucherCode);

      // Update totals - truyền thẳng voucherCode để tránh stale closure
      await updateTotalsWithAddress(voucherResult.voucherCode);

      showToast(voucherResult.message || "Đã áp dụng mã giảm giá", "success");
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Mã giảm giá không hợp lệ";
      setVoucherError(
        msg.toLowerCase().includes("not found") ||
          msg.toLowerCase().includes("404") ||
          msg.toLowerCase().includes("failed to apply")
          ? "Mã giảm giá không tồn tại hoặc đã hết hạn. Vui lòng thử lại."
          : msg,
      );
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

      // Update totals - truyền null để tránh stale closure
      await updateTotalsWithAddress(null);

      showToast("Đã bỏ mã giảm giá", "info");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Không thể bỏ mã giảm giá",
        "error",
      );
    } finally {
      setIsApplyingVoucher(false);
    }
  };

  const handleCheckout = async () => {
    try {
      setIsSubmitting(true);

      // Validate
      if (!isPickupInStore && !selectedAddressId && !useNewAddress) {
        showToast("Vui lòng chọn địa chỉ giao hàng", "warning");
        return;
      }

      if (
        useNewAddress &&
        (!newAddress.fullName ||
          !newAddress.phone ||
          !newAddress.street ||
          !newAddress.provinceId ||
          !newAddress.districtId ||
          !newAddress.wardCode)
      ) {
        showToast("Vui lòng điền đầy đủ thông tin địa chỉ", "warning");
        return;
      }

      // Build request
      const request: CreateOrderRequest = {
        voucherCode: voucherCode || null,
        isPickupInStore,
        payment: {
          method: paymentMethod,
        },
      };

      // Add recipient info based on delivery method
      if (!isPickupInStore) {
        // Giao hàng tận nơi
        if (useNewAddress) {
          // Nhập địa chỉ mới -> truyền đầy đủ thông tin, addressId = null
          request.recipient = {
            addressId: null,
            fullName: newAddress.fullName,
            phone: newAddress.phone,
            districtId: newAddress.districtId || 0,
            districtName: newAddress.districtName,
            wardCode: newAddress.wardCode,
            wardName: newAddress.wardName,
            provinceId: newAddress.provinceId || 0,
            provinceName: newAddress.provinceName,
            fullAddress: newAddress.street,
          };
        } else {
          // Chọn địa chỉ có sẵn -> chỉ truyền addressId, các field khác để rỗng
          // Backend sẽ lấy thông tin địa chỉ từ addressId
          request.recipient = {
            addressId: selectedAddressId,
            fullName: "",
            phone: "",
            districtId: 0,
            districtName: "",
            wardCode: "",
            wardName: "",
            provinceId: 0,
            provinceName: "",
            fullAddress: "",
          };
        }
      } else {
        // Nhận tại cửa hàng -> không cần thông tin địa chỉ giao hàng
        request.recipient = {
          addressId: null,
          fullName: "",
          phone: "",
          districtId: 0,
          districtName: "",
          wardCode: "",
          wardName: "",
          provinceId: 0,
          provinceName: "",
          fullAddress: "",
        };
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

      // Handle payment redirect
      if (paymentMethod === "VnPay" || paymentMethod === "Momo") {
        if (response.url) {
          window.location.href = response.url;
        } else {
          showToast("Không thể chuyển đến trang thanh toán", "error");
        }
      } else {
        showToast("Đặt hàng thành công!", "success");
        navigate("/");
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
            onClick={() => navigate("/")}
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
            onClick={() => navigate("/cart")}
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
                      value={newAddress.fullName}
                      onChange={(e) =>
                        setNewAddress({
                          ...newAddress,
                          fullName: e.target.value,
                        })
                      }
                      required
                      fullWidth
                    />

                    <TextField
                      label="Số điện thoại *"
                      value={newAddress.phone}
                      onChange={(e) =>
                        setNewAddress({ ...newAddress, phone: e.target.value })
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
                  isPickupInStore
                    ? m.value !== "CashOnDelivery"
                    : m.value !== "CashInStore",
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
                            bgcolor: "#fff",
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
                {items.map((item) => (
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
                      <Typography variant="body2" fontWeight={500}>
                        {item.variantName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        x{item.quantity}
                      </Typography>
                      <Typography variant="body2" color="error">
                        {formatCurrency(item.subTotal)}
                      </Typography>
                    </Box>
                  </Box>
                ))}
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
                      onClick={applyVoucher}
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
              {totals.shippingFee > 0 && (
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography>Phí vận chuyển</Typography>
                  <Typography fontWeight={600}>
                    {formatCurrency(totals.shippingFee)}
                  </Typography>
                </Box>
              )}
              {totals.discount > 0 && (
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography>Giảm giá</Typography>
                  <Typography color="success.main" fontWeight={600}>
                    -{formatCurrency(totals.discount)}
                  </Typography>
                </Box>
              )}
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
    </MainLayout>
  );
};
