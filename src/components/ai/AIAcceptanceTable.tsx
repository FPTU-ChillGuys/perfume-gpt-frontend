import {
    Chip,
    CircularProgress,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    Typography,
} from "@mui/material";
import { CheckCircle as CheckCircleIcon, Cancel as CancelIcon } from "@mui/icons-material";
import type { AiAcceptanceRecord } from "@/types/chatbot";

const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString("vi-VN");
};

interface Props {
    loading: boolean;
    records: AiAcceptanceRecord[];
    totalCount: number;
    page: number;
    rowsPerPage: number;
    onPageChange: (_: unknown, newPage: number) => void;
    onRowsPerPageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const AIAcceptanceTable = ({
    loading,
    records,
    totalCount,
    page,
    rowsPerPage,
    onPageChange,
    onRowsPerPageChange,
}: Props) => (
    <TableContainer component={Paper}>
        <Table>
            <TableHead>
                <TableRow sx={{ bgcolor: "grey.50" }}>
                    <TableCell>Record ID</TableCell>
                    <TableCell align="center">Trạng thái</TableCell>
                    <TableCell>Ngày tạo</TableCell>
                    <TableCell>Cập nhật cuối</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {loading ? (
                    <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                            <CircularProgress />
                        </TableCell>
                    </TableRow>
                ) : records.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                            <Typography variant="body2" color="text.secondary">
                                Không có bản ghi nào phù hợp
                            </Typography>
                        </TableCell>
                    </TableRow>
                ) : (
                    records.map((record) => (
                        <TableRow key={record.id} hover>
                            <TableCell>
                                <Typography variant="body2" fontWeight={500} title={record.id}>
                                    {record.id?.substring(0, 8)}...
                                </Typography>
                            </TableCell>
                            <TableCell align="center">
                                {record.isAccepted ? (
                                    <Chip
                                        icon={<CheckCircleIcon />}
                                        label="Chấp nhận"
                                        color="success"
                                        size="small"
                                        variant="outlined"
                                    />
                                ) : (
                                    <Chip
                                        icon={<CancelIcon />}
                                        label="Từ chối"
                                        color="error"
                                        size="small"
                                        variant="outlined"
                                    />
                                )}
                            </TableCell>
                            <TableCell>
                                <Typography variant="body2" noWrap>
                                    {formatDate(record.createdAt)}
                                </Typography>
                            </TableCell>
                            <TableCell>
                                <Typography variant="body2" noWrap>
                                    {formatDate(record.updatedAt)}
                                </Typography>
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>

        {!loading && (
            <TablePagination
                component="div"
                count={totalCount}
                page={page}
                onPageChange={onPageChange}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={onRowsPerPageChange}
                rowsPerPageOptions={[5, 10, 25, 50]}
                labelRowsPerPage="Số hàng mỗi trang:"
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
            />
        )}
    </TableContainer>
);
