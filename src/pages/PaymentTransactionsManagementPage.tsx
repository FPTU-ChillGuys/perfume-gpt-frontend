import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Chip,
  CircularProgress,
} from "@mui/material";
import { Clear as ClearIcon, Sync as SyncIcon } from "@mui/icons-material";
import { AdminLayout } from "@/layouts/AdminLayout";
import { useToast } from "@/hooks/useToast";
import {
  paymentManagementService,
  type PaymentMethod,
  type TransactionType,
  type TransactionStatus,
  type PaymentTransactionOverviewResponse,
} from "@/services/paymentManagementService";
import { formatDateTimeVN } from "@/utils/dateTime";

const PAYMENT_METHOD_LABELS: Record<NonNullable<PaymentMethod>, string> = {
  CashOnDelivery: "Thanh toán khi nhận hàng",
  CashInStore: "Tiền mặt tại quầy",
  VnPay: "VNPay",
  Momo: "MoMo",
  ExternalBankTransfer: "Chuyển khoản ngân hàng",
  PayOs: "PayOS",
};

const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  Payment: "Thu",
  Refund: "Hoàn tiền",
};

const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  Pending: "Chờ xử lý",
  Success: "Thành công",
  Failed: "Thất bại",
  Cancelled: "Đã hủy",
};

const STATUS_COLORS: Record<
  TransactionStatus,
  "default" | "success" | "error" | "warning"
> = {
  Pending: "warning",
  Success: "success",
  Failed: "error",
  Cancelled: "default",
};

const EMPTY_DATA: PaymentTransactionOverviewResponse = {
  summary: {},
  transactions: {
    items: [],
    pageNumber: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  },
};

const formatCurrency = (value?: number) => {
  const amount = value ?? 0;
  return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "-";
  const adjusted = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(adjusted);
};

export const PaymentTransactionsManagementPage = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] =
    useState<PaymentTransactionOverviewResponse>(EMPTY_DATA);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Applied filters
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [transactionType, setTransactionType] = useState<TransactionType | "">(
    "",
  );
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const response = await paymentManagementService.getManagementTransactions(
        {
          FromDate: fromDate || undefined,
          ToDate: toDate || undefined,
          PaymentMethod: paymentMethod || undefined,
          TransactionType: transactionType || undefined,
          PageNumber: page + 1,
          PageSize: rowsPerPage,
          SortBy: "CreatedAt",
          SortOrder: sortOrder,
          IsDescending: sortOrder === "desc",
        },
      );
      setOverview(response);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Không thể tải dữ liệu giao dịch thu chi";
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    page,
    rowsPerPage,
    fromDate,
    toDate,
    paymentMethod,
    transactionType,
    sortOrder,
  ]);

  const handleResetFilters = () => {
    setFromDate("");
    setToDate("");
    setPaymentMethod("");
    setTransactionType("");
    setSortOrder("desc");
    setPage(0);
  };

  const handlePageChange = (_event: unknown, nextPage: number) => {
    setPage(nextPage);
  };

  const handleRowsPerPageChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const summaryCards = useMemo(
    () => [
      {
        label: "Tổng số giao dịch",
        value: overview.summary.totalTransactions ?? 0,
      },
      {
        label: "Tổng giao dịch thu",
        value: overview.summary.totalPaymentTransactions ?? 0,
      },
      {
        label: "Tổng giao dịch hoàn",
        value: overview.summary.totalRefundTransactions ?? 0,
      },
      {
        label: "Giao dịch thành công",
        value: overview.summary.successTransactionsCount ?? 0,
      },
    ],
    [overview.summary],
  );

  return (
    <AdminLayout>
      <Box>
        <Paper sx={{ p: 2.5, mb: 3 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 1,
              mb: 1,
            }}
          >
            <Typography variant="h6" fontWeight={700}>
              Tổng hợp dòng tiền
            </Typography>
            <Tooltip title="Làm mới">
              <span>
                <IconButton
                  color="primary"
                  onClick={loadTransactions}
                  disabled={loading}
                  aria-label="Làm mới"
                >
                  <SyncIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            Tổng tiền thu: {formatCurrency(overview.summary.totalPaymentAmount)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tổng tiền hoàn: {formatCurrency(overview.summary.totalRefundAmount)}
          </Typography>
        </Paper>
        <Box
          sx={{
            mb: 3,
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              lg: "repeat(4, 1fr)",
            },
            gap: 2,
          }}
        >
          {summaryCards.map((card) => (
            <Box key={card.label}>
              <Paper
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  {card.label}
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                  {new Intl.NumberFormat("vi-VN").format(card.value)}
                </Typography>
              </Paper>
            </Box>
          ))}
        </Box>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Tabs
            value={transactionType}
            onChange={(_, value: TransactionType | "") => {
              setTransactionType(value);
              setPage(0);
            }}
            variant="scrollable"
            scrollButtons="auto"
            TabIndicatorProps={{ style: { backgroundColor: "#ee4d2d" } }}
            sx={{
              mb: 2,
              borderBottom: "1px solid",
              borderColor: "divider",
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 500,
                minWidth: 100,
              },
              "& .Mui-selected": {
                color: "#ee4d2d !important",
              },
            }}
          >
            <Tab value="" label="Tất cả" />
            <Tab value="Payment" label="Thu" />
            <Tab value="Refund" label="Hoàn tiền" />
          </Tabs>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
                lg: "repeat(4, 1fr)",
              },
              gap: 2,
            }}
          >
            <TextField
              label="Từ ngày"
              type="date"
              fullWidth
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(0);
              }}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="Đến ngày"
              type="date"
              fullWidth
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(0);
              }}
              InputLabelProps={{ shrink: true }}
            />

            <FormControl fullWidth>
              <InputLabel>Phương thức thanh toán</InputLabel>
              <Select
                value={paymentMethod}
                label="Phương thức thanh toán"
                onChange={(e) => {
                  setPaymentMethod(e.target.value as PaymentMethod | "");
                  setPage(0);
                }}
              >
                <MenuItem value="">Tất cả</MenuItem>
                <MenuItem value="CashOnDelivery">
                  Thanh toán khi nhận hàng
                </MenuItem>
                <MenuItem value="CashInStore">Tiền mặt tại quầy</MenuItem>
                <MenuItem value="VnPay">VNPay</MenuItem>
                <MenuItem value="Momo">MoMo</MenuItem>
                <MenuItem value="ExternalBankTransfer">
                  Chuyển khoản ngân hàng
                </MenuItem>
              </Select>
            </FormControl>

            <Button
              variant="outlined"
              startIcon={<ClearIcon />}
              onClick={handleResetFilters}
              sx={{ minHeight: 56 }}
            >
              Xóa lọc
            </Button>
          </Box>
        </Paper>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell>Mã giao dịch</TableCell>
                <TableCell>Mã đơn hàng</TableCell>
                <TableCell>Loại giao dịch</TableCell>
                <TableCell>Phương thức</TableCell>
                <TableCell>Trạng thái</TableCell>
                <TableCell align="right">Số tiền</TableCell>
                <TableCell>Mã cổng thanh toán</TableCell>
                <TableCell sortDirection={sortOrder}>
                  <TableSortLabel
                    active
                    direction={sortOrder}
                    onClick={() => {
                      setSortOrder((prev) =>
                        prev === "desc" ? "asc" : "desc",
                      );
                      setPage(0);
                    }}
                  >
                    Thời gian tạo
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center">Lần thử</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : overview.transactions.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Không có giao dịch nào phù hợp bộ lọc
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                overview.transactions.items.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>{item.id ?? "-"}</TableCell>
                    <TableCell>{item.orderCode ?? "-"}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={
                          item.transactionType
                            ? TRANSACTION_TYPE_LABELS[item.transactionType]
                            : "-"
                        }
                        color={
                          item.transactionType === "Refund"
                            ? "warning"
                            : "success"
                        }
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {item.method ? PAYMENT_METHOD_LABELS[item.method] : "-"}
                    </TableCell>
                    <TableCell>
                      {item.transactionStatus ? (
                        <Chip
                          size="small"
                          label={
                            TRANSACTION_STATUS_LABELS[item.transactionStatus]
                          }
                          color={STATUS_COLORS[item.transactionStatus]}
                        />
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      <Typography
                        variant="body2"
                        color={
                          item.transactionType === "Refund"
                            ? "error.main"
                            : "success.main"
                        }
                        fontWeight={700}
                      >
                        {item.transactionType === "Refund" ? "" : "+"}
                        {formatCurrency(item.amount)}
                      </Typography>
                    </TableCell>
                    <TableCell>{item.gatewayTransactionNo ?? "-"}</TableCell>
                    <TableCell>{formatDateTime(item.createdAt)}</TableCell>
                    <TableCell align="center">
                      {item.retryAttempt ?? 0}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <TablePagination
            component="div"
            page={page}
            count={overview.transactions.totalCount}
            rowsPerPage={rowsPerPage}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
            rowsPerPageOptions={[10, 20, 50]}
            labelRowsPerPage="Số dòng mỗi trang"
          />
        </TableContainer>
      </Box>
    </AdminLayout>
  );
};

export default PaymentTransactionsManagementPage;
