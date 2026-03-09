import { useState, useEffect } from "react";
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
import type { UserCredentials } from "../services/userService";
import { productReviewService } from "../services/reviewService";
import type { UserProfile, UpdateProfileRequest } from "../types/profile";
import type { AddressResponse } from "../types/address";
import type { ReviewResponse } from "../types/review";
import { AdminLayout } from "../layouts/AdminLayout";
import { MainLayout } from "../layouts/MainLayout";
import ProfileInfo from "../components/profile/ProfileInfo";
import AddressList from "../components/profile/AddressList";
import { MyReviews } from "../components/profile/MyReviews";
import { UserProfileSidebar } from "../components/profile/UserProfileSidebar";
import { ReviewEditorDialog } from "../components/review/ReviewEditorDialog";
import type { ReviewDialogTarget } from "../types/review";

const ProfilePage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { pathname } = useLocation();

  const [userInfo, setUserInfo] = useState<UserCredentials | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [addresses, setAddresses] = useState<AddressResponse[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);

  const [myReviews, setMyReviews] = useState<ReviewResponse[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewDialogMode, setReviewDialogMode] = useState<"create" | "edit">(
    "create",
  );
  const [reviewDialogTarget, setReviewDialogTarget] =
    useState<ReviewDialogTarget | null>(null);
  const [selectedReview, setSelectedReview] = useState<ReviewResponse | null>(
    null,
  );

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState<UpdateProfileRequest>({
    scentPreference: "",
    minBudget: undefined,
    maxBudget: undefined,
    preferredStyle: "",
    favoriteNotes: "",
  });

  const Layout =
    user?.role === "admin" || user?.role === "staff" ? AdminLayout : MainLayout;

  const getActiveSection = () => {
    if (pathname === "/profile/notifications") return "notifications";
    if (pathname === "/profile/address") return "address";
    if (pathname === "/profile/change-password") return "change-password";
    if (pathname === "/profile/vouchers") return "vouchers";
    return "profile";
  };
  const activeSection = getActiveSection();

  useEffect(() => {
    loadUserInfo();
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

  const loadAddresses = async () => {
    setIsLoadingAddresses(true);
    try {
      const data = await addressService.getAddresses();
      setAddresses(data);
    } catch (err: any) {
      console.error("Error loading addresses:", err);
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  const loadMyReviews = async () => {
    setIsLoadingReviews(true);
    try {
      const data = await productReviewService.getMyReviews();
      setMyReviews(data);
    } catch (err: any) {
      console.error("Error loading reviews:", err);
    } finally {
      setIsLoadingReviews(false);
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
      await loadProfile();
    } catch (err: any) {
      setError(err.message || "Không thể cập nhật profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: keyof UpdateProfileRequest, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditReview = (review: ReviewResponse) => {
    if (!review.orderDetailId || !review.variantId) {
      showToast("Không thể mở đánh giá này", "error");
      return;
    }
    setReviewDialogMode("edit");
    setReviewDialogTarget({
      orderDetailId: review.orderDetailId,
      variantId: review.variantId,
      variantName: review.variantName,
      productName: review.variantName,
      thumbnailUrl: review.images?.[0]?.url || null,
    });
    setSelectedReview(review);
    setIsReviewDialogOpen(true);
  };

  const handleDeleteReview = async (review: ReviewResponse) => {
    if (!review.id) return;
    try {
      await productReviewService.deleteReview(review.id);
      showToast("Đã xoá đánh giá", "success");
      await loadMyReviews();
    } catch (err: any) {
      showToast(err.message || "Không thể xoá đánh giá", "error");
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
        return (
          <Box py={4} textAlign="center">
            <Typography variant="h6" color="text.secondary">
              Thông báo
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={1}>
              Tính năng đang được phát triển.
            </Typography>
          </Box>
        );
      case "address":
        return (
          <AddressList
            addresses={addresses}
            isLoading={isLoadingAddresses}
            onRefresh={loadAddresses}
          />
        );
      case "vouchers":
        return (
          <Box py={4} textAlign="center">
            <Typography variant="h6" color="text.secondary">
              Kho Voucher
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={1}>
              Tính năng đang được phát triển.
            </Typography>
          </Box>
        );
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
          <>
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
            />
            {(myReviews.length > 0 || isLoadingReviews) && (
              <Box mt={4}>
                <MyReviews
                  reviews={myReviews}
                  isLoading={isLoadingReviews}
                  onRefresh={loadMyReviews}
                  onEdit={handleEditReview}
                  onDelete={handleDeleteReview}
                />
              </Box>
            )}
          </>
        );
    }
  };

  return (
    <Layout>
      <Box sx={{ bgcolor: "#ffff", py: 4, flex: 1 }}>
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
            <UserProfileSidebar userInfo={userInfo} />
            <Box sx={{ flex: 1, p: 4, bgcolor: "#fff", minWidth: 0 }}>
              {renderContent()}
            </Box>
          </Paper>
        </Container>
      </Box>

      <ReviewEditorDialog
        open={isReviewDialogOpen}
        mode={reviewDialogMode}
        target={reviewDialogTarget}
        initialReview={selectedReview}
        onClose={() => {
          setIsReviewDialogOpen(false);
          setReviewDialogTarget(null);
          setSelectedReview(null);
        }}
        onSuccess={loadMyReviews}
      />
    </Layout>
  );
};

export default ProfilePage;
