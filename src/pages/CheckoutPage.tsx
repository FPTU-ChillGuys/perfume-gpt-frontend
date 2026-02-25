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
import { LocalShipping, Store, CheckCircle } from "@mui/icons-material";
import { MainLayout } from "@/layouts/MainLayout";
import { orderService } from "@/services/orderService";
import { addressService } from "@/services/addressService";
import { cartService } from "@/services/cartService";
import { useToast } from "@/hooks/useToast";
import { useCart } from "@/hooks/useCart";
import type {
  AddressResponse,
  ProvinceResponse,
  DistrictResponse,
  WardResponse,
} from "@/types/address";
import type { PaymentMethod, CreateOrderRequest } from "@/types/checkout";
import type { CartItem, CartTotals } from "@/types/cart";

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat("vi-VN").format(Number(value ?? 0)) + "đ";

const PAYMENT_METHODS: {
  value: PaymentMethod;
  label: string;
  description: string;
}[] = [
  {
    value: "CashOnDelivery",
    label: "Thanh toán khi nhận hàng",
    description: "Thanh toán bằng tiền mặt khi nhận hàng",
  },
  {
    value: "CashInStore",
    label: "Thanh toán tại cửa hàng",
    description: "Thanh toán trực tiếp tại cửa hàng",
  },
  { value: "VnPay", label: "VnPay", description: "Thanh toán qua VnPay" },
  { value: "Momo", label: "Momo", description: "Thanh toán qua Momo" },
];

export const CheckoutPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { refreshCart } = useCart();

  // State
  const [isPickupInStore, setIsPickupInStore] = useState(false);
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("CashOnDelivery");
  const [addresses, setAddresses] = useState<AddressResponse[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [voucherCode, setVoucherCode] = useState("");

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

  useEffect(() => {
    loadData();
    loadProvinces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      // Add recipient info if delivery
      if (!isPickupInStore) {
        if (useNewAddress) {
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
          request.recipient = {
            addressId: selectedAddressId,
            fullName: "",
            phone: "",
            districtId: 1,
            districtName: "",
            wardCode: "",
            wardName: "",
            provinceId: 1,
            provinceName: "",
            fullAddress: "",
          };
        }
      } else {
        request.recipient = {
          addressId: null,
          fullName: "",
          phone: "",
          districtId: 1,
          districtName: "",
          wardCode: "",
          wardName: "",
          provinceId: 1,
          provinceName: "",
          fullAddress: "",
        };
      }

      // Call checkout API
      const response = await orderService.checkout(request);

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
        <Typography variant="h4" fontWeight="bold" mb={4}>
          Thanh toán
        </Typography>

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
                {PAYMENT_METHODS.map((method) => (
                  <FormControlLabel
                    key={method.value}
                    value={method.value}
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography fontWeight={500}>{method.label}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {method.description}
                        </Typography>
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
              <Box display="flex" gap={1} mb={2}>
                <TextField
                  size="small"
                  placeholder="Mã giảm giá"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value)}
                  fullWidth
                />
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
                  <Typography color="success.main">
                    -{formatCurrency(totals.discount)}
                  </Typography>
                </Box>
              )}
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
