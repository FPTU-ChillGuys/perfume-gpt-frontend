import { useState, useEffect } from "react";
import {
  Box,
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
  Slideshow as SlideshowIcon,
  SmartToy as BotIcon,
  Quiz as QuizIcon,
  Feed as FeedIcon,
  Chat as ChatIcon,
  ThumbsUpDown as ThumbsUpDownIcon,
  LocalOffer as LocalOfferIcon,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { importStockService } from "../services/importStockService";

const drawerWidth = 280;
const drawerCollapsedWidth = 70;

interface MenuItem {
  text: string;
  icon: React.ReactElement;
  path: string;
  roles: string[];
}

const menuItems: MenuItem[] = [
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
  {
    text: "Quản lý người dùng",
    icon: <PeopleIcon />,
    path: "#",
    roles: ["admin"],
  },
  {
    text: "Quản lý sản phẩm",
    icon: <CategoryIcon />,
    path: "/admin/products",
    roles: ["admin"],
  },
  {
    text: "Banner & nội dung",
    icon: <SlideshowIcon />,
    path: "/admin/content",
    roles: ["admin"],
  },
  {
    text: "Nhập hàng",
    icon: <AddBoxIcon />,
    path: "/admin/import-stock",
    roles: ["admin"],
  },
  {
    text: "Quản lý đơn hàng",
    icon: <ShoppingCartIcon />,
    path: "/admin/orders",
    roles: ["admin"],
  },
  {
    text: "Quản lý sản phẩm",
    icon: <CategoryIcon />,
    path: "/staff/products",
    roles: ["staff"],
  },
  {
    text: "Đợt nhập hàng",
    icon: <ShipmentIcon />,
    path: "/staff/receive-import-stock",
    roles: ["staff"],
  },
  {
    text: "Quản lý đơn hàng",
    icon: <ShoppingCartIcon />,
    path: "/staff/orders",
    roles: ["staff"],
  },
  {
    text: "Quản lý kho",
    icon: <InventoryIcon />,
    path: "/admin/inventory",
    roles: ["admin"],
  },
  {
    text: "Chiến lược khuyến mãi",
    icon: <LocalOfferIcon />,
    path: "/admin/campaigns",
    roles: ["admin"],
  },
  {
    text: "Quản lý kho",
    icon: <InventoryIcon />,
    path: "/staff/inventory",
    roles: ["staff"],
  },
  {
    text: "Báo cáo",
    icon: <ReportsIcon />,
    path: "/admin/inventory-report-logs",
    roles: ["admin"],
  },
  {
    text: "Cấu hình AI",
    icon: <BotIcon />,
    path: "/admin/instructions",
    roles: ["admin"],
  },
  {
    text: "Quiz",
    icon: <QuizIcon />,
    path: "/admin/quiz",
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
  {
    text: "AI Acceptance",
    icon: <ThumbsUpDownIcon />,
    path: "/admin/ai-acceptance",
    roles: ["admin"],
  },
  {
    text: "Quản lý Voucher",
    icon: <LocalOfferIcon />,
    path: "/admin/vouchers",
    roles: ["admin"],
  },
  {
    text: "Yêu cầu hủy đơn",
    icon: <ShoppingCartIcon />,
    path: "/admin/cancel-requests",
    roles: ["admin"],
  },
  {
    text: "Nhà cung cấp",
    icon: <PeopleIcon />,
    path: "/admin/suppliers",
    roles: ["admin"],
  },
];

export const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

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
    navigate(path);
    setMobileOpen(false);
  };

  // Filter menu items based on user role
  const filteredMenuItems = menuItems.filter((item) =>
    item.roles.includes(user?.role || ""),
  );

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
      <List sx={{ px: 1, py: 2 }}>
        {filteredMenuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem
              key={`${item.text}-${item.path}`}
              disablePadding
              sx={{ mb: 0.5 }}
            >
              <ListItemButton
                onClick={() => handleNavigate(item.path)}
                sx={{
                  borderRadius: 1,
                  bgcolor: isActive ? "primary.main" : "transparent",
                  color: isActive ? "white" : "text.primary",
                  justifyContent: collapsed ? "center" : "flex-start",
                  px: collapsed ? 1 : 2,
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
        })}
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
          <IconButton onClick={handleMenuOpen} sx={{ p: 0.5 }}>
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
              <Typography
                variant="caption"
                sx={{
                  display: "inline-block",
                  mt: 0.5,
                  px: 1,
                  py: 0.25,
                  bgcolor: "primary.main",
                  color: "white",
                  borderRadius: 1,
                  fontSize: "0.7rem",
                  textTransform: "uppercase",
                }}
              >
                {user?.role}
              </Typography>
            </MenuItem>
            <Divider />
            <MenuItem
              onClick={() => {
                handleMenuClose();
                navigate("/");
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
