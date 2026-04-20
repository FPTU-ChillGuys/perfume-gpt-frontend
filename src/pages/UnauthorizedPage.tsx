import { Box, Button, Stack, Typography } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import BlockIcon from "@mui/icons-material/Block";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import ArrowBackOutlinedIcon from "@mui/icons-material/ArrowBackOutlined";
import LoginOutlinedIcon from "@mui/icons-material/LoginOutlined";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import { useAuth } from "@/hooks/useAuth";

const Screw = ({
  top,
  left,
  right,
  bottom,
}: {
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
}) => (
  <Box
    sx={{
      position: "absolute",
      top,
      left,
      right,
      bottom,
      width: 14,
      height: 14,
      borderRadius: "50%",
      bgcolor: "#c0c0c0",
      border: "1.5px solid #999",
      boxShadow: "inset 0 1px 2px rgba(0,0,0,0.3)",
      "&::after": {
        content: '""',
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%) rotate(45deg)",
        width: 8,
        height: 1.5,
        bgcolor: "#888",
      },
    }}
  />
);

const UnauthorizedPage = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { isAuthenticated, user } = useAuth();

  const isUnauthorizedMode = pathname === "/unauthorized";
  const roleLabel = user?.role ? user.role.toUpperCase() : "GUEST";

  const is403 = isUnauthorizedMode;

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
          bgcolor: "white",
        }}
      >
        <Stack spacing={3} alignItems="center">
          {/* Metal sign */}
          <Box
            sx={{
              position: "relative",
              width: { xs: 380, sm: 580 },
              bgcolor: "#f5f5f5",
              borderRadius: 3,
              border: "3px solid #bbb",
              boxShadow:
                "0 6px 24px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.6)",
              overflow: "hidden",
              background: "linear-gradient(180deg, #f9f9f9 0%, #e8e8e8 100%)",
            }}
          >
            {/* Screws */}
            <Screw top={10} left={10} />
            <Screw top={10} right={10} />
            <Screw bottom={10} left={10} />
            <Screw bottom={10} right={10} />

            {is403 ? (
              <>
                {/* Red banner top */}
                <Box
                  sx={{
                    bgcolor: "#e53935",
                    px: 3,
                    py: { xs: 2, sm: 2.5 },
                    textAlign: "center",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 1.5,
                      mb: 0.5,
                    }}
                  >
                    <Box
                      sx={{
                        flex: 1,
                        height: 2,
                        bgcolor: "rgba(255,255,255,0.5)",
                        borderRadius: 1,
                      }}
                    />
                    <Box
                      sx={{
                        flex: 1,
                        height: 2,
                        bgcolor: "rgba(255,255,255,0.5)",
                        borderRadius: 1,
                      }}
                    />
                  </Box>
                  <Typography
                    sx={{
                      color: "#fff",
                      fontWeight: 900,
                      fontSize: { xs: "2.8rem", sm: "4rem" },
                      lineHeight: 1,
                      letterSpacing: 2,
                      textShadow: "0 2px 4px rgba(0,0,0,0.3)",
                    }}
                  >
                    403
                  </Typography>
                  <Typography
                    sx={{
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: { xs: "1.3rem", sm: "1.8rem" },
                      letterSpacing: 3,
                      textTransform: "uppercase",
                    }}
                  >
                    Forbidden
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 1.5,
                      mt: 0.5,
                    }}
                  >
                    <Box
                      sx={{
                        flex: 1,
                        height: 2,
                        bgcolor: "rgba(255,255,255,0.5)",
                        borderRadius: 1,
                      }}
                    />
                    <Box
                      sx={{
                        flex: 1,
                        height: 2,
                        bgcolor: "rgba(255,255,255,0.5)",
                        borderRadius: 1,
                      }}
                    />
                  </Box>
                </Box>

                {/* Body */}
                <Box
                  sx={{
                    px: { xs: 2.5, sm: 4 },
                    py: { xs: 2.5, sm: 3 },
                    display: "flex",
                    alignItems: "center",
                    gap: { xs: 2, sm: 3 },
                  }}
                >
                  {/* Left text */}
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      sx={{
                        fontWeight: 900,
                        fontSize: { xs: "1.6rem", sm: "2.2rem" },
                        lineHeight: 1.15,
                        color: "#222",
                        letterSpacing: 1,
                        textTransform: "uppercase",
                      }}
                    >
                      Chỉ dành cho
                      <br />
                      Nhân viên
                      <br />
                      Được ủy quyền
                    </Typography>
                  </Box>

                  {/* No-person icon */}
                  <Box
                    sx={{
                      position: "relative",
                      width: { xs: 100, sm: 140 },
                      height: { xs: 100, sm: 140 },
                      flexShrink: 0,
                    }}
                  >
                    <Box
                      sx={{
                        width: "100%",
                        height: "100%",
                        borderRadius: "50%",
                        bgcolor: "#eee",
                        display: "grid",
                        placeItems: "center",
                        border: "3px solid #e53935",
                      }}
                    >
                      <PersonIcon
                        sx={{ fontSize: { xs: 56, sm: 80 }, color: "#aaa" }}
                      />
                    </Box>
                    <BlockIcon
                      sx={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        fontSize: { xs: 100, sm: 140 },
                        color: "#e53935",
                        opacity: 0.85,
                      }}
                    />
                  </Box>
                </Box>

                {/* Bottom text */}
                <Box sx={{ px: { xs: 2.5, sm: 4 }, pb: 3.5 }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: { xs: "0.8rem", sm: "0.95rem" } }}
                  >
                    <strong>Lỗi 403:</strong> Bạn không có quyền truy cập trang
                    này.
                  </Typography>
                </Box>
              </>
            ) : (
              /* 404 mode */
              <>
                {/* Red banner top */}
                <Box
                  sx={{
                    bgcolor: "#e53935",
                    px: 3,
                    py: { xs: 2, sm: 2.5 },
                    textAlign: "center",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 1.5,
                      mb: 0.5,
                    }}
                  >
                    <Box
                      sx={{
                        flex: 1,
                        height: 2,
                        bgcolor: "rgba(255,255,255,0.5)",
                        borderRadius: 1,
                      }}
                    />
                    <Box
                      sx={{
                        flex: 1,
                        height: 2,
                        bgcolor: "rgba(255,255,255,0.5)",
                        borderRadius: 1,
                      }}
                    />
                  </Box>
                  <Typography
                    sx={{
                      color: "#fff",
                      fontWeight: 900,
                      fontSize: { xs: "2.8rem", sm: "4rem" },
                      lineHeight: 1,
                      letterSpacing: 2,
                      textShadow: "0 2px 4px rgba(0,0,0,0.3)",
                    }}
                  >
                    404
                  </Typography>
                  <Typography
                    sx={{
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: { xs: "1.3rem", sm: "1.8rem" },
                      letterSpacing: 3,
                      textTransform: "uppercase",
                    }}
                  >
                    Not Found
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 1.5,
                      mt: 0.5,
                    }}
                  >
                    <Box
                      sx={{
                        flex: 1,
                        height: 2,
                        bgcolor: "rgba(255,255,255,0.5)",
                        borderRadius: 1,
                      }}
                    />
                    <Box
                      sx={{
                        flex: 1,
                        height: 2,
                        bgcolor: "rgba(255,255,255,0.5)",
                        borderRadius: 1,
                      }}
                    />
                  </Box>
                </Box>

                {/* Body */}
                <Box
                  sx={{
                    px: { xs: 2.5, sm: 4 },
                    py: { xs: 2.5, sm: 3 },
                    display: "flex",
                    alignItems: "center",
                    gap: { xs: 2, sm: 3 },
                  }}
                >
                  {/* Left text */}
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      sx={{
                        fontWeight: 900,
                        fontSize: { xs: "1.6rem", sm: "2.2rem" },
                        lineHeight: 1.15,
                        color: "#222",
                        letterSpacing: 1,
                        textTransform: "uppercase",
                      }}
                    >
                      Không Tìm
                      <br />
                      thấy Trang vừa
                      <br />
                      truy cập
                    </Typography>
                  </Box>

                  {/* Question mark icon */}
                  <Box
                    sx={{
                      width: { xs: 150, sm: 140 },
                      height: { xs: 150, sm: 140 },
                      flexShrink: 0,
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <HelpOutlineIcon
                      sx={{
                        fontSize: { xs: 100, sm: 150 },
                        color: "#e53935",
                      }}
                    />
                  </Box>
                </Box>

                {/* Bottom text */}
                <Box sx={{ px: { xs: 2.5, sm: 4 }, pb: 3.5 }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: { xs: "0.8rem", sm: "0.95rem" } }}
                  >
                    <strong>Lỗi 404:</strong> URL bạn vừa truy cập không tồn tại
                    hoặc đã thay đổi.
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        </Stack>
      </Box>
    </MainLayout>
  );
};

export default UnauthorizedPage;
