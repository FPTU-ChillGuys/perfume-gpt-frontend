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
  Facebook,
  ArrowBack,
} from "@mui/icons-material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { GoogleLogin } from "@react-oauth/google";

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login, googleLogin } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const validateEmail = (value: string) => {
    if (!value.trim()) return "Email hoặc số điện thoại không được để trống";
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    const isPhone = /^(0|\+84)\d{9}$/.test(value.replace(/\s/g, ""));
    if (!isEmail && !isPhone)
      return "Email hoặc số điện thoại không đúng định dạng";
    return "";
  };

  const validatePassword = (value: string) => {
    if (!value) return "Mật khẩu không được để trống";
    if (value.length < 6) return "Mật khẩu phải có ít nhất 6 ký tự";
    return "";
  };

  const handleGoogleLoginSuccess = async (credentialResponse: any) => {
    setIsLoading(true);
    setError("");
    try {
      // credentialResponse.credential contains the idToken
      const userData = (await googleLogin(
        credentialResponse.credential,
      )) as any;
      // Redirect after successful login
      if (userData?.role === "admin") {
        navigate("/admin/dashboard", { replace: true });
      } else if (userData?.role === "staff") {
        navigate("/staff/dashboard", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (err: any) {
      console.error("Google login error:", err);
      const errorMessage =
        err?.message || "Đăng nhập Google thất bại. Vui lòng thử lại.";
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const handleGoogleLoginError = () => {
    setError("Đăng nhập Google thất bại. Vui lòng thử lại.");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoading) return; // Prevent double submission

    setError("");

    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    setEmailError(eErr);
    setPasswordError(pErr);
    if (eErr || pErr) return;

    setIsLoading(true);

    try {
      const userData = (await login({ credential: email, password })) as any;
      // Redirect after successful login
      if (userData?.role === "admin") {
        navigate("/admin/dashboard", { replace: true });
      } else if (userData?.role === "staff") {
        navigate("/staff/dashboard", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (err: any) {
      console.error("Login error:", err);
      const errorMessage =
        err?.message ||
        err?.response?.data?.message ||
        "Đăng nhập thất bại. Vui lòng kiểm tra lại email và mật khẩu.";
      setError(errorMessage);
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
          component={RouterLink}
          to="/"
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
            bgcolor: "background.paper",
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
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError("");
                }}
                onBlur={() => setEmailError(validateEmail(email))}
                size="small"
                required
                disabled={isLoading}
                error={!!emailError}
                helperText={emailError}
                autoComplete="username"
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
                  component={RouterLink}
                  to="/forgot-password"
                  variant="body2"
                  color="error"
                  underline="hover"
                  sx={{ fontSize: "0.875rem" }}
                  tabIndex={-1}
                >
                  Quên mật khẩu?
                </Link>
              </Box>
              <TextField
                fullWidth
                type={showPassword ? "text" : "password"}
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError("");
                }}
                onBlur={() => setPasswordError(validatePassword(password))}
                size="small"
                required
                disabled={isLoading}
                error={!!passwordError}
                helperText={passwordError}
                autoComplete="current-password"
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
          <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
            <Box>
              <GoogleLogin
                onSuccess={handleGoogleLoginSuccess}
                onError={handleGoogleLoginError}
                theme="outline"
                size="large"
                width="100%"
                text="continue_with"
              />
            </Box>
          </Box>

          {/* Sign Up Link */}
          <Typography variant="body2" textAlign="center" color="text.secondary">
            Bạn chưa có tài khoản?{" "}
            <Link
              component={RouterLink}
              to="/register"
              color="primary"
              underline="hover"
              fontWeight={600}
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
