import { useState, useEffect } from "react";
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Avatar,
  Divider,
  Stack,
} from "@mui/material";
import {
  Person as PersonIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from "@mui/icons-material";
import { useAuth } from "../hooks/useAuth";
import { profileService } from "../services/profileService";
import type { UserProfile, UpdateProfileRequest } from "../types/profile";
import { AdminLayout } from "../layouts/AdminLayout";
import { MainLayout } from "../layouts/MainLayout";

const ProfilePage = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Determine which layout to use based on user role
  const Layout =
    user?.role === "admin" || user?.role === "staff" ? AdminLayout : MainLayout;

  // Form state
  const [formData, setFormData] = useState<UpdateProfileRequest>({
    scentPreference: "",
    minBudget: undefined,
    maxBudget: undefined,
    preferredStyle: "",
    favoriteNotes: "",
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await profileService.getMyProfile();
      setProfile(data);
      setFormData({
        scentPreference: data.scentPreference || "",
        minBudget: data.minBudget || undefined,
        maxBudget: data.maxBudget || undefined,
        preferredStyle: data.preferredStyle || "",
        favoriteNotes: data.favoriteNotes || "",
      });
    } catch (err: any) {
      setError(err.message || "Không thể tải thông tin profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setError("");
    setSuccess("");
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (profile) {
      setFormData({
        scentPreference: profile.scentPreference || "",
        minBudget: profile.minBudget || undefined,
        maxBudget: profile.maxBudget || undefined,
        preferredStyle: profile.preferredStyle || "",
        favoriteNotes: profile.favoriteNotes || "",
      });
    }
    setError("");
    setSuccess("");
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError("");
    setSuccess("");
    try {
      const message = await profileService.updateProfile(formData);
      setSuccess(message);
      setIsEditing(false);
      await loadProfile(); // Reload profile data
    } catch (err: any) {
      setError(err.message || "Không thể cập nhật profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: keyof UpdateProfileRequest, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  if (isLoading) {
    return (
      <Layout>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="60vh"
        >
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          {/* Header */}
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            mb={3}
          >
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: "primary.main",
                  fontSize: "2rem",
                }}
              >
                {profile?.profilePictureUrl ? (
                  <img
                    src={profile.profilePictureUrl}
                    alt={profile.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <PersonIcon fontSize="large" />
                )}
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight="bold">
                  Thông tin cá nhân
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {user?.email}
                </Typography>
              </Box>
            </Box>
            {!isEditing && (
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={handleEdit}
              >
                Chỉnh sửa
              </Button>
            )}
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Alerts */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

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
              onChange={(e) => handleChange("scentPreference", e.target.value)}
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
                  handleChange(
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
                  handleChange(
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
              onChange={(e) => handleChange("preferredStyle", e.target.value)}
              fullWidth
              disabled={!isEditing}
              placeholder="VD: Sang trọng, trẻ trung, cổ điển..."
              multiline
              rows={2}
            />
            <TextField
              label="Note hương yêu thích"
              value={formData.favoriteNotes || ""}
              onChange={(e) => handleChange("favoriteNotes", e.target.value)}
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
                onClick={handleCancel}
                disabled={isSaving}
              >
                Hủy
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  "Lưu"
                )}
              </Button>
            </Box>
          )}
        </Paper>
      </Container>
    </Layout>
  );
};

export default ProfilePage;
