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
} from "@mui/material";
import {
  Search,
  FavoriteBorder,
  ShoppingCartOutlined,
  PersonOutline,
} from "@mui/icons-material";

const navItems = [
  { label: "Nước Hoa Nam", href: "#" },
  { label: "Nước Hoa Nữ", href: "#" },
  { label: "GiftSet", href: "#" },
  { label: "Thương Hiệu", href: "#" },
];

export const Header = () => {
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
            sx={{ flexShrink: 0 }}
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
            <IconButton color="default">
              <ShoppingCartOutlined />
            </IconButton>
            <Button
              startIcon={<PersonOutline />}
              color="inherit"
              sx={{ fontWeight: 500 }}
            >
              Đăng nhập
            </Button>
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
