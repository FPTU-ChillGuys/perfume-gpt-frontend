import { useState, useEffect } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import SpaIcon from "@mui/icons-material/Spa";
import LocalFloristIcon from "@mui/icons-material/LocalFlorist";
import StyleIcon from "@mui/icons-material/Style";
import EditIcon from "@mui/icons-material/Edit";
import type { UserProfile } from "@/types/profile";
import type { UpdateProfileRequest } from "@/types/profile";
import type { UserAvatar, UserCredentials } from "@/services/userService";

interface ProfileInfoProps {
  profile: UserProfile | null;
  userInfo: UserCredentials | null;
  formData: UpdateProfileRequest;
  isEditing: boolean;
  isSaving: boolean;
  error: string;
  success: string;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (
    fullName: string,
    phoneNumber: string,
    budget: { minBudget: number | null; maxBudget: number | null },
  ) => void;
  onChange: (field: keyof UpdateProfileRequest, value: any) => void;
  onClearError: () => void;
  onClearSuccess: () => void;
  avatar: UserAvatar | null;
  isAvatarUploading: boolean;
  isAvatarDeleting: boolean;
  onPickAvatar: () => void;
  onDeleteAvatar: () => void;
}

const InfoRow = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 2,
      py: 2,
      borderBottom: "1px solid",
      borderColor: "divider",
    }}
  >
    <Box
      sx={{
        width: 40,
        height: 40,
        borderRadius: "50%",
        bgcolor: "error.50",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "error.main",
        flexShrink: 0,
      }}
    >
      {icon}
    </Box>
    <Box sx={{ flex: 1 }}>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography
        variant="body1"
        fontWeight={500}
        color={value ? "text.primary" : "text.disabled"}
      >
        {value || "Chưa cập nhật"}
      </Typography>
    </Box>
  </Box>
);

const ProfileInfo = ({
  profile,
  userInfo,
  formData,
  isEditing,
  isSaving,
  error,
  success,
  onEdit,
  onCancel,
  onSave,
  onClearError,
  onClearSuccess,
  avatar,
  isAvatarUploading,
  isAvatarDeleting,
  onPickAvatar,
  onDeleteAvatar,
}: ProfileInfoProps) => {
  const [editName, setEditName] = useState(userInfo?.fullName || "");
  const [editPhone, setEditPhone] = useState(userInfo?.phoneNumber || "");
  const [editMinBudget, setEditMinBudget] = useState("");
  const [editMaxBudget, setEditMaxBudget] = useState("");
  const [nameError, setNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [budgetError, setBudgetError] = useState("");

  // Sync form fields when entering edit mode or when userInfo changes
  useEffect(() => {
    if (isEditing) {
      setEditName(userInfo?.fullName || "");
      setEditPhone(userInfo?.phoneNumber || "");
      setEditMinBudget(
        formData.minBudget != null
          ? String(formData.minBudget)
          : profile?.minBudget != null
            ? String(profile.minBudget)
            : "",
      );
      setEditMaxBudget(
        formData.maxBudget != null
          ? String(formData.maxBudget)
          : profile?.maxBudget != null
            ? String(profile.maxBudget)
            : "",
      );
      setNameError("");
      setPhoneError("");
      setBudgetError("");
    }
  }, [isEditing, userInfo, formData.minBudget, formData.maxBudget, profile]);

  const validate = () => {
    let valid = true;
    if (!editName.trim()) {
      setNameError("Họ và tên không được để trống");
      valid = false;
    } else if (editName.trim().length < 2) {
      setNameError("Họ và tên phải có ít nhất 2 ký tự");
      valid = false;
    } else if (editName.trim().length > 100) {
      setNameError("Họ và tên tối đa 100 ký tự");
      valid = false;
    } else if (/[^a-zA-ZÀ-ỹ\s]/.test(editName.trim())) {
      setNameError("Họ và tên chỉ được chứa chữ cái và khoảng trắng");
      valid = false;
    } else {
      setNameError("");
    }

    if (!editPhone.trim()) {
      setPhoneError("Số điện thoại không được để trống");
      valid = false;
    } else if (/[^0-9]/.test(editPhone.trim())) {
      setPhoneError("Số điện thoại chỉ được chứa chữ số");
      valid = false;
    } else if (editPhone.trim().length !== 10) {
      setPhoneError("Số điện thoại phải đúng 10 chữ số");
      valid = false;
    } else if (!/^0/.test(editPhone.trim())) {
      setPhoneError("Số điện thoại phải bắt đầu bằng số 0");
      valid = false;
    } else {
      setPhoneError("");
    }

    const parsedMin = editMinBudget.trim()
      ? Number(editMinBudget.replace(/[^0-9]/g, ""))
      : null;
    const parsedMax = editMaxBudget.trim()
      ? Number(editMaxBudget.replace(/[^0-9]/g, ""))
      : null;

    if (
      (parsedMin != null && !Number.isFinite(parsedMin)) ||
      (parsedMax != null && !Number.isFinite(parsedMax))
    ) {
      setBudgetError("Ngân sách không hợp lệ");
      valid = false;
    } else if (
      (parsedMin != null && parsedMin < 0) ||
      (parsedMax != null && parsedMax < 0)
    ) {
      setBudgetError("Ngân sách phải lớn hơn hoặc bằng 0");
      valid = false;
    } else if (
      parsedMin != null &&
      parsedMax != null &&
      parsedMin > parsedMax
    ) {
      setBudgetError("Ngân sách tối thiểu không được lớn hơn tối đa");
      valid = false;
    } else {
      setBudgetError("");
    }
    return valid;
  };

  const handleSave = () => {
    if (!validate()) return;
    const minBudget = editMinBudget.trim()
      ? Number(editMinBudget.replace(/[^0-9]/g, ""))
      : null;
    const maxBudget = editMaxBudget.trim()
      ? Number(editMaxBudget.replace(/[^0-9]/g, ""))
      : null;
    onSave(editName.trim(), editPhone.trim(), { minBudget, maxBudget });
  };
  const avatarFallback = (userInfo?.fullName || userInfo?.email || "U")
    .trim()
    .charAt(0)
    .toUpperCase();

  const formatCurrency = (value?: number | null) => {
    if (value == null) return null;
    return `${new Intl.NumberFormat("vi-VN").format(value)} ₫`;
  };

  const budgetText = (() => {
    const min = formatCurrency(profile?.minBudget);
    const max = formatCurrency(profile?.maxBudget);
    if (min && max) return `${min} – ${max}`;
    if (min) return `Từ ${min}`;
    if (max) return `Đến ${max}`;
    return "";
  })();

  const noteTypeLabel = (type?: string) => {
    if (type === "Top") return "Hương đầu";
    if (type === "Heart") return "Hương giữa";
    if (type === "Base") return "Hương cuối";
    return type || "";
  };

  const familyPreferences = profile?.familyPreferences ?? [];
  const notePreferences = profile?.notePreferences ?? [];
  const attributePreferences = profile?.attributePreferences ?? [];

  return (
    <>
      <Paper
        elevation={0}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          p: { xs: 2, sm: 3 },
          mb: 2.5,
          bgcolor: "grey.50",
        }}
      >
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mb={2}
      >
        <Box>
          <Typography variant="h6" fontWeight="bold">
            Hồ Sơ Của Tôi
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Quản lý thông tin hồ sơ để bảo mật tài khoản
          </Typography>
        </Box>
        {!isEditing && (
          <Tooltip title="Chỉnh sửa">
            <IconButton
              onClick={onEdit}
              size="small"
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1.5,
                p: 0.75,
                "&:hover": { borderColor: "error.main", color: "error.main" },
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={onClearError}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={onClearSuccess}>
          {success}
        </Alert>
      )}

      <Divider sx={{ mb: 2.5 }} />

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems={{ xs: "flex-start", sm: "center" }}
        sx={{ mb: 1.5 }}
      >
        <Avatar
          src={avatar?.url || undefined}
          alt={avatar?.altText || userInfo?.fullName || "Avatar"}
          sx={{ width: 88, height: 88, bgcolor: "error.main", fontSize: 32 }}
        >
          {avatarFallback}
        </Avatar>

        <Box>
          <Typography variant="subtitle1" fontWeight={600}>
            Ảnh đại diện
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            JPG/PNG, dung lượng nên dưới 5MB.
          </Typography>

          <Stack direction="row" spacing={1.25}>
            <Button
              variant="contained"
              color="error"
              onClick={onPickAvatar}
              disabled={isAvatarUploading || isAvatarDeleting}
            >
              {isAvatarUploading ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                "Tải ảnh lên"
              )}
            </Button>
            <Button
              variant="outlined"
              color="inherit"
              onClick={onDeleteAvatar}
              disabled={!avatar || isAvatarUploading || isAvatarDeleting}
            >
              {isAvatarDeleting ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                "Xóa ảnh"
              )}
            </Button>
          </Stack>
        </Box>
      </Stack>
      </Paper>

      {/* Info rows */}
      <Paper
        elevation={0}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          p: { xs: 2, sm: 2.5 },
        }}
      >
      <Box>
        {isEditing ? (
          <>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
              Chỉnh sửa thông tin
            </Typography>
            <Stack spacing={2}>
              <TextField
                fullWidth
                label="Họ và tên"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                error={!!nameError}
                helperText={nameError}
                size="small"
                slotProps={{ htmlInput: { maxLength: 100 } }}
              />
              <TextField
                fullWidth
                label="Email"
                value={userInfo?.email || ""}
                size="small"
                disabled
                helperText="Email không thể thay đổi"
              />
              <TextField
                fullWidth
                label="Số điện thoại"
                value={editPhone}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "");
                  setEditPhone(val);
                }}
                error={!!phoneError}
                helperText={phoneError || "Nhập đúng 10 chữ số"}
                size="small"
                placeholder="0xxxxxxxxx"
                slotProps={{ htmlInput: { maxLength: 10, inputMode: "numeric" } }}
              />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <TextField
                  fullWidth
                  label="Ngân sách từ (₫)"
                  value={editMinBudget}
                  onChange={(e) =>
                    setEditMinBudget(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  size="small"
                  placeholder="Ví dụ: 500000"
                  slotProps={{ htmlInput: { inputMode: "numeric" } }}
                />
                <TextField
                  fullWidth
                  label="Ngân sách đến (₫)"
                  value={editMaxBudget}
                  onChange={(e) =>
                    setEditMaxBudget(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  size="small"
                  placeholder="Ví dụ: 2000000"
                  slotProps={{ htmlInput: { inputMode: "numeric" } }}
                />
              </Stack>
              {budgetError && (
                <Typography variant="caption" color="error">
                  {budgetError}
                </Typography>
              )}
            </Stack>
            <Stack direction="row" spacing={1.5} sx={{ mt: 1 }}>
              <Button
                variant="contained"
                color="error"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? <CircularProgress size={20} color="inherit" /> : "Lưu thay đổi"}
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                onClick={onCancel}
                disabled={isSaving}
              >
                Hủy
              </Button>
            </Stack>
          </>
        ) : (
          <>
            <InfoRow
              icon={<PersonIcon fontSize="small" />}
              label="Họ và tên"
              value={userInfo?.fullName || ""}
            />
            <InfoRow
              icon={<EmailIcon fontSize="small" />}
              label="Email"
              value={userInfo?.email || ""}
            />
            <InfoRow
              icon={<PhoneIcon fontSize="small" />}
              label="Số điện thoại"
              value={userInfo?.phoneNumber || ""}
            />
            <InfoRow
              icon={<AccountBalanceWalletIcon fontSize="small" />}
              label="Ngân sách nước hoa"
              value={budgetText}
            />
          </>
        )}
      </Box>
      </Paper>

      {/* Scent Preferences */}
      {(notePreferences.length ||
        familyPreferences.length ||
        attributePreferences.length) ? (
        <>
          <Divider sx={{ my: 3 }} />
          <Typography variant="subtitle1" fontWeight={600} mb={2}>
            Sở thích hương
          </Typography>

          {familyPreferences.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <LocalFloristIcon fontSize="small" color="secondary" />
                <Typography variant="body2" color="text.secondary">
                  Nhóm hương yêu thích
                </Typography>
              </Stack>
              <Stack direction="row" flexWrap="wrap" gap={0.75}>
                {familyPreferences.map((f) => (
                  <Chip
                    key={f.familyId}
                    label={f.familyName}
                    size="small"
                    color="secondary"
                    variant="outlined"
                  />
                ))}
              </Stack>
            </Box>
          )}

          {notePreferences.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <SpaIcon fontSize="small" color="primary" />
                <Typography variant="body2" color="text.secondary">
                  Nốt hương ưa thích
                </Typography>
              </Stack>
              <Stack direction="row" flexWrap="wrap" gap={0.75}>
                {notePreferences.map((n) => (
                  <Chip
                    key={`${n.noteId}-${n.noteType}`}
                    label={`${n.noteName} (${noteTypeLabel(n.noteType)})`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Stack>
            </Box>
          )}

          {attributePreferences.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <StyleIcon fontSize="small" color="info" />
                <Typography variant="body2" color="text.secondary">
                  Thuộc tính yêu thích
                </Typography>
              </Stack>
              <Stack direction="row" flexWrap="wrap" gap={0.75}>
                {attributePreferences.map((a) => (
                  <Chip
                    key={a.attributeValueId}
                    label={a.attributeValueName}
                    size="small"
                    color="info"
                    variant="outlined"
                  />
                ))}
              </Stack>
            </Box>
          )}
        </>
      ) : null}
    </>
  );
};

export default ProfileInfo;
