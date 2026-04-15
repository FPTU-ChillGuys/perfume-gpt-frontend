import { useState, useEffect } from "react";
import {
  Box,
  Collapse,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Badge,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Inventory as InventoryIcon,
  LocalShipping as ShipmentIcon,
  Campaign as CampaignIcon,
  Assessment as ReportsIcon,
  People as PeopleIcon,
  Logout as LogoutIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ArrowDropDown as ArrowDropDownIcon,
  ArrowDropUp as ArrowDropUpIcon,
  AddBox as AddBoxIcon,
  Category as CategoryIcon,
  ShoppingCart as ShoppingCartIcon,
  PointOfSale as PointOfSaleIcon,
  Tv as TvIcon,
  Cancel as CancelIcon,
  AssignmentReturn as AssignmentReturnIcon,
  Slideshow as SlideshowIcon,
  SmartToy as BotIcon,
  Quiz as SurveyIcon,
  Feed as FeedIcon,
  Chat as ChatIcon,
  ThumbsUpDown as ThumbsUpDownIcon,
  LocalOffer as LocalOfferIcon,
  AccountBalanceWallet as AccountBalanceWalletIcon,
} from "@mui/icons-material";
import { Link as RouterLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { importStockService } from "../services/importStockService";
import { NotificationBell } from "../components/common/NotificationBell";
import { useNotificationSystem } from "../hooks/useNotificationSystem";
import type { NotificationItem } from "@/services/notificationService";

const drawerWidth = 280;
const drawerCollapsedWidth = 70;

interface SidebarMenuItem {
  text: string;
  icon: React.ReactElement;
  path: string;
  roles: string[];
}

interface SidebarMenuGroup {
  key: string;
  text: string;
  icon: React.ReactElement;
  roles: string[];
  pinnedBottom?: boolean;
  items: SidebarMenuItem[];
}

const menuGroups: SidebarMenuGroup[] = [
  {
    key: "overview",
    text: "Tổng quan",
    icon: <DashboardIcon />,
    roles: ["admin", "staff"],
    items: [
      {
        text: "Trang chủ",
        icon: <DashboardIcon />,
        path: "/admin/dashboard",
        roles: ["admin"],
      },
      {
        text: "Trang chủ",
        icon: <DashboardIcon />,
        path: "/staff/dashboard",
        roles: ["staff"],
      },
    ],
  },
  {
    key: "orders",
    text: "Đơn hàng",
    icon: <ShoppingCartIcon />,
    roles: ["admin", "staff"],
    items: [
      {
        text: "Quản lý đơn hàng",
        icon: <ShoppingCartIcon />,
        path: "/admin/orders",
        roles: ["admin"],
      },
      {
        text: "Yêu cầu hủy đơn",
        icon: <CancelIcon />,
        path: "/admin/cancel-requests",
        roles: ["admin"],
      },
      {
        text: "Yêu cầu trả hàng",
        icon: <AssignmentReturnIcon />,
        path: "/admin/return-requests",
        roles: ["admin"],
      },
      {
        text: "Quản lý đơn hàng",
        icon: <ShoppingCartIcon />,
        path: "/staff/orders",
        roles: ["staff"],
      },
      {
        text: "Yêu cầu hủy đơn",
        icon: <CancelIcon />,
        path: "/staff/cancel-requests",
        roles: ["staff"],
      },
      {
        text: "Yêu cầu trả hàng",
        icon: <AssignmentReturnIcon />,
        path: "/staff/return-requests",
        roles: ["staff"],
      },
    ],
  },
  {
    key: "inventory",
    text: "Kho hàng",
    icon: <InventoryIcon />,
    roles: ["admin", "staff"],
    items: [
      {
        text: "Quản lý kho",
        icon: <InventoryIcon />,
        path: "/admin/inventory",
        roles: ["admin"],
      },
      {
        text: "Nhập hàng",
        icon: <AddBoxIcon />,
        path: "/admin/import-stock",
        roles: ["admin"],
      },
      {
        text: "Nhà cung cấp",
        icon: <PeopleIcon />,
        path: "/admin/suppliers",
        roles: ["admin"],
      },
      {
        text: "Quản lý sản phẩm",
        icon: <CategoryIcon />,
        path: "/admin/products",
        roles: ["admin"],
      },
      {
        text: "Báo cáo",
        icon: <ReportsIcon />,
        path: "/admin/inventory-report-logs",
        roles: ["admin"],
      },
      {
        text: "Sổ kho",
        icon: <ReportsIcon />,
        path: "/admin/inventory-ledger",
        roles: ["admin"],
      },
      {
        text: "Sổ dòng tiền",
        icon: <AccountBalanceWalletIcon />,
        path: "/admin/cash-flow",
        roles: ["admin"],
      },
      {
        text: "Quản lý kho",
        icon: <InventoryIcon />,
        path: "/staff/inventory",
        roles: ["staff"],
      },
      {
        text: "Đợt nhập hàng",
        icon: <ShipmentIcon />,
        path: "/staff/receive-import-stock",
        roles: ["staff"],
      },
      {
        text: "Quản lý sản phẩm",
        icon: <CategoryIcon />,
        path: "/staff/products",
        roles: ["staff"],
      },
      {
        text: "Rà soát giao dịch thu chi",
        icon: <AccountBalanceWalletIcon />,
        path: "/staff/payment-transactions",
        roles: ["staff"],
      },
    ],
  },
  {
    key: "content-and-ops",
    text: "Nội dung & Vận hành",
    icon: <CampaignIcon />,
    roles: ["admin"],
    items: [
      {
        text: "Banner & nội dung",
        icon: <SlideshowIcon />,
        path: "/admin/content",
        roles: ["admin"],
      },
      {
        text: "Chiến dịch khuyến mãi",
        icon: <CampaignIcon />,
        path: "/admin/campaigns",
        roles: ["admin"],
      },
      {
        text: "Quản lý Voucher",
        icon: <LocalOfferIcon />,
        path: "/admin/vouchers",
        roles: ["admin"],
      },
      {
        text: "Rà soát giao dịch thu chi",
        icon: <AccountBalanceWalletIcon />,
        path: "/admin/payment-transactions",
        roles: ["admin"],
      },
      {
        text: "Quản lý người dùng",
        icon: <PeopleIcon />,
        path: "/admin/users",
        roles: ["admin"],
      },
      {
        text: "Thuộc tính sản phẩm",
        icon: <CategoryIcon />,
        path: "/admin/attributes",
        roles: ["admin"],
      },
    ],
  },
  {
    key: "ai",
    text: "AI",
    icon: <BotIcon />,
    roles: ["admin"],
    pinnedBottom: true,
    items: [
      {
        text: "Cấu hình AI",
        icon: <BotIcon />,
        path: "/admin/instructions",
        roles: ["admin"],
      },
      {
        text: "AI Acceptance",
        icon: <ThumbsUpDownIcon />,
        path: "/admin/ai-acceptance",
        roles: ["admin"],
      },
      {
        text: "Survey",
        icon: <SurveyIcon />,
        path: "/admin/survey",
        roles: ["admin"],
      },
      {
        text: "Quản lý Log",
        icon: <FeedIcon />,
        path: "/admin/logs",
        roles: ["admin"],
      },
      {
        text: "Quản lý Hội thoại",
        icon: <ChatIcon />,
        path: "/admin/conversations",
        roles: ["admin"],
      },
    ],
  },
];

export const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotificationSystem({
      userRole: user?.role ?? "",
      userId: user?.id,
    });

  const routePrefix = user?.role === "staff" ? "/staff" : "/admin";

  const handleNotificationClick = (item: NotificationItem) => {
    if (!item.referenceId) return;
    switch (item.referenceType) {
      case "Order":
        navigate(`${routePrefix}/orders/${item.referenceId}`);
        break;
      case "OrderCancelRequest":
        navigate(`${routePrefix}/cancel-requests/${item.referenceId}`);
        break;
      case "OrderReturnRequest":
        navigate(`${routePrefix}/return-requests/${item.referenceId}`);
        break;
    }
  };
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [collapsedGroupKeys, setCollapsedGroupKeys] = useState<string[]>([]);

  // Fetch pending import tickets count for staff
  useEffect(() => {
    const fetchPendingCount = async () => {
      if (user?.role === "staff") {
        try {
          const response = await importStockService.getImportTickets(
            1,
            1,
            "Pending",
          );
          setPendingCount(response.payload!.totalCount);
        } catch (error) {
          console.error("Failed to fetch pending tickets:", error);
        }
      }
    };

    fetchPendingCount();
    // Refresh every 30 seconds
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleCollapse = () => {
    setCollapsed(!collapsed);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleMenuClose();
  };

  const handleNavigate = (path: string) => {
    if (path === "#") {
      return;
    }
    navigate(path);
    setMobileOpen(false);
  };

  const visibleMenuGroups = menuGroups
    .filter((group) => group.roles.includes(user?.role || ""))
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        item.roles.includes(user?.role || ""),
      ),
    }))
    .filter((group) => group.items.length > 0);

  const normalGroups = visibleMenuGroups.filter((group) => !group.pinnedBottom);
  const bottomGroups = visibleMenuGroups.filter((group) => group.pinnedBottom);

  const isGroupActive = (group: SidebarMenuGroup) =>
    group.items.some((item) => location.pathname === item.path);

  const toggleGroup = (groupKey: string) => {
    setCollapsedGroupKeys((prev) =>
      prev.includes(groupKey)
        ? prev.filter((key) => key !== groupKey)
        : [...prev, groupKey],
    );
  };

  const renderMenuItem = (
    item: SidebarMenuItem,
    isChild = false,
    keyPrefix = "",
  ) => {
    const isActive = location.pathname === item.path;
    return (
      <ListItem
        key={`${keyPrefix}${item.text}-${item.path}`}
        disablePadding
        sx={{ mb: 0.5 }}
      >
        <ListItemButton
          component={RouterLink}
          to={item.path}
          onClick={() => handleNavigate(item.path)}
          sx={{
            borderRadius: 1,
            bgcolor: isActive ? "primary.main" : "transparent",
            color: isActive ? "white" : "text.primary",
            justifyContent: collapsed ? "center" : "flex-start",
            px: collapsed ? 1 : isChild ? 4 : 2,
            "&:hover": {
              bgcolor: isActive ? "primary.dark" : "action.hover",
            },
            "& .MuiListItemIcon-root": {
              color: isActive ? "white" : "text.secondary",
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: collapsed ? "auto" : 40 }}>
            {item.text === "Đợt nhập hàng" &&
            user?.role === "staff" &&
            pendingCount > 0 &&
            collapsed ? (
              <Badge badgeContent={pendingCount} color="error" max={99}>
                {item.icon}
              </Badge>
            ) : (
              item.icon
            )}
          </ListItemIcon>
          {!collapsed && (
            <ListItemText
              primary={item.text}
              primaryTypographyProps={{
                fontSize: "0.875rem",
                fontWeight: isActive ? 600 : 500,
              }}
            />
          )}
          {!collapsed &&
            item.text === "Đợt nhập hàng" &&
            user?.role === "staff" &&
            pendingCount > 0 && (
              <Box
                sx={{
                  ml: 1,
                  px: 1,
                  py: 0.25,
                  bgcolor: "error.main",
                  color: "white",
                  borderRadius: 1,
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}
              >
                +{pendingCount}
              </Box>
            )}
        </ListItemButton>
      </ListItem>
    );
  };

  const renderMenuGroup = (group: SidebarMenuGroup) => {
    const isOpen = !collapsedGroupKeys.includes(group.key);
    const active = isGroupActive(group);
    return (
      <Box key={group.key} sx={{ mb: 1 }}>
        <ListItem disablePadding sx={{ mb: 0.5 }}>
          <ListItemButton
            onClick={() => toggleGroup(group.key)}
            sx={{
              borderRadius: 1,
              bgcolor: active ? "action.selected" : "transparent",
              px: 2,
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: "text.secondary" }}>
              {group.icon}
            </ListItemIcon>
            <ListItemText
              primary={group.text}
              primaryTypographyProps={{
                fontSize: "0.875rem",
                fontWeight: 700,
              }}
            />
            {isOpen ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />}
          </ListItemButton>
        </ListItem>
        <Collapse in={isOpen} timeout="auto" unmountOnExit>
          <List disablePadding>
            {group.items.map((item) =>
              renderMenuItem(item, true, `${group.key}-`),
            )}
          </List>
        </Collapse>
      </Box>
    );
  };

  const getGroupNavigatePath = (group: SidebarMenuGroup) => {
    const activeItem = group.items.find(
      (item) => location.pathname === item.path,
    );
    if (activeItem) {
      return activeItem.path;
    }

    const fallbackItem = group.items.find((item) => item.path !== "#");
    return fallbackItem?.path ?? "#";
  };

  const renderCollapsedGroupItem = (group: SidebarMenuGroup) => {
    const active = isGroupActive(group);
    const navigatePath = getGroupNavigatePath(group);
    const showPendingBadge =
      user?.role === "staff" &&
      pendingCount > 0 &&
      group.items.some((item) => item.path === "/staff/receive-import-stock");

    return (
      <ListItem key={`collapsed-${group.key}`} disablePadding sx={{ mb: 0.5 }}>
        <ListItemButton
          component={RouterLink}
          to={navigatePath}
          onClick={() => handleNavigate(navigatePath)}
          title={group.text}
          sx={{
            borderRadius: 1,
            bgcolor: active ? "primary.main" : "transparent",
            color: active ? "white" : "text.primary",
            justifyContent: "center",
            px: 1,
            "&:hover": {
              bgcolor: active ? "primary.dark" : "action.hover",
            },
            "& .MuiListItemIcon-root": {
              color: active ? "white" : "text.secondary",
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: "auto" }}>
            {showPendingBadge ? (
              <Badge badgeContent={pendingCount} color="error" max={99}>
                {group.icon}
              </Badge>
            ) : (
              group.icon
            )}
          </ListItemIcon>
        </ListItemButton>
      </ListItem>
    );
  };

  const drawer = (
    <Box>
      <Toolbar
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          px: collapsed ? 1 : 2,
          py: 2,
        }}
      >
        {!collapsed && (
          <Typography
            variant="h6"
            noWrap
            component="div"
            color="primary"
            fontWeight="bold"
          >
            PerfumeGPT
          </Typography>
        )}
        <IconButton
          onClick={handleCollapse}
          sx={{ display: { xs: "none", sm: "block" } }}
        >
          {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </IconButton>
      </Toolbar>
      <Divider />

      {/* Navigation Menu */}
      <List
        sx={{
          px: 1,
          py: 2,
          height: "calc(100vh - 81px)",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        {collapsed
          ? normalGroups.map((group) => renderCollapsedGroupItem(group))
          : normalGroups.map((group) => renderMenuGroup(group))}

        {bottomGroups.length > 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            {collapsed
              ? bottomGroups.map((group) => renderCollapsedGroupItem(group))
              : bottomGroups.map((group) => renderMenuGroup(group))}
          </>
        )}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* AppBar */}
      <AppBar
        position="fixed"
        sx={{
          width: {
            sm: `calc(100% - ${collapsed ? drawerCollapsedWidth : drawerWidth}px)`,
          },
          ml: { sm: `${collapsed ? drawerCollapsedWidth : drawerWidth}px` },
          bgcolor: "background.paper",
          color: "text.primary",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          transition: "width 0.3s, margin-left 0.3s",
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 }, py: 1 }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }} />
          <NotificationBell
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAsRead={markAsRead}
            onMarkAllAsRead={markAllAsRead}
            onItemClick={handleNotificationClick}
          />
          <IconButton onClick={handleMenuOpen} sx={{ p: 0.5, ml: 1 }}>
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: "primary.main",
                fontSize: "0.875rem",
              }}
            >
              {user?.name?.charAt(0).toUpperCase()}
            </Avatar>
            {anchorEl ? (
              <ArrowDropUpIcon sx={{ ml: 0.5 }} />
            ) : (
              <ArrowDropDownIcon sx={{ ml: 0.5 }} />
            )}
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "right",
            }}
            transformOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
            PaperProps={{
              sx: {
                mt: 1.5,
                minWidth: 220,
                boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
              },
            }}
          >
            <MenuItem
              onClick={handleMenuClose}
              sx={{
                px: 2,
                py: 1.5,
                flexDirection: "column",
                alignItems: "flex-start",
                cursor: "default",
                "&:hover": {
                  bgcolor: "transparent",
                },
              }}
            >
              <Typography variant="subtitle2" fontWeight={600}>
                {user?.name}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block" }}
              >
                {user?.email}
              </Typography>
            </MenuItem>
            <Divider />
            {user?.role === "staff" && (
              <MenuItem
                component={RouterLink}
                to="/checkout/counter/staff"
                onClick={() => {
                  handleMenuClose();
                }}
                sx={{ py: 1.5 }}
              >
                <ListItemIcon>
                  <PointOfSaleIcon fontSize="small" />
                </ListItemIcon>
                <Typography variant="body2">Checkout tại quầy</Typography>
              </MenuItem>
            )}
            {user?.role === "staff" && (
              <MenuItem
                component={RouterLink}
                to="/checkout/counter/display"
                onClick={() => {
                  handleMenuClose();
                }}
                sx={{ py: 1.5 }}
              >
                <ListItemIcon>
                  <TvIcon fontSize="small" />
                </ListItemIcon>
                <Typography variant="body2">Màn hình khách tại quầy</Typography>
              </MenuItem>
            )}
            <MenuItem
              component={RouterLink}
              to="/"
              onClick={() => {
                handleMenuClose();
              }}
              sx={{ py: 1.5 }}
            >
              <ListItemIcon>
                <DashboardIcon fontSize="small" />
              </ListItemIcon>
              <Typography variant="body2">Website</Typography>
            </MenuItem>
            <MenuItem onClick={handleLogout} sx={{ py: 1.5 }}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              <Typography variant="body2">Đăng xuất</Typography>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Box
        component="nav"
        sx={{
          width: { sm: collapsed ? drawerCollapsedWidth : drawerWidth },
          flexShrink: { sm: 0 },
          transition: "width 0.3s",
        }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: collapsed ? drawerCollapsedWidth : drawerWidth,
              borderRight: "1px solid",
              borderColor: "divider",
              transition: "width 0.3s",
              overflowX: "hidden",
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: {
            sm: `calc(100% - ${collapsed ? drawerCollapsedWidth : drawerWidth}px)`,
          },
          bgcolor: "background.default",
          minHeight: "100vh",
          transition: "width 0.3s",
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
};
