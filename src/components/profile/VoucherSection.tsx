import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Chip,
  Grid,
  Divider,
  CircularProgress,
  Alert,
  Button,
  Tabs,
  Tab,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  IconButton,
} from "@mui/material";
import {
  LocalOffer,
  CheckCircle,
  HourglassEmpty,
  Redeem,
  Close,
  PersonAdd,
  AccountCircle,
} from "@mui/icons-material";
import {
  voucherService,
  type UserVoucherResponse,
  type RedeemableVoucherResponse,
} from "@/services/voucherService";
import { useToast } from "@/hooks/useToast";

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("vi-VN");
};

const formatDiscount = (
  item: UserVoucherResponse | RedeemableVoucherResponse,
) => {
  const val = Number(item.discountValue ?? 0);
  const type = (item as any).discountType;
  if (type === "Percentage" || type === 2) return `${val}%`;
  return `${val.toLocaleString("vi-VN")}đ`;
};

interface RedeemDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (receiverEmailOrPhone: string | null) => void;
  voucher: RedeemableVoucherResponse | null;
  redeeming: boolean;
}

const RedeemDialog = ({
  open,
  onClose,
  onConfirm,
  voucher,
  redeeming,
}: RedeemDialogProps) => {
  const [redeemType, setRedeemType] = useState<"self" | "gift">("self");
  const [receiverInput, setReceiverInput] = useState("");
  const [inputError, setInputError] = useState("");

  const handleRedeemTypeChange = (value: "self" | "gift") => {
    setRedeemType(value);
    setReceiverInput("");
    setInputError("");
  };

  const validateInput = () => {
    if (redeemType === "self") return true;

    if (!receiverInput.trim()) {
      setInputError("Vui lòng nhập email hoặc số điện thoại");
      return false;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // Simple phone validation (Vietnamese format)
    const phoneRegex = /^0(3[2-9]|5[6789]|7[06789]|8[0-9]|9[0-9])\d{7}$/;

    if (!emailRegex.test(receiverInput) && !phoneRegex.test(receiverInput)) {
      setInputError("Vui lòng nhập email hoặc số điện thoại hợp lệ");
      return false;
    }

    setInputError("");
    return true;
  };

  const handleConfirm = () => {
    if (!validateInput()) return;

    const receiver = redeemType === "self" ? null : receiverInput.trim();
    onConfirm(receiver);
  };

  const handleClose = () => {
    setRedeemType("self");
    setReceiverInput("");
    setInputError("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Redeem color="primary" />
          <Typography variant="h6" fontWeight={600}>
            Đổi voucher
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {voucher && (
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              mb: 3,
              borderColor: "primary.main",
              borderWidth: 1.5,
              borderRadius: 2,
              position: "relative",
              "&::before": {
                content: '""',
                position: "absolute",
                top: 0,
                left: 0,
                width: 6,
                height: "100%",
                bgcolor: "primary.main",
                borderRadius: "4px 0 0 4px",
              },
            }}
          >
            <Box sx={{ pl: 1 }}>
              <Typography variant="subtitle1" fontWeight={600} mb={0.5}>
                {voucher.code}
              </Typography>
              <Typography variant="body1" fontWeight={600} color="primary">
                Giảm {formatDiscount(voucher)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Tối thiểu:{" "}
                {voucher.minOrderValue
                  ? `${Number(voucher.minOrderValue).toLocaleString("vi-VN")}đ`
                  : "Không giới hạn"}
              </Typography>
              <Typography
                variant="caption"
                color="warning.main"
                fontWeight={600}
                sx={{ display: "block", mt: 1 }}
              >
                Chi phí: {voucher.requiredPoints?.toLocaleString("vi-VN")} điểm
              </Typography>
            </Box>
          </Paper>
        )}

        <FormControl component="fieldset" fullWidth>
          <FormLabel component="legend" sx={{ mb: 2 }}>
            Chọn cách thức đổi voucher
          </FormLabel>
          <RadioGroup
            value={redeemType}
            onChange={(e) =>
              handleRedeemTypeChange(e.target.value as "self" | "gift")
            }
          >
            <FormControlLabel
              value="self"
              control={<Radio />}
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <AccountCircle fontSize="small" color="primary" />
                  <Typography>Đổi cho bản thân</Typography>
                </Box>
              }
            />
            <FormControlLabel
              value="gift"
              control={<Radio />}
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <PersonAdd fontSize="small" color="secondary" />
                  <Typography>Tặng cho người khác</Typography>
                </Box>
              }
            />
          </RadioGroup>
        </FormControl>

        {redeemType === "gift" && (
          <TextField
            fullWidth
            label="Email hoặc số điện thoại người nhận"
            placeholder="Nhập email hoặc số điện thoại..."
            value={receiverInput}
            onChange={(e) => {
              setReceiverInput(e.target.value);
              setInputError("");
            }}
            error={!!inputError}
            helperText={inputError || "Ví dụ: user@email.com hoặc 0123456789"}
            sx={{ mt: 2 }}
            disabled={redeeming}
          />
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={handleClose} disabled={redeeming}>
          Hủy
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={redeeming}
          startIcon={redeeming ? <CircularProgress size={16} /> : <Redeem />}
        >
          {redeeming ? "Đang đổi..." : "Xác nhận đổi"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

interface VoucherCardProps {
  voucher: UserVoucherResponse;
}

const VoucherCard = ({ voucher }: VoucherCardProps) => {
  const isUsed = voucher.isUsed;
  const isExpired = voucher.isExpired;
  const inactive = isUsed || isExpired;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 2,
        opacity: inactive ? 0.6 : 1,
        borderColor: inactive ? "divider" : "primary.main",
        borderWidth: inactive ? 1 : 1.5,
        position: "relative",
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          width: 6,
          height: "100%",
          bgcolor: inactive ? "grey.400" : "primary.main",
          borderRadius: "4px 0 0 4px",
        },
      }}
    >
      <Box sx={{ pl: 1 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            mb: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <LocalOffer
              fontSize="small"
              color={inactive ? "disabled" : "primary"}
            />
            <Typography
              variant="subtitle2"
              fontWeight={700}
              fontFamily="monospace"
            >
              {voucher.code}
            </Typography>
          </Box>
          {isUsed ? (
            <Chip label="Đã dùng" size="small" color="default" />
          ) : isExpired ? (
            <Chip
              label="Hết hạn"
              size="small"
              color="error"
              variant="outlined"
            />
          ) : (
            <Chip label="Có thể dùng" size="small" color="success" />
          )}
        </Box>

        <Typography
          variant="h6"
          fontWeight={700}
          color={inactive ? "text.disabled" : "primary.main"}
        >
          Giảm {formatDiscount(voucher)}
        </Typography>

        <Typography variant="caption" color="text.secondary">
          Đơn tối thiểu:{" "}
          {voucher.minOrderValue
            ? `${Number(voucher.minOrderValue).toLocaleString("vi-VN")}đ`
            : "Không giới hạn"}
        </Typography>

        <Divider sx={{ my: 1 }} />

        <Typography variant="caption" color="text.secondary">
          HSD: {formatDate(voucher.expiryDate)}
        </Typography>
        {voucher.redeemedAt && (
          <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
            Nhận: {formatDate(voucher.redeemedAt)}
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

interface RedeemableCardProps {
  voucher: RedeemableVoucherResponse;
  onRedeem: (voucher: RedeemableVoucherResponse) => void;
  redeeming: boolean;
  balance: number;
}

const RedeemableCard = ({
  voucher,
  onRedeem,
  redeeming,
  balance,
}: RedeemableCardProps) => {
  const required = voucher.requiredPoints ?? 0;
  const canRedeem = balance >= required && !voucher.isExpired;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 2,
        borderColor: canRedeem ? "success.main" : "divider",
        borderWidth: canRedeem ? 1.5 : 1,
        position: "relative",
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          width: 6,
          height: "100%",
          bgcolor: canRedeem ? "success.main" : "grey.400",
          borderRadius: "4px 0 0 4px",
        },
      }}
    >
      <Box sx={{ pl: 1 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            mb: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <LocalOffer
              fontSize="small"
              color={canRedeem ? "success" : "disabled"}
            />
            <Typography
              variant="subtitle2"
              fontWeight={700}
              fontFamily="monospace"
            >
              {voucher.code}
            </Typography>
          </Box>
          {voucher.isExpired ? (
            <Chip
              label="Hết hạn"
              size="small"
              color="error"
              variant="outlined"
            />
          ) : (
            <Chip
              label={`Tối đa ${voucher.maxUsagePerUser ?? "∞"} lần/người`}
              size="small"
              color="info"
              variant="outlined"
            />
          )}
        </Box>

        <Typography
          variant="h6"
          fontWeight={700}
          color={canRedeem ? "success.dark" : "text.disabled"}
        >
          Giảm {formatDiscount(voucher)}
        </Typography>

        <Typography variant="caption" color="text.secondary">
          Đơn tối thiểu:{" "}
          {voucher.minOrderValue
            ? `${Number(voucher.minOrderValue).toLocaleString("vi-VN")}đ`
            : "Không giới hạn"}
        </Typography>

        <Divider sx={{ my: 1 }} />

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <HourglassEmpty
              fontSize="small"
              sx={{ color: "warning.main", fontSize: 14 }}
            />
            <Typography variant="caption" fontWeight={600} color="warning.main">
              {required.toLocaleString("vi-VN")} điểm
            </Typography>
          </Box>
          <Tooltip
            title={
              !canRedeem && balance < required
                ? `Chưa đủ điểm (cần ${required.toLocaleString("vi-VN")})`
                : ""
            }
          >
            <span>
              <Button
                size="small"
                variant="contained"
                color="success"
                startIcon={
                  redeeming ? (
                    <CircularProgress size={14} color="inherit" />
                  ) : (
                    <Redeem />
                  )
                }
                disabled={!canRedeem || redeeming}
                onClick={() => onRedeem(voucher)}
              >
                Đổi voucher
              </Button>
            </span>
          </Tooltip>
        </Box>
      </Box>
    </Paper>
  );
};

export const VoucherSection = () => {
  const { showToast } = useToast();
  const [tab, setTab] = useState(0);
  const [myVouchers, setMyVouchers] = useState<UserVoucherResponse[]>([]);
  const [redeemableVouchers, setRedeemableVouchers] = useState<
    RedeemableVoucherResponse[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [redeemDialogOpen, setRedeemDialogOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] =
    useState<RedeemableVoucherResponse | null>(null);

  const loadMyVouchers = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await voucherService.getMyVouchers({ PageSize: 50 });
      setMyVouchers(data);
    } catch (err: any) {
      setError(err.message || "Không thể tải voucher của bạn");
    } finally {
      setLoading(false);
    }
  };

  const loadRedeemable = async () => {
    setLoading(true);
    setError("");
    try {
      const redeemData = await voucherService.getRedeemableList();
      // Chỉ hiển thị voucher phải đổi điểm (không miễn phí)
      const paidVouchers = redeemData.filter(
        (v) => (v.requiredPoints ?? 0) > 0,
      );
      setRedeemableVouchers(paidVouchers);
    } catch (err: any) {
      setError(err.message || "Không thể tải danh sách voucher khả dụng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    import("@/services/loyaltyService").then(({ loyaltyService }) => {
      loyaltyService
        .getMyBalance()
        .then((d) => setBalance(d.pointBalance ?? 0))
        .catch(() => {});
    });
  }, []);

  useEffect(() => {
    if (tab === 0) loadMyVouchers();
    else loadRedeemable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const handleRedeem = async (
    voucherId: string,
    receiverEmailOrPhone: string | null,
  ) => {
    setRedeemingId(voucherId);
    try {
      // Note: You may need to modify voucherService.redeemVoucher to accept receiverEmailOrPhone parameter
      const msg = await voucherService.redeemVoucher(voucherId, {
        receiverEmailOrPhone,
      });
      showToast(msg, "success");
      // Refresh balance after redeem
      import("@/services/loyaltyService").then(({ loyaltyService }) => {
        loyaltyService
          .getMyBalance()
          .then((d) => setBalance(d.pointBalance ?? 0))
          .catch(() => {});
      });
      await loadRedeemable();
      await loadMyVouchers();
    } catch (err: any) {
      showToast(err.message || "Không thể đổi voucher", "error");
    } finally {
      setRedeemingId(null);
    }
  };

  const handleOpenRedeemDialog = (voucher: RedeemableVoucherResponse) => {
    setSelectedVoucher(voucher);
    setRedeemDialogOpen(true);
  };

  const handleCloseRedeemDialog = () => {
    setRedeemDialogOpen(false);
    setSelectedVoucher(null);
  };

  const handleConfirmRedeem = async (receiverEmailOrPhone: string | null) => {
    if (!selectedVoucher?.id) return;

    await handleRedeem(selectedVoucher.id, receiverEmailOrPhone);
    setRedeemDialogOpen(false);
    setSelectedVoucher(null);
  };

  const available = myVouchers.filter((v) => !v.isUsed && !v.isExpired);
  const used = myVouchers.filter((v) => v.isUsed || v.isExpired);

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <Typography variant="h6" fontWeight={700}>
          Kho Voucher
        </Typography>
        {balance > 0 && (
          <Chip
            icon={<CheckCircle fontSize="small" />}
            label={`${balance.toLocaleString("vi-VN")} điểm`}
            color="primary"
            size="small"
            sx={{ ml: "auto" }}
          />
        )}
      </Box>

      <Paper variant="outlined" sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
          <Tab label="Voucher của tôi" />
          <Tab label="Đổi điểm lấy voucher" />
        </Tabs>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : tab === 0 ? (
        <>
          {available.length > 0 && (
            <Box mb={3}>
              <Typography
                variant="subtitle2"
                color="success.main"
                fontWeight={600}
                mb={1.5}
              >
                Có thể sử dụng ({available.length})
              </Typography>
              <Grid container spacing={2}>
                {available.map((v) => (
                  <Grid size={{ xs: 12, sm: 6 }} key={v.id}>
                    <VoucherCard voucher={v} />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {used.length > 0 && (
            <Box>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                fontWeight={600}
                mb={1.5}
              >
                Đã dùng / Hết hạn ({used.length})
              </Typography>
              <Grid container spacing={2}>
                {used.map((v) => (
                  <Grid size={{ xs: 12, sm: 6 }} key={v.id}>
                    <VoucherCard voucher={v} />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {myVouchers.length === 0 && (
            <Box py={6} textAlign="center">
              <LocalOffer
                sx={{ fontSize: 48, color: "text.disabled", mb: 1 }}
              />
              <Typography color="text.secondary">
                Bạn chưa có voucher nào.
              </Typography>
              <Button
                variant="text"
                size="small"
                onClick={() => setTab(1)}
                sx={{ mt: 1 }}
              >
                Đổi điểm lấy voucher
              </Button>
            </Box>
          )}
        </>
      ) : (
        <>
          {redeemableVouchers.length > 0 ? (
            <Box mb={3}>
              <Typography
                variant="subtitle2"
                color="warning.main"
                fontWeight={600}
                mb={1.5}
              >
                Đổi điểm lấy voucher ({redeemableVouchers.length})
              </Typography>
              <Grid container spacing={2}>
                {redeemableVouchers.map((v) => (
                  <Grid size={{ xs: 12, sm: 6 }} key={v.id}>
                    <RedeemableCard
                      voucher={v}
                      onRedeem={handleOpenRedeemDialog}
                      redeeming={redeemingId === v.id}
                      balance={balance}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          ) : (
            <Box py={6} textAlign="center">
              <Redeem sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
              <Typography color="text.secondary">
                Chưa có voucher nào để đổi.
              </Typography>
            </Box>
          )}
        </>
      )}

      <RedeemDialog
        open={redeemDialogOpen}
        onClose={handleCloseRedeemDialog}
        onConfirm={handleConfirmRedeem}
        voucher={selectedVoucher}
        redeeming={redeemingId === selectedVoucher?.id}
      />
    </Box>
  );
};
