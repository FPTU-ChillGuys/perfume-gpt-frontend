import { Alert, Box, Chip, Divider, Typography } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import type { UserProfile } from "@/types/profile";
import type { UpdateProfileRequest } from "@/types/profile";
import type { UserCredentials } from "@/services/userService";

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
}: ProfileInfoProps) => {
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
