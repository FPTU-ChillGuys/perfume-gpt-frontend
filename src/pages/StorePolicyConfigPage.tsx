import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Typography,
  Switch,
  Divider,
  InputAdornment,
  Alert,
  Paper,
  TextField,
  FormControlLabel,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Stack,
  Tooltip,
  IconButton,
  CircularProgress,
} from "@mui/material";
import {
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Article as ArticleIcon,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "../layouts/AdminLayout";
import {
  storePolicyService,
  type UpdateStorePolicyRequest,
} from "../services/storePolicyService";
import { pageService, type StaticPage } from "../services/pageService";
import { useToast } from "../hooks/useToast";
import { LoadingButton } from "../components/common/LoadingButton";

export const StorePolicyConfigPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Static Pages state ─────────────────────────────────────────────────────
  const [staticPages, setStaticPages] = useState<StaticPage[]>([]);
  const [staticPagesLoading, setStaticPagesLoading] = useState(true);

  const loadStaticPages = useCallback(async () => {
    setStaticPagesLoading(true);
    try {
      const result = await pageService.getPages({ PageSize: 100 });
      setStaticPages(result.items);
    } catch {
      // non-fatal: list may be empty on first use
    } finally {
      setStaticPagesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStaticPages();
  }, [loadStaticPages]);

  const handleDeletePage = async (slug: string) => {
    try {
      await pageService.deletePage(slug);
      showToast("Đã xóa trang", "success");
      void loadStaticPages();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Không thể xóa trang",
        "error",
      );
    }
  };

  const handlePublishPage = async (
    slug: string,
    currentlyPublished: boolean,
  ) => {
    try {
      await pageService.publishPage(slug);
      showToast(
        currentlyPublished ? "Đã chuyển về bản nháp" : "Đã công bố trang",
        "success",
      );
      void loadStaticPages();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Không thể thay đổi trạng thái",
        "error",
      );
    }
  };
  // ──────────────────────────────────────────────────────────────────────────

  const [formData, setFormData] = useState<UpdateStorePolicyRequest>({
    requiredDepositPercentage: 0,
    depositTimeoutMinutes: 0,
    isDepositRequiredForCOD: false,
    reviewRewardPoints: 0,
    stockAdjustmentAutoApprovalThreshold: 0,
    orderRewardPointsInDays: 0,
    batchExpiringSoonThresholdInDays: 0,
    stopSellingBeforeExpiryDays: 0,
    clearanceBufferDays: 0,
    returnOrderAllowanceInDays: 0,
    maxAddressesPerUser: 0,
    newTagThresholdInDays: 0,
  });

  const loadPolicy = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await storePolicyService.getCurrentPolicy();
      setFormData({
        requiredDepositPercentage: data.requiredDepositPercentage ?? 0,
        depositTimeoutMinutes: data.depositTimeoutMinutes ?? 0,
        isDepositRequiredForCOD: data.isDepositRequiredForCOD ?? false,
        reviewRewardPoints: data.reviewRewardPoints ?? 0,
        stockAdjustmentAutoApprovalThreshold:
          data.stockAdjustmentAutoApprovalThreshold ?? 0,
        orderRewardPointsInDays: data.orderRewardPointsInDays ?? 0,
        batchExpiringSoonThresholdInDays:
          data.batchExpiringSoonThresholdInDays ?? 0,
        stopSellingBeforeExpiryDays: data.stopSellingBeforeExpiryDays ?? 0,
        clearanceBufferDays: data.clearanceBufferDays ?? 0,
        returnOrderAllowanceInDays: data.returnOrderAllowanceInDays ?? 0,
        maxAddressesPerUser: data.maxAddressesPerUser ?? 0,
        newTagThresholdInDays: data.newTagThresholdInDays ?? 0,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể tải cấu hình chính sách",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPolicy();
  }, []);

  const handleChange = (field: keyof UpdateStorePolicyRequest, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await storePolicyService.updatePolicy(formData);
      showToast("Lưu cấu hình chính sách thành công", "success");
      await loadPolicy(); // Reload để có id hoặc data update mới nhất
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Lỗi khi lưu cấu hình",
        "error",
      );
      setError(err instanceof Error ? err.message : "Lỗi khi lưu cấu hình");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <Typography>Đang tải cấu hình...</Typography>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Box sx={{ px: { xs: 2, md: 3 }, py: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5" fontWeight={700}>
            Cấu hình Chính sách Cửa hàng
          </Typography>
          <LoadingButton
            variant="contained"
            color="primary"
            onClick={handleSave}
            loading={isSaving}
          >
            Lưu thay đổi
          </LoadingButton>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2}>
          {/* Nhóm Đặt cọc & Thanh toán */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 2, height: "100%", borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} mb={1}>
                Thanh toán & Đặt cọc
              </Typography>
              <Divider sx={{ mb: 1.5 }} />
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.isDepositRequiredForCOD}
                        onChange={(e) =>
                          handleChange("isDepositRequiredForCOD", e.target.checked)
                        }
                      />
                    }
                    label="Yêu cầu đặt cọc cho đơn COD"
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Tỷ lệ đặt cọc yêu cầu"
                    type="number"
                    value={formData.requiredDepositPercentage}
                    onChange={(e) =>
                      handleChange(
                        "requiredDepositPercentage",
                        Number(e.target.value),
                      )
                    }
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      inputProps: { min: 0, max: 100 },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Thời hạn đặt cọc/thanh toán"
                    type="number"
                    value={formData.depositTimeoutMinutes}
                    onChange={(e) =>
                      handleChange("depositTimeoutMinutes", Number(e.target.value))
                    }
                    InputProps={{
                      endAdornment: <InputAdornment position="end">phút</InputAdornment>,
                      inputProps: { min: 1 },
                    }}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Nhóm Đổi trả & Điểm thưởng */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 2, height: "100%", borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} mb={1}>
                Đổi trả & Điểm thưởng
              </Typography>
              <Divider sx={{ mb: 1.5 }} />
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Thời hạn đổi trả hàng"
                    type="number"
                    value={formData.returnOrderAllowanceInDays}
                    onChange={(e) =>
                      handleChange(
                        "returnOrderAllowanceInDays",
                        Number(e.target.value),
                      )
                    }
                    InputProps={{
                      endAdornment: <InputAdornment position="end">ngày</InputAdornment>,
                      inputProps: { min: 0 },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Thời gian cộng điểm đơn hàng"
                    type="number"
                    value={formData.orderRewardPointsInDays}
                    onChange={(e) =>
                      handleChange("orderRewardPointsInDays", Number(e.target.value))
                    }
                    InputProps={{
                      endAdornment: <InputAdornment position="end">ngày</InputAdornment>,
                      inputProps: { min: 0 },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Điểm thưởng khi đánh giá"
                    type="number"
                    value={formData.reviewRewardPoints}
                    onChange={(e) =>
                      handleChange("reviewRewardPoints", Number(e.target.value))
                    }
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">điểm</InputAdornment>
                      ),
                      inputProps: { min: 0 },
                    }}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Nhóm Tồn kho & Hạn sử dụng */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 2, height: "100%", borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} mb={1}>
                Tồn kho & Hạn sử dụng (Date)
              </Typography>
              <Divider sx={{ mb: 1.5 }} />
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Ngưỡng cảnh báo cận Date"
                    type="number"
                    value={formData.batchExpiringSoonThresholdInDays}
                    onChange={(e) =>
                      handleChange(
                        "batchExpiringSoonThresholdInDays",
                        Number(e.target.value),
                      )
                    }
                    InputProps={{
                      endAdornment: <InputAdornment position="end">ngày</InputAdornment>,
                      inputProps: { min: 0 },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Dừng bán trước hạn"
                    type="number"
                    value={formData.stopSellingBeforeExpiryDays}
                    onChange={(e) =>
                      handleChange(
                        "stopSellingBeforeExpiryDays",
                        Number(e.target.value),
                      )
                    }
                    InputProps={{
                      endAdornment: <InputAdornment position="end">ngày</InputAdornment>,
                      inputProps: { min: 0 },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Khoảng thời gian thanh lý"
                    type="number"
                    value={formData.clearanceBufferDays}
                    onChange={(e) =>
                      handleChange("clearanceBufferDays", Number(e.target.value))
                    }
                    InputProps={{
                      endAdornment: <InputAdornment position="end">ngày</InputAdornment>,
                      inputProps: { min: 0 },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Tự động duyệt lệch kho"
                    type="number"
                    value={formData.stockAdjustmentAutoApprovalThreshold}
                    onChange={(e) =>
                      handleChange(
                        "stockAdjustmentAutoApprovalThreshold",
                        Number(e.target.value),
                      )
                    }
                    InputProps={{
                      inputProps: { min: 0 },
                    }}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Nhóm Cấu hình Khác */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 2, height: "100%", borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} mb={1}>
                Khác
              </Typography>
              <Divider sx={{ mb: 1.5 }} />
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Số địa chỉ tối đa/Người dùng"
                    type="number"
                    value={formData.maxAddressesPerUser}
                    onChange={(e) =>
                      handleChange("maxAddressesPerUser", Number(e.target.value))
                    }
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">địa chỉ</InputAdornment>
                      ),
                      inputProps: { min: 1 },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Thời gian gắn nhãn 'Mới'"
                    type="number"
                    value={formData.newTagThresholdInDays}
                    onChange={(e) =>
                      handleChange("newTagThresholdInDays", Number(e.target.value))
                    }
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">ngày</InputAdornment>
                      ),
                      inputProps: { min: 0 },
                    }}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Nhóm Trang nội dung tĩnh */}
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", sm: "center" }}
                spacing={2}
                sx={{ mb: 2 }}
              >
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Trang nội dung tĩnh
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tạo các trang như Chính sách, Về chúng tôi, Hướng dẫn mua
                    hàng...
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<RefreshIcon />}
                    onClick={() => void loadStaticPages()}
                  >
                    Làm mới
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<ArticleIcon />}
                    onClick={() => navigate("/admin/content/new-page")}
                  >
                    Tạo trang mới
                  </Button>
                </Stack>
              </Stack>

              {staticPagesLoading ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress size={32} />
                </Box>
              ) : staticPages.length === 0 ? (
                <Alert severity="info">
                  Chưa có trang nào. Hãy tạo trang đầu tiên!
                </Alert>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Tiêu đề</TableCell>
                        <TableCell>Slug</TableCell>
                        <TableCell align="center">Trạng thái</TableCell>
                        <TableCell>Cập nhật</TableCell>
                        <TableCell align="right">Thao tác</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {staticPages.map((page) => (
                        <TableRow key={page.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {page.title}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography
                              variant="caption"
                              sx={{
                                fontFamily: "monospace",
                                color: "primary.main",
                              }}
                            >
                              /pages/{page.slug}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={page.isPublished ? "Công khai" : "Bản nháp"}
                              size="small"
                              color={page.isPublished ? "success" : "default"}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">
                              {page.updatedAt
                                ? new Date(page.updatedAt).toLocaleDateString(
                                    "vi-VN",
                                  )
                                : "-"}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Stack
                              direction="row"
                              spacing={0.5}
                              justifyContent="flex-end"
                            >
                              <Tooltip
                                title={
                                  page.isPublished ? "Chuyển về nháp" : "Công bố"
                                }
                              >
                                <IconButton
                                  size="small"
                                  color={
                                    page.isPublished ? "success" : "default"
                                  }
                                  onClick={() =>
                                    void handlePublishPage(
                                      page.slug,
                                      page.isPublished,
                                    )
                                  }
                                >
                                  {page.isPublished ? (
                                    <ToggleOnIcon fontSize="small" />
                                  ) : (
                                    <ToggleOffIcon fontSize="small" />
                                  )}
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Chỉnh sửa">
                                <IconButton
                                  size="small"
                                  onClick={() =>
                                    navigate(
                                      `/admin/content/pages/${page.slug}/edit`,
                                    )
                                  }
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Xóa">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => void handleDeletePage(page.slug)}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </Grid>

          {/* Nhóm Nội dung hướng dẫn (Policy) */}

          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Nội dung hướng dẫn (Policy)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Quản lý các nội dung hệ thống như Hướng dẫn sử dụng, Chính sách vận chuyển...
                </Typography>
              </Box>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Tên nội dung</TableCell>
                      <TableCell>Mã định danh</TableCell>
                      <TableCell align="right">Thao tác</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[
                      { code: "USAGE_STORAGE", name: "Hướng dẫn Sử dụng & Bảo quản" },
                      { code: "SHIPPING_RETURN", name: "Chính sách Vận chuyển & Đổi trả" },
                    ].map((policy) => (
                      <TableRow key={policy.code} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {policy.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={policy.code}
                            size="small"
                            variant="outlined"
                            sx={{ fontFamily: "monospace", fontSize: "0.7rem" }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            startIcon={<EditIcon fontSize="small" />}
                            onClick={() => navigate(`/admin/content/policies/${policy.code}/edit`)}
                          >
                            Chỉnh sửa
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </AdminLayout>
  );
};
