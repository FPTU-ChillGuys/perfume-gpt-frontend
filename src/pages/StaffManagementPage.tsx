import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Badge as BadgeIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  Clear as ClearIcon,
} from "@mui/icons-material";
import { AdminLayout } from "@/layouts/AdminLayout";
import { userService } from "@/services/userService";
import type { StaffManageItem } from "@/types/staff-user";

const getInitials = (name: string) =>
  name
    .split(" ")
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

export const StaffManagementPage = () => {
  const [allStaff, setAllStaff] = useState<StaffManageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await userService.getStaffManage();
      setAllStaff(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách nhân viên");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const filtered = allStaff.filter((s) => {
    const q = search.toLowerCase();
    return (
      !q ||
      s.fullName.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.userName?.toLowerCase() ?? "").includes(q) ||
      (s.phoneNumber ?? "").includes(q)
    );
  });

  const activeCount = allStaff.filter((s) => s.isActive).length;
  const inactiveCount = allStaff.length - activeCount;

  return (
    <AdminLayout>
      <Box sx={{ px: { xs: 2, md: 3 }, py: 3 }}>
        {/* Header */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={2}
          sx={{ mb: 3 }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "#7c3aed",
                color: "white",
              }}
            >
              <BadgeIcon />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={700}>
                Quản lý nhân viên
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Xem danh sách và trạng thái tài khoản nhân viên
              </Typography>
            </Box>
          </Stack>
          <Tooltip title="Tải lại">
            <IconButton onClick={fetchStaff} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>

        {/* Stats row */}
        <Stack direction="row" spacing={2} sx={{ mb: 3 }} flexWrap="wrap">
          <Paper
            elevation={0}
            sx={{
              px: 2.5,
              py: 1.5,
              border: "1px solid",
              borderColor: "grey.200",
              borderRadius: 2.5,
              minWidth: 120,
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={500}>
              Tổng nhân viên
            </Typography>
            <Typography variant="h6" fontWeight={700}>
              {loading ? <Skeleton width={40} /> : allStaff.length}
            </Typography>
          </Paper>
          <Paper
            elevation={0}
            sx={{
              px: 2.5,
              py: 1.5,
              border: "1px solid",
              borderColor: "#bbf7d0",
              borderRadius: 2.5,
              bgcolor: "#f0fdf4",
              minWidth: 120,
            }}
          >
            <Typography variant="caption" color="success.dark" fontWeight={500}>
              Đang hoạt động
            </Typography>
            <Typography variant="h6" fontWeight={700} color="success.dark">
              {loading ? <Skeleton width={40} /> : activeCount}
            </Typography>
          </Paper>
          <Paper
            elevation={0}
            sx={{
              px: 2.5,
              py: 1.5,
              border: "1px solid",
              borderColor: "#fecaca",
              borderRadius: 2.5,
              bgcolor: "#fff5f5",
              minWidth: 120,
            }}
          >
            <Typography variant="caption" color="error.dark" fontWeight={500}>
              Không hoạt động
            </Typography>
            <Typography variant="h6" fontWeight={700} color="error.dark">
              {loading ? <Skeleton width={40} /> : inactiveCount}
            </Typography>
          </Paper>
        </Stack>

        {/* Search */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 2.5,
            border: "1px solid",
            borderColor: "grey.200",
            borderRadius: 2.5,
          }}
        >
          <TextField
            placeholder="Tìm theo tên, email, username, số điện thoại…"
            size="small"
            fullWidth
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: search ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearch("")}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
          />
        </Paper>

        {error && (
          <Alert
            severity="error"
            sx={{ mb: 2, borderRadius: 2 }}
            action={
              <Button color="inherit" size="small" onClick={fetchStaff}>
                Thử lại
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {/* Table */}
        <Paper
          elevation={0}
          sx={{
            border: "1px solid",
            borderColor: "grey.200",
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow
                  sx={{
                    bgcolor: "grey.50",
                    "& th": {
                      fontWeight: 600,
                      fontSize: "0.8rem",
                      color: "text.secondary",
                      whiteSpace: "nowrap",
                      py: 1.5,
                    },
                  }}
                >
                  <TableCell>Nhân viên</TableCell>
                  <TableCell>Username</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Số điện thoại</TableCell>
                  <TableCell align="center">Trạng thái</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 5 }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton variant="text" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : filtered.map((staff) => (
                      <TableRow
                        key={staff.id}
                        hover
                        sx={{ "&:last-child td": { borderBottom: 0 } }}
                      >
                        {/* Avatar + name */}
                        <TableCell>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar
                              src={staff.profileImageUrl ?? undefined}
                              sx={{
                                width: 36,
                                height: 36,
                                bgcolor: "#7c3aed",
                                fontSize: "0.8rem",
                                fontWeight: 700,
                              }}
                            >
                              {getInitials(staff.fullName)}
                            </Avatar>
                            <Typography variant="body2" fontWeight={600} fontSize="0.85rem">
                              {staff.fullName}
                            </Typography>
                          </Stack>
                        </TableCell>

                        {/* Username */}
                        <TableCell>
                          <Typography
                            variant="body2"
                            fontSize="0.82rem"
                            sx={{ fontFamily: "monospace", color: "text.secondary" }}
                          >
                            {staff.userName || "—"}
                          </Typography>
                        </TableCell>

                        {/* Email */}
                        <TableCell>
                          <Typography variant="body2" fontSize="0.82rem">
                            {staff.email}
                          </Typography>
                        </TableCell>

                        {/* Phone */}
                        <TableCell>
                          <Typography variant="body2" fontSize="0.82rem" color="text.secondary">
                            {staff.phoneNumber || "—"}
                          </Typography>
                        </TableCell>

                        {/* Status */}
                        <TableCell align="center">
                          {staff.isActive ? (
                            <Chip
                              icon={<ActiveIcon fontSize="small" />}
                              label="Hoạt động"
                              size="small"
                              color="success"
                              variant="outlined"
                              sx={{ fontWeight: 600, fontSize: "0.75rem" }}
                            />
                          ) : (
                            <Chip
                              icon={<InactiveIcon fontSize="small" />}
                              label="Vô hiệu"
                              size="small"
                              color="error"
                              variant="outlined"
                              sx={{ fontWeight: 600, fontSize: "0.75rem" }}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}

                {!loading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ py: 8, textAlign: "center" }}>
                      <BadgeIcon sx={{ fontSize: 48, color: "grey.300", mb: 1 }} />
                      <Typography variant="body1" color="text.secondary">
                        Không tìm thấy nhân viên nào
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Result count */}
          {!loading && (
            <Box
              sx={{
                px: 2,
                py: 1.5,
                borderTop: "1px solid",
                borderColor: "grey.200",
                bgcolor: "grey.50",
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Hiển thị {filtered.length} / {allStaff.length} nhân viên
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>
    </AdminLayout>
  );
};
