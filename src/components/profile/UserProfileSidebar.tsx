import {
  Avatar,
  Box,
  Collapse,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
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
  Quiz as QuizIcon,
} from "@mui/icons-material";
import { Link as RouterLink, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import type { UserCredentials } from "@/services/userService";

interface UserProfileSidebarProps {
  userInfo: UserCredentials | null;
}

export const UserProfileSidebar = ({ userInfo }: UserProfileSidebarProps) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [accountOpen, setAccountOpen] = useState(true);
  const [ordersOpen, setOrdersOpen] = useState(true);

  const isActive = (path: string, includeSubPaths = false) =>
    pathname === path || (includeSubPaths && pathname.startsWith(`${path}/`));

  const navItems = [
    {
      label: "Thông Báo",
      icon: <NotificationsIcon fontSize="small" />,
      path: "/profile/notifications",
    },
    {
      label: "Tài Khoản Của Tôi",
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
        {
          label: "Lịch Sử Mua Hàng",
          path: "/my-orders",
          includeSubPaths: true,
        },
        {
          label: "Hủy Đơn/Hoàn Tiền",
          path: "/my-cancel-requests",
          includeSubPaths: true,
        },
        {
          label: "Trả Hàng/Hoàn Tiền",
          path: "/my-return-requests",
          includeSubPaths: true,
        },
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
      icon: <QuizIcon fontSize="small" />,
      path: "/profile/quiz-history",
    },
  ];

  const displayName = userInfo?.fullName || userInfo?.email || "Người dùng";

  return (
    <Box
      sx={{
        width: 240,
        flexShrink: 0,
        borderRight: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        pt: 3,
        pb: 4,
      }}
    >
      {/* User info */}
      <Box
        component={RouterLink}
        to="/profile"
        sx={{
          px: 3,
          pb: 2.5,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          cursor: "pointer",
          textDecoration: "none",
          color: "inherit",
        }}
      >
        <Avatar
          sx={{
            width: 48,
            height: 48,
            bgcolor: "error.main",
            fontSize: "1.2rem",
          }}
        >
          {displayName.charAt(0).toUpperCase()}
        </Avatar>
        <Box>
          <Typography
            variant="body2"
            fontWeight="bold"
            noWrap
            sx={{ maxWidth: 120 }}
          >
            {displayName}
          </Typography>
          <Box
            component={RouterLink}
            to="/profile"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              color: "text.secondary",
              cursor: "pointer",
              "&:hover": { color: "primary.main" },
              textDecoration: "none",
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <EditIcon sx={{ fontSize: 12 }} />
            <Typography variant="caption">Sửa Hồ Sơ</Typography>
          </Box>
        </Box>
      </Box>

      <Divider />

      <List dense disablePadding>
        {navItems.map((item) => {
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
                  {groupOpen ? (
                    <ExpandLess fontSize="small" />
                  ) : (
                    <ExpandMore fontSize="small" />
                  )}
                </ListItemButton>
                <Collapse in={groupOpen} timeout="auto" unmountOnExit>
                  <List dense disablePadding>
                    {item.children?.map((child) => (
                      <ListItemButton
                        key={child.path}
                        component={RouterLink}
                        to={child.path}
                        selected={isActive(
                          child.path,
                          "includeSubPaths" in child
                            ? child.includeSubPaths
                            : false,
                        )}
                        sx={{
                          pl: 7,
                          py: 0.9,
                          "&.Mui-selected": {
                            color: "error.main",
                            bgcolor: "transparent",
                          },
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
                          position: "relative",
                        }}
                      >
                        <ListItemText
                          primary={
                            <Typography
                              variant="body2"
                              color={
                                isActive(
                                  child.path,
                                  "includeSubPaths" in child
                                    ? child.includeSubPaths
                                    : false,
                                )
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
              selected={isActive(item.path!)}
              sx={{
                py: 1.2,
                px: 3,
                "&.Mui-selected": {
                  color: "error.main",
                  bgcolor: "transparent",
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 32,
                  color: isActive(item.path!) ? "error.main" : "text.secondary",
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography
                    variant="body2"
                    fontWeight="bold"
                    color={isActive(item.path!) ? "error.main" : "text.primary"}
                  >
                    {item.label}
                  </Typography>
                }
              />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
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
