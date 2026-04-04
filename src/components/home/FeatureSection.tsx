import { Box, Container, Typography, Button, Grid } from "@mui/material";
import {
  VerifiedUser,
  CardGiftcard,
  Security,
  ArrowForward,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const features = [
  {
    icon: VerifiedUser,
    title: "100% Chính hãng",
  },
  {
    icon: CardGiftcard,
    title: "Ưu đãi độc quyền",
  },
  {
    icon: Security,
    title: "Giao dịch an toàn",
  },
];

export const FeatureSection = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  return (
    <Box sx={{ py: 8, bgcolor: "background.paper" }}>
      <Container maxWidth="xl">
        {/* About PerfumeGPT */}
        <Typography
          variant="h4"
          component="h2"
          fontWeight="bold"
          textAlign="center"
          mb={6}
        >
          Về PerfumeGPT
        </Typography>

        <Grid container spacing={4} sx={{ maxWidth: 1024, mx: "auto", mb: 8 }}>
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Grid size={{ xs: 12, md: 4 }} key={index}>
                <Box sx={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      mx: "auto",
                      mb: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon sx={{ fontSize: 64, color: "text.primary" }} />
                  </Box>
                  <Typography variant="h6" fontWeight={600}>
                    {feature.title}
                  </Typography>
                </Box>
              </Grid>
            );
          })}
        </Grid>

        {/* Signup Section */}
        {!isAuthenticated && (
          <Box sx={{ maxWidth: 768, mx: "auto", textAlign: "center", mt: 6 }}>
            <Typography variant="h4" component="h2" fontWeight="bold" mb={2}>
              Hãy là người đầu tiên được biết
            </Typography>
            <Typography variant="body1" color="text.secondary" mb={4}>
              Nhận ngay thông tin về các sản phẩm mới nhất và các ưu đãi đặc
              biệt chỉ dành cho những khách hàng đặc biệt của PerfumeGPT
            </Typography>
            <Button
              variant="outlined"
              size="large"
              color="secondary"
              endIcon={<ArrowForward />}
              sx={{
                borderWidth: 2,
                "&:hover": {
                  borderWidth: 2,
                  bgcolor: "secondary.main",
                  color: "white",
                },
              }}
              onClick={(e) => {
                e.preventDefault();
                navigate("/register");
              }}
            >
              ĐĂNG KÝ NGAY
            </Button>
          </Box>
        )}
      </Container>
    </Box>
  );
};
