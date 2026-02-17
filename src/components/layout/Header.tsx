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
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useState } from "react";

const navItems = [
  { label: "Nước Hoa Nam", href: "#" },
  { label: "Nước Hoa Nữ", href: "#" },
  { label: "GiftSet", href: "#" },
  { label: "Thương Hiệu", href: "#" },
];

export const Header = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDashboard = () => {
    if (user?.role === "admin") {
      navigate("/admin/dashboard");
    } else if (user?.role === "staff") {
      navigate("/staff/dashboard");
    }
    handleMenuClose();
  };

  const handleLogout = () => {
    logout();
    handleMenuClose();
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
            <Box
              component={RouterLink}
              to="/cart"
              aria-label="Giỏ hàng"
              sx={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "text.secondary",
                transition: "all 0.2s ease",
                textDecoration: "none",
                "&:hover": {
                  color: "primary.main",
                  bgcolor: "action.hover",
                },
                "&:focus-visible": {
                  outline: "2px solid",
                  outlineColor: "primary.main",
                  outlineOffset: 2,
                },
              }}
            >
              <ShoppingCartOutlined fontSize="medium" />
            </Box>

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
                  <Box sx={{ px: 2, py: 1.5 }}>
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
                  </Box>
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
              href={item.href}
              color="inherit"
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
