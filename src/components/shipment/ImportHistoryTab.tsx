import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Typography,
  CircularProgress,
  Alert,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Tooltip,
  Stack,
  Button,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import { FilterList, Refresh } from "@mui/icons-material";
import { shipmentService } from "../../services/shipmentService";
import type { ImportTicket } from "../../services/shipmentService";

export const ImportHistoryTab: React.FC = () => {
  const [tickets, setTickets] = useState<ImportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      // Filter tickets based on date range locally (since API doesn't support date filters)
      const response = await shipmentService.getImportTickets(
        page + 1,
        rowsPerPage,
        statusFilter || undefined,
      );

      let filteredItems = response.payload.items;

      // Apply date filters
      if (fromDate) {
        const fromDateTime = new Date(fromDate).getTime();
        filteredItems = filteredItems.filter(
          (ticket) => new Date(ticket.importDate).getTime() >= fromDateTime,
        );
      }

      if (toDate) {
        const toDateTime = new Date(toDate).getTime();
        filteredItems = filteredItems.filter(
          (ticket) => new Date(ticket.importDate).getTime() <= toDateTime,
        );
      }

      setTickets(filteredItems);
      setTotalCount(response.payload.totalCount);
    } catch (err: any) {
      setError(err.message || "Không thể tải lịch sử nhập hàng");
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, statusFilter, fromDate, toDate]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleStatusFilterChange = (event: SelectChangeEvent) => {
    setStatusFilter(event.target.value);
    setPage(0);
  };

  const handleClearFilters = () => {
    setStatusFilter("");
    setFromDate("");
    setToDate("");
    setPage(0);
  };

  const getStatusColor = (
    status: string,
  ): "default" | "primary" | "success" | "error" | "warning" | "info" => {
    switch (status) {
      case "Pending":
        return "warning";
      case "InProgress":
        return "info";
      case "Completed":
        return "success";
      case "Canceled":
        return "error";
      default:
        return "default";
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case "Pending":
        return "Chờ xử lý";
      case "InProgress":
        return "Đang xử lý";
      case "Completed":
        return "Hoàn thành";
      case "Canceled":
        return "Đã hủy";
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: 400,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Filter Section */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
        }}
      >
        <Stack spacing={2}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <FilterList color="primary" />
            <Typography variant="h6" fontWeight={600}>
              Bộ lọc
            </Typography>
          </Box>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <FormControl sx={{ minWidth: { xs: "100%", sm: 200 } }}>
              <InputLabel shrink>Trạng thái</InputLabel>
              <Select
                value={statusFilter}
                label="Trạng thái"
                onChange={handleStatusFilterChange}
                size="small"
                displayEmpty
                notched
              >
                <MenuItem value="">Tất cả</MenuItem>
                <MenuItem value="Pending">Chờ xử lý</MenuItem>
                <MenuItem value="InProgress">Đang xử lý</MenuItem>
                <MenuItem value="Completed">Hoàn thành</MenuItem>
                <MenuItem value="Canceled">Đã hủy</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Từ ngày"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
              sx={{ minWidth: { xs: "100%", sm: 200 } }}
            />

            <TextField
              label="Đến ngày"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
              sx={{ minWidth: { xs: "100%", sm: 200 } }}
            />

            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={handleClearFilters}
              sx={{ minWidth: 120 }}
            >
              Xóa bộ lọc
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Table */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}
      >
        <Table>
          <TableHead>
            <TableRow
              sx={{
                bgcolor: "grey.100",
                "& .MuiTableCell-root": {
                  color: "text.primary",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                },
              }}
            >
              <TableCell>Mã phiếu</TableCell>
              <TableCell>Nhà cung cấp</TableCell>
              <TableCell>Người tạo</TableCell>
              <TableCell>Ngày nhập</TableCell>
              <TableCell align="right">Tổng tiền</TableCell>
              <TableCell align="center">Số mặt hàng</TableCell>
              <TableCell align="center">Trạng thái</TableCell>
              <TableCell>Ngày tạo</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary" variant="body1">
                    Không có dữ liệu
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket) => (
                <TableRow
                  key={ticket.id}
                  sx={{
                    "&:hover": { bgcolor: "action.hover" },
                    "&:last-child td": { borderBottom: 0 },
                  }}
                >
                  <TableCell>
                    <Tooltip title={ticket.id} arrow placement="top">
                      <Typography
                        variant="body2"
                        fontFamily="monospace"
                        sx={{
                          cursor: "pointer",
                          color: "primary.main",
                          fontWeight: 500,
                        }}
                      >
                        {ticket.id.substring(0, 8)}...
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {ticket.supplierName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {ticket.createdByName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(ticket.importDate)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, color: "primary.main" }}
                    >
                      {formatCurrency(ticket.totalCost)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={ticket.totalItems}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={getStatusText(ticket.status)}
                      color={getStatusColor(ticket.status)}
                      size="small"
                      variant="filled"
                      sx={{
                        fontWeight: 600,
                        minWidth: 100,
                        borderWidth: 2,
                        borderStyle: "solid",
                        borderColor: `${getStatusColor(ticket.status)}.dark`,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(ticket.createdAt)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mt: 2,
          p: 2,
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
        }}
      >
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="Số hàng mỗi trang:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} của ${count}`
          }
          sx={{ border: "none" }}
        />
      </Box>
    </Box>
  );
};
