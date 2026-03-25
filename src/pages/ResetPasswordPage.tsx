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
  Alert,
  CircularProgress,
} from "@mui/material";
import { Visibility, VisibilityOff, ArrowBack, CheckCircle } from "@mui/icons-material";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authService } from "../services/authService";

export const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const email = searchParams.get("email") || "";
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const validatePassword = (value: string) => {
    if (!value) return "Mật khẩu không được để trống";
    if (value.length < 6) return "Mật khẩu phải có ít nhất 6 ký tự";
    return "";
  };

  const validateConfirmPassword = (value: string) => {
    if (!value) return "Xác nhận mật khẩu không được để trống";
    if (value !== password) return "Mật khẩu xác nhận không khớp";
    return "";
  };

  const isTokenValid = !!(email && token);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const pErr = validatePassword(password);
    const cErr = validateConfirmPassword(confirmPassword);
    setPasswordError(pErr);
    setConfirmPasswordError(cErr);
    if (pErr || cErr) return;

    setIsLoading(true);
    setError("");

    try {
      const message = await authService.resetPassword(
        email,
        token,
        password,
        confirmPassword,
      );
      setSuccessMessage(message);
    } catch (err: any) {
      setError(err?.message || "Đặt lại mật khẩu thất bại. Vui lòng thử lại.");
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
          onClick={() => navigate("/login")}
          sx={{ fontWeight: 500 }}
        >
          QUAY LẠI ĐĂNG NHẬP
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
          <Typography
            variant="h5"
            component="h2"
            fontWeight="bold"
            textAlign="center"
            mb={0.5}
          >
            Đặt lại mật khẩu
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            textAlign="center"
            mb={2.5}
          >
            Nhập mật khẩu mới cho tài khoản của bạn
          </Typography>

          {!isTokenValid ? (
            <Box textAlign="center">
              <Alert severity="error" sx={{ mb: 2 }}>
                Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.
              </Alert>
              <Button
                variant="contained"
                fullWidth
                onClick={() => navigate("/forgot-password")}
              >
                Yêu cầu link mới
              </Button>
            </Box>
          ) : successMessage ? (
            <Box textAlign="center">
              <CheckCircle
                sx={{ fontSize: 56, color: "success.main", mb: 1.5 }}
              />
              <Alert severity="success" sx={{ mb: 2, textAlign: "left" }}>
                {successMessage}
              </Alert>
              <Button
                variant="contained"
                fullWidth
                onClick={() => navigate("/login")}
              >
                Đăng nhập ngay
              </Button>
            </Box>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {/* New Password */}
              <Box mb={1.5}>
                <Typography variant="body2" fontWeight={600} mb={0.5}>
                  Mật khẩu mới
                </Typography>
                <TextField
                  fullWidth
                  type={showPassword ? "text" : "password"}
                  placeholder="Nhập mật khẩu mới"
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

              {/* Confirm Password */}
              <Box mb={2}>
                <Typography variant="body2" fontWeight={600} mb={0.5}>
                  Xác nhận mật khẩu
                </Typography>
                <TextField
                  fullWidth
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Nhập lại mật khẩu mới"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (confirmPasswordError) setConfirmPasswordError("");
                  }}
                  onBlur={() =>
                    setConfirmPasswordError(
                      validateConfirmPassword(confirmPassword),
                    )
                  }
                  size="small"
                  required
                  disabled={isLoading}
                  error={!!confirmPasswordError}
                  helperText={confirmPasswordError}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          edge="end"
                          size="small"
                          disabled={isLoading}
                        >
                          {showConfirmPassword ? (
                            <VisibilityOff />
                          ) : (
                            <Visibility />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={isLoading}
                sx={{
                  py: 1.2,
                  fontWeight: 600,
                  "&:hover": { bgcolor: "primary.dark" },
                }}
              >
                {isLoading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  "ĐẶT LẠI MẬT KHẨU"
                )}
              </Button>

              <Typography
                variant="body2"
                textAlign="center"
                color="text.secondary"
                mt={2}
              >
                Bạn đã nhớ mật khẩu?{" "}
                <Link
                  href="#"
                  color="primary"
                  underline="hover"
                  fontWeight={600}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/login");
                  }}
                >
                  Đăng nhập ngay
                </Link>
              </Typography>
            </form>
          )}
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
