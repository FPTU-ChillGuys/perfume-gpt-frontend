import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  InputAdornment,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  Button,
  CircularProgress,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from "@mui/material";
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Visibility as VisibilityIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  PersonAdd as PersonAddIcon,
} from "@mui/icons-material";
import { AdminLayout } from "@/layouts/AdminLayout";
import { useToast } from "@/hooks/useToast";

// ─── Mock types (replace with real API types when available) ────────────────
type UserRole = "user" | "staff" | "admin";
type UserStatus = "active" | "banned";

interface UserItem {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  lastLoginAt?: string | null;
  avatarUrl?: string | null;
  loyaltyPoints?: number;
}

// ─── Mock data (remove when API is ready) ───────────────────────────────────
const MOCK_NAMES = [
  "Nguyễn Văn An",
  "Trần Thị Bình",
  "Lê Minh Cường",
  "Phạm Thị Dung",
  "Hoàng Văn Em",
  "Đặng Thị Phương",
  "Bùi Quốc Hùng",
  "Vũ Thị Lan",
];
const MOCK_ROLES: UserRole[] = ["user", "user", "user", "staff", "admin"];

const MOCK_USERS: UserItem[] = Array.from({ length: 32 }, (_, i) => ({
  id: `user-${i + 1}`,
  fullName: MOCK_NAMES[i % MOCK_NAMES.length] ?? "Người dùng",
  email: `user${i + 1}@example.com`,
  phoneNumber: `09${String(10000000 + i).slice(1)}`,
  role: MOCK_ROLES[i % MOCK_ROLES.length] ?? "user",
  status: (i % 9 === 0 ? "banned" : "active") as UserStatus,
  createdAt: new Date(
    Date.now() - Math.floor(Math.random() * 365) * 86400000,
  ).toISOString(),
  lastLoginAt:
    i % 4 === 0
      ? null
      : new Date(
          Date.now() - Math.floor(Math.random() * 30) * 86400000,
        ).toISOString(),
  avatarUrl: null,
  loyaltyPoints: Math.floor(Math.random() * 5000),
}));

// ─── Helpers ────────────────────────────────────────────────────────────────
const roleConfig: Record<
  UserRole,
  {
    label: string;
    color:
      | "default"
      | "primary"
      | "error"
      | "warning"
      | "success"
      | "info"
      | "secondary";
  }
> = {
  user: { label: "Khách hàng", color: "default" },
  staff: { label: "Nhân viên", color: "info" },
  admin: { label: "Admin", color: "error" },
};

const statusConfig: Record<
  UserStatus,
  { label: string; color: "success" | "error" }
> = {
  active: { label: "Hoạt động", color: "success" },
  banned: { label: "Đã khoá", color: "error" },
};

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatCurrency = (value?: number) =>
  value !== undefined
    ? new Intl.NumberFormat("vi-VN").format(value) + " điểm"
    : "—";

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((s) => s[0])
    .slice(-2)
    .join("")
    .toUpperCase();

// ─── Detail Dialog ───────────────────────────────────────────────────────────
const UserDetailDialog = ({
  user,
  onClose,
}: {
  user: UserItem | null;
  onClose: () => void;
}) => (
  <Dialog open={Boolean(user)} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle>Chi tiết người dùng</DialogTitle>
    <Divider />
    <DialogContent>
      {user && (
        <Stack spacing={2.5} mt={1}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar
              src={user.avatarUrl || undefined}
              sx={{ width: 64, height: 64, fontSize: 22, fontWeight: 700 }}
            >
              {getInitials(user.fullName)}
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {user.fullName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user.email}
              </Typography>
            </Box>
          </Stack>

          <Divider />

          {(
            [
              ["ID", user.id],
              ["Số điện thoại", user.phoneNumber || "—"],
              ["Vai trò", roleConfig[user.role].label],
              ["Trạng thái", statusConfig[user.status].label],
              ["Điểm loyalty", formatCurrency(user.loyaltyPoints)],
              ["Ngày tạo", formatDate(user.createdAt)],
              ["Đăng nhập cuối", formatDate(user.lastLoginAt)],
            ] as [string, string][]
          ).map(([label, value]) => (
            <Stack
              key={label}
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography variant="body2" color="text.secondary" minWidth={140}>
                {label}
              </Typography>
              <Typography variant="body2" fontWeight={500} textAlign="right">
                {value}
              </Typography>
            </Stack>
          ))}
        </Stack>
      )}
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Đóng</Button>
    </DialogActions>
  </Dialog>
);

// ─── Main Page ───────────────────────────────────────────────────────────────
export const UserManagementPage = () => {
  const { showToast } = useToast();

  // Data
  const [allUsers] = useState<UserItem[]>(MOCK_USERS);
  const [loading] = useState(false);

  // Filters
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "">("");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "">("");

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Detail dialog
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [searchTerm, roleFilter, statusFilter]);

  const filtered = allUsers.filter((u) => {
    const matchSearch =
      !searchTerm ||
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.phoneNumber?.includes(searchTerm);
    const matchRole = !roleFilter || u.role === roleFilter;
    const matchStatus = !statusFilter || u.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  const paginated = filtered.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  const handleToggleStatus = (user: UserItem) => {
    // TODO: call API PATCH /api/users/{id}/status
    const action = user.status === "active" ? "khoá" : "mở khoá";
    showToast(`Tính năng ${action} tài khoản chưa có API.`, "warning");
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") setSearchTerm(searchInput);
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearchTerm("");
  };

  return (
    <AdminLayout>
      <Box>
        {/* Header */}
        <Stack
          direction="row"
          justifyContent="flex-end"
          alignItems="center"
          mb={3}
        >
          <Tooltip title="Chưa có API tạo người dùng">
            <span>
              <Button
                variant="contained"
                startIcon={<PersonAddIcon />}
                disabled
              >
                Thêm người dùng
              </Button>
            </span>
          </Tooltip>
        </Stack>

        {/* Filters */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 2,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems="center"
          >
            <TextField
              size="small"
              placeholder="Tìm theo tên, email, SĐT..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              sx={{ flex: 1 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: searchInput && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={clearSearch}>
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Vai trò</InputLabel>
              <Select
                label="Vai trò"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as UserRole | "")}
              >
                <MenuItem value="">Tất cả</MenuItem>
                <MenuItem value="user">Khách hàng</MenuItem>
                <MenuItem value="staff">Nhân viên</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Trạng thái</InputLabel>
              <Select
                label="Trạng thái"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as UserStatus | "")
                }
              >
                <MenuItem value="">Tất cả</MenuItem>
                <MenuItem value="active">Hoạt động</MenuItem>
                <MenuItem value="banned">Đã khoá</MenuItem>
              </Select>
            </FormControl>

            <Button
              variant="outlined"
              onClick={() => setSearchTerm(searchInput)}
              size="small"
              sx={{ whiteSpace: "nowrap" }}
            >
              Tìm kiếm
            </Button>
          </Stack>
        </Paper>

        {/* Table */}
        <Paper
          elevation={0}
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          {loading ? (
            <Box display="flex" justifyContent="center" py={6}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: "action.hover" }}>
                      <TableCell sx={{ fontWeight: 700 }}>Người dùng</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Liên hệ</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Vai trò</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>
                        Điểm loyalty
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Ngày tạo</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>
                        Đăng nhập cuối
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>
                        Thao tác
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginated.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          align="center"
                          sx={{ py: 6, color: "text.secondary" }}
                        >
                          Không có dữ liệu
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginated.map((user) => (
                        <TableRow
                          key={user.id}
                          hover
                          sx={{ opacity: user.status === "banned" ? 0.6 : 1 }}
                        >
                          <TableCell>
                            <Stack
                              direction="row"
                              spacing={1.5}
                              alignItems="center"
                            >
                              <Avatar
                                src={user.avatarUrl || undefined}
                                sx={{
                                  width: 36,
                                  height: 36,
                                  fontSize: 13,
                                  fontWeight: 700,
                                }}
                              >
                                {getInitials(user.fullName)}
                              </Avatar>
                              <Typography
                                variant="body2"
                                fontWeight={600}
                                noWrap
                              >
                                {user.fullName}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {user.email}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {user.phoneNumber || "—"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={roleConfig[user.role].label}
                              color={roleConfig[user.role].color}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={statusConfig[user.status].label}
                              color={statusConfig[user.status].color}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {formatCurrency(user.loyaltyPoints)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {formatDate(user.createdAt)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {formatDate(user.lastLoginAt)}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Stack
                              direction="row"
                              spacing={0.5}
                              justifyContent="center"
                            >
                              <Tooltip title="Xem chi tiết">
                                <IconButton
                                  size="small"
                                  onClick={() => setSelectedUser(user)}
                                >
                                  <VisibilityIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip
                                title={
                                  user.status === "active"
                                    ? "Khoá tài khoản (chưa có API)"
                                    : "Mở khoá tài khoản (chưa có API)"
                                }
                              >
                                <IconButton
                                  size="small"
                                  color={
                                    user.status === "active"
                                      ? "error"
                                      : "success"
                                  }
                                  onClick={() => handleToggleStatus(user)}
                                >
                                  {user.status === "active" ? (
                                    <BlockIcon fontSize="small" />
                                  ) : (
                                    <CheckCircleIcon fontSize="small" />
                                  )}
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={filtered.length}
                page={page}
                onPageChange={(_, p) => setPage(p)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[10, 25, 50]}
                labelRowsPerPage="Hàng mỗi trang:"
                labelDisplayedRows={({ from, to, count }) =>
                  `${from}–${to} của ${count}`
                }
              />
            </>
          )}
        </Paper>
      </Box>

      <UserDetailDialog
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
      />
    </AdminLayout>
  );
};
