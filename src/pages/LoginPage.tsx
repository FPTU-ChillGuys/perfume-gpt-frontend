import { useState } from "react";
import {
  Box,
  Container,
  TextField,
  Button,
  Typography,
  Link,
  InputAdornment,
  IconButton,
  Divider,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Google,
  Facebook,
  ArrowBack,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoading) return; // Prevent double submission

    setError("");
    setIsLoading(true);

    try {
      await login({ email, password });
      // Navigation is handled by AuthContext based on role
    } catch (err: any) {
      console.error("Login error:", err);
      const errorMessage =
        err?.message ||
        err?.response?.data?.message ||
        "Đăng nhập thất bại. Vui lòng kiểm tra lại email và mật khẩu.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.paper",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          px: 3,
          py: 2,
        }}
      >
        <Typography
          variant="h5"
          component="h1"
          color="primary"
          fontWeight="bold"
        >
          PerfumeGPT
        </Typography>
        <Button
          startIcon={<ArrowBack />}
          color="inherit"
          onClick={() => navigate("/")}
          sx={{ fontWeight: 500 }}
        >
          QUAY LẠI TRANG CHỦ
        </Button>
      </Box>

      {/* Main Content */}
      <Container
        maxWidth="sm"
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          py: 2,
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: 480,
            bgcolor: "white",
            p: 3,
            borderRadius: 2,
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          {/* Title */}
          <Typography
            variant="h5"
            component="h2"
            fontWeight="bold"
            textAlign="center"
            mb={0.5}
          >
            Chào mừng bạn trở lại
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            textAlign="center"
            mb={2.5}
          >
            Hành trình tìm kiếm mùi hương hoàn hảo bắt đầu từ đây
          </Typography>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>
            {/* Error Alert */}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {/* Email Input */}
            <Box mb={1.5}>
              <Typography variant="body2" fontWeight={600} mb={0.5}>
                Email hoặc Số điện thoại
              </Typography>
              <TextField
                fullWidth
                placeholder="Nhập email hoặc số điện thoại"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                size="small"
                required
                disabled={isLoading}
              />
            </Box>

            {/* Password Input */}
            <Box mb={0.5}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 0.5,
                }}
              >
                <Typography variant="body2" fontWeight={600}>
                  Mật khẩu
                </Typography>
                <Link
                  href="#"
                  variant="body2"
                  color="error"
                  underline="hover"
                  sx={{ fontSize: "0.875rem" }}
                >
                  Quên mật khẩu?
                </Link>
              </Box>
              <TextField
                fullWidth
                type={showPassword ? "text" : "password"}
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                size="small"
                required
                disabled={isLoading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        size="small"
                        disabled={isLoading}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            {/* Login Button */}
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={isLoading}
              sx={{
                mt: 2,
                mb: 1.5,
                py: 1.2,
                bgcolor: "primary.main",
                fontWeight: 600,
                "&:hover": {
                  bgcolor: "primary.dark",
                },
              }}
            >
              {isLoading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "ĐĂNG NHẬP"
              )}
            </Button>
          </form>

          {/* Divider */}
          <Divider sx={{ my: 2 }}>
            <Typography variant="body2" color="text.secondary">
              HOẶC
            </Typography>
          </Divider>

          {/* Social Login */}
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<Google />}
              sx={{
                py: 0.8,
                borderColor: "divider",
                color: "text.primary",
                "&:hover": {
                  borderColor: "divider",
                  bgcolor: "action.hover",
                },
              }}
            >
              Google
            </Button>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<Facebook />}
              sx={{
                py: 0.8,
                borderColor: "divider",
                color: "text.primary",
                "&:hover": {
                  borderColor: "divider",
                  bgcolor: "action.hover",
                },
              }}
            >
              Facebook
            </Button>
          </Box>

          {/* Sign Up Link */}
          <Typography variant="body2" textAlign="center" color="text.secondary">
            Bạn chưa có tài khoản?{" "}
            <Link
              href="#"
              color="primary"
              underline="hover"
              fontWeight={600}
              onClick={(e) => {
                e.preventDefault();
                navigate("/register");
              }}
            >
              Đăng ký ngay
            </Link>
          </Typography>
        </Box>
      </Container>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          py: 1.5,
          textAlign: "center",
          borderTop: 1,
          borderColor: "divider",
        }}
      >
        <Typography variant="caption" color="text.secondary">
          © 2026 PERFUMEGPT — THE ART OF OLFACTORY INTELLIGENCE
        </Typography>
      </Box>
    </Box>
  );
};
