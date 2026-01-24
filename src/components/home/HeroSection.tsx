import { Box, Container, Typography, Button, Grid } from "@mui/material";

export const HeroSection = () => {
  return (
    <Box
      sx={{
        position: "relative",
        height: 500,
        background:
          "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #1e3a8a 100%)",
        overflow: "hidden",
      }}
    >
      {/* Background Overlay */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          bgcolor: "rgba(0, 0, 0, 0.4)",
        }}
      />

      {/* Content */}
      <Container
        maxWidth="xl"
        sx={{
          height: "100%",
          position: "relative",
          zIndex: 10,
        }}
      >
        <Grid
          container
          spacing={4}
          sx={{ height: "100%", alignItems: "center" }}
        >
          {/* Left Content */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography
              variant="overline"
              sx={{
                color: "grey.300",
                letterSpacing: 2,
                mb: 2,
                display: "block",
              }}
            >
              EXCLUSIVE RELEASE
            </Typography>
            <Typography
              variant="h1"
              sx={{
                color: "white",
                fontSize: { xs: "3rem", md: "4rem" },
                fontWeight: "bold",
                mb: 3,
                lineHeight: 1.2,
              }}
            >
              ELIXIR
              <br />
              ABSOLU
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: "grey.300",
                mb: 4,
                maxWidth: 500,
                lineHeight: 1.7,
              }}
            >
              Khơi gợi những nốt hương quyến rũ, sang trọng với hương thơm từ
              hoa hồng, vani và xạ hương, tôn lên sự đẳng cấp trong từng giây
              phút.
            </Typography>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Button
                variant="contained"
                size="large"
                color="inherit"
                sx={{
                  bgcolor: "white",
                  color: "grey.900",
                  "&:hover": { bgcolor: "grey.100" },
                }}
              >
                Mua Ngay
              </Button>
              <Button
                variant="outlined"
                size="large"
                sx={{
                  borderColor: "white",
                  color: "white",
                  borderWidth: 2,
                  "&:hover": {
                    borderWidth: 2,
                    bgcolor: "rgba(255, 255, 255, 0.1)",
                  },
                }}
              >
                Chi tiết
              </Button>
            </Box>
          </Grid>

          {/* Right Image Placeholder */}
          <Grid
            size={{ xs: 12, md: 6 }}
            sx={{
              display: { xs: "none", md: "flex" },
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Box
              sx={{
                width: 256,
                height: 320,
                background:
                  "linear-gradient(135deg, rgba(219, 39, 119, 0.3) 0%, rgba(147, 51, 234, 0.3) 100%)",
                borderRadius: 2,
                backdropFilter: "blur(8px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Box
                sx={{ textAlign: "center", color: "rgba(255, 255, 255, 0.5)" }}
              >
                <Box
                  sx={{
                    width: 128,
                    height: 192,
                    mx: "auto",
                    mb: 2,
                    bgcolor: "rgba(255, 255, 255, 0.1)",
                    borderRadius: 2,
                  }}
                />
                <Typography variant="body2">Product Image</Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};
