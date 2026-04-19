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
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
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

      <DialogContent sx={{ pt: 1, pb: 2 }}>
        {voucher && (
          <Box
            sx={{
              display: "flex",
              mb: 3,
              borderRadius: 2,
              overflow: "hidden",
              border: "1.5px solid",
              borderColor: "primary.main",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
          >
            {/* Left red panel */}
            <Box
              sx={{
                width: 56,
                minWidth: 56,
                bgcolor: "primary.main",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                gap: 0.5,
                py: 2,
              }}
            >
              <Redeem sx={{ fontSize: 22 }} />
              <Typography
                variant="caption"
                sx={{
                  writingMode: "vertical-rl",
                  transform: "rotate(180deg)",
                  fontSize: 9,
                  letterSpacing: 1,
                  opacity: 0.9,
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                VOUCHER
              </Typography>
            </Box>

            {/* Dashed separator */}
            <Box
              sx={{
                width: 0,
                borderLeft: "2px dashed",
                borderColor: "primary.light",
                my: 1,
              }}
            />

            {/* Right content */}
            <Box sx={{ flex: 1, px: 2, py: 1.5 }}>
              <Typography
                variant="subtitle2"
                fontWeight={700}
                letterSpacing={1}
              >
                {voucher.code}
              </Typography>
              <Typography
                variant="h6"
                fontWeight={800}
                color="primary.main"
                sx={{ lineHeight: 1.2, my: 0.5 }}
              >
                Giảm {formatDiscount(voucher)}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                Đơn tối thiểu:{" "}
                {voucher.minOrderValue
                  ? `${Number(voucher.minOrderValue).toLocaleString("vi-VN")}đ`
                  : "Không giới hạn"}
              </Typography>
              <Chip
                label={`${voucher.requiredPoints?.toLocaleString("vi-VN")} điểm`}
                size="small"
                color="warning"
                sx={{ mt: 1, fontWeight: 700, fontSize: 11 }}
              />
            </Box>
          </Box>
        )}

        {/* Method selection */}
        <Typography
          variant="body2"
          color="text.secondary"
          mb={1.5}
          fontWeight={500}
        >
          Chọn cách thức đổi
        </Typography>
        <Box sx={{ display: "flex", gap: 1.5, mb: 2 }}>
          <Box
            onClick={() => !redeeming && handleRedeemTypeChange("self")}
            sx={{
              flex: 1,
              border: "2px solid",
              borderColor: redeemType === "self" ? "primary.main" : "divider",
              borderRadius: 2,
              p: 1.5,
              cursor: "pointer",
              textAlign: "center",
              bgcolor: redeemType === "self" ? "primary.50" : "transparent",
              transition: "all 0.15s",
              "&:hover": { borderColor: "primary.main" },
            }}
          >
            <AccountCircle
              sx={{
                fontSize: 28,
                color: redeemType === "self" ? "primary.main" : "text.disabled",
                mb: 0.5,
              }}
            />
            <Typography
              variant="caption"
              fontWeight={600}
              display="block"
              color={redeemType === "self" ? "primary.main" : "text.secondary"}
            >
              Cho bản thân
            </Typography>
          </Box>
          <Box
            onClick={() => !redeeming && handleRedeemTypeChange("gift")}
            sx={{
              flex: 1,
              border: "2px solid",
              borderColor: redeemType === "gift" ? "secondary.main" : "divider",
              borderRadius: 2,
              p: 1.5,
              cursor: "pointer",
              textAlign: "center",
              bgcolor: redeemType === "gift" ? "secondary.50" : "transparent",
              transition: "all 0.15s",
              "&:hover": { borderColor: "secondary.main" },
            }}
          >
            <PersonAdd
              sx={{
                fontSize: 28,
                color:
                  redeemType === "gift" ? "secondary.main" : "text.disabled",
                mb: 0.5,
              }}
            />
            <Typography
              variant="caption"
              fontWeight={600}
              display="block"
              color={
                redeemType === "gift" ? "secondary.main" : "text.secondary"
              }
            >
              Tặng người khác
            </Typography>
          </Box>
        </Box>

        {redeemType === "gift" && (
          <TextField
            fullWidth
            size="small"
            label="Email hoặc số điện thoại người nhận"
            placeholder="Nhập email hoặc số điện thoại..."
            value={receiverInput}
            onChange={(e) => {
              setReceiverInput(e.target.value);
              setInputError("");
            }}
            error={!!inputError}
            helperText={inputError || "Ví dụ: user@email.com hoặc 0912345678"}
            disabled={redeeming}
          />
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 0, gap: 1 }}>
        <Button onClick={handleClose} disabled={redeeming} sx={{ flex: 1 }}>
          Hủy
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={redeeming}
          startIcon={redeeming ? <CircularProgress size={16} /> : <Redeem />}
          sx={{ flex: 2 }}
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
  const accentColor = inactive ? "grey.400" : "primary.main";
  const borderColor = inactive ? "divider" : "primary.main";

  return (
    <Box
      sx={{
        display: "flex",
        borderRadius: 2,
        overflow: "hidden",
        border: "1.5px solid",
        borderColor,
        opacity: inactive ? 0.65 : 1,
        boxShadow: inactive ? "none" : "0 2px 8px rgba(0,0,0,0.07)",
      }}
    >
      {/* Left panel */}
      <Box
        sx={{
          width: 48,
          minWidth: 48,
          bgcolor: accentColor,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          gap: 0.5,
          py: 2,
        }}
      >
        <LocalOffer sx={{ fontSize: 18 }} />
        <Typography
          variant="caption"
          sx={{
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
            fontSize: 8,
            letterSpacing: 1,
            opacity: 0.9,
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          VOUCHER
        </Typography>
      </Box>

      {/* Dashed separator */}
      <Box
        sx={{
          width: 0,
          borderLeft: "2px dashed",
          borderColor: inactive ? "grey.300" : "primary.light",
          my: 1,
        }}
      />

      {/* Right content */}
      <Box sx={{ flex: 1, px: 1.5, py: 1.25 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            mb: 0.5,
          }}
        >
          <Typography variant="subtitle2" fontWeight={700} letterSpacing={0.5}>
            {voucher.code}
          </Typography>
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
            <Chip label="Khả dụng" size="small" color="success" />
          )}
        </Box>

        <Typography
          variant="h6"
          fontWeight={800}
          color={inactive ? "text.disabled" : "primary.main"}
          sx={{ lineHeight: 1.2 }}
        >
          Giảm {formatDiscount(voucher)}
        </Typography>

        <Typography variant="caption" color="text.secondary" display="block">
          Đơn tối thiểu:{" "}
          {voucher.minOrderValue
            ? `${Number(voucher.minOrderValue).toLocaleString("vi-VN")}đ`
            : "Không giới hạn"}
        </Typography>

        <Divider sx={{ my: 0.75 }} />

        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
          <Typography variant="caption" color="text.secondary">
            HSD: {formatDate(voucher.expiryDate)}
          </Typography>
          {voucher.redeemedAt && (
            <Typography variant="caption" color="text.secondary">
              Nhận: {formatDate(voucher.redeemedAt)}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
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
  const accentColor = canRedeem ? "success.main" : "grey.400";
  const borderColor = canRedeem ? "success.main" : "divider";

  return (
    <Box
      sx={{
        display: "flex",
        borderRadius: 2,
        overflow: "hidden",
        border: "1.5px solid",
        borderColor,
        boxShadow: canRedeem ? "0 2px 8px rgba(0,0,0,0.07)" : "none",
      }}
    >
      {/* Left panel */}
      <Box
        sx={{
          width: 48,
          minWidth: 48,
          bgcolor: accentColor,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          gap: 0.5,
          py: 2,
        }}
      >
        <Redeem sx={{ fontSize: 18 }} />
        <Typography
          variant="caption"
          sx={{
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
            fontSize: 8,
            letterSpacing: 1,
            opacity: 0.9,
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          ĐỔI ĐIỂM
        </Typography>
      </Box>

      {/* Dashed separator */}
      <Box
        sx={{
          width: 0,
          borderLeft: "2px dashed",
          borderColor: canRedeem ? "success.light" : "grey.300",
          my: 1,
        }}
      />

      {/* Right content */}
      <Box sx={{ flex: 1, px: 1.5, py: 1.25 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            mb: 0.5,
          }}
        >
          <Typography variant="subtitle2" fontWeight={700} letterSpacing={0.5}>
            {voucher.code}
          </Typography>
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
          fontWeight={800}
          color={canRedeem ? "success.dark" : "text.disabled"}
          sx={{ lineHeight: 1.2 }}
        >
          Giảm {formatDiscount(voucher)}
        </Typography>

        <Typography variant="caption" color="text.secondary" display="block">
          Đơn tối thiểu:{" "}
          {voucher.minOrderValue
            ? `${Number(voucher.minOrderValue).toLocaleString("vi-VN")}đ`
            : "Không giới hạn"}
        </Typography>

        <Divider sx={{ my: 0.75 }} />

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Chip
            icon={<HourglassEmpty sx={{ fontSize: "14px !important" }} />}
            label={`${required.toLocaleString("vi-VN")} điểm`}
            size="small"
            color="warning"
            sx={{ fontWeight: 700, fontSize: 11 }}
          />
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
                sx={{ fontSize: 12 }}
              >
                Đổi ngay
              </Button>
            </span>
          </Tooltip>
        </Box>
      </Box>
    </Box>
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
      const Status = "Available";
      const data = await voucherService.getMyVouchers({ PageSize: 50, Status });
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
