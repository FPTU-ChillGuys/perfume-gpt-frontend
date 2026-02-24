import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Autocomplete,
  CircularProgress,
  Alert,
} from "@mui/material";
import { addressService } from "@/services/addressService";
import type {
  CreateAddressRequest,
  ProvinceResponse,
  DistrictResponse,
  WardResponse,
} from "@/types/address";

interface AddAddressDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddAddressDialog = ({
  open,
  onClose,
  onSuccess,
}: AddAddressDialogProps) => {
  const [formData, setFormData] = useState<CreateAddressRequest>({
    receiverName: "",
    phone: "",
    street: "",
    ward: "",
    district: "",
    city: "",
    wardCode: "",
    districtId: undefined,
    provinceId: undefined,
  });

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState("");

  // Load provinces on mount
  useEffect(() => {
    if (open) {
      loadProvinces();
    }
  }, [open]);

  const loadProvinces = async () => {
    setIsLoadingProvinces(true);
    try {
      const data = await addressService.getProvinces();
      setProvinces(data);
    } catch (err: any) {
      setError(err.message || "Không thể tải danh sách tỉnh/thành phố");
    } finally {
      setIsLoadingProvinces(false);
    }
  };

  const loadDistricts = async (provinceId: number) => {
    setIsLoadingDistricts(true);
    try {
      const data = await addressService.getDistricts(provinceId);
      setDistricts(data);
    } catch (err: any) {
      setError(err.message || "Không thể tải danh sách quận/huyện");
    } finally {
      setIsLoadingDistricts(false);
    }
  };

  const loadWards = async (districtId: number) => {
    setIsLoadingWards(true);
    try {
      const data = await addressService.getWards(districtId);
      setWards(data);
    } catch (err: any) {
      setError(err.message || "Không thể tải danh sách phường/xã");
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
      setFormData((prev) => ({
        ...prev,
        city: newValue.ProvinceName || "",
        provinceId: newValue.ProvinceID,
        district: "",
        districtId: undefined,
        ward: "",
        wardCode: "",
      }));
      if (newValue.ProvinceID) {
        loadDistricts(newValue.ProvinceID);
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        city: "",
        provinceId: undefined,
        district: "",
        districtId: undefined,
        ward: "",
        wardCode: "",
      }));
    }
  };

  const handleDistrictChange = (_: any, newValue: DistrictResponse | null) => {
    setSelectedDistrict(newValue);
    setSelectedWard(null);
    setWards([]);

    if (newValue) {
      setFormData((prev) => ({
        ...prev,
        district: newValue.DistrictName || "",
        districtId: newValue.DistrictID,
        ward: "",
        wardCode: "",
      }));
      if (newValue.DistrictID) {
        loadWards(newValue.DistrictID);
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        district: "",
        districtId: undefined,
        ward: "",
        wardCode: "",
      }));
    }
  };

  const handleWardChange = (_: any, newValue: WardResponse | null) => {
    setSelectedWard(newValue);

    if (newValue) {
      setFormData((prev) => ({
        ...prev,
        ward: newValue.WardName || "",
        wardCode: newValue.WardCode || "",
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        ward: "",
        wardCode: "",
      }));
    }
  };

  const handleSubmit = async () => {
    setError("");

    // Validation
    if (
      !formData.receiverName ||
      !formData.phone ||
      !formData.street ||
      !formData.provinceId ||
      !formData.districtId ||
      !formData.wardCode
    ) {
      setError("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    setIsSubmitting(true);
    try {
      await addressService.createAddress(formData);
      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message || "Không thể tạo địa chỉ");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset form
    setFormData({
      receiverName: "",
      phone: "",
      street: "",
      ward: "",
      district: "",
      city: "",
      wardCode: "",
      districtId: undefined,
      provinceId: undefined,
    });
    setSelectedProvince(null);
    setSelectedDistrict(null);
    setSelectedWard(null);
    setDistricts([]);
    setWards([]);
    setError("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Thêm địa chỉ mới</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        <Stack spacing={2} sx={{ mt: 2 }}>
          <TextField
            label="Tên người nhận *"
            value={formData.receiverName}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, receiverName: e.target.value }))
            }
            fullWidth
            required
          />

          <TextField
            label="Số điện thoại *"
            value={formData.phone}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, phone: e.target.value }))
            }
            fullWidth
            required
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
            value={formData.street}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, street: e.target.value }))
            }
            fullWidth
            required
            multiline
            rows={2}
            placeholder="VD: 123 Nguyễn Trãi"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isSubmitting}>
          Hủy
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isSubmitting}
        >
          {isSubmitting ? <CircularProgress size={24} /> : "Thêm địa chỉ"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddAddressDialog;
