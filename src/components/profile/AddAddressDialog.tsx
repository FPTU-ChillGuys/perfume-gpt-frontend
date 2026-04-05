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
    recipientName: "",
    recipientPhoneNumber: "",
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
  const [isLoadingStreets, setIsLoadingStreets] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [streets, setStreets] = useState<string[]>([]);

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

  const loadStreets = async (province: string, district: string, ward: string) => {
    if (!ward) return;
    setIsLoadingStreets(true);
    try {
      const data = await addressService.getStreets({
        Province: province,
        District: district,
        Ward_street: ward,
      });
      setStreets(data);
    } catch {
      setStreets([]);
    } finally {
      setIsLoadingStreets(false);
    }
  };

  const handleProvinceChange = (_: any, newValue: ProvinceResponse | null) => {
    setSelectedProvince(newValue);
    setSelectedDistrict(null);
    setSelectedWard(null);
    setDistricts([]);
    setWards([]);
    setStreets([]);

    if (newValue) {
      setFormData((prev) => ({
        ...prev,
        city: newValue.ProvinceName || "",
        provinceId: newValue.ProvinceID,
        district: "",
        districtId: undefined,
        ward: "",
        wardCode: "",
        street: "",
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
        street: "",
      }));
    }
  };

  const handleDistrictChange = (_: any, newValue: DistrictResponse | null) => {
    setSelectedDistrict(newValue);
    setSelectedWard(null);
    setWards([]);
    setStreets([]);

    if (newValue) {
      setFormData((prev) => ({
        ...prev,
        district: newValue.DistrictName || "",
        districtId: newValue.DistrictID,
        ward: "",
        wardCode: "",
        street: "",
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
        street: "",
      }));
    }
  };

  const handleWardChange = (_: any, newValue: WardResponse | null) => {
    setSelectedWard(newValue);
    setStreets([]);

    if (newValue) {
      setFormData((prev) => ({
        ...prev,
        ward: newValue.WardName || "",
        wardCode: newValue.WardCode || "",
        street: "",
      }));
      loadStreets(
        formData.city || "",
        formData.district || "",
        newValue.WardName || "",
      );
    } else {
      setFormData((prev) => ({
        ...prev,
        ward: "",
        wardCode: "",
        street: "",
      }));
    }
  };

  const handleSubmit = async () => {
    setError("");

    // Validation
    if (
      !formData.recipientName ||
      !formData.recipientPhoneNumber ||
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
      recipientName: "",
      recipientPhoneNumber: "",
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
    setStreets([]);
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
            value={formData.recipientName}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                recipientName: e.target.value,
              }))
            }
            fullWidth
            required
          />

          <TextField
            label="Số điện thoại *"
            value={formData.recipientPhoneNumber}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                recipientPhoneNumber: e.target.value,
              }))
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

          <Autocomplete
            freeSolo
            options={streets}
            value={formData.street}
            onInputChange={(_, newValue) =>
              setFormData((prev) => ({ ...prev, street: newValue }))
            }
            loading={isLoadingStreets}
            disabled={!selectedWard}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Địa chỉ cụ thể (Số nhà, tên đường) *"
                required
                placeholder="VD: 123 Nguyễn Trãi"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {isLoadingStreets ? (
                        <CircularProgress color="inherit" size={20} />
                      ) : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
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
