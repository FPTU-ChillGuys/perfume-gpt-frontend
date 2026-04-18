import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
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
  People as PeopleIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  Clear as ClearIcon,
  Block as BlockIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import { AdminLayout } from "@/layouts/AdminLayout";
import { userService } from "@/services/userService";
import { useToast } from "@/hooks/useToast";
import type { UserManageItem } from "@/types/staff-user";

const getInitials = (name: string) =>
  name
    .split(" ")
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export const UserManagementPage = () => {
  const { showToast } = useToast();
  const [allUsers, setAllUsers] = useState<UserManageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [codFilter, setCodFilter] = useState<"all" | "blocked">("all");

  const [confirmTarget, setConfirmTarget] = useState<UserManageItem | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await userService.getUserManage();
      setAllUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách người dùng");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDeactivate = async () => {
    if (!confirmTarget) return;
    try {
      setDeactivating(true);
      await userService.setUserInactive(confirmTarget.id);
      showToast(`Đã vô hiệu hóa tài khoản ${confirmTarget.fullName}`, "success");
      setAllUsers((prev) =>
        prev.map((u) => (u.id === confirmTarget.id ? { ...u, isActive: false } : u)),
      );
      setConfirmTarget(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Thao tác thất bại", "error");
    } finally {
      setDeactivating(false);
    }
  };

  const filtered = allUsers.filter((u) => {
    const q = search.toLowerCase();
    if (
      q &&
      !u.fullName.toLowerCase().includes(q) &&
      !u.email.toLowerCase().includes(q) &&
      !(u.userName?.toLowerCase() ?? "").includes(q) &&
      !(u.phoneNumber ?? "").includes(q)
    )
      return false;
    if (statusFilter === "active" && !u.isActive) return false;
    if (statusFilter === "inactive" && u.isActive) return false;
    if (codFilter === "blocked" && !u.codBlockedUntil) return false;
    return true;
  });

  const activeCount = allUsers.filter((u) => u.isActive).length;
  const inactiveCount = allUsers.length - activeCount;
  const codBlockedCount = allUsers.filter((u) => u.codBlockedUntil).length;

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
                bgcolor: "primary.main",
                color: "white",
              }}
            >
              <PeopleIcon />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={700}>
                Quản lý người dùng
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Xem và quản lý tài khoản khách hàng
              </Typography>
            </Box>
          </Stack>
          <Tooltip title="Tải lại">
            <IconButton onClick={fetchUsers} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>

        {/* Stats */}
        <Stack direction="row" spacing={2} sx={{ mb: 3 }} flexWrap="wrap">
          {[
            { label: "Tổng người dùng", value: allUsers.length, color: "#6366f1", borderColor: "grey.200", bg: "transparent" },
            { label: "Đang hoạt động", value: activeCount, color: "#16a34a", borderColor: "#bbf7d0", bg: "#f0fdf4" },
            { label: "Vô hiệu hóa", value: inactiveCount, color: "#dc2626", borderColor: "#fecaca", bg: "#fff5f5" },
            { label: "Bị khóa COD", value: codBlockedCount, color: "#d97706", borderColor: "#fde68a", bg: "#fffbeb" },
          ].map((stat) => (
            <Paper
              key={stat.label}
              elevation={0}
              sx={{
                px: 2.5,
                py: 1.5,
                border: "1px solid",
                borderColor: stat.borderColor,
                borderRadius: 2.5,
                bgcolor: stat.bg,
                minWidth: 130,
              }}
            >
              <Typography variant="caption" color="text.secondary" fontWeight={500}>
                {stat.label}
              </Typography>
              <Typography variant="h6" fontWeight={700} sx={{ color: stat.color }}>
                {loading ? <Skeleton width={40} /> : stat.value}
              </Typography>
            </Paper>
          ))}
        </Stack>

        {/* Filters */}
        <Paper
          elevation={0}
          sx={{ p: 2, mb: 2.5, border: "1px solid", borderColor: "grey.200", borderRadius: 2.5 }}
        >
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              placeholder="Tìm theo tên, email, username, số điện thoại…"
              size="small"
              sx={{ flex: 2 }}
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
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Trạng thái</InputLabel>
              <Select
                label="Trạng thái"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              >
                <MenuItem value="all">Tất cả</MenuItem>
                <MenuItem value="active">Hoạt động</MenuItem>
                <MenuItem value="inactive">Vô hiệu</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>COD</InputLabel>
              <Select
                label="COD"
                value={codFilter}
                onChange={(e) => setCodFilter(e.target.value as typeof codFilter)}
              >
                <MenuItem value="all">Tất cả</MenuItem>
                <MenuItem value="blocked">Bị khóa COD</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Paper>

        {error && (
          <Alert
            severity="error"
            sx={{ mb: 2, borderRadius: 2 }}
            action={
              <Button color="inherit" size="small" onClick={fetchUsers}>
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
          sx={{ border: "1px solid", borderColor: "grey.200", borderRadius: 3, overflow: "hidden" }}
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
                  <TableCell>Người dùng</TableCell>
                  <TableCell>Username</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Số điện thoại</TableCell>
                  <TableCell align="center">Từ chối giao</TableCell>
                  <TableCell>Khóa COD đến</TableCell>
                  <TableCell align="center">Trạng thái</TableCell>
                  <TableCell align="center">Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading
                  ? Array.from({ length: 7 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton variant="text" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : filtered.map((user) => (
                      <TableRow
                        key={user.id}
                        hover
                        sx={{ "&:last-child td": { borderBottom: 0 } }}
                      >
                        <TableCell>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar
                              src={user.profileImageUrl ?? undefined}
                              sx={{
                                width: 36,
                                height: 36,
                                bgcolor: "primary.main",
                                fontSize: "0.8rem",
                                fontWeight: 700,
                              }}
                            >
                              {getInitials(user.fullName)}
                            </Avatar>
                            <Typography variant="body2" fontWeight={600} fontSize="0.85rem">
                              {user.fullName}
                            </Typography>
                          </Stack>
                        </TableCell>

                        <TableCell>
                          <Typography
                            variant="body2"
                            fontSize="0.82rem"
                            sx={{ fontFamily: "monospace", color: "text.secondary" }}
                          >
                            {user.userName || "—"}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2" fontSize="0.82rem">
                            {user.email}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2" fontSize="0.82rem" color="text.secondary">
                            {user.phoneNumber || "—"}
                          </Typography>
                        </TableCell>

                        <TableCell align="center">
                          <Chip
                            label={user.deliveryRefusalCount}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              fontSize: "0.78rem",
                              bgcolor: user.deliveryRefusalCount > 0 ? "#fef3c7" : "#f3f4f6",
                              color: user.deliveryRefusalCount > 0 ? "#92400e" : "#6b7280",
                              border: "1px solid",
                              borderColor: user.deliveryRefusalCount > 0 ? "#fde68a" : "#e5e7eb",
                            }}
                          />
                        </TableCell>

                        <TableCell>
                          {user.codBlockedUntil ? (
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <WarningIcon sx={{ color: "warning.main", fontSize: 14 }} />
                              <Typography variant="body2" fontSize="0.82rem" color="warning.dark" fontWeight={600}>
                                {formatDate(user.codBlockedUntil)}
                              </Typography>
                            </Stack>
                          ) : (
                            <Typography variant="body2" fontSize="0.82rem" color="text.disabled">
                              —
                            </Typography>
                          )}
                        </TableCell>

                        <TableCell align="center">
                          {user.isActive ? (
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

                        <TableCell align="center">
                          {user.isActive ? (
                            <Tooltip title="Vô hiệu hóa tài khoản">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => setConfirmTarget(user)}
                              >
                                <BlockIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          ) : (
                            <Typography variant="caption" color="text.disabled">—</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}

                {!loading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ py: 8, textAlign: "center" }}>
                      <PeopleIcon sx={{ fontSize: 48, color: "grey.300", mb: 1 }} />
                      <Typography variant="body1" color="text.secondary">
                        Không tìm thấy người dùng nào
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

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
                Hiển thị {filtered.length} / {allUsers.length} người dùng
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>

      {/* Confirm deactivate dialog */}
      <Dialog
        open={!!confirmTarget}
        onClose={() => !deactivating && setConfirmTarget(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Xác nhận vô hiệu hóa</DialogTitle>
        <DialogContent>
          <Typography>
            Bạn có chắc muốn vô hiệu hóa tài khoản của{" "}
            <strong>{confirmTarget?.fullName}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Người dùng sẽ không thể đăng nhập cho đến khi được kích hoạt lại.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            variant="outlined"
            onClick={() => setConfirmTarget(null)}
            disabled={deactivating}
          >
            Hủy
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeactivate}
            disabled={deactivating}
            startIcon={<BlockIcon />}
          >
            {deactivating ? "Đang xử lý…" : "Vô hiệu hóa"}
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
};

