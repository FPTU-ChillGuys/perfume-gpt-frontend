import { useState, useEffect, useRef } from "react";
import {
  Box,
  CircularProgress,
  Container,
  Paper,
  Typography,
} from "@mui/material";
import { useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { profileService } from "../services/profileService";
import { addressService } from "../services/addressService";
import { userService } from "../services/userService";
import type { UserAvatar, UserCredentials } from "../services/userService";
import type { UserProfile, UpdateProfileRequest } from "../types/profile";
import type { AddressResponse } from "../types/address";
import { AdminLayout } from "../layouts/AdminLayout";
import { MainLayout } from "../layouts/MainLayout";
import ProfileInfo from "../components/profile/ProfileInfo";
import AddressList from "../components/profile/AddressList";
import { UserProfileSidebar } from "../components/profile/UserProfileSidebar";
import { LoyaltyHistorySection } from "../components/profile/LoyaltyHistorySection";
import { VoucherSection } from "../components/profile/VoucherSection";
import { ScentPreferencesSection } from "../components/profile/ScentPreferencesSection";
import { QuizHistorySection } from "../components/profile/QuizHistorySection";
import { NotificationSection } from "../components/profile/NotificationSection";

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const { pathname } = useLocation();

  const [userInfo, setUserInfo] = useState<UserCredentials | null>(null);
  const [avatar, setAvatar] = useState<UserAvatar | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [isAvatarDeleting, setIsAvatarDeleting] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const [addresses, setAddresses] = useState<AddressResponse[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState<UpdateProfileRequest>({
    dateOfBirth: null,
    minBudget: null,
    maxBudget: null,
    notePreferenceIds: null,
    familyPreferenceIds: null,
    attributePreferenceIds: null,
  });

  const Layout =
    user?.role === "admin" || user?.role === "staff" ? AdminLayout : MainLayout;

  const getActiveSection = () => {
    if (pathname === "/profile/notifications") return "notifications";
    if (pathname === "/profile/address") return "address";
    if (pathname === "/profile/change-password") return "change-password";
    if (pathname === "/profile/vouchers") return "vouchers";
    if (pathname === "/profile/loyalty") return "loyalty";
    if (pathname === "/profile/scent-preferences") return "scent-preferences";
    if (pathname === "/profile/quiz-history") return "quiz-history";
    return "profile";
  };
  const activeSection = getActiveSection();

  useEffect(() => {
    loadUserInfo();
    loadAvatar();
    loadProfile();
  }, []);

  useEffect(() => {
    if (activeSection === "address" && addresses.length === 0) {
      loadAddresses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  const loadUserInfo = async () => {
    try {
      const data = await userService.getUserMe();
      setUserInfo(data);
    } catch (err) {
      console.error("Failed to load user info:", err);
    }
  };

  const loadProfile = async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await profileService.getMyProfile();
      setProfile(data);
      setFormData({
        dateOfBirth: data.dateOfBirth ?? null,
        minBudget: data.minBudget ?? null,
        maxBudget: data.maxBudget ?? null,
        notePreferenceIds:
          data.notePreferences?.map((n) => ({
            noteId: n.noteId!,
            noteType: n.noteType as "Top" | "Heart" | "Base",
          })) ?? null,
        familyPreferenceIds:
          data.familyPreferences?.map((f) => f.familyId!) ?? null,
        attributePreferenceIds:
          data.attributePreferences?.map((a) => a.attributeValueId!) ?? null,
      });
    } catch (err: any) {
      setError(err.message || "Không thể tải thông tin profile");
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvatar = async (): Promise<UserAvatar | null> => {
    try {
      const data = await userService.getMyAvatar();
      setAvatar(data);
      return data;
    } catch (err: any) {
      // Avatar can be empty for new users; only surface unexpected errors.
      if (err?.message) {
        console.error("Failed to load avatar:", err);
      }
      return null;
    }
  };

  const loadAddresses = async () => {
    setIsLoadingAddresses(true);
    try {
      const data = await addressService.getAddresses();
      setAddresses(data);
    } catch (err: any) {
      showToast(err?.message || "Không thể tải danh sách địa chỉ", "error");
    } finally {
      setIsLoadingAddresses(false);
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
        dateOfBirth: profile.dateOfBirth ?? null,
        minBudget: profile.minBudget ?? null,
        maxBudget: profile.maxBudget ?? null,
        notePreferenceIds:
          profile.notePreferences?.map((n) => ({
            noteId: n.noteId!,
            noteType: n.noteType as "Top" | "Heart" | "Base",
          })) ?? null,
        familyPreferenceIds:
          profile.familyPreferences?.map((f) => f.familyId!) ?? null,
        attributePreferenceIds:
          profile.attributePreferences?.map((a) => a.attributeValueId!) ?? null,
      });
    }
    setError("");
    setSuccess("");
  };

  const handleSave = async (fullName: string, phoneNumber: string) => {
    setIsSaving(true);
    setError("");
    setSuccess("");
    try {
      const message = await userService.updateUserMe({ fullName, phoneNumber });
      setSuccess(message);
      setIsEditing(false);
      await loadUserInfo();
    } catch (err: any) {
      setError(err.message || "Không thể cập nhật thông tin");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: keyof UpdateProfileRequest, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePickAvatar = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      showToast("Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP", "warning");
      event.target.value = "";
      return;
    }

    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      showToast("Ảnh phải nhỏ hơn hoặc bằng 5MB", "warning");
      event.target.value = "";
      return;
    }

    setIsAvatarUploading(true);
    try {
      const message = await userService.uploadAvatar(file, file.name);
      showToast(message, "success");
      const [newAvatar] = await Promise.all([loadAvatar(), loadUserInfo()]);
      updateUser({ avatarUrl: newAvatar?.url || undefined });
    } catch (err: any) {
      showToast(err?.message || "Không thể tải ảnh đại diện", "error");
    } finally {
      setIsAvatarUploading(false);
      event.target.value = "";
    }
  };

  const handleDeleteAvatar = async () => {
    if (!avatar) return;
    setIsAvatarDeleting(true);
    try {
      const message = await userService.deleteMyAvatar();
      showToast(message, "success");
      await Promise.all([loadAvatar(), loadUserInfo()]);
      setAvatar(null);
      updateUser({ avatarUrl: undefined });
    } catch (err: any) {
      showToast(err?.message || "Không thể xóa ảnh đại diện", "error");
    } finally {
      setIsAvatarDeleting(false);
    }
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

  const renderContent = () => {
    switch (activeSection) {
      case "notifications":
        return <NotificationSection />;
      case "address":
        return (
          <AddressList
            addresses={addresses}
            isLoading={isLoadingAddresses}
            onRefresh={loadAddresses}
          />
        );
      case "vouchers":
        return <VoucherSection />;
      case "loyalty":
        return <LoyaltyHistorySection />;
      case "scent-preferences":
        return (
          <ScentPreferencesSection
            profile={profile}
            onProfileUpdated={loadProfile}
          />
        );
      case "quiz-history":
        return <QuizHistorySection />;
      case "change-password":
        return (
          <Box py={4} textAlign="center">
            <Typography variant="h6" color="text.secondary">
              Đổi Mật Khẩu
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={1}>
              Tính năng đang được phát triển.
            </Typography>
          </Box>
        );
      default:
        return (
          <ProfileInfo
            profile={profile}
            userInfo={userInfo}
            formData={formData}
            isEditing={isEditing}
            isSaving={isSaving}
            error={error}
            success={success}
            onEdit={handleEdit}
            onCancel={handleCancel}
            onSave={handleSave}
            onChange={handleChange}
            onClearError={() => setError("")}
            onClearSuccess={() => setSuccess("")}
            avatar={avatar}
            isAvatarUploading={isAvatarUploading}
            isAvatarDeleting={isAvatarDeleting}
            onPickAvatar={handlePickAvatar}
            onDeleteAvatar={handleDeleteAvatar}
          />
        );
    }
  };

  return (
    <Layout>
      <Box sx={{ bgcolor: "background.default", py: 4, flex: 1 }}>
        <Container maxWidth="lg">
          <Paper
            elevation={0}
            sx={{
              display: "flex",
              overflow: "hidden",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              minHeight: 600,
            }}
          >
            <UserProfileSidebar
              userInfo={userInfo}
              avatarUrl={avatar?.url || user?.avatarUrl}
            />
            <Box
              sx={{ flex: 1, p: 4, bgcolor: "background.paper", minWidth: 0 }}
            >
              {renderContent()}
            </Box>
          </Paper>
        </Container>
      </Box>

      <input
        ref={avatarInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        style={{ display: "none" }}
        onChange={handleAvatarChange}
      />
    </Layout>
  );
};

export default ProfilePage;
