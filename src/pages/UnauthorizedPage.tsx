import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import GppBadOutlinedIcon from "@mui/icons-material/GppBadOutlined";
import SearchOffOutlinedIcon from "@mui/icons-material/SearchOffOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import ArrowBackOutlinedIcon from "@mui/icons-material/ArrowBackOutlined";
import LoginOutlinedIcon from "@mui/icons-material/LoginOutlined";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import { useAuth } from "@/hooks/useAuth";

const UnauthorizedPage = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { isAuthenticated, user } = useAuth();

  const isUnauthorizedMode = pathname === "/unauthorized";
  const roleLabel = user?.role ? user.role.toUpperCase() : "GUEST";

  const title = isUnauthorizedMode
    ? "Bạn không có quyền truy cập"
    : "Không tìm thấy trang";
  const description = isUnauthorizedMode
    ? "Trang này bị chặn theo quyền tài khoản hiện tại. Vui lòng quay về đúng khu vực được cấp quyền."
    : "URL bạn vừa truy cập không tồn tại hoặc đã thay đổi. Hệ thống đã chặn truy cập để đảm bảo an toàn.";

  const statusCode = isUnauthorizedMode ? "403" : "404";

  return (
    <MainLayout>
      <Box
        sx={{
          minHeight: "calc(100vh - 140px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: 2,
          py: 6,
          background: "#ffff",
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: "100%",
            maxWidth: 760,
            borderRadius: 4,
            border: "1px solid",
            borderColor: "divider",
            p: { xs: 3, sm: 5 },
          }}
        >
          <Stack spacing={2} alignItems="center" textAlign="center">
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                bgcolor: isUnauthorizedMode ? "error.light" : "warning.light",
                color: isUnauthorizedMode ? "error.dark" : "warning.dark",
              }}
            >
              {isUnauthorizedMode ? (
                <GppBadOutlinedIcon fontSize="large" />
              ) : (
                <SearchOffOutlinedIcon fontSize="large" />
              )}
            </Box>

            <Typography variant="h2" fontWeight={800} color="error.main">
              {statusCode}
            </Typography>

            <Typography variant="h5" fontWeight={700}>
              {title}
            </Typography>

            <Typography variant="body1" color="text.secondary" maxWidth={620}>
              {description}
            </Typography>

            {isAuthenticated && (
              <Typography
                variant="caption"
                sx={{
                  px: 1,
                  py: 0.5,
                  borderRadius: 999,
                  bgcolor: "action.selected",
                  color: "text.secondary",
                  letterSpacing: 0.4,
                }}
              >
                Quyền hiện tại: {roleLabel}
              </Typography>
            )}

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              sx={{ pt: 1 }}
            >
              <Button
                variant="contained"
                startIcon={<HomeOutlinedIcon />}
                component={RouterLink}
                to="/"
              >
                Về trang chủ
              </Button>

              {!isAuthenticated && (
                <Button
                  variant="contained"
                  startIcon={<LoginOutlinedIcon />}
                  component={RouterLink}
                  to="/login"
                >
                  Đăng nhập
                </Button>
              )}
              <Button
                variant="contained"
                startIcon={<ArrowBackOutlinedIcon />}
                onClick={() => navigate(-1)}
              >
                Quay lại
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Box>
    </MainLayout>
  );
};

export default UnauthorizedPage;
