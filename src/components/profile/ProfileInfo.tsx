import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
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
  onSave: () => void;
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
  userInfo,
  error,
  success,
  onClearError,
  onClearSuccess,
  avatar,
  isAvatarUploading,
  isAvatarDeleting,
  onPickAvatar,
  onDeleteAvatar,
}: ProfileInfoProps) => {
  const avatarFallback = (userInfo?.fullName || userInfo?.email || "U")
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <>
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

      {/* Header */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mb={3}
      >
        <Box>
          <Typography variant="h6" fontWeight="bold">
            Hồ Sơ Của Tôi
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Quản lý thông tin hồ sơ để bảo mật tài khoản
          </Typography>
        </Box>
        <Chip
          label="Người dùng"
          size="small"
          sx={{ bgcolor: "error.main", color: "#fff", fontWeight: 600 }}
        />
      </Box>

      <Divider sx={{ mb: 3 }} />

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems={{ xs: "flex-start", sm: "center" }}
        sx={{ mb: 3 }}
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

      {/* Info rows */}
      <Box>
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
      </Box>
    </>
  );
};

export default ProfileInfo;
