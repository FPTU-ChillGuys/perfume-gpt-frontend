import {
  AppBar,
  Toolbar,
  Box,
  Container,
  TextField,
  IconButton,
  Button,
  Typography,
  InputAdornment,
  Menu,
  MenuItem,
  Divider,
  ListItemIcon,
  Avatar,
  Badge,
} from "@mui/material";
import {
  Search,
  FavoriteBorder,
  ShoppingCartOutlined,
  PersonOutline,
  ArrowDropDown,
  ArrowDropUp,
  Dashboard as DashboardIcon,
  Logout as LogoutIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useCart } from "../../hooks/useCart";
import { useState, useEffect } from "react";
import { CartDropdown } from "../common/CartDropdown";

const navItems = [
  { label: "Tất cả sản phẩm", href: "/products" },
  { label: "Nước Hoa Nam", href: "#" },
  { label: "Nước Hoa Nữ", href: "#" },
  { label: "GiftSet", href: "#" },
  { label: "Thương Hiệu", href: "#" },
  { label: "Quiz AI", href: "/quiz" },
];

export const Header = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { cartCount } = useCart();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [cartAnchorEl, setCartAnchorEl] = useState<null | HTMLElement>(null);
  const [hoverTimerRef, setHoverTimerRef] = useState<number | null>(null);

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

    // Navigate to cart
    navigate("/cart");
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
    if (user?.role === "admin") {
      navigate("/admin/profile");
    } else if (user?.role === "staff") {
      navigate("/staff/profile");
    } else {
      navigate("/profile");
    }
    handleMenuClose();
  };

  const handleLogout = () => {
    logout();
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
      position="sticky"
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
            component="h1"
            color="primary"
            fontWeight="bold"
            sx={{ flexShrink: 0, cursor: "pointer" }}
            onClick={() => navigate("/")}
          >
            PerfumeGPT
          </Typography>

          {/* Search Bar */}
          <Box
            sx={{
              flex: 1,
              maxWidth: 640,
              mx: 4,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <TextField
              fullWidth
              size="small"
              placeholder="Tìm kiếm sản phẩm..."
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Search color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          {/* Right Icons */}
          <Box
            sx={{
              display: "flex",
              gap: 2,
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <IconButton color="default">
              <FavoriteBorder />
            </IconButton>
            <IconButton
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
                    px: 1.5,
                  }}
                >
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      mr: 1,
                      bgcolor: "primary.main",
                      fontSize: "0.875rem",
                    }}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </Avatar>
                  {user.email}
                </Button>
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
                    onClick={handleProfile}
                    sx={{
                      px: 2,
                      py: 1.5,
                      flexDirection: "column",
                      alignItems: "flex-start",
                      "&:hover": {
                        bgcolor: "action.hover",
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
                      {user.role}
                    </Typography>
                  </MenuItem>
                  <Divider />
                  {(user.role === "admin" || user.role === "staff") && (
                    <MenuItem onClick={handleDashboard} sx={{ py: 1.5 }}>
                      <ListItemIcon>
                        <DashboardIcon fontSize="small" />
                      </ListItemIcon>
                      <Typography variant="body2">Trang chủ</Typography>
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
                color="inherit"
                sx={{ fontWeight: 500 }}
                onClick={() => navigate("/login")}
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
            gap: 4,
            py: 2,
          }}
        >
          {navItems.map((item) => (
            <Button
              key={item.label}
              color="inherit"
              onClick={() => handleNavClick(item.href)}
              sx={{
                fontWeight: 500,
                color: "text.primary",
                "&:hover": {
                  color: "primary.main",
                },
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>
      </Container>
    </AppBar>
  );
};
