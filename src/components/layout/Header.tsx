import {
  AppBar,
  Toolbar,
  Box,
  Container,
  IconButton,
  Button,
  Typography,
  Menu,
  MenuItem,
  Divider,
  ListItemIcon,
  Avatar,
  Badge,
} from "@mui/material";
import {
  ShoppingCartOutlined,
  PersonOutline,
  ArrowDropDown,
  ArrowDropUp,
  Dashboard as DashboardIcon,
  Logout as LogoutIcon,
  ShoppingBag as ShoppingBagIcon,
  PointOfSale as PointOfSaleIcon,
  Tv as TvIcon,
} from "@mui/icons-material";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useCart } from "../../hooks/useCart";
import { useState, useEffect, useRef } from "react";
import { CartDropdown } from "../common/CartDropdown";
import { HeaderSearch } from "./HeaderSearch";
import {
  categoryService,
  type CategoryLookupItem,
} from "../../services/categoryService";
import { loyaltyService } from "../../services/loyaltyService";
import { NotificationBell } from "../common/NotificationBell";
import { useNotificationSystem } from "../../hooks/useNotificationSystem";
import type { NotificationItem } from "@/services/notificationService";

const MAX_VISIBLE_CATEGORIES = 5;

const CATEGORY_NAME_VI: Record<string, string> = {
  "for women": "Nước hoa cho Nữ",
  "for men": "Nước hoa cho Nam",
  unisex: "Nước hoa Unisex",
  "niche & artisan": "Niche và Artisan",
  "gift sets": "Gift Sets",
};

const toVietnameseCategoryName = (name?: string | null) => {
  if (!name) return "";
  return CATEGORY_NAME_VI[name.trim().toLowerCase()] ?? name;
};

export const Header = ({ sticky = true }: { sticky?: boolean }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { cartCount } = useCart();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [cartAnchorEl, setCartAnchorEl] = useState<null | HTMLElement>(null);
  const [hoverTimerRef, setHoverTimerRef] = useState<number | null>(null);
  const [categories, setCategories] = useState<CategoryLookupItem[]>([]);
  const [moreAnchorEl, setMoreAnchorEl] = useState<null | HTMLElement>(null);
  const [loyaltyBalance, setLoyaltyBalance] = useState<number | null>(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotificationSystem({
      userRole: user?.role ?? "",
      userId: user?.id,
    });

  const handleNotificationClick = (item: NotificationItem) => {
    if (!item.referenceId) return;

    const role = user?.role;
    if (role === "admin" || role === "staff") {
      const prefix = role === "staff" ? "/staff" : "/admin";
      switch (item.referenceType) {
        case "Order":
          navigate(`${prefix}/orders/${item.referenceId}`);
          break;
        case "OrderCancelRequest":
          navigate(`${prefix}/cancel-requests/${item.referenceId}`);
          break;
        case "OrderReturnRequest":
          navigate(`${prefix}/return-requests/${item.referenceId}`);
          break;
      }
    } else {
      switch (item.referenceType) {
        case "Order":
          navigate(`/my-orders/${item.referenceId}`);
          break;
        case "OrderCancelRequest":
          navigate(`/my-cancel-requests/${item.referenceId}`);
          break;
        case "OrderReturnRequest":
          navigate(`/my-return-requests/${item.referenceId}`);
          break;
      }
    }
  };

  useEffect(() => {
    categoryService
      .getCategoriesLookupCached()
      .then(setCategories)
      .catch(() => {
        console.error("Failed to load categories");
      });
  }, []);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "user") {
      return;
    }

    let isMounted = true;

    loyaltyService
      .getMyBalance()
      .then((data) => {
        if (isMounted) {
          setLoyaltyBalance(data.pointBalance ?? 0);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoyaltyBalance(0);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user?.role]);

  const visibleCategories = categories.slice(0, MAX_VISIBLE_CATEGORIES);
  const overflowCategories = categories.slice(MAX_VISIBLE_CATEGORIES);
  const isBackOfficeRole = user?.role === "admin" || user?.role === "staff";
  const isStaffHomepageOrStaffPage =
    user?.role === "staff" &&
    (location.pathname === "/" || location.pathname.startsWith("/staff"));

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (hoverTimerRef) {
        clearTimeout(hoverTimerRef);
      }
    };
  }, [hoverTimerRef]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleCartHover = (event: React.MouseEvent<HTMLElement>) => {
    // Clear any existing timer
    if (hoverTimerRef) {
      clearTimeout(hoverTimerRef);
    }

    // Capture the element reference before setTimeout
    const element = event.currentTarget;

    // Start a timer to show dropdown after 200ms
    const timer = window.setTimeout(() => {
      setCartAnchorEl(element);
    }, 200);

    setHoverTimerRef(timer);
  };

  const handleCartLeave = () => {
    // Clear timer if user leaves before dropdown shows
    if (hoverTimerRef) {
      clearTimeout(hoverTimerRef);
      setHoverTimerRef(null);
    }
  };

  const handleCartClose = () => {
    setCartAnchorEl(null);
    if (hoverTimerRef) {
      clearTimeout(hoverTimerRef);
      setHoverTimerRef(null);
    }
  };

  const handleCartClick = () => {
    // Clear hover timer to prevent dropdown from showing
    if (hoverTimerRef) {
      clearTimeout(hoverTimerRef);
      setHoverTimerRef(null);
    }

    // Close dropdown if open
    setCartAnchorEl(null);
  };

  const handleDashboard = () => {
    if (user?.role === "admin") {
      navigate("/admin/dashboard");
    } else if (user?.role === "staff") {
      navigate("/staff/dashboard");
    }
    handleMenuClose();
  };

  const handleProfile = () => {
    if (user?.role === "user") {
      navigate("/profile");
    }
    handleMenuClose();
  };

  const handleMyOrders = () => {
    navigate("/my-orders");
    handleMenuClose();
  };

  const handleLogout = () => {
    logout();
    handleMenuClose();
  };

  const handleCounterCheckout = () => {
    navigate("/checkout/counter/staff");
    handleMenuClose();
  };

  const handleCounterDisplay = () => {
    navigate("/checkout/counter/display");
    handleMenuClose();
  };

  const handleNavClick = (href: string) => {
    if (href.startsWith("/")) {
      navigate(href);
      return;
    }

    if (href.startsWith("#")) {
      const target = document.querySelector(href);
      target?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <AppBar
      position={sticky ? "sticky" : "static"}
      color="inherit"
      elevation={0}
      sx={{ borderBottom: 1, borderColor: "divider" }}
    >
      {/* Top Bar */}
      <Container maxWidth="xl">
        <Toolbar sx={{ py: 1, justifyContent: "space-between" }}>
          {/* Logo */}
          <Typography
            variant="h5"
            color="primary"
            fontWeight="bold"
            sx={{ flexShrink: 0, cursor: "pointer", textDecoration: "none" }}
            component={RouterLink}
            to="/"
          >
            PerfumeGPT
          </Typography>

          {/* Search Bar */}
          <Box
            sx={{
              flex: 1,
              maxWidth: 640,
              mx: { xs: 1, sm: 2, md: 4 },
              display: { xs: "none", md: "flex" },
              justifyContent: "center",
            }}
          >
            <HeaderSearch />
          </Box>

          {/* Right Icons */}
          <Box
            sx={{
              display: "flex",
              gap: { xs: 1, sm: 2 },
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <NotificationBell
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={markAllAsRead}
              onItemClick={handleNotificationClick}
            />
            {!isBackOfficeRole && (
              <>
                <IconButton
                  component={RouterLink}
                  to="/cart"
                  onClick={handleCartClick}
                  onMouseEnter={handleCartHover}
                  onMouseLeave={handleCartLeave}
                  aria-label="Giỏ hàng"
                  color="default"
                  sx={{
                    transition: "all 0.2s ease",
                    "&:hover": {
                      color: "primary.main",
                    },
                  }}
                >
                  <Badge badgeContent={cartCount} color="error" max={99}>
                    <ShoppingCartOutlined fontSize="medium" />
                  </Badge>
                </IconButton>
                <CartDropdown
                  anchorEl={cartAnchorEl}
                  open={Boolean(cartAnchorEl)}
                  onClose={handleCartClose}
                />
              </>
            )}

            {isAuthenticated && user ? (
              <>
                <Button
                  endIcon={anchorEl ? <ArrowDropUp /> : <ArrowDropDown />}
                  color="inherit"
                  onClick={handleMenuOpen}
                  sx={{
                    textTransform: "none",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    px: { xs: 0.5, sm: 1.5 },
                    minWidth: { xs: "auto", sm: "auto" },
                  }}
                >
                  <Avatar
                    src={user.avatarUrl || undefined}
                    sx={{
                      width: 32,
                      height: 32,
                      mr: { xs: 0, sm: 1 },
                      bgcolor: user.avatarUrl ? undefined : "primary.main",
                      fontSize: "0.875rem",
                    }}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box sx={{ display: { xs: "none", sm: "block" } }}>
                    {user.email}
                  </Box>
                </Button>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  disableScrollLock
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
                    onClick={user.role === "user" ? handleProfile : undefined}
                    sx={{
                      px: 2,
                      py: 1.5,
                      flexDirection: "column",
                      alignItems: "flex-start",
                      cursor: user.role === "user" ? "pointer" : "default",
                      "&:hover": {
                        bgcolor:
                          user.role === "user" ? "action.hover" : "transparent",
                      },
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight={600}>
                      {user.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block" }}
                    >
                      {user.email}
                    </Typography>
                    {user.role === "user" && loyaltyBalance !== null && (
                      <Typography
                        variant="caption"
                        sx={{
                          display: "inline-block",
                          mt: 0.75,
                          px: 1.25,
                          py: 0.35,
                          color: "error.main",
                          border: (theme) =>
                            `1px solid ${theme.palette.error.main}`,
                          borderRadius: 99,
                          fontSize: "0.75rem",
                          fontWeight: 500,
                        }}
                      >
                        {`Số dư: ${loyaltyBalance.toLocaleString("vi-VN")} điểm`}
                      </Typography>
                    )}
                  </MenuItem>
                  <Divider />
                  {user.role === "user" && (
                    <MenuItem onClick={handleMyOrders} sx={{ py: 1.5 }}>
                      <ListItemIcon>
                        <ShoppingBagIcon fontSize="small" />
                      </ListItemIcon>
                      <Typography variant="body2">Đơn mua</Typography>
                    </MenuItem>
                  )}
                  {(user.role === "admin" || user.role === "staff") && (
                    <MenuItem onClick={handleDashboard} sx={{ py: 1.5 }}>
                      <ListItemIcon>
                        <DashboardIcon fontSize="small" />
                      </ListItemIcon>
                      <Typography variant="body2">Trang chủ</Typography>
                    </MenuItem>
                  )}
                  {isStaffHomepageOrStaffPage && (
                    <MenuItem onClick={handleCounterCheckout} sx={{ py: 1.5 }}>
                      <ListItemIcon>
                        <PointOfSaleIcon fontSize="small" />
                      </ListItemIcon>
                      <Typography variant="body2">Checkout tại quầy</Typography>
                    </MenuItem>
                  )}
                  {isStaffHomepageOrStaffPage && (
                    <MenuItem onClick={handleCounterDisplay} sx={{ py: 1.5 }}>
                      <ListItemIcon>
                        <TvIcon fontSize="small" />
                      </ListItemIcon>
                      <Typography variant="body2">
                        Màn hình khách tại quầy
                      </Typography>
                    </MenuItem>
                  )}
                  <MenuItem onClick={handleLogout} sx={{ py: 1.5 }}>
                    <ListItemIcon>
                      <LogoutIcon fontSize="small" />
                    </ListItemIcon>
                    <Typography variant="body2">Đăng xuất</Typography>
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Button
                startIcon={<PersonOutline />}
                component={RouterLink}
                to="/login"
                color="inherit"
                sx={{ fontWeight: 500 }}
              >
                Đăng nhập
              </Button>
            )}
          </Box>
        </Toolbar>
      </Container>

      {/* Navigation */}
      <Container maxWidth="xl">
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            gap: { xs: 1, sm: 2, md: 4 },
            py: { xs: 1, sm: 2 },
            overflowX: "auto",
            flexWrap: { xs: "nowrap", md: "wrap" },
            "&::-webkit-scrollbar": { display: "none" },
            scrollbarWidth: "none",
          }}
        >
          {/* All products */}
          <Button
            color="inherit"
            component={RouterLink}
            to="/products"
            size="small"
            sx={{
              fontWeight: 500,
              fontSize: { xs: "0.75rem", sm: "0.875rem" },
              px: { xs: 1, sm: 2 },
              color: "text.primary",
              "&:hover": { color: "primary.main" },
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            Tất cả sản phẩm
          </Button>

          {/* Dynamic categories */}
          {visibleCategories.map((cat) => (
            <Button
              key={cat.id}
              color="inherit"
              component={RouterLink}
              to={`/products?categoryId=${cat.id}&categoryName=${encodeURIComponent(cat.name ?? "")}`}
              size="small"
              sx={{
                fontWeight: 500,
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
                px: { xs: 1, sm: 2 },
                color: "text.primary",
                "&:hover": { color: "primary.main" },
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {toVietnameseCategoryName(cat.name)}
            </Button>
          ))}

          {/* Overflow "Thêm" dropdown */}
          {overflowCategories.length > 0 && (
            <>
              <Button
                color="inherit"
                size="small"
                endIcon={moreAnchorEl ? <ArrowDropUp /> : <ArrowDropDown />}
                onClick={(e) => setMoreAnchorEl(e.currentTarget)}
                sx={{
                  fontWeight: 500,
                  fontSize: { xs: "0.75rem", sm: "0.875rem" },
                  px: { xs: 1, sm: 2 },
                  color: "text.primary",
                  "&:hover": { color: "primary.main" },
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                Thêm
              </Button>
              <Menu
                anchorEl={moreAnchorEl}
                open={Boolean(moreAnchorEl)}
                onClose={() => setMoreAnchorEl(null)}
                disableScrollLock
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                transformOrigin={{ vertical: "top", horizontal: "left" }}
                PaperProps={{ sx: { mt: 1, minWidth: 180 } }}
              >
                {overflowCategories.map((cat) => (
                  <MenuItem
                    key={cat.id}
                    component={RouterLink}
                    to={`/products?categoryId=${cat.id}&categoryName=${encodeURIComponent(cat.name ?? "")}`}
                    onClick={() => {
                      setMoreAnchorEl(null);
                    }}
                  >
                    {toVietnameseCategoryName(cat.name)}
                  </MenuItem>
                ))}
              </Menu>
            </>
          )}

          {/* Survey AI */}
          <Button
            color="inherit"
            component={RouterLink}
            to="/survey"
            size="small"
            sx={{
              fontWeight: 500,
              fontSize: { xs: "0.75rem", sm: "0.875rem" },
              px: { xs: 1, sm: 2 },
              color: "text.primary",
              "&:hover": { color: "primary.main" },
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            Khảo sát cùng AI
          </Button>
        </Box>
      </Container>
    </AppBar>
  );
};
