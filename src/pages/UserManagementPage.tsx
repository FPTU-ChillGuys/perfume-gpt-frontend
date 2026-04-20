import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
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
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
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
  EmojiEvents as PointsIcon,
  History as HistoryIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Close as CloseIcon,
  TrendingUp as EarnIcon,
  TrendingDown as SpendIcon,
} from "@mui/icons-material";
import { AdminLayout } from "@/layouts/AdminLayout";
import { userService } from "@/services/userService";
import { loyaltyService, type LoyaltyHistoryItem } from "@/services/loyaltyService";
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

const formatDateTime = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const PHONE_REGEX = /^(0)(3[2-9]|5[6789]|7[06789]|8[0-9]|9[0-9])[0-9]{7}$/;

// ---------------------------------------------------------------------------
// Sub-component: Users tab
// ---------------------------------------------------------------------------
function UsersTab() {
  const { showToast } = useToast();

  // --- Loyalty drawer state ---
  const [loyaltyUser, setLoyaltyUser] = useState<UserManageItem | null>(null);
  const [historyItems, setHistoryItems] = useState<LoyaltyHistoryItem[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(0);
  const [historyPageSize] = useState(8);
  const [historyTypeFilter, setHistoryTypeFilter] = useState<"" | "Earn" | "Spend">("");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // --- Adjust points (inline in drawer) ---
  const [pointsType, setPointsType] = useState<"Earn" | "Spend">("Earn");
  const [pointsAmount, setPointsAmount] = useState("");
  const [pointsReason, setPointsReason] = useState("");
  const [pointsErrors, setPointsErrors] = useState<{ amount?: string; reason?: string }>({});
  const [pointsSaving, setPointsSaving] = useState(false);

  const loadHistory = useCallback(
    async (user: UserManageItem, page: number, type: "" | "Earn" | "Spend") => {
      try {
        setHistoryLoading(true);
        setHistoryError(null);
        const result = await loyaltyService.getUserHistory(
          user.id,
          page + 1,
          historyPageSize,
          type || undefined,
        );
        setHistoryItems(result.items);
        setHistoryTotal(result.totalCount);
      } catch (err) {
        setHistoryError(err instanceof Error ? err.message : "Không thể tải lịch sử");
      } finally {
        setHistoryLoading(false);
      }
    },
    [historyPageSize],
  );

  const openLoyaltyDrawer = (user: UserManageItem) => {
    setLoyaltyUser(user);
    setHistoryPage(0);
    setHistoryTypeFilter("");
    setPointsType("Earn");
    setPointsAmount("");
    setPointsReason("");
    setPointsErrors({});
    loadHistory(user, 0, "");
  };

  const closeLoyaltyDrawer = () => {
    setLoyaltyUser(null);
    setHistoryItems([]);
  };

  const handlePointsSubmit = async () => {
    if (!loyaltyUser) return;
    const errs: typeof pointsErrors = {};
    const amt = parseInt(pointsAmount, 10);
    if (!pointsAmount || isNaN(amt) || amt <= 0) errs.amount = "Số điểm phải lớn hơn 0";
    if (!pointsReason.trim()) errs.reason = "Lý do không được để trống";
    if (Object.keys(errs).length > 0) { setPointsErrors(errs); return; }

    try {
      setPointsSaving(true);
      await loyaltyService.manualChange(loyaltyUser.id, amt, pointsType, pointsReason.trim());
      showToast(
        `${pointsType === "Earn" ? "Cộng" : "Trừ"} ${amt} điểm cho ${loyaltyUser.fullName} thành công`,
        "success",
      );
      setPointsAmount("");
      setPointsReason("");
      setPointsErrors({});
      loadHistory(loyaltyUser, historyPage, historyTypeFilter);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Thao tác thất bại", "error");
    } finally {
      setPointsSaving(false);
    }
  };
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
                <TableCell align="center">Thao tác</TableCell>              </TableRow>
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
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <Tooltip title={user.isActive ? "Lịch sử & Điều chỉnh điểm" : "Tài khoản đã bị vô hiệu hóa"}>
                            <span>
                              <IconButton
                                size="small"
                                disabled={!user.isActive}
                                sx={{ color: user.isActive ? "#7c3aed" : undefined }}
                                onClick={() => openLoyaltyDrawer(user)}
                              >
                                <HistoryIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title={user.isActive ? "Điều chỉnh điểm" : "Tài khoản đã bị vô hiệu hóa"}>
                            <span>
                              <IconButton
                                size="small"
                                disabled={!user.isActive}
                                sx={{ color: user.isActive ? "#0891b2" : undefined }}
                                onClick={() => openLoyaltyDrawer(user)}
                              >
                                <PointsIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
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
                            <IconButton size="small" disabled>
                              <BlockIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Stack>
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

      {/* ------------------------------------------------------------------ */}
      {/* Loyalty drawer — two-panel (history | adjust form)                   */}
      {/* ------------------------------------------------------------------ */}
      <Drawer
        anchor="right"
        open={!!loyaltyUser}
        onClose={closeLoyaltyDrawer}
        PaperProps={{ sx: { width: { xs: "100%", sm: 820 } } }}
      >
        {loyaltyUser && (
          <Stack sx={{ height: "100%" }}>
            {/* Header */}
            <Stack
              direction="row"
              alignItems="center"
              spacing={2}
              sx={{
                px: 3,
                py: 2,
                flexShrink: 0,
                background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)",
                color: "white",
              }}
            >
              <Avatar
                src={loyaltyUser.profileImageUrl ?? undefined}
                sx={{ width: 40, height: 40, bgcolor: "rgba(255,255,255,0.2)", fontWeight: 700 }}
              >
                {getInitials(loyaltyUser.fullName)}
              </Avatar>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="subtitle1" fontWeight={700} noWrap>
                    {loyaltyUser.fullName}
                  </Typography>
                  {!loyaltyUser.isActive && (
                    <Chip
                      label="Vô hiệu"
                      size="small"
                      sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white", fontWeight: 600, fontSize: "0.7rem", height: 20 }}
                    />
                  )}
                </Stack>
                <Typography variant="caption" sx={{ opacity: 0.85 }}>
                  {loyaltyUser.email}
                </Typography>
              </Box>
              <IconButton size="small" sx={{ color: "white" }} onClick={closeLoyaltyDrawer}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>

            {/* Two-column body */}
            <Stack direction="row" sx={{ flexGrow: 1, overflow: "hidden" }}>

              {/* ---- LEFT: History ---- */}
              <Stack sx={{ flex: 1, overflow: "hidden", borderRight: "1px solid", borderColor: "divider" }}>
                {/* Filter */}
                <Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "grey.100", flexShrink: 0 }}>
                  <ToggleButtonGroup
                    size="small"
                    value={historyTypeFilter}
                    exclusive
                    onChange={(_, v) => {
                      const next = v ?? "";
                      setHistoryTypeFilter(next);
                      setHistoryPage(0);
                      loadHistory(loyaltyUser, 0, next);
                    }}
                  >
                    <ToggleButton value="">Tất cả</ToggleButton>
                    <ToggleButton value="Earn" sx={{ color: "#16a34a" }}>
                      <EarnIcon fontSize="small" sx={{ mr: 0.5 }} /> Cộng
                    </ToggleButton>
                    <ToggleButton value="Spend" sx={{ color: "#dc2626" }}>
                      <SpendIcon fontSize="small" sx={{ mr: 0.5 }} /> Trừ
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>

                {/* List */}
                <Box sx={{ flexGrow: 1, overflow: "auto", px: 2, py: 1.5 }}>
                  {historyLoading ? (
                    <Stack spacing={1.5}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} variant="rounded" height={64} />
                      ))}
                    </Stack>
                  ) : historyError ? (
                    <Alert severity="error">{historyError}</Alert>
                  ) : historyItems.length === 0 ? (
                    <Box sx={{ textAlign: "center", py: 6 }}>
                      <HistoryIcon sx={{ fontSize: 40, color: "grey.300", mb: 1 }} />
                      <Typography color="text.secondary" variant="body2">Chưa có giao dịch nào</Typography>
                    </Box>
                  ) : (
                    <Stack spacing={1}>
                      {historyItems.map((item, idx) => {
                        const isEarn = item.transactionType === "Earn";
                        return (
                          <Paper
                            key={item.id ?? idx}
                            elevation={0}
                            sx={{
                              p: 1.5,
                              border: "1px solid",
                              borderColor: isEarn ? "#bbf7d0" : "#fecaca",
                              borderRadius: 2,
                              bgcolor: isEarn ? "#f0fdf4" : "#fff5f5",
                              display: "flex",
                              alignItems: "center",
                              gap: 1.5,
                            }}
                          >
                            <Box
                              sx={{
                                width: 32,
                                height: 32,
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                bgcolor: isEarn ? "#dcfce7" : "#fee2e2",
                                flexShrink: 0,
                              }}
                            >
                              {isEarn ? (
                                <AddIcon sx={{ color: "#16a34a", fontSize: 16 }} />
                              ) : (
                                <RemoveIcon sx={{ color: "#dc2626", fontSize: 16 }} />
                              )}
                            </Box>
                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                              <Typography
                                variant="body2"
                                fontWeight={600}
                                sx={{ color: isEarn ? "#15803d" : "#b91c1c", fontSize: "0.82rem" }}
                              >
                                {isEarn ? "+" : "-"}{Math.abs(item.pointsChanged ?? 0)} điểm
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block" noWrap>
                                {item.reason || "—"}
                              </Typography>
                            </Box>
                            <Typography variant="caption" color="text.disabled" sx={{ whiteSpace: "nowrap", flexShrink: 0, fontSize: "0.7rem" }}>
                              {formatDateTime(item.createdAt ?? null)}
                            </Typography>
                          </Paper>
                        );
                      })}
                    </Stack>
                  )}
                </Box>

                {/* Pagination */}
                {historyTotal > historyPageSize && (
                  <Box sx={{ borderTop: "1px solid", borderColor: "grey.200", flexShrink: 0 }}>
                    <TablePagination
                      component="div"
                      count={historyTotal}
                      page={historyPage}
                      rowsPerPage={historyPageSize}
                      rowsPerPageOptions={[historyPageSize]}
                      onPageChange={(_, p) => {
                        setHistoryPage(p);
                        loadHistory(loyaltyUser, p, historyTypeFilter);
                      }}
                      labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
                    />
                  </Box>
                )}
              </Stack>

              {/* ---- RIGHT: Adjust points form ---- */}
              <Box
                sx={{
                  width: 300,
                  flexShrink: 0,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "auto",
                  opacity: loyaltyUser.isActive ? 1 : 0.45,
                  pointerEvents: loyaltyUser.isActive ? "auto" : "none",
                }}
              >
                <Box sx={{ px: 2.5, pt: 2, pb: 1, borderBottom: "1px solid", borderColor: "grey.100" }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <PointsIcon sx={{ color: "#7c3aed", fontSize: 18 }} />
                    <Typography variant="subtitle2" fontWeight={700}>
                      Điều chỉnh điểm
                    </Typography>
                  </Stack>
                  {!loyaltyUser.isActive && (
                    <Typography variant="caption" color="error.main" sx={{ display: "block", mt: 0.5 }}>
                      Tài khoản bị vô hiệu — không thể điều chỉnh
                    </Typography>
                  )}
                </Box>

                <Stack spacing={2} sx={{ p: 2.5, flexGrow: 1 }}>
                  <ToggleButtonGroup
                    fullWidth
                    exclusive
                    value={pointsType}
                    onChange={(_, v) => v && setPointsType(v)}
                    size="small"
                  >
                    <ToggleButton
                      value="Earn"
                      sx={{
                        flex: 1,
                        fontWeight: 600,
                        fontSize: "0.78rem",
                        "&.Mui-selected": { bgcolor: "#dcfce7", color: "#15803d", borderColor: "#86efac" },
                      }}
                    >
                      <AddIcon fontSize="small" sx={{ mr: 0.5 }} /> Cộng
                    </ToggleButton>
                    <ToggleButton
                      value="Spend"
                      sx={{
                        flex: 1,
                        fontWeight: 600,
                        fontSize: "0.78rem",
                        "&.Mui-selected": { bgcolor: "#fee2e2", color: "#b91c1c", borderColor: "#fca5a5" },
                      }}
                    >
                      <RemoveIcon fontSize="small" sx={{ mr: 0.5 }} /> Trừ
                    </ToggleButton>
                  </ToggleButtonGroup>

                  <TextField
                    label="Số điểm"
                    fullWidth
                    size="small"
                    type="number"
                    value={pointsAmount}
                    onChange={(e) => {
                      setPointsAmount(e.target.value);
                      setPointsErrors((prev) => ({ ...prev, amount: undefined }));
                    }}
                    error={!!pointsErrors.amount}
                    helperText={pointsErrors.amount}
                    slotProps={{ htmlInput: { min: 1 } }}
                  />

                  <TextField
                    label="Lý do"
                    fullWidth
                    size="small"
                    multiline
                    rows={3}
                    placeholder="Nhập lý do điều chỉnh…"
                    value={pointsReason}
                    onChange={(e) => {
                      setPointsReason(e.target.value);
                      setPointsErrors((prev) => ({ ...prev, reason: undefined }));
                    }}
                    error={!!pointsErrors.reason}
                    helperText={pointsErrors.reason}
                  />

                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handlePointsSubmit}
                    disabled={pointsSaving}
                    startIcon={pointsType === "Earn" ? <AddIcon /> : <RemoveIcon />}
                    sx={{
                      bgcolor: pointsType === "Earn" ? "#16a34a" : "#dc2626",
                      "&:hover": { bgcolor: pointsType === "Earn" ? "#15803d" : "#b91c1c" },
                      fontWeight: 600,
                    }}
                  >
                    {pointsSaving ? "Đang xử lý…" : pointsType === "Earn" ? "Cộng điểm" : "Trừ điểm"}
                  </Button>
                </Stack>
              </Box>
            </Stack>
          </Stack>
        )}
      </Drawer>

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
