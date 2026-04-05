import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Paper,
} from "@mui/material";
import {
  TrendingUp as EarnIcon,
  TrendingDown as SpendIcon,
} from "@mui/icons-material";
import {
  loyaltyService,
  type LoyaltyHistoryItem,
  type LoyaltyTransactionType,
} from "@/services/loyaltyService";

const PAGE_SIZE = 10;

export const LoyaltyHistorySection = () => {
  const [items, setItems] = useState<LoyaltyHistoryItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<LoyaltyTransactionType | "">("");
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const [historyResult, balanceResult] = await Promise.all([
        loyaltyService.getMyHistory(
          page + 1,
          PAGE_SIZE,
          filter || undefined,
        ),
        balance === null ? loyaltyService.getMyBalance() : Promise.resolve(null),
      ]);
      setItems(historyResult.items);
      setTotalCount(historyResult.totalCount);
      if (balanceResult !== null) {
        setBalance(balanceResult.pointBalance ?? 0);
      }
    } catch {
      setItems([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [page, filter, balance]);

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filter]);

  const handleFilterChange = (
    _: React.MouseEvent<HTMLElement>,
    value: LoyaltyTransactionType | "",
  ) => {
    setFilter(value ?? "");
    setPage(0);
  };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Typography variant="h6" fontWeight={600}>
          Lịch Sử Điểm Thưởng
        </Typography>
        {balance !== null && (
          <Chip
            label={`Số dư: ${balance.toLocaleString()} điểm`}
            color="primary"
            variant="outlined"
          />
        )}
      </Box>

      <ToggleButtonGroup
        value={filter}
        exclusive
        onChange={handleFilterChange}
        size="small"
        sx={{ mb: 2 }}
      >
        <ToggleButton value="">Tất cả</ToggleButton>
        <ToggleButton value="Earn">
          <EarnIcon fontSize="small" sx={{ mr: 0.5 }} />
          Cộng điểm
        </ToggleButton>
        <ToggleButton value="Spend">
          <SpendIcon fontSize="small" sx={{ mr: 0.5 }} />
          Trừ điểm
        </ToggleButton>
      </ToggleButtonGroup>

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : items.length === 0 ? (
        <Box py={6} textAlign="center">
          <Typography color="text.secondary">
            Chưa có giao dịch điểm thưởng nào.
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Thời gian</TableCell>
                <TableCell>Lý do</TableCell>
                <TableCell align="center">Loại</TableCell>
                <TableCell align="right">Điểm</TableCell>
                <TableCell align="right">Số dư sau</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item, idx) => (
                <TableRow key={item.id ?? idx}>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    {item.id
                      ? new Date().toLocaleDateString("vi-VN")
                      : "—"}
                  </TableCell>
                  <TableCell>{item.reason || "—"}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={
                        item.transactionType === "Earn"
                          ? "Cộng điểm"
                          : "Trừ điểm"
                      }
                      color={
                        item.transactionType === "Earn" ? "success" : "error"
                      }
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontWeight: 600,
                      color:
                        item.transactionType === "Earn"
                          ? "success.main"
                          : "error.main",
                    }}
                  >
                    {item.transactionType === "Earn" ? "+" : "-"}
                    {Math.abs(item.pointsChanged ?? 0).toLocaleString()}
                  </TableCell>
                  <TableCell align="right">
                    {(item.absolutePoints ?? 0).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            rowsPerPage={PAGE_SIZE}
            rowsPerPageOptions={[PAGE_SIZE]}
            onPageChange={(_, p) => setPage(p)}
            labelDisplayedRows={({ from, to, count }) =>
              `${from}–${to} / ${count}`
            }
          />
        </TableContainer>
      )}
    </Box>
  );
};
