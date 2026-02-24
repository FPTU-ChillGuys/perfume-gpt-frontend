import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import type { UserProfile } from "@/types/profile";
import type { UpdateProfileRequest } from "@/types/profile";

interface ProfileInfoProps {
  profile: UserProfile | null;
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

const ProfileInfo = ({
  profile,
  formData,
  isEditing,
  isSaving,
  error,
  success,
  onEdit,
  onCancel,
  onSave,
  onChange,
  onClearError,
  onClearSuccess,
}: ProfileInfoProps) => {
  return (
    <>
      {/* Alerts */}
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

      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h6" fontWeight="bold">
          Thông tin cá nhân
        </Typography>
        {!isEditing && (
          <Button variant="contained" startIcon={<EditIcon />} onClick={onEdit}>
            Chỉnh sửa
          </Button>
        )}
      </Box>

      {/* Basic Info (Read-only) */}
      <Stack spacing={2} mb={3}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="Họ và tên"
            value={profile?.name || ""}
            fullWidth
            disabled
            variant="outlined"
          />
          <TextField
            label="Email"
            value={profile?.email || ""}
            fullWidth
            disabled
            variant="outlined"
          />
        </Stack>
        {profile?.phoneNumber && (
          <TextField
            label="Số điện thoại"
            value={profile.phoneNumber}
            fullWidth
            disabled
            variant="outlined"
            sx={{ maxWidth: { sm: "calc(50% - 8px)" } }}
          />
        )}
      </Stack>

      <Divider sx={{ my: 3 }} />

      <Typography variant="h6" fontWeight="bold" mb={2}>
        Sở thích nước hoa
      </Typography>

      {/* Editable Preferences */}
      <Stack spacing={2}>
        <TextField
          label="Mùi hương yêu thích"
          value={formData.scentPreference || ""}
          onChange={(e) => onChange("scentPreference", e.target.value)}
          fullWidth
          disabled={!isEditing}
          placeholder="VD: Hương gỗ ấm áp, hương hoa nhẹ nhàng..."
          multiline
          rows={2}
        />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="Ngân sách tối thiểu (VNĐ)"
            type="number"
            value={formData.minBudget || ""}
            onChange={(e) =>
              onChange(
                "minBudget",
                e.target.value ? Number(e.target.value) : undefined,
              )
            }
            fullWidth
            disabled={!isEditing}
            placeholder="VD: 500000"
          />
          <TextField
            label="Ngân sách tối đa (VNĐ)"
            type="number"
            value={formData.maxBudget || ""}
            onChange={(e) =>
              onChange(
                "maxBudget",
                e.target.value ? Number(e.target.value) : undefined,
              )
            }
            fullWidth
            disabled={!isEditing}
            placeholder="VD: 2000000"
          />
        </Stack>
        <TextField
          label="Phong cách ưa thích"
          value={formData.preferredStyle || ""}
          onChange={(e) => onChange("preferredStyle", e.target.value)}
          fullWidth
          disabled={!isEditing}
          placeholder="VD: Sang trọng, trẻ trung, cổ điển..."
          multiline
          rows={2}
        />
        <TextField
          label="Note hương yêu thích"
          value={formData.favoriteNotes || ""}
          onChange={(e) => onChange("favoriteNotes", e.target.value)}
          fullWidth
          disabled={!isEditing}
          placeholder="VD: Xạ hương, gỗ tuyết tùng, hoa hồng..."
          multiline
          rows={2}
        />
      </Stack>

      {/* Action Buttons */}
      {isEditing && (
        <Box display="flex" gap={2} justifyContent="flex-end" mt={3}>
          <Button
            variant="outlined"
            startIcon={<CancelIcon />}
            onClick={onCancel}
            disabled={isSaving}
          >
            Hủy
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? <CircularProgress size={24} color="inherit" /> : "Lưu"}
          </Button>
        </Box>
      )}
    </>
  );
};

export default ProfileInfo;
