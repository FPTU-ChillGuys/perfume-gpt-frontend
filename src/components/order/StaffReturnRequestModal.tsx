import { useState, useEffect, useMemo } from "react";
import {
  Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, FormControlLabel, IconButton, Paper, Radio, RadioGroup, Stack,
  TextField, Typography, Autocomplete, CircularProgress
} from "@mui/material";
import {
  Add, CheckCircle, DeleteOutline, PhotoCameraOutlined, LocationOn,
  PlayCircleOutline, RadioButtonUnchecked, Remove, VideocamOutlined
} from "@mui/icons-material";
import { LoadingButton } from "@/components/common/LoadingButton";
import { orderService } from "@/services/orderService";
import type { OrderResponse } from "@/types/order";
import type { ReturnOrderReason } from "@/services/orderService";
import { useToast } from "@/hooks/useToast";
import { addressService } from "@/services/addressService";
import type { ProvinceResponse, DistrictResponse, WardResponse } from "@/types/address";

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

const getBankDisplayName = (bank: VietQrBank) => {
  const shortName = (bank.shortName || bank.short_name || "").trim();
  return shortName ? `${shortName} - ${bank.name}` : bank.name;
};

const normalizeRefundAccountNumber = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const normalizeRefundAccountName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trimStart();

const fmt = (value?: number | null) =>
  `${new Intl.NumberFormat("vi-VN").format(Number(value ?? 0))}đ`;

interface StaffReturnRequestModalProps {
  open: boolean;
  onClose: () => void;
  order: OrderResponse;
  onSuccess: () => void;
  forceInStore?: boolean;
}

export const StaffReturnRequestModal = ({ open, onClose, order, onSuccess, forceInStore = false }: StaffReturnRequestModalProps) => {
  const { showToast } = useToast();

  const [returnMethod, setReturnMethod] = useState<"shipping" | "in-store">("shipping");
  const [approvedRefundAmount, setApprovedRefundAmount] = useState<string>("");
  const [isRestocked, setIsRestocked] = useState(false);
  const [inspectionNote, setInspectionNote] = useState("");

  const [returnItemQuantities, setReturnItemQuantities] = useState<Record<string, number>>({});
  const [returnReason, setReturnReason] = useState<ReturnOrderReason>("DamagedProduct");
  const [isRefundOnly, setIsRefundOnly] = useState(false);
  const [returnNote, setReturnNote] = useState("");
  const [returnMediaFiles, setReturnMediaFiles] = useState<File[]>([]);
  
  const [isSubmittingReturnRequest, setIsSubmittingReturnRequest] = useState(false);
  const [returnFormError, setReturnFormError] = useState("");

  const [selectedRefundBank, setSelectedRefundBank] = useState<VietQrBank | null>(null);
  const [refundBankName, setRefundBankName] = useState("");
  const [refundAccountNumber, setRefundAccountNumber] = useState("");
  const [refundAccountName, setRefundAccountName] = useState("");

  const [vietQrBanks, setVietQrBanks] = useState<VietQrBank[]>([]);
  const [isLoadingVietQrBanks, setIsLoadingVietQrBanks] = useState(false);
  const [vietQrBankError, setVietQrBankError] = useState<string | null>(null);


  const [provinces, setProvinces] = useState<ProvinceResponse[]>([]);
  const [districts, setDistricts] = useState<DistrictResponse[]>([]);
  const [wards, setWards] = useState<WardResponse[]>([]);
  
  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);
  const [isLoadingWards, setIsLoadingWards] = useState(false);

  const [selectedProvince, setSelectedProvince] = useState<ProvinceResponse | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictResponse | null>(null);
  const [selectedWard, setSelectedWard] = useState<WardResponse | null>(null);

  const [customRecipient, setCustomRecipient] = useState({
    contactName: "",
    contactPhoneNumber: "",
    fullAddress: "",
  });

  const resetReturnDialogState = () => {
    setReturnMethod("shipping");
    setApprovedRefundAmount("");
    setIsRestocked(false);
    setInspectionNote("");
    setReturnItemQuantities({});
    setReturnReason("DamagedProduct");
    setIsRefundOnly(false);
    setReturnNote("");
    setReturnMediaFiles([]);
    setSelectedRefundBank(null);
    setRefundBankName("");
    setRefundAccountNumber("");
    setRefundAccountName("");
    setReturnFormError("");

    setCustomRecipient({
      contactName: "",
      contactPhoneNumber: "",
      fullAddress: "",
    });
    setSelectedProvince(null);
    setSelectedDistrict(null);
    setSelectedWard(null);
  };

  useEffect(() => {
    if (open) {
      resetReturnDialogState();
      if (forceInStore) {
        setReturnMethod("in-store");
      }
    }
  }, [open, forceInStore]);

  useEffect(() => {
    if (open && vietQrBanks.length === 0) {
      const loadVietQrBanks = async () => {
        try {
          setIsLoadingVietQrBanks(true);
          const response = await fetch("https://api.vietqr.io/v2/banks");
          if (!response.ok) throw new Error("Lỗi tải danh sách ngân hàng");
          const json = await response.json();
          setVietQrBanks(Array.isArray(json.data) ? json.data : []);
        } catch {
          setVietQrBankError("Không tải được danh sách ngân hàng");
        } finally {
          setIsLoadingVietQrBanks(false);
        }
      };
      void loadVietQrBanks();
    }
  }, [open, vietQrBanks.length]);

  useEffect(() => {
    if (open && provinces.length === 0) {
      const loadProvinces = async () => {
        try {
          setIsLoadingProvinces(true);
          const data = await addressService.getProvinces();
          setProvinces(data);
        } catch {
          showToast("Không tải được danh sách tỉnh/thành phố", "error");
        } finally {
          setIsLoadingProvinces(false);
        }
      };
      void loadProvinces();
    }
  }, [open, provinces.length, showToast]);

  const handleProvinceChange = async (_: unknown, newValue: ProvinceResponse | null) => {
    setSelectedProvince(newValue);
    setSelectedDistrict(null);
    setSelectedWard(null);
    setDistricts([]);
    setWards([]);
    if (!newValue?.ProvinceID) return;
    setIsLoadingDistricts(true);
    try {
      const data = await addressService.getDistricts(newValue.ProvinceID);
      setDistricts(data);
    } catch {
      showToast("Không thể tải danh sách quận/huyện", "error");
    } finally {
      setIsLoadingDistricts(false);
    }
  };

  const handleDistrictChange = async (_: unknown, newValue: DistrictResponse | null) => {
    setSelectedDistrict(newValue);
    setSelectedWard(null);
    setWards([]);
    if (!newValue?.DistrictID) return;
    setIsLoadingWards(true);
    try {
      const data = await addressService.getWards(newValue.DistrictID);
      setWards(data);
    } catch {
      showToast("Không thể tải danh sách phường/xã", "error");
    } finally {
      setIsLoadingWards(false);
    }
  };

  const handleWardChange = (_: unknown, newValue: WardResponse | null) => {
    setSelectedWard(newValue);
  };


  const returnMediaPreviews = useMemo(() =>
    returnMediaFiles.map((file, index) => ({
      index,
      name: file.name,
      isVideo: file.type.startsWith("video/"),
      url: URL.createObjectURL(file),
    })),
  [returnMediaFiles]);

  const returnImageFiles = useMemo(() => returnMediaFiles.filter((file) => file.type.startsWith("image/")), [returnMediaFiles]);
  const returnVideoFiles = useMemo(() => returnMediaFiles.filter((file) => file.type.startsWith("video/")), [returnMediaFiles]);

  const handleReturnImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith("image/"));
    if (files.length) setReturnMediaFiles(prev => [...prev.filter(f => f.type.startsWith("image/")), ...files, ...prev.filter(f => f.type.startsWith("video/"))]);
    e.target.value = "";
  };

  const handleReturnVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith("video/"));
    if (files.length) setReturnMediaFiles(prev => [...prev.filter(f => f.type.startsWith("image/")), ...files]);
    e.target.value = "";
  };

  const handleRemoveReturnMedia = (idx: number) => {
    setReturnMediaFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const selectedReturnItems = useMemo(() =>
    (order?.orderDetails ?? [])
      .map((item) => {
        const id = item.id ?? "";
        const max = Number(item.quantity ?? 0);
        const refundableUnitPrice = Number(item.refunablePrice ?? item.unitPrice ?? 0);
        const requested = Math.min(Math.max(0, Number(returnItemQuantities[id] ?? 0)), max);
        return { orderDetailId: id, requested, max, refundableUnitPrice, item };
      })
      .filter((entry) => Boolean(entry.orderDetailId) && entry.requested > 0),
  [order?.orderDetails, returnItemQuantities]);

  const estimatedRefundAmount = useMemo(() =>
    selectedReturnItems.reduce((sum, entry) => sum + entry.refundableUnitPrice * entry.requested, 0),
  [selectedReturnItems]);

  const isFullReturn = useMemo(() => {
    if (!order?.orderDetails || order.orderDetails.length === 0) return false;
    return order.orderDetails.every(item => {
      const id = item.id ?? "";
      const max = Number(item.quantity ?? 0);
      const requested = Number(returnItemQuantities[id] ?? 0);
      return requested === max;
    });
  }, [order?.orderDetails, returnItemQuantities]);

  const recommendedRefundAmount = useMemo(() => {
    return estimatedRefundAmount + (isFullReturn ? (order?.shippingFee ?? 0) : 0);
  }, [estimatedRefundAmount, isFullReturn, order?.shippingFee]);

  const isAddressValid = useMemo(() => {
    if (returnMethod === "in-store") return true;
    if (isRefundOnly) return true;
    return Boolean(
      customRecipient.contactName.trim() &&
      customRecipient.contactPhoneNumber.trim() &&
      customRecipient.fullAddress.trim() &&
      selectedProvince?.ProvinceID &&
      selectedDistrict?.DistrictID &&
      selectedWard?.WardCode
    );
  }, [
    returnMethod,
    isRefundOnly,
    customRecipient,
    selectedProvince,
    selectedDistrict,
    selectedWard,
  ]);

  const canSubmitReturnRequest =
    selectedReturnItems.length > 0 &&
    Boolean(returnReason) &&
    (returnMethod === "shipping" ? (returnImageFiles.length > 0 || returnVideoFiles.length > 0) : true) &&
    Boolean(refundBankName.trim()) &&
    Boolean(refundAccountNumber.trim()) &&
    Boolean(refundAccountName.trim()) &&
    (returnMethod === "in-store" ? approvedRefundAmount !== "" : true) &&
    isAddressValid;

  const handleSubmitReturnRequest = async () => {
    if (!order?.id) return;
    if (!returnReason) return setReturnFormError("Vui lòng chọn lý do trả hàng");
    if (!selectedReturnItems.length) return setReturnFormError("Vui lòng chọn ít nhất 1 sản phẩm và số lượng muốn trả");
    if (returnMethod === "shipping" && !returnImageFiles.length && !returnVideoFiles.length) return setReturnFormError("Vui lòng tải lên ít nhất 1 ảnh hoặc 1 video");

    const trimmedBankName = refundBankName.trim();
    const trimmedAccountNumber = refundAccountNumber.trim();
    const trimmedAccountName = refundAccountName.trim();

    if (!trimmedBankName || !trimmedAccountNumber || !trimmedAccountName) {
      return setReturnFormError("Vui lòng điền đầy đủ thông tin tài khoản nhận hoàn tiền");
    }

    if (returnMethod === "in-store" && approvedRefundAmount === "") {
      return setReturnFormError("Vui lòng nhập số tiền hoàn lại (có thể bằng 0)");
    }

    let recipient = null;

    if (returnMethod === "shipping" && !isRefundOnly) {
      if (!customRecipient.contactName.trim() || !customRecipient.contactPhoneNumber.trim() || !customRecipient.fullAddress.trim() ||
          !selectedProvince?.ProvinceID || !selectedDistrict?.DistrictID || !selectedWard?.WardCode) {
        return setReturnFormError("Vui lòng điền đầy đủ địa chỉ lấy hàng");
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

      const uploadedMedias = returnMediaFiles.length ? await orderService.uploadTemporaryReturnMedia(returnMediaFiles) : [];
      const temporaryMediaIds = uploadedMedias.map((m) => m.id).filter((id): id is string => Boolean(id));

      if (returnMethod === "in-store") {
        await orderService.createInStoreReturnRequest({
          orderId: order.id,
          orderCode: order.code || order.id,
          reason: returnReason,
          isRefundOnly,
          returnItems: selectedReturnItems.map((entry) => ({
            orderDetailId: entry.orderDetailId,
            quantity: entry.requested,
          })),
          approvedRefundAmount: Number(approvedRefundAmount.replace(/\./g, "")) || 0,
          isRestocked,
          inspectionNote: inspectionNote.trim() || null,
          customerNote: returnNote.trim() || null,
          refundBankName: trimmedBankName,
          refundAccountNumber: trimmedAccountNumber,
          refundAccountName: trimmedAccountName,
          temporaryMediaIds: temporaryMediaIds.length ? temporaryMediaIds : null,
        });
      } else {
        await orderService.createGuestOnBehalfReturnRequest({
          orderId: order.id,
          orderCode: order.code || order.id,
          reason: returnReason,
          isRefundOnly,
          returnItems: selectedReturnItems.map((entry) => ({
            orderDetailId: entry.orderDetailId,
            quantity: entry.requested,
          })),
          customerNote: returnNote.trim() || null,
          refundBankName: trimmedBankName,
          refundAccountNumber: trimmedAccountNumber,
          refundAccountName: trimmedAccountName,
          savedAddressId: null, // Staff does not use saved address IDs
          recipient,
          temporaryMediaIds: temporaryMediaIds.length ? temporaryMediaIds : null,
        });
      }

      showToast("Đã tạo yêu cầu trả hàng thành công", "success");
      onSuccess();
      onClose();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Không thể tạo yêu cầu trả hàng", "error");
    } finally {
      setIsSubmittingReturnRequest(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Tạo yêu cầu trả hàng</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          {returnFormError && <Alert severity="warning">{returnFormError}</Alert>}

          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>Hình thức trả hàng</Typography>
            <RadioGroup 
              row 
              value={returnMethod} 
              onChange={(e) => setReturnMethod(e.target.value as "shipping" | "in-store")}
            >
              <FormControlLabel 
                value="shipping" 
                control={<Radio />} 
                label="Trả hàng qua giao hàng" 
                disabled={forceInStore}
              />
              <FormControlLabel 
                value="in-store" 
                control={<Radio />} 
                label="Trả hàng tại quầy" 
              />
            </RadioGroup>
            {forceInStore && (
              <Typography variant="caption" color="warning.main" sx={{ mt: 0.5, display: "block" }}>
                * Đơn hàng đã gắn tài khoản khách hàng. Để đảm bảo quyền lợi, Staff chỉ có thể tạo yêu cầu trả hàng tại quầy. Nếu muốn trả hàng qua giao hàng, vui lòng hướng dẫn khách hàng tạo yêu cầu trên App/Website.
              </Typography>
            )}
          </Paper>

          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} mb={1.25}>1. Chọn sản phẩm và số lượng muốn trả</Typography>
            <Stack spacing={1.25}>
              {(order?.orderDetails ?? []).map((item, index) => {
                const detailId = item.id ?? "";
                const maxQty = Number(item.quantity ?? 0);
                const refundableUnitPrice = Number(item.refunablePrice ?? item.unitPrice ?? 0);
                const selectedQty = Math.min(maxQty, Math.max(0, Number(returnItemQuantities[detailId] ?? 0)));
                const isSelected = selectedQty > 0;

                return (
                  <Box key={detailId || `${item.variantName}-${index}`} sx={{ p: 1.25, border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }}>
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <Checkbox checked={isSelected} disabled={!detailId || maxQty <= 0}
                          onChange={() => setReturnItemQuantities(prev => ({ ...prev, [detailId]: isSelected ? 0 : Math.min(1, maxQty) }))}
                          icon={<RadioButtonUnchecked />} checkedIcon={<CheckCircle />} />
                        {item.imageUrl ? <Box component="img" src={item.imageUrl} alt={item.variantName} sx={{ width: 52, height: 52, borderRadius: 1, objectFit: "cover" }} />
                          : <Box sx={{ width: 52, height: 52, borderRadius: 1, bgcolor: "grey.100" }} />}
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{item.variantName}</Typography>
                          <Typography variant="caption" color="text.secondary">Đã mua: {maxQty}</Typography>
                          <Typography variant="caption" color="text.secondary" display="block">Đơn giá hoàn tiền: {fmt(refundableUnitPrice)}</Typography>
                        </Box>
                      </Stack>
                      <Stack direction="row" alignItems="center" spacing={0.75}>
                        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 72 }}>Số lượng trả</Typography>
                        <IconButton size="small" onClick={() => setReturnItemQuantities(prev => ({ ...prev, [detailId]: Math.max(0, selectedQty - 1) }))} disabled={!detailId || selectedQty <= 0} sx={{ border: "1px solid", borderColor: "divider" }}><Remove fontSize="small" /></IconButton>
                        <TextField size="small" type="number" value={selectedQty}
                          onChange={(e) => setReturnItemQuantities(prev => ({ ...prev, [detailId]: Math.min(maxQty, Math.max(0, parseInt(e.target.value) || 0)) }))}
                          disabled={!detailId} inputProps={{ min: 0, max: maxQty, style: { textAlign: "center" } }} sx={{ width: 90 }} />
                        <IconButton size="small" onClick={() => setReturnItemQuantities(prev => ({ ...prev, [detailId]: Math.min(maxQty, selectedQty + 1) }))} disabled={!detailId || selectedQty >= maxQty} sx={{ border: "1px solid", borderColor: "divider" }}><Add fontSize="small" /></IconButton>
                      </Stack>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
            <Divider sx={{ my: 1.5 }} />
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">Tạm tính hoàn tiền</Typography>
              <Typography variant="subtitle1" fontWeight={700} color="#ee4d2d">{fmt(estimatedRefundAmount)}</Typography>
            </Box>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>2. Lý do trả hàng</Typography>
            <RadioGroup value={returnReason} onChange={(e) => setReturnReason(e.target.value as ReturnOrderReason)}>
              {RETURN_REASON_OPTIONS.map((opt) => <FormControlLabel key={opt.value} value={opt.value} control={<Radio />} label={opt.label} />)}
            </RadioGroup>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>3. Phương án giải quyết</Typography>
            <RadioGroup value={isRefundOnly ? "refund-only" : "return-and-refund"} onChange={(e) => setIsRefundOnly(e.target.value === "refund-only")}>
              <FormControlLabel value="return-and-refund" control={<Radio />} label="Trả hàng & Hoàn tiền" />
              <FormControlLabel value="refund-only" control={<Radio />} label="Hoàn tiền (Không trả hàng)" />
            </RadioGroup>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} mb={0.5}>4. Mô tả thêm và bằng chứng (ảnh/video)</Typography>
            <Typography variant="caption" color="text.secondary" mb={1} display="block">Vui lòng tải lên ít nhất 1 ảnh hoặc 1 video làm bằng chứng</Typography>
            <Stack spacing={1.25}>
              <TextField label="Mô tả thêm (tuỳ chọn)" value={returnNote} onChange={(e) => setReturnNote(e.target.value)} fullWidth multiline minRows={3} />
              <Stack direction="row" spacing={1.5}>
                <Box component="label" sx={{ border: "1px dashed", borderColor: "divider", borderRadius: 2, p: 1.5, width: 164, textAlign: "center", cursor: "pointer", bgcolor: "#fafafa" }}>
                  <PhotoCameraOutlined sx={{ color: "text.secondary" }} />
                  <Typography variant="body2" mt={0.5}>Thêm Hình ảnh</Typography>
                  <Typography variant="body2" color="text.secondary">{returnImageFiles.length}</Typography>
                  <input hidden type="file" accept="image/*" multiple onChange={handleReturnImageChange} />
                </Box>
                <Box component="label" sx={{ border: "1px dashed", borderColor: "divider", borderRadius: 2, p: 1.5, width: 164, textAlign: "center", cursor: "pointer", bgcolor: "#fafafa" }}>
                  <VideocamOutlined sx={{ color: "text.secondary" }} />
                  <Typography variant="body2" mt={0.5}>Thêm Video</Typography>
                  <Typography variant="body2" color="text.secondary">{returnVideoFiles.length}</Typography>
                  <input hidden type="file" accept="video/*" onChange={handleReturnVideoChange} />
                </Box>
              </Stack>
              {!!returnMediaPreviews.length && (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {returnMediaPreviews.map((preview) => (
                    <Box key={`${preview.name}-${preview.index}`} sx={{ position: "relative", width: 100, height: 100, borderRadius: 1.5, overflow: "hidden", border: "2px solid", borderColor: "divider", bgcolor: "grey.100" }}>
                      <IconButton size="small" onClick={() => handleRemoveReturnMedia(preview.index)} sx={{ position: "absolute", top: 4, right: 4, zIndex: 2, bgcolor: "rgba(0,0,0,0.6)", color: "white", "&:hover": { bgcolor: "rgba(0,0,0,0.8)" } }}>
                        <DeleteOutline fontSize="small" />
                      </IconButton>
                      {preview.isVideo ? (
                        <><Box component="video" src={preview.url} muted playsInline preload="metadata" sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        <PlayCircleOutline sx={{ fontSize: 36, color: "common.white", position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} /></>
                      ) : (
                        <Box component="img" src={preview.url} alt={preview.name} sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      )}
                    </Box>
                  ))}
                </Stack>
              )}
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>Thông tin tài khoản nhận hoàn tiền</Typography>
            <Stack spacing={1.25}>
              <Alert severity="info" sx={{ mb: 0.5 }}>Vui lòng nhập chính xác thông tin tài khoản để hệ thống hỗ trợ hoàn tiền linh hoạt.</Alert>
              <Autocomplete
                options={vietQrBanks}
                value={selectedRefundBank}
                inputValue={refundBankName}
                loading={isLoadingVietQrBanks}
                getOptionLabel={(option) => typeof option === "string" ? option : getBankDisplayName(option)}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                onInputChange={() => {}}
                onChange={(_, bank) => {
                  if (!bank) { setSelectedRefundBank(null); setRefundBankName(""); return; }
                  if (typeof bank === "string") return;
                  setSelectedRefundBank(bank);
                  setRefundBankName(getBankDisplayName(bank));
                }}
                renderOption={(props, option) => {
                  const { key, ...optionProps } = props;
                  return (
                    <Box component="li" key={key} {...optionProps}>
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        {option.logo ? <Box component="img" src={option.logo} sx={{ width: 28, height: 28, objectFit: "contain", borderRadius: 0.5 }} /> : <Box sx={{ width: 28, height: 28, borderRadius: 0.5, bgcolor: "grey.100" }} />}
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{option.shortName || option.short_name || option.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{option.name}</Typography>
                        </Box>
                      </Stack>
                    </Box>
                  );
                }}
                renderInput={(params) => <TextField {...params} label="Ngân hàng nhận tiền *" size="small" error={Boolean(vietQrBankError)} helperText={vietQrBankError || "Chọn ngân hàng từ danh sách VietQR"} inputProps={{ ...params.inputProps, readOnly: true }} />}
              />
              <TextField label="Số tài khoản *" value={refundAccountNumber} onChange={(e) => setRefundAccountNumber(normalizeRefundAccountNumber(e.target.value))} fullWidth size="small" inputProps={{ inputMode: "text", autoCapitalize: "characters" }} helperText="Tự động viết HOA, không dấu, không khoảng trắng" />
              <TextField label="Tên chủ tài khoản *" value={refundAccountName} onChange={(e) => setRefundAccountName(normalizeRefundAccountName(e.target.value))} fullWidth size="small" inputProps={{ autoCapitalize: "characters" }} helperText="Tự động viết HOA, không dấu" />
            </Stack>
          </Paper>

          {returnMethod === "in-store" ? (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>5. Thông tin xử lý tại quầy</Typography>
              <Typography variant="caption" color="text.secondary" mb={1.5} display="block">Điền thông tin để hoàn tất quy trình trả hàng ngay lập tức</Typography>
              <Stack spacing={1.5}>
                <TextField 
                  label="Số tiền hoàn lại (VNĐ) *" 
                  size="small" 
                  value={approvedRefundAmount} 
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/\D/g, "");
                    if (!rawValue) {
                      setApprovedRefundAmount("");
                      return;
                    }
                    const formatted = new Intl.NumberFormat("vi-VN").format(Number(rawValue));
                    setApprovedRefundAmount(formatted);
                  }}
                  fullWidth 
                  inputProps={{ inputMode: "numeric" }}
                  helperText={`Gợi ý: ${fmt(recommendedRefundAmount)} (${isFullReturn ? `100% giá trị sản phẩm + ${fmt(order?.shippingFee ?? 0)} phí ship` : "Chỉ hoàn tiền sản phẩm trả lại (không hoàn phí ship vì trả 1 phần)"})`}
                />
                <FormControlLabel
                  control={
                    <Checkbox 
                    icon={<RadioButtonUnchecked />}
                    checkedIcon={<CheckCircle />}
                      checked={isRestocked}
                      onChange={(e) => setIsRestocked(e.target.checked)}
                    />
                  }
                  label="Nhập lại hàng vào kho (Sản phẩm còn nguyên vẹn)"
                />
                <TextField 
                  label="Ghi chú kiểm tra hàng (Tuỳ chọn)" 
                  size="small" 
                  value={inspectionNote} 
                  onChange={(e) => setInspectionNote(e.target.value)} 
                  fullWidth 
                  multiline 
                  minRows={2} 
                />
              </Stack>
            </Paper>
          ) : (
            !isRefundOnly && (
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle2" fontWeight={700} mb={1}>5. Địa chỉ lấy hàng</Typography>
                <Typography variant="caption" color="text.secondary" mb={1.5} display="block">Vui lòng nhập đầy đủ địa chỉ để đơn vị vận chuyển đến lấy hàng</Typography>
                <Stack spacing={1.25}>
                  <TextField label="Tên liên hệ *" size="small" value={customRecipient.contactName} onChange={(e) => setCustomRecipient(prev => ({ ...prev, contactName: e.target.value }))} />
                  <TextField label="Số điện thoại *" size="small" value={customRecipient.contactPhoneNumber} onChange={(e) => setCustomRecipient(prev => ({ ...prev, contactPhoneNumber: e.target.value }))} />
                  <Autocomplete options={provinces} value={selectedProvince} loading={isLoadingProvinces} getOptionLabel={(opt) => opt.ProvinceName || ""} onChange={handleProvinceChange} renderInput={(params) => <TextField {...params} label="Tỉnh/Thành phố *" size="small" />} />
                  <Autocomplete options={districts} value={selectedDistrict} loading={isLoadingDistricts} disabled={!selectedProvince} getOptionLabel={(opt) => opt.DistrictName || ""} onChange={handleDistrictChange} renderInput={(params) => <TextField {...params} label="Quận/Huyện *" size="small" />} />
                  <Autocomplete options={wards} value={selectedWard} loading={isLoadingWards} disabled={!selectedDistrict} getOptionLabel={(opt) => opt.WardName || ""} onChange={handleWardChange} renderInput={(params) => <TextField {...params} label="Phường/Xã *" size="small" />} />
                  <TextField label="Số nhà, tên đường *" size="small" value={customRecipient.fullAddress} onChange={(e) => setCustomRecipient(prev => ({ ...prev, fullAddress: e.target.value }))} />
                </Stack>
              </Paper>
            )
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid", borderColor: "divider" }}>
        <Button onClick={onClose} disabled={isSubmittingReturnRequest}>Đóng</Button>
        <LoadingButton variant="contained" color="warning" onClick={handleSubmitReturnRequest} disabled={isSubmittingReturnRequest || !canSubmitReturnRequest} loading={isSubmittingReturnRequest}>Gửi yêu cầu</LoadingButton>
      </DialogActions>
    </Dialog>
  );
};
