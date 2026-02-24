import { useState, useEffect } from "react";
import {
  Box,
  Container,
  Paper,
  Typography,
  CircularProgress,
  Avatar,
  Tabs,
  Tab,
  Chip,
} from "@mui/material";
import {
  Person as PersonIcon,
  LocationOn as LocationIcon,
  ShoppingBag as ShoppingBagIcon,
} from "@mui/icons-material";
import { useAuth } from "../hooks/useAuth";
import { profileService } from "../services/profileService";
import { addressService } from "../services/addressService";
import { orderService } from "../services/orderService";
import type { UserProfile, UpdateProfileRequest } from "../types/profile";
import type { AddressResponse } from "../types/address";
import type { OrderListItem } from "../types/order";
import { AdminLayout } from "../layouts/AdminLayout";
import { MainLayout } from "../layouts/MainLayout";
import ProfileInfo from "../components/profile/ProfileInfo";
import AddressList from "../components/profile/AddressList";
import OrderHistory from "../components/profile/OrderHistory";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const ProfilePage = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [addresses, setAddresses] = useState<AddressResponse[]>([]);
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
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

  useEffect(() => {
    if (activeTab === 1 && addresses.length === 0) {
      loadAddresses();
    } else if (activeTab === 2 && orders.length === 0) {
      loadOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

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

  const loadOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const { items } = await orderService.getMyOrders({
        PageSize: 20,
        PageNumber: 1,
      });
      setOrders(items);
    } catch (err: any) {
      console.error("Error loading orders:", err);
    } finally {
      setIsLoadingOrders(false);
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
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper elevation={3}>
          {/* Header */}
          <Box sx={{ p: 3, borderBottom: 1, borderColor: "divider" }}>
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar
                sx={{
                  width: 64,
                  height: 64,
                  bgcolor: "primary.main",
                  fontSize: "1.5rem",
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
                  {profile?.name || user?.email}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {user?.email}
                </Typography>
                <Chip
                  label={user?.role === "user" ? "Người dùng" : user?.role}
                  size="small"
                  color="primary"
                  sx={{ mt: 0.5 }}
                />
              </Box>
            </Box>
          </Box>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{ borderBottom: 1, borderColor: "divider", px: 3 }}
          >
            <Tab
              icon={<PersonIcon />}
              label="Thông tin cá nhân"
              iconPosition="start"
            />
            <Tab icon={<LocationIcon />} label="Địa chỉ" iconPosition="start" />
            <Tab
              icon={<ShoppingBagIcon />}
              label="Lịch sử mua hàng"
              iconPosition="start"
            />
          </Tabs>

          <Box sx={{ px: 3, pb: 3 }}>
            {/* Tab 0: Profile Info */}
            <TabPanel value={activeTab} index={0}>
              <ProfileInfo
                profile={profile}
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
            </TabPanel>

            {/* Tab 1: Addresses */}
            <TabPanel value={activeTab} index={1}>
              <AddressList
                addresses={addresses}
                isLoading={isLoadingAddresses}
                onRefresh={loadAddresses}
              />
            </TabPanel>

            {/* Tab 2: Order History */}
            <TabPanel value={activeTab} index={2}>
              <OrderHistory orders={orders} isLoading={isLoadingOrders} />
            </TabPanel>
          </Box>
        </Paper>
      </Container>
    </Layout>
  );
};

export default ProfilePage;
