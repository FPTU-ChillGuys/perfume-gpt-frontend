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
  FormControlLabel,
} from "@mui/material";
import { Visibility, VisibilityOff, ArrowBack } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

export const RegisterPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  });

  const handleChange = (field: string) => (e: any) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement registration logic
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

          {/* Form */}
          <form onSubmit={handleSubmit}>
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
                size="small"
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
                size="small"
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
                Phone
              </Typography>
              <TextField
                fullWidth
                placeholder="09xx xxx xxx"
                value={formData.phone}
                onChange={handleChange("phone")}
                size="small"
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
                size="small"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        size="small"
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
                size="small"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        edge="end"
                        size="small"
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
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.agreeTerms}
                  onChange={handleChange("agreeTerms")}
                  size="small"
                  sx={{ py: 0.5, alignSelf: "flex-start" }}
                />
              }
              label={
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: "0.7rem", lineHeight: 1.3, pt: 0.8 }}
                >
                  Đăng ký đồng nghĩa đã đọc và đồng ý với{" "}
                  <Link href="#" underline="hover" color="primary">
                    Điều khoản
                  </Link>{" "}
                  và{" "}
                  <Link href="#" underline="hover" color="primary">
                    Chính sách
                  </Link>
                </Typography>
              }
              sx={{ mb: 1.5, alignItems: "flex-start", ml: 0 }}
            />

            {/* Register Button */}
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="medium"
              sx={{
                mb: 1,
                py: 1,
                bgcolor: "primary.main",
                fontWeight: 600,
                "&:hover": {
                  bgcolor: "primary.dark",
                },
              }}
            >
              ĐĂNG KÝ
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
              href="#"
              color="primary"
              underline="hover"
              fontWeight={600}
              onClick={(e) => {
                e.preventDefault();
                navigate("/login");
              }}
            >
              Đăng nhập
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
