import { useEffect, useState } from "react";
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
} from "@mui/material";
import { AdminLayout } from "../layouts/AdminLayout";
import {
  storePolicyService,
  type UpdateStorePolicyRequest,
} from "../services/storePolicyService";
import { useToast } from "../hooks/useToast";
import { LoadingButton } from "../components/common/LoadingButton";

export const StorePolicyConfigPage = () => {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </AdminLayout>
  );
};
