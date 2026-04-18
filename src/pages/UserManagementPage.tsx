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
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  People as PeopleIcon,
  Badge as BadgeIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  Clear as ClearIcon,
  Block as BlockIcon,
  Warning as WarningIcon,
  PersonAdd as PersonAddIcon,
} from "@mui/icons-material";
import { AdminLayout } from "@/layouts/AdminLayout";
import { userService } from "@/services/userService";
import { useToast } from "@/hooks/useToast";
import type { StaffManageItem, UserManageItem } from "@/types/staff-user";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
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

const PHONE_REGEX = /^(0)(3[2-9]|5[6789]|7[06789]|8[0-9]|9[0-9])[0-9]{7}$/;

// ---------------------------------------------------------------------------
// Sub-component: Users tab
// ---------------------------------------------------------------------------
function UsersTab() {
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
    <>
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
          <Tooltip title="Tải lại">
            <IconButton onClick={fetchUsers} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
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
                            <Typography
                              variant="body2"
                              fontSize="0.82rem"
                              color="warning.dark"
                              fontWeight={600}
                            >
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
                          <Typography variant="caption" color="text.disabled">
                            —
                          </Typography>
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
          <Box sx={{ px: 2, py: 1.5, borderTop: "1px solid", borderColor: "grey.200", bgcolor: "grey.50" }}>
            <Typography variant="caption" color="text.secondary">
              Hiển thị {filtered.length} / {allUsers.length} người dùng
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Confirm deactivate */}
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
          <Button variant="outlined" onClick={() => setConfirmTarget(null)} disabled={deactivating}>
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
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Staff tab
// ---------------------------------------------------------------------------

const EMPTY_CREATE = {
  fullName: "",
  phoneNumber: "",
  email: "",
  password: "",
  clientUri: typeof window !== "undefined" ? window.location.origin : "",
};

function StaffTab() {
  const { showToast } = useToast();
  const [allStaff, setAllStaff] = useState<StaffManageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [confirmTarget, setConfirmTarget] = useState<StaffManageItem | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE);
  const [createErrors, setCreateErrors] = useState<Partial<typeof EMPTY_CREATE>>({});
  const [creating, setCreating] = useState(false);

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

  const handleDeactivate = async () => {
    if (!confirmTarget) return;
    try {
      setDeactivating(true);
      await userService.setUserInactive(confirmTarget.id);
      showToast(`Đã vô hiệu hóa tài khoản ${confirmTarget.fullName}`, "success");
      setAllStaff((prev) =>
        prev.map((s) => (s.id === confirmTarget.id ? { ...s, isActive: false } : s)),
      );
      setConfirmTarget(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Thao tác thất bại", "error");
    } finally {
      setDeactivating(false);
    }
  };

  const validateCreate = () => {
    const errs: Partial<typeof EMPTY_CREATE> = {};
    if (!createForm.fullName.trim()) errs.fullName = "Họ tên không được để trống";
    if (!createForm.email.trim()) errs.email = "Email không được để trống";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.email))
      errs.email = "Email không hợp lệ";
    if (!createForm.phoneNumber.trim()) errs.phoneNumber = "Số điện thoại không được để trống";
    else if (!PHONE_REGEX.test(createForm.phoneNumber))
      errs.phoneNumber = "Số điện thoại không đúng định dạng";
    if (!createForm.password) errs.password = "Mật khẩu không được để trống";
    else if (createForm.password.length < 6) errs.password = "Mật khẩu tối thiểu 6 ký tự";
    return errs;
  };

  const handleCreateSubmit = async () => {
    const errs = validateCreate();
    if (Object.keys(errs).length > 0) {
      setCreateErrors(errs);
      return;
    }
    try {
      setCreating(true);
      await userService.createStaff(createForm);
      showToast("Tạo nhân viên thành công! Email xác thực đã được gửi.", "success");
      setCreateOpen(false);
      setCreateForm(EMPTY_CREATE);
      setCreateErrors({});
      fetchStaff();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Tạo nhân viên thất bại", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleCreateClose = () => {
    if (creating) return;
    setCreateOpen(false);
    setCreateForm(EMPTY_CREATE);
    setCreateErrors({});
  };

  const filtered = allStaff.filter((s) => {
    const q = search.toLowerCase();
    if (
      q &&
      !s.fullName.toLowerCase().includes(q) &&
      !s.email.toLowerCase().includes(q) &&
      !(s.userName?.toLowerCase() ?? "").includes(q) &&
      !(s.phoneNumber ?? "").includes(q)
    )
      return false;
    if (statusFilter === "active" && !s.isActive) return false;
    if (statusFilter === "inactive" && s.isActive) return false;
    return true;
  });

  const activeCount = allStaff.filter((s) => s.isActive).length;
  const inactiveCount = allStaff.length - activeCount;

  return (
    <>
      {/* Stats */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }} flexWrap="wrap">
        {[
          { label: "Tổng nhân viên", value: allStaff.length, color: "#7c3aed", borderColor: "grey.200", bg: "transparent" },
          { label: "Đang hoạt động", value: activeCount, color: "#16a34a", borderColor: "#bbf7d0", bg: "#f0fdf4" },
          { label: "Vô hiệu hóa", value: inactiveCount, color: "#dc2626", borderColor: "#fecaca", bg: "#fff5f5" },
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

      {/* Filters + Create */}
      <Paper
        elevation={0}
        sx={{ p: 2, mb: 2.5, border: "1px solid", borderColor: "grey.200", borderRadius: 2.5 }}
      >
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
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
          <Tooltip title="Tải lại">
            <IconButton onClick={fetchStaff} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={() => setCreateOpen(true)}
            sx={{ whiteSpace: "nowrap", bgcolor: "#7c3aed", "&:hover": { bgcolor: "#6d28d9" } }}
          >
            Tạo nhân viên
          </Button>
        </Stack>
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
                <TableCell>Nhân viên</TableCell>
                <TableCell>Username</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Số điện thoại</TableCell>
                <TableCell align="center">Trạng thái</TableCell>
                <TableCell align="center">Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((__, j) => (
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
                      <TableCell>
                        <Typography
                          variant="body2"
                          fontSize="0.82rem"
                          sx={{ fontFamily: "monospace", color: "text.secondary" }}
                        >
                          {staff.userName || "—"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontSize="0.82rem">
                          {staff.email}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontSize="0.82rem" color="text.secondary">
                          {staff.phoneNumber || "—"}
                        </Typography>
                      </TableCell>
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
                      <TableCell align="center">
                        {staff.isActive ? (
                          <Tooltip title="Vô hiệu hóa tài khoản">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => setConfirmTarget(staff)}
                            >
                              <BlockIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Typography variant="caption" color="text.disabled">
                            —
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} sx={{ py: 8, textAlign: "center" }}>
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
        {!loading && (
          <Box sx={{ px: 2, py: 1.5, borderTop: "1px solid", borderColor: "grey.200", bgcolor: "grey.50" }}>
            <Typography variant="caption" color="text.secondary">
              Hiển thị {filtered.length} / {allStaff.length} nhân viên
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Confirm deactivate */}
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
            Nhân viên sẽ không thể đăng nhập cho đến khi được kích hoạt lại.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button variant="outlined" onClick={() => setConfirmTarget(null)} disabled={deactivating}>
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

      {/* Create staff dialog */}
      <Dialog
        open={createOpen}
        onClose={handleCreateClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <PersonAddIcon sx={{ color: "#7c3aed" }} />
            <span>Tạo tài khoản nhân viên</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              label="Họ và tên"
              fullWidth
              required
              value={createForm.fullName}
              onChange={(e) => {
                setCreateForm((f) => ({ ...f, fullName: e.target.value }));
                setCreateErrors((errs) => ({ ...errs, fullName: undefined }));
              }}
              error={!!createErrors.fullName}
              helperText={createErrors.fullName}
            />
            <TextField
              label="Email"
              fullWidth
              required
              type="email"
              value={createForm.email}
              onChange={(e) => {
                setCreateForm((f) => ({ ...f, email: e.target.value }));
                setCreateErrors((errs) => ({ ...errs, email: undefined }));
              }}
              error={!!createErrors.email}
              helperText={createErrors.email}
            />
            <TextField
              label="Số điện thoại"
              fullWidth
              required
              placeholder="09xxxxxxxx"
              value={createForm.phoneNumber}
              onChange={(e) => {
                setCreateForm((f) => ({ ...f, phoneNumber: e.target.value }));
                setCreateErrors((errs) => ({ ...errs, phoneNumber: undefined }));
              }}
              error={!!createErrors.phoneNumber}
              helperText={createErrors.phoneNumber ?? "Định dạng: 03x, 05x, 07x, 08x, 09x"}
            />
            <TextField
              label="Mật khẩu"
              fullWidth
              required
              type="password"
              value={createForm.password}
              onChange={(e) => {
                setCreateForm((f) => ({ ...f, password: e.target.value }));
                setCreateErrors((errs) => ({ ...errs, password: undefined }));
              }}
              error={!!createErrors.password}
              helperText={createErrors.password ?? "Tối thiểu 6 ký tự"}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button variant="outlined" onClick={handleCreateClose} disabled={creating}>
            Hủy
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateSubmit}
            disabled={creating}
            startIcon={<PersonAddIcon />}
            sx={{ bgcolor: "#7c3aed", "&:hover": { bgcolor: "#6d28d9" } }}
          >
            {creating ? "Đang tạo…" : "Tạo nhân viên"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export const UserManagementPage = () => {
  const [tab, setTab] = useState(0);

  return (
    <AdminLayout>
      <Box sx={{ px: { xs: 2, md: 3 }, py: 3 }}>
        {/* Header */}
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: tab === 0 ? "primary.main" : "#7c3aed",
              color: "white",
              transition: "background-color 0.2s",
            }}
          >
            {tab === 0 ? <PeopleIcon /> : <BadgeIcon />}
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Quản lý tài khoản
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Quản lý người dùng và nhân viên
            </Typography>
          </Box>
        </Stack>

        {/* Tabs */}
        <Paper
          elevation={0}
          sx={{ border: "1px solid", borderColor: "grey.200", borderRadius: 2.5, mb: 3 }}
        >
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{
              px: 1,
              "& .MuiTab-root": { fontWeight: 600, fontSize: "0.9rem", minHeight: 48 },
            }}
          >
            <Tab
              icon={<PeopleIcon fontSize="small" />}
              iconPosition="start"
              label="Người dùng"
            />
            <Tab
              icon={<BadgeIcon fontSize="small" />}
              iconPosition="start"
              label="Nhân viên"
            />
          </Tabs>
        </Paper>

        {tab === 0 && <UsersTab />}
        {tab === 1 && <StaffTab />}
      </Box>
    </AdminLayout>
  );
};
