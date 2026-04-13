import { useState } from "react";
import {
  Box,
  Container,
  TextField,
  Button,
  Typography,
  Link,
  Alert,
  CircularProgress,
} from "@mui/material";
import { ArrowBack, MarkEmailRead } from "@mui/icons-material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { authService } from "../services/authService";

export const ForgotPasswordPage = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const validateEmail = (value: string) => {
    if (!value.trim()) return "Email không được để trống";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
      return "Email không đúng định dạng";
    return "";
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const err = validateEmail(email);
    setEmailError(err);
    if (err) return;

    setIsLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const clientUri = `${window.location.origin}/reset-password`;
      const message = await authService.forgotPassword(email, clientUri);
      setSuccessMessage(message);
    } catch (err: any) {
      setError(err?.message || "Đã xảy ra lỗi. Vui lòng thử lại.");
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
          component={RouterLink}
          to="/login"
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
            bgcolor: "background.paper",
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
            Quên mật khẩu
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            textAlign="center"
            mb={2.5}
          >
            Nhập email của bạn, chúng tôi sẽ gửi link đặt lại mật khẩu
          </Typography>

          {successMessage ? (
            <Box textAlign="center">
              <MarkEmailRead
                sx={{ fontSize: 56, color: "success.main", mb: 1.5 }}
              />
              <Alert severity="success" sx={{ mb: 2, textAlign: "left" }}>
                {successMessage}
              </Alert>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Vui lòng kiểm tra hộp thư email (kể cả thư mục Spam).
              </Typography>
              <Button
                variant="outlined"
                fullWidth
                component={RouterLink}
                to="/login"
              >
                Quay lại đăng nhập
              </Button>
            </Box>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              <Box mb={2}>
                <Typography variant="body2" fontWeight={600} mb={0.5}>
                  Email
                </Typography>
                <TextField
                  fullWidth
                  placeholder="Nhập địa chỉ email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError("");
                  }}
                  onBlur={() => setEmailError(validateEmail(email))}
                  size="small"
                  type="email"
                  required
                  disabled={isLoading}
                  error={!!emailError}
                  helperText={emailError}
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
                  "GỬI LINK ĐẶT LẠI MẬT KHẨU"
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
                  component={RouterLink}
                  to="/login"
                  color="primary"
                  underline="hover"
                  fontWeight={600}
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
