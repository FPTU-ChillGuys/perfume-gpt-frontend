import { useEffect, useState } from "react";
import {
  Box,
  Container,
  Typography,
  Button,
  CircularProgress,
  Alert,
} from "@mui/material";
import { CheckCircle, ErrorOutline, ArrowBack } from "@mui/icons-material";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authService } from "../services/authService";

export const VerifyEmailPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const email = searchParams.get("email") || "";
  const token = searchParams.get("token") || "";

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!email || !token) {
      setStatus("error");
      setMessage("Liên kết xác thực không hợp lệ.");
      return;
    }
    authService
      .verifyEmail(email, token)
      .then((msg) => {
        setMessage(msg);
        setStatus("success");
      })
      .catch((err: any) => {
        setMessage(
          err?.message || "Xác thực email thất bại. Liên kết có thể đã hết hạn.",
        );
        setStatus("error");
      });
  }, [email, token]);

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
        <Typography variant="h5" component="h1" color="primary" fontWeight="bold">
          PerfumeGPT
        </Typography>
        <Button
          startIcon={<ArrowBack />}
          color="inherit"
          onClick={() => navigate("/login")}
          sx={{ fontWeight: 500 }}
        >
          ĐI TỚI ĐĂNG NHẬP
        </Button>
      </Box>

      <Container
        maxWidth="sm"
        sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", py: 2 }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: 480,
            bgcolor: "white",
            p: 4,
            borderRadius: 2,
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            textAlign: "center",
          }}
        >
          {status === "loading" && (
            <>
              <CircularProgress size={56} sx={{ mb: 2 }} />
              <Typography variant="h6" fontWeight="bold" mb={1}>
                Đang xác thực email...
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Vui lòng chờ trong giây lát.
              </Typography>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle sx={{ fontSize: 64, color: "success.main", mb: 2 }} />
              <Typography variant="h6" fontWeight="bold" mb={1}>
                Xác thực thành công!
              </Typography>
              <Alert severity="success" sx={{ mb: 2, textAlign: "left" }}>
                {message}
              </Alert>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Tài khoản của bạn đã được kích hoạt. Bạn có thể đăng nhập ngay bây giờ.
              </Typography>
              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={() => navigate("/login")}
                sx={{ fontWeight: 600, py: 1.2 }}
              >
                ĐĂNG NHẬP NGAY
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <ErrorOutline sx={{ fontSize: 64, color: "error.main", mb: 2 }} />
              <Typography variant="h6" fontWeight="bold" mb={1}>
                Xác thực thất bại
              </Typography>
              <Alert severity="error" sx={{ mb: 2, textAlign: "left" }}>
                {message}
              </Alert>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Liên kết xác thực có thể đã hết hạn hoặc không hợp lệ.
              </Typography>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => navigate("/register")}
              >
                Đăng ký lại
              </Button>
            </>
          )}
        </Box>
      </Container>

      <Box
        component="footer"
        sx={{ py: 1.5, textAlign: "center", borderTop: 1, borderColor: "divider" }}
      >
        <Typography variant="caption" color="text.secondary">
          © 2026 PERFUMEGPT — THE ART OF OLFACTORY INTELLIGENCE
        </Typography>
      </Box>
    </Box>
  );
};
