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
  Checkbox,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  ArrowBack,
  MarkEmailRead,
} from "@mui/icons-material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { authService } from "../services/authService";

export const RegisterPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string) => (e: any) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setFormData({ ...formData, [field]: value });
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!formData.fullName.trim())
      errors.fullName = "Họ và tên không được để trống";
    if (!formData.email.trim()) {
      errors.email = "Email không được để trống";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Email không đúng định dạng";
    }
    if (!formData.phone.trim()) {
      errors.phone = "Số điện thoại không được để trống";
    } else if (
      !/^(0)(3[2-9]|5[6789]|7[06789]|8[0-9]|9[0-9])\d{7}$/.test(
        formData.phone.replace(/\s/g, ""),
      )
    ) {
      errors.phone = "Số điện thoại không đúng định dạng (VD: 0912345678)";
    }
    if (!formData.password) {
      errors.password = "Mật khẩu không được để trống";
    } else if (formData.password.length < 6) {
      errors.password = "Mật khẩu phải có ít nhất 6 ký tự";
    } else if (!/[A-Z]/.test(formData.password) || !/\d/.test(formData.password) || !/[^a-zA-Z0-9]/.test(formData.password)) {
      errors.password = "Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 số và 1 ký tự đặc biệt";
    }
    if (!formData.confirmPassword) {
      errors.confirmPassword = "Vui lòng nhập lại mật khẩu";
    } else if (formData.confirmPassword !== formData.password) {
      errors.confirmPassword = "Mật khẩu xác nhận không khớp";
    }
    if (!formData.agreeTerms)
      errors.agreeTerms = "Bạn cần đồng ý với điều khoản";
    return errors;
  };

  const handleBlur = (field: string) => () => {
    const errors = validate();
    setFieldErrors((prev) => ({
      ...prev,
      [field]: errors[field] || "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const clientUri = `${window.location.origin}/verify-email`;
      const message = await authService.register({
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: formData.phone.replace(/\s/g, ""),
        password: formData.password,
        clientUri,
      });
      setSuccessMessage(message);
    } catch (err: any) {
      setError(err?.message || "Đăng ký thất bại. Vui lòng thử lại.");
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
          px: { xs: 2, sm: 3 },
          py: 2,
          gap: 1,
          flexWrap: "nowrap",
          minWidth: 0,
        }}
      >
        <Typography
          variant="h5"
          component={RouterLink}
          color="primary"
          fontWeight="bold"
          to="/"
          sx={{ flexShrink: 0, fontSize: { xs: "1.1rem", sm: "1.5rem" } }}
        >
          PerfumeGPT
        </Typography>
        <Button
          startIcon={<ArrowBack />}
          color="inherit"
          component={RouterLink}
          to="/"
          sx={{
            fontWeight: 500,
            fontSize: { xs: "0.7rem", sm: "0.875rem" },
            px: { xs: 1, sm: 2 },
            minWidth: 0,
            whiteSpace: "nowrap",
          }}
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
          py: 1,
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: 480,
            bgcolor: "white",
            p: 2.5,
            borderRadius: 2,
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          {/* Title */}
          <Typography
            variant="h6"
            component="h2"
            fontWeight="bold"
            textAlign="center"
            mb={0.3}
          >
            Tham gia cùng PerfumeGPT
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            textAlign="center"
            display="block"
            mb={1.5}
          >
            Nhận ngay mùi hương đặc trưng của bạn cùng chuyên gia AI hàng đầu
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
                Vui lòng kiểm tra hộp thư email để xác thực tài khoản trước khi
                đăng nhập.
              </Typography>
              <Button
                variant="contained"
                fullWidth
                component={RouterLink}
                to="/login"
              >
                Đi tới đăng nhập
              </Button>
            </Box>
          ) : (
            <>
              {/* Form */}
              <form onSubmit={handleSubmit} noValidate>
                {error && (
                  <Alert severity="error" sx={{ mb: 1.5 }}>
                    {error}
                  </Alert>
                )}

                {/* Full Name */}
                <Box mb={1}>
                  <Typography
                    variant="caption"
                    fontWeight={600}
                    mb={0.3}
                    display="block"
                  >
                    Họ và tên
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="Nguyễn Văn A"
                    value={formData.fullName}
                    onChange={handleChange("fullName")}
                    onBlur={handleBlur("fullName")}
                    size="small"
                    disabled={isLoading}
                    error={!!fieldErrors.fullName}
                    helperText={fieldErrors.fullName}
                  />
                </Box>

                {/* Email */}
                <Box mb={1}>
                  <Typography
                    variant="caption"
                    fontWeight={600}
                    mb={0.3}
                    display="block"
                  >
                    Email
                  </Typography>
                  <TextField
                    fullWidth
                    type="email"
                    placeholder="example@gmail.com"
                    value={formData.email}
                    onChange={handleChange("email")}
                    onBlur={handleBlur("email")}
                    size="small"
                    disabled={isLoading}
                    error={!!fieldErrors.email}
                    helperText={fieldErrors.email}
                  />
                </Box>

                {/* Phone */}
                <Box mb={1}>
                  <Typography
                    variant="caption"
                    fontWeight={600}
                    mb={0.3}
                    display="block"
                  >
                    Số điện thoại
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="09xx xxx xxx"
                    value={formData.phone}
                    onChange={handleChange("phone")}
                    onBlur={handleBlur("phone")}
                    size="small"
                    disabled={isLoading}
                    error={!!fieldErrors.phone}
                    helperText={fieldErrors.phone}
                  />
                </Box>

                {/* Password */}
                <Box mb={1}>
                  <Typography
                    variant="caption"
                    fontWeight={600}
                    mb={0.3}
                    display="block"
                  >
                    Mật khẩu
                  </Typography>
                  <TextField
                    fullWidth
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange("password")}
                    onBlur={handleBlur("password")}
                    size="small"
                    disabled={isLoading}
                    error={!!fieldErrors.password}
                    helperText={fieldErrors.password}
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
                <Box mb={1}>
                  <Typography
                    variant="caption"
                    fontWeight={600}
                    mb={0.3}
                    display="block"
                  >
                    Nhập lại mật khẩu
                  </Typography>
                  <TextField
                    fullWidth
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange("confirmPassword")}
                    onBlur={handleBlur("confirmPassword")}
                    size="small"
                    disabled={isLoading}
                    error={!!fieldErrors.confirmPassword}
                    helperText={fieldErrors.confirmPassword}
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

                {/* Terms Checkbox */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.5 }}>
                  <Checkbox
                    checked={formData.agreeTerms}
                    onChange={handleChange("agreeTerms")}
                    size="small"
                    sx={{
                      p: 0,
                      flexShrink: 0,
                      color: fieldErrors.agreeTerms ? "error.main" : undefined,
                    }}
                  />
                  <Typography
                    variant="caption"
                    color={fieldErrors.agreeTerms ? "error" : "text.secondary"}
                    sx={{ fontSize: "0.75rem", lineHeight: 1.5 }}
                  >
                    Đồng ý với{" "}
                    <Link href="/pages/chinh-sach-mua-hang" underline="hover" color="primary">
                      Chính sách
                    </Link>
                    {" "}của{" "}
                    <strong>PerfumeGPT</strong>
                  </Typography>
                </Box>
                {fieldErrors.agreeTerms && (
                  <Typography
                    variant="caption"
                    color="error"
                    display="block"
                    mb={1}
                  >
                    {fieldErrors.agreeTerms}
                  </Typography>
                )}

                {/* Register Button */}
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  size="medium"
                  disabled={isLoading || Object.keys(validate()).length > 0}
                  sx={{
                    mb: 1,
                    py: 1,
                    bgcolor: "primary.main",
                    fontWeight: 600,
                    "&:hover": { bgcolor: "primary.dark" },
                    ...(isLoading && {
                      "&.Mui-disabled": {
                        bgcolor: "primary.main",
                        color: "white",
                        opacity: 0.7,
                      },
                    }),
                  }}
                >
                  {isLoading ? (
                    <CircularProgress size={22} color="inherit" />
                  ) : (
                    "ĐĂNG KÝ"
                  )}
                </Button>
              </form>

              {/* Login Link */}
              <Typography
                variant="caption"
                textAlign="center"
                color="text.secondary"
                display="block"
              >
                Bạn đã có tài khoản?{" "}
                <Link
                  component={RouterLink}
                  to="/login"
                  color="primary"
                  underline="hover"
                  fontWeight={600}
                >
                  Đăng nhập
                </Link>
              </Typography>
            </>
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
          © 2026 PerfumeGPT. Made by <strong>ChillGuys</strong>.
        </Typography>
      </Box>
    </Box>
  );
};
