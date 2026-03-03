import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Switch,
  Typography,
} from "@mui/material";
import type { Banner, BannerPayload, BannerStatus } from "@/types/banner";

interface BannerFormDialogProps {
  open: boolean;
  initialData?: Banner | null;
  saving?: boolean;
  onClose: () => void;
  onSubmit: (payload: BannerPayload) => Promise<void> | void;
}

const statusOptions: BannerStatus[] = ["draft", "scheduled", "published"];

const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
};

export const BannerFormDialog = ({
  open,
  initialData,
  saving,
  onClose,
  onSubmit,
}: BannerFormDialogProps) => {
  const defaultValues = useMemo(
    () => ({
      name: "",
      tagline: "",
      description: "",
      heroImageUrl: "",
      mobileImageUrl: "",
      ctaLabel: "",
      ctaHref: "",
      status: "draft" as BannerStatus,
      priority: 1,
      isHomeFeatured: false,
    }),
    [],
  );

  const [values, setValues] = useState(defaultValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notesInput, setNotesInput] = useState("");

  useEffect(() => {
    if (open) {
      if (initialData) {
        setValues({
          name: initialData.name,
          tagline: initialData.tagline,
          description: initialData.description,
          heroImageUrl: initialData.heroImageUrl,
          mobileImageUrl: initialData.mobileImageUrl || "",
          ctaLabel: initialData.ctaLabel || "",
          ctaHref: initialData.ctaHref || "",
          status: initialData.status,
          priority: initialData.priority,
          isHomeFeatured: Boolean(initialData.isHomeFeatured),
        });
        setNotesInput(initialData.notes?.join(", ") || "");
      } else {
        setValues(defaultValues);
        setNotesInput("");
      }
      setErrors({});
    }
  }, [open, initialData, defaultValues]);

  const handleChange = (
    field: keyof typeof values,
    value: string | number,
  ) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (
    field: "heroImageUrl" | "mobileImageUrl",
    file?: File,
  ) => {
    if (!file) {
      return;
    }
    try {
      const base64 = await readFileAsDataUrl(file);
      setValues((prev) => ({ ...prev, [field]: base64 }));
    } catch (error) {
      console.error("Failed to parse image", error);
    }
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!values.name.trim()) {
      nextErrors.name = "Tên banner không được bỏ trống";
    }
    if (!values.tagline.trim()) {
      nextErrors.tagline = "Tagline bắt buộc";
    }
    if (!values.description.trim()) {
      nextErrors.description = "Vui lòng nhập mô tả";
    }
    if (!values.heroImageUrl) {
      nextErrors.heroImageUrl = "Cần tải lên hình nền";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }
    await onSubmit({
      id: initialData?.id,
      ...values,
      mobileImageUrl: values.mobileImageUrl || undefined,
      ctaLabel: values.ctaLabel || undefined,
      ctaHref: values.ctaHref || undefined,
      isHomeFeatured: values.isHomeFeatured,
      notes: notesInput
        .split(",")
        .map((note) => note.trim())
        .filter(Boolean),
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {initialData ? "Chỉnh sửa banner" : "Tạo banner mới"}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Tên chiến dịch"
            value={values.name}
            onChange={(event) => handleChange("name", event.target.value)}
            error={Boolean(errors.name)}
            helperText={errors.name}
            fullWidth
          />
          <TextField
            label="Tagline"
            value={values.tagline}
            onChange={(event) => handleChange("tagline", event.target.value)}
            error={Boolean(errors.tagline)}
            helperText={errors.tagline}
            fullWidth
          />
          <TextField
            label="Mô tả"
            value={values.description}
            onChange={(event) => handleChange("description", event.target.value)}
            multiline
            minRows={3}
            error={Boolean(errors.description)}
            helperText={errors.description}
          />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="CTA label"
              value={values.ctaLabel}
              onChange={(event) => handleChange("ctaLabel", event.target.value)}
              fullWidth
            />
            <TextField
              label="CTA link"
              value={values.ctaHref}
              onChange={(event) => handleChange("ctaHref", event.target.value)}
              fullWidth
            />
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <FormControl fullWidth>
              <InputLabel id="banner-status-label">Trạng thái</InputLabel>
              <Select
                labelId="banner-status-label"
                label="Trạng thái"
                value={values.status}
                onChange={(event) =>
                  handleChange("status", event.target.value as BannerStatus)
                }
              >
                {statusOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Độ ưu tiên"
              type="number"
              inputProps={{ min: 1, max: 10 }}
              value={values.priority}
              onChange={(event) =>
                handleChange("priority", Number(event.target.value))
              }
              fullWidth
            />
          </Stack>
          <FormControlLabel
            control={
              <Switch
                checked={values.isHomeFeatured}
                onChange={(event) =>
                  setValues((prev) => ({
                    ...prev,
                    isHomeFeatured: event.target.checked,
                  }))
                }
              />
            }
            label="Hiển thị trên banner trang chủ"
          />
          <TextField
            label="Ghi chú (ngăn cách bởi dấu phẩy)"
            value={notesInput}
            onChange={(event) => setNotesInput(event.target.value)}
            fullWidth
          />
          <Divider>Hình ảnh</Divider>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" sx={{ mb: 1, display: "block" }}>
                Hero / Desktop
              </Typography>
              <Button component="label" variant="outlined" fullWidth>
                {values.heroImageUrl ? "Thay đổi" : "Tải hình"}
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    handleImageUpload(
                      "heroImageUrl",
                      event.target.files?.[0],
                    )
                  }
                />
              </Button>
              {errors.heroImageUrl && (
                <Typography variant="caption" color="error">
                  {errors.heroImageUrl}
                </Typography>
              )}
              {values.heroImageUrl && (
                <Box
                  component="img"
                  src={values.heroImageUrl}
                  alt="Hero preview"
                  sx={{
                    width: "100%",
                    mt: 1,
                    borderRadius: 2,
                    objectFit: "cover",
                    height: 160,
                  }}
                />
              )}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" sx={{ mb: 1, display: "block" }}>
                Mobile / Secondary
              </Typography>
              <Button component="label" variant="outlined" fullWidth>
                {values.mobileImageUrl ? "Thay đổi" : "Tải hình"}
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    handleImageUpload(
                      "mobileImageUrl",
                      event.target.files?.[0],
                    )
                  }
                />
              </Button>
              {values.mobileImageUrl && (
                <Box
                  component="img"
                  src={values.mobileImageUrl}
                  alt="Mobile preview"
                  sx={{
                    width: "100%",
                    mt: 1,
                    borderRadius: 2,
                    objectFit: "cover",
                    height: 160,
                  }}
                />
              )}
            </Box>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Hủy</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={saving}
        >
          {saving ? "Đang lưu..." : "Lưu banner"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
