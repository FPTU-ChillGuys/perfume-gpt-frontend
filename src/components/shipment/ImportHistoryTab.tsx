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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Collapse,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import {
  FilterList,
  Refresh,
  Close,
  ExpandMore,
  ExpandLess,
} from "@mui/icons-material";
import { importStockService } from "../../services/importStockService";
import type { ImportTicket, ImportTicketDetail } from "@/types/import-ticket";
import { userService } from "../../services/userService";
import { type StaffUser } from "@/types/staff-user";

export const ImportHistoryTab: React.FC = () => {
  const [tickets, setTickets] = useState<ImportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [staffFilter, setStaffFilter] = useState("");
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedTicket, setSelectedTicket] =
    useState<ImportTicketDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(
    new Set(),
  );

  // Load staff list on mount
  useEffect(() => {
    const loadStaff = async () => {
      try {
        const response = await userService.getStaffLookup();
        setStaffList(response.payload!);
      } catch (err: any) {
        console.error("Failed to load staff list:", err);
      }
    };
    loadStaff();
  }, []);

  const getTicketDateValue = (ticket: ImportTicket): number | null => {
    const datePriority = [
      ticket.actualImportDate,
      ticket.expectedArrivalDate,
      ticket.createdAt,
    ];

    for (const date of datePriority) {
      if (!date) continue;
      const timestamp = new Date(date).getTime();
      if (!Number.isNaN(timestamp)) {
        return timestamp;
      }
    }

    return null;
  };

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      // Filter tickets based on date range locally (since API doesn't support date filters)
      const response = await importStockService.getImportTickets(
        page + 1,
        rowsPerPage,
        statusFilter || undefined,
        staffFilter || undefined,
      );

      let filteredItems = response.payload!.items;

      // Apply date filters
      if (fromDate) {
        const fromDateTime = new Date(fromDate).getTime();
        filteredItems = filteredItems.filter((ticket) => {
          const ticketTime = getTicketDateValue(ticket);
          return ticketTime !== null && ticketTime >= fromDateTime;
        });
      }

      if (toDate) {
        const toDateTime = new Date(toDate).getTime();
        filteredItems = filteredItems.filter((ticket) => {
          const ticketTime = getTicketDateValue(ticket);
          return ticketTime !== null && ticketTime <= toDateTime;
        });
      }

      filteredItems = filteredItems.slice().sort((a, b) => {
        const bTime = getTicketDateValue(b) ?? new Date(b.createdAt!).getTime();
        const aTime = getTicketDateValue(a) ?? new Date(a.createdAt!).getTime();
        return bTime - aTime;
      });

      setTickets(filteredItems);
      setTotalCount(response.payload!.totalCount);
    } catch (err: any) {
      setError(err.message || "Không thể tải lịch sử nhập hàng");
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, statusFilter, staffFilter, fromDate, toDate]);

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
    setStaffFilter("");
    setFromDate("");
    setToDate("");
    setPage(0);
  };

  const handleViewDetail = async (ticketId: string) => {
    try {
      setDetailLoading(true);
      const response = await importStockService.getImportTicketDetail(ticketId);
      setSelectedTicket(response.payload!);
      setExpandedProducts(new Set());
    } catch (err: any) {
      setError(err.message || "Không thể tải chi tiết phiếu nhập");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedTicket(null);
    setExpandedProducts(new Set());
  };

  const toggleProductExpand = (productId: string) => {
    setExpandedProducts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
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

  const formatDate = (
    dateString?: string | null,
    options?: { includeTime?: boolean },
  ) => {
    const includeTime = options?.includeTime ?? true;

    if (!dateString) {
      return "-";
    }

    const parsedDate = new Date(dateString);

    if (Number.isNaN(parsedDate.getTime())) {
      return "-";
    }

    if (includeTime) {
      return parsedDate.toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return parsedDate.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
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

            <FormControl sx={{ minWidth: { xs: "100%", sm: 200 } }}>
              <InputLabel shrink>Nhân viên xác nhận</InputLabel>
              <Select
                value={staffFilter}
                label="Nhân viên xác nhận"
                onChange={(e) => {
                  setStaffFilter(e.target.value);
                  setPage(0);
                }}
                size="small"
                displayEmpty
                notched
              >
                <MenuItem value="">Tất cả nhân viên</MenuItem>
                {staffList.map((staff) => (
                  <MenuItem key={staff.id} value={staff.id}>
                    {staff.fullName}
                  </MenuItem>
                ))}
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
              <TableCell>Ngày dự kiến</TableCell>
              <TableCell>Ngày thực tế</TableCell>
              <TableCell align="right">Tổng tiền</TableCell>
              <TableCell align="center">Số mặt hàng</TableCell>
              <TableCell align="center">Trạng thái</TableCell>
              <TableCell>Người xác nhận</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary" variant="body1">
                    Không có dữ liệu
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket) => (
                <TableRow
                  key={ticket.id}
                  onClick={() => ticket.id && handleViewDetail(ticket.id)}
                  sx={{
                    "&:hover": { bgcolor: "action.hover", cursor: "pointer" },
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
                        {(ticket.id || "").substring(0, 8)}...
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
                      {formatDate(ticket.expectedArrivalDate, {
                        includeTime: false,
                      })}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      color={
                        ticket.actualImportDate
                          ? "text.primary"
                          : "warning.main"
                      }
                    >
                      {formatDate(ticket.actualImportDate)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, color: "primary.main" }}
                    >
                      {formatCurrency(ticket.totalCost ?? 0)}
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
                      label={getStatusText(ticket.status!)}
                      color={getStatusColor(ticket.status!)}
                      size="small"
                      variant="filled"
                      sx={{
                        fontWeight: 600,
                        minWidth: 100,
                        borderWidth: 2,
                        borderStyle: "solid",
                        borderColor: `${getStatusColor(ticket.status!)}.dark`,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {ticket.verifiedByName || "-"}
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

      {/* Detail Dialog */}
      <Dialog
        open={!!selectedTicket}
        onClose={handleCloseDetail}
        maxWidth="lg"
        fullWidth
      >
        {selectedTicket && (
          <>
            <DialogTitle
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  Chi tiết phiếu nhập - {selectedTicket.id!.substring(0, 8)}...
                </Typography>
                <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    {selectedTicket.supplierName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Ngày dự kiến:{" "}
                    {formatDate(selectedTicket.expectedArrivalDate, {
                      includeTime: false,
                    })}
                  </Typography>
                  <Typography
                    variant="caption"
                    color={
                      selectedTicket.actualImportDate
                        ? "text.secondary"
                        : "warning.main"
                    }
                  >
                    Ngày thực tế: {formatDate(selectedTicket.actualImportDate)}
                  </Typography>
                </Stack>
              </Box>
              <IconButton onClick={handleCloseDetail}>
                <Close />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              {detailLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  {/* Summary Info */}
                  <Box
                    sx={{ mb: 3, p: 2, bgcolor: "grey.50", borderRadius: 1 }}
                  >
                    <Stack
                      direction="row"
                      spacing={4}
                      sx={{ flexWrap: "wrap", rowGap: 2 }}
                    >
                      <Box sx={{ minWidth: 160 }}>
                        <Typography variant="caption" color="text.secondary">
                          Người tạo
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {selectedTicket.createdByName}
                        </Typography>
                      </Box>
                      <Box sx={{ minWidth: 160 }}>
                        <Typography variant="caption" color="text.secondary">
                          Người xác nhận
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {selectedTicket.verifiedByName || "-"}
                        </Typography>
                      </Box>
                      <Box sx={{ minWidth: 160 }}>
                        <Typography variant="caption" color="text.secondary">
                          Tổng tiền
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          color="primary"
                        >
                          {formatCurrency(selectedTicket.totalCost!)}
                        </Typography>
                      </Box>
                      <Box sx={{ minWidth: 160 }}>
                        <Typography variant="caption" color="text.secondary">
                          Trạng thái
                        </Typography>
                        <Box sx={{ mt: 0.5 }}>
                          <Chip
                            label={getStatusText(selectedTicket.status!)}
                            color={getStatusColor(selectedTicket.status!)}
                            size="small"
                          />
                        </Box>
                      </Box>
                      <Box sx={{ minWidth: 160 }}>
                        <Typography variant="caption" color="text.secondary">
                          Ngày dự kiến
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {formatDate(selectedTicket.expectedArrivalDate, {
                            includeTime: false,
                          })}
                        </Typography>
                      </Box>
                      <Box sx={{ minWidth: 160 }}>
                        <Typography variant="caption" color="text.secondary">
                          Ngày thực tế
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          color={
                            selectedTicket.actualImportDate
                              ? "success.main"
                              : "warning.main"
                          }
                        >
                          {formatDate(selectedTicket.actualImportDate)}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>

                  {/* Products Table */}
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: "grey.100" }}>
                          <TableCell width={40} />
                          <TableCell>Sản phẩm</TableCell>
                          <TableCell align="center">Số lượng</TableCell>
                          <TableCell align="center">Đã nhận</TableCell>
                          <TableCell align="center">Từ chối</TableCell>
                          <TableCell align="right">Đơn giá</TableCell>
                          <TableCell align="right">Thành tiền</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedTicket.importDetails!.map((product) => {
                          const isExpanded = expandedProducts.has(product.id!);
                          const totalReceived = product.batches!.reduce(
                            (sum, b) => sum + b.importQuantity!,
                            0,
                          );

                          return (
                            <React.Fragment key={product.id}>
                              {/* Product Row */}
                              <TableRow
                                hover
                                sx={{ cursor: "pointer" }}
                                onClick={() => toggleProductExpand(product.id!)}
                              >
                                <TableCell>
                                  <IconButton size="small">
                                    {isExpanded ? (
                                      <ExpandLess />
                                    ) : (
                                      <ExpandMore />
                                    )}
                                  </IconButton>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" fontWeight={600}>
                                    {product.variantName}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    {product.variantSku}
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  {product.expectedQuantity}
                                </TableCell>
                                <TableCell align="center">
                                  <Typography
                                    variant="body2"
                                    fontWeight={600}
                                    color={
                                      totalReceived === product.expectedQuantity
                                        ? "success.main"
                                        : "warning.main"
                                    }
                                  >
                                    {totalReceived}
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <Typography
                                    variant="body2"
                                    fontWeight={600}
                                    color={
                                      product.rejectedQuantity! > 0
                                        ? "error.main"
                                        : "text.secondary"
                                    }
                                  >
                                    {product.rejectedQuantity}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  {formatCurrency(product.unitPrice!)}
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="body2" fontWeight={600}>
                                    {formatCurrency(product.totalPrice!)}
                                  </Typography>
                                </TableCell>
                              </TableRow>

                              {/* Batches Collapse */}
                              <TableRow>
                                <TableCell
                                  colSpan={7}
                                  sx={{ py: 0, border: 0 }}
                                >
                                  <Collapse
                                    in={isExpanded}
                                    timeout="auto"
                                    unmountOnExit
                                  >
                                    <Box
                                      sx={{ py: 2, px: 4, bgcolor: "grey.50" }}
                                    >
                                      <Typography
                                        variant="subtitle2"
                                        fontWeight={600}
                                        sx={{ mb: 1 }}
                                      >
                                        Danh sách Batch
                                      </Typography>
                                      {product.batches!.length === 0 ? (
                                        <Typography
                                          variant="body2"
                                          color="text.secondary"
                                        >
                                          Chưa có batch nào
                                        </Typography>
                                      ) : (
                                        <Table size="small">
                                          <TableHead>
                                            <TableRow>
                                              <TableCell>Mã batch</TableCell>
                                              <TableCell>
                                                Ngày sản xuất
                                              </TableCell>
                                              <TableCell>
                                                Ngày hết hạn
                                              </TableCell>
                                              <TableCell align="center">
                                                Số lượng nhập
                                              </TableCell>
                                              <TableCell align="center">
                                                Còn lại
                                              </TableCell>
                                            </TableRow>
                                          </TableHead>
                                          <TableBody>
                                            {product.batches!.map((batch) => (
                                              <TableRow key={batch.id}>
                                                <TableCell>
                                                  <Typography
                                                    variant="body2"
                                                    fontFamily="monospace"
                                                    fontWeight={600}
                                                  >
                                                    {batch.batchCode}
                                                  </Typography>
                                                </TableCell>
                                                <TableCell>
                                                  {new Date(
                                                    batch.manufactureDate!,
                                                  ).toLocaleDateString("vi-VN")}
                                                </TableCell>
                                                <TableCell>
                                                  {new Date(
                                                    batch.expiryDate!,
                                                  ).toLocaleDateString("vi-VN")}
                                                </TableCell>
                                                <TableCell align="center">
                                                  <Chip
                                                    label={batch.importQuantity}
                                                    size="small"
                                                    color="primary"
                                                    variant="outlined"
                                                  />
                                                </TableCell>
                                                <TableCell align="center">
                                                  <Chip
                                                    label={
                                                      batch.remainingQuantity
                                                    }
                                                    size="small"
                                                    color={
                                                      batch.remainingQuantity! >
                                                      0
                                                        ? "success"
                                                        : "default"
                                                    }
                                                  />
                                                </TableCell>
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </Table>
                                      )}
                                      {product.note && (
                                        <Box
                                          sx={{
                                            mt: 2,
                                            p: 1.5,
                                            bgcolor: "warning.light",
                                            borderRadius: 1,
                                          }}
                                        >
                                          <Typography
                                            variant="caption"
                                            fontWeight={600}
                                          >
                                            Ghi chú:
                                          </Typography>
                                          <Typography variant="body2">
                                            {product.note}
                                          </Typography>
                                        </Box>
                                      )}
                                    </Box>
                                  </Collapse>
                                </TableCell>
                              </TableRow>
                            </React.Fragment>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDetail}>Đóng</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};
