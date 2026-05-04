import {
  Avatar,
  Box,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
} from "@mui/material";
import {
  Person as PersonIcon,
  LocationOn as LocationIcon,
  Lock as LockIcon,
  ListAlt as OrderIcon,
  LocalOffer as VoucherIcon,
  Notifications as NotificationsIcon,
  AccountCircle as AccountIcon,
  Edit as EditIcon,
  ExpandLess,
  ExpandMore,
  AssignmentReturn as ReturnIcon,
  Stars as LoyaltyIcon,
  Spa as SpaIcon,
  Quiz as SurveyIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  Home as HomeIcon,
} from "@mui/icons-material";
import { Link as RouterLink, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import type { UserCredentials } from "@/services/userService";
import { userService } from "@/services/userService";
import { useAuth } from "@/hooks/useAuth";

interface UserProfileSidebarProps {
  userInfo: UserCredentials | null;
  avatarUrl?: string | null;
}

const NAV_ITEMS = [
  {
    label: "Thông Báo",
    icon: <NotificationsIcon fontSize="small" />,
    path: "/profile/notifications",
  },
  {
    label: "Tài Khoản",
    icon: <AccountIcon fontSize="small" />,
    isGroup: true,
    children: [
      { label: "Hồ Sơ", path: "/profile" },
      { label: "Địa Chỉ", path: "/profile/address" },
      { label: "Đổi Mật Khẩu", path: "/profile/change-password" },
    ],
  },
  {
    label: "Đơn Mua",
    icon: <OrderIcon fontSize="small" />,
    isGroup: true,
    children: [
      { label: "Lịch Sử Mua Hàng", path: "/my-orders", includeSubPaths: true },
      { label: "Hủy Đơn/Hoàn Tiền", path: "/my-cancel-requests", includeSubPaths: true },
      { label: "Trả Hàng/Hoàn Tiền", path: "/my-return-requests", includeSubPaths: true },
    ],
  },
  {
    label: "Kho Voucher",
    icon: <VoucherIcon fontSize="small" />,
    path: "/profile/vouchers",
  },
  {
    label: "Điểm Thưởng",
    icon: <LoyaltyIcon fontSize="small" />,
    path: "/profile/loyalty",
  },
  {
    label: "Sở Thích Hương",
    icon: <SpaIcon fontSize="small" />,
    path: "/profile/scent-preferences",
  },
  {
    label: "Lịch Sử Khảo Sát",
    icon: <SurveyIcon fontSize="small" />,
    path: "/survey/history",
  },
];

// Bottom nav quick items (most-used 3 + More)
const BOTTOM_NAV_ITEMS = [
  { label: "Hồ Sơ", icon: <PersonIcon />, path: "/profile" },
  { label: "Đơn Mua", icon: <OrderIcon />, path: "/my-orders" },
  { label: "Voucher", icon: <VoucherIcon />, path: "/profile/vouchers" },
];

export const UserProfileSidebar = ({ userInfo, avatarUrl }: UserProfileSidebarProps) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [accountOpen, setAccountOpen] = useState(true);
  const [ordersOpen, setOrdersOpen] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [fetchedAvatarUrl, setFetchedAvatarUrl] = useState<string | null>(null);

  const isActive = (path: string, includeSubPaths = false) =>
    pathname === path || (includeSubPaths && pathname.startsWith(`${path}/`));

  const displayName = userInfo?.fullName || userInfo?.email || "Người dùng";
  const resolvedAvatarUrl = avatarUrl || user?.avatarUrl || fetchedAvatarUrl || undefined;

  useEffect(() => {
    // If parent already provides avatar or auth has it, skip extra request.
    if (avatarUrl || user?.avatarUrl) {
      return;
    }

    let isMounted = true;
    const loadAvatar = async () => {
      try {
        const avatar = await userService.getMyAvatar();
        if (isMounted) {
          setFetchedAvatarUrl(avatar?.url ?? null);
        }
      } catch {
        if (isMounted) {
          setFetchedAvatarUrl(null);
        }
      }
    };

    void loadAvatar();
    return () => {
      isMounted = false;
    };
  }, [avatarUrl, user?.avatarUrl]);

  // Exact-match for bottom nav — each item maps only its own path
  const bottomNavValue = (() => {
    if (pathname === "/profile") return 0;
    if (pathname === "/my-orders" || pathname.startsWith("/my-orders/")) return 1;
    if (pathname === "/profile/vouchers") return 2;
    return -1; // nothing selected (e.g. /profile/address, /profile/loyalty …)
  })();

  const SidebarContent = () => (
    <>
      {/* User info */}
      <Box
        component={RouterLink}
        to="/profile"
        onClick={() => setDrawerOpen(false)}
        sx={{
          px: 3,
          pb: 2.5,
          pt: { xs: 2, md: 3 },
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          cursor: "pointer",
          textDecoration: "none",
          color: "inherit",
        }}
      >
        <Avatar
          src={resolvedAvatarUrl}
          sx={{
            width: 48,
            height: 48,
            bgcolor: resolvedAvatarUrl ? undefined : "error.main",
            fontSize: "1.2rem",
          }}
        >
          {displayName.charAt(0).toUpperCase()}
        </Avatar>
        <Box>
          <Typography variant="body2" fontWeight="bold" noWrap sx={{ maxWidth: 160 }}>
            {displayName}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "text.secondary", "&:hover": { color: "primary.main" } }}>
            <EditIcon sx={{ fontSize: 12 }} />
            <Typography variant="caption">Sửa Hồ Sơ</Typography>
          </Box>
        </Box>
      </Box>

      <Divider />

      <List dense disablePadding>
        {NAV_ITEMS.map((item) => {
          if (item.isGroup) {
            const isOrdersGroup = item.label === "Đơn Mua";
            const groupOpen = isOrdersGroup ? ordersOpen : accountOpen;
            const toggleGroup = isOrdersGroup
              ? () => setOrdersOpen((prev) => !prev)
              : () => setAccountOpen((prev) => !prev);

            return (
              <Box key={item.label}>
                <ListItemButton onClick={toggleGroup} sx={{ py: 1.2, px: 3 }}>
                  <ListItemIcon sx={{ minWidth: 32, color: "error.main" }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body2" fontWeight="bold">
                        {item.label}
                      </Typography>
                    }
                  />
                  {groupOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                </ListItemButton>
                <Collapse in={groupOpen} timeout="auto" unmountOnExit>
                  <List dense disablePadding>
                    {item.children?.map((child) => (
                      <ListItemButton
                        key={child.path}
                        component={RouterLink}
                        to={child.path}
                        onClick={() => setDrawerOpen(false)}
                        selected={isActive(child.path, "includeSubPaths" in child ? child.includeSubPaths : false)}
                        sx={{
                          pl: 7,
                          py: 0.9,
                          position: "relative",
                          "&.Mui-selected": { color: "error.main", bgcolor: "transparent" },
                          "&.Mui-selected::before": {
                            content: '""',
                            position: "absolute",
                            left: 0,
                            top: "20%",
                            height: "60%",
                            width: 3,
                            bgcolor: "error.main",
                            borderRadius: 1,
                          },
                        }}
                      >
                        <ListItemText
                          primary={
                            <Typography
                              variant="body2"
                              color={
                                isActive(child.path, "includeSubPaths" in child ? child.includeSubPaths : false)
                                  ? "error.main"
                                  : "text.primary"
                              }
                            >
                              {child.label}
                            </Typography>
                          }
                        />
                      </ListItemButton>
                    ))}
                  </List>
                </Collapse>
              </Box>
            );
          }

          return (
            <ListItemButton
              key={item.path}
              component={RouterLink}
              to={item.path!}
              onClick={() => setDrawerOpen(false)}
              selected={isActive(item.path!)}
              sx={{
                py: 1.2,
                px: 3,
                "&.Mui-selected": { color: "error.main", bgcolor: "transparent" },
              }}
            >
              <ListItemIcon sx={{ minWidth: 32, color: isActive(item.path!) ? "error.main" : "text.secondary" }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="body2" fontWeight="bold" color={isActive(item.path!) ? "error.main" : "text.primary"}>
                    {item.label}
                  </Typography>
                }
              />
            </ListItemButton>
          );
        })}
      </List>
    </>
  );

  return (
    <>
      {/* ── DESKTOP: permanent left sidebar ── */}
      <Box
        sx={{
          display: { xs: "none", md: "block" },
          width: 240,
          flexShrink: 0,
          borderRight: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          pt: 0,
          pb: 4,
        }}
      >
        <SidebarContent />
      </Box>

      {/* ── MOBILE: slide-in Drawer triggered by bottom nav "More" ── */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: 280, pt: 0 } }}
        sx={{ display: { xs: "block", md: "none" } }}
      >
        {/* Close button */}
        <Box sx={{ display: "flex", justifyContent: "flex-end", px: 1, pt: 1 }}>
          <IconButton onClick={() => setDrawerOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <SidebarContent />
      </Drawer>

      {/* ── MOBILE: fixed bottom navigation bar ── */}
      <Paper
        elevation={8}
        sx={{
          display: { xs: "block", md: "none" },
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1200,
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <BottomNavigation
          value={drawerOpen ? -1 : bottomNavValue}
          showLabels
          sx={{ height: 56 }}
        >
          {BOTTOM_NAV_ITEMS.map((item) => (
            <BottomNavigationAction
              key={item.path}
              label={item.label}
              icon={item.icon}
              onClick={() => {
                setDrawerOpen(false);
                navigate(item.path);
              }}
              sx={{
                minWidth: 0,
                "& .MuiBottomNavigationAction-label": {
                  fontSize: "0.65rem !important", // prevent MUI size inflation on selected
                },
                "&.Mui-selected": { color: "error.main" },
              }}
            />
          ))}
          {/* More button — opens drawer */}
          <BottomNavigationAction
            label="Thêm"
            icon={<MenuIcon />}
            onClick={() => setDrawerOpen(true)}
            sx={{
              minWidth: 0,
              "& .MuiBottomNavigationAction-label": {
                fontSize: "0.65rem !important",
              },
              color: drawerOpen ? "error.main" : "text.secondary",
              "&.Mui-selected": { color: "text.secondary" }, // "More" never shows as selected
            }}
          />
        </BottomNavigation>
      </Paper>
    </>
  );
};

// Icon components used inside the sidebar (kept local for clarity)
export {
  PersonIcon,
  LocationIcon,
  LockIcon,
  OrderIcon,
  VoucherIcon,
  ReturnIcon,
};
