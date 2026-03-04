import { useState, useEffect, useMemo } from "react";
import {
    Box,
    Paper,
    Typography,
    TextField,
    InputAdornment,
    CircularProgress,
    Container,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TableSortLabel,
} from "@mui/material";
import { Search as SearchIcon, SmartToy as BotIcon } from "@mui/icons-material";
import { useToast } from "@/hooks/useToast";
import { aiInstructionService } from "@/services/ai/aiInstructionService";
import type { AiInstruction } from "@/types/aiInstruction";
import { AdminLayout } from "@/layouts/AdminLayout";
import dayjs from "dayjs";

type Order = "asc" | "desc";

export default function AIInstructionPage() {
    const [instructions, setInstructions] = useState<AiInstruction[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [order, setOrder] = useState<Order>("desc");
    const [orderBy, setOrderBy] = useState<keyof AiInstruction>("updatedAt");
    const { showToast } = useToast();

    useEffect(() => {
        fetchInstructions();
    }, []);

    const fetchInstructions = async () => {
        setLoading(true);
        try {
            const response = await aiInstructionService.getInstructions();
            setInstructions(response.data);
        } catch (error) {
            console.error("Failed to fetch instructions:", error);
            showToast("Lỗi khi tải danh sách AI Instructions", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleRequestSort = (property: keyof AiInstruction) => {
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
    };

    // Filter and sort the data locally
    const filteredAndSortedInstructions = useMemo(() => {
        // Filter
        let data = instructions;
        if (searchQuery.trim() !== "") {
            const query = searchQuery.toLowerCase();
            data = data.filter(
                (item) =>
                    item.instruction.toLowerCase().includes(query) ||
                    item.instructionType.toLowerCase().includes(query)
            );
        }

        // Sort
        data = [...data].sort((a, b) => {
            let valA = a[orderBy];
            let valB = b[orderBy];

            // Handle date strings
            if (orderBy === "createdAt" || orderBy === "updatedAt") {
                valA = new Date(valA).getTime() as any;
                valB = new Date(valB).getTime() as any;
            } else if (typeof valA === "string" && typeof valB === "string") {
                valA = valA.toLowerCase();
                valB = valB.toLowerCase();
            }

            if (valA < valB) return order === "asc" ? -1 : 1;
            if (valA > valB) return order === "asc" ? 1 : -1;
            return 0;
        });

        return data;
    }, [instructions, searchQuery, order, orderBy]);

    if (loading) {
        return (
            <AdminLayout>
                <Container maxWidth="xl">
                    <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
                        <CircularProgress />
                    </Box>
                </Container>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <Container maxWidth="xl">
                <Paper sx={{ width: "100%", overflow: "hidden" }}>
                    <Box sx={{ p: 3 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
                            <BotIcon color="primary" sx={{ fontSize: 28 }} />
                            <Typography variant="h5" fontWeight="bold">
                                Cấu hình AI (Instructions)
                            </Typography>
                        </Box>

                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, justifyContent: "space-between", alignItems: "center", mb: 3 }}>
                            <TextField
                                placeholder="Tìm kiếm nội dung hoặc loại prompt..."
                                variant="outlined"
                                size="small"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                sx={{ minWidth: { xs: "100%", sm: 400 }, bgcolor: "#fff" }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <Typography variant="body2" color="text.secondary">
                                Tổng số: <strong>{filteredAndSortedInstructions.length}</strong> chỉ thị
                            </Typography>
                        </Box>

                        <TableContainer>
                            <Table>
                                <TableHead sx={{ bgcolor: "#f8f9fa" }}>
                                    <TableRow>
                                        <TableCell>
                                            <TableSortLabel
                                                active={orderBy === "instructionType"}
                                                direction={orderBy === "instructionType" ? order : "asc"}
                                                onClick={() => handleRequestSort("instructionType")}
                                                sx={{ fontWeight: "bold" }}
                                            >
                                                Loại Instruction (Type)
                                            </TableSortLabel>
                                        </TableCell>
                                        <TableCell sx={{ width: "50%", fontWeight: "bold" }}>
                                            Nội dung (Instruction)
                                        </TableCell>
                                        <TableCell>
                                            <TableSortLabel
                                                active={orderBy === "updatedAt"}
                                                direction={orderBy === "updatedAt" ? order : "asc"}
                                                onClick={() => handleRequestSort("updatedAt")}
                                                sx={{ fontWeight: "bold" }}
                                            >
                                                Ngày cập nhật
                                            </TableSortLabel>
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredAndSortedInstructions.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} align="center" sx={{ py: 6 }}>
                                                <Typography variant="body2" color="text.secondary">Không tìm thấy dữ liệu phù hợp.</Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredAndSortedInstructions.map((item) => (
                                            <TableRow key={item.id} hover>
                                                <TableCell>
                                                    <Chip
                                                        label={item.instructionType}
                                                        color="primary"
                                                        variant="outlined"
                                                        size="small"
                                                        sx={{ fontWeight: 600, bgcolor: "rgba(25, 118, 210, 0.04)" }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Box
                                                        sx={{
                                                            maxHeight: 120,
                                                            overflowY: "auto",
                                                            pr: 1,
                                                            color: "text.secondary",
                                                            fontSize: "0.875rem",
                                                            whiteSpace: "pre-wrap",
                                                            "&::-webkit-scrollbar": { width: 4 },
                                                            "&::-webkit-scrollbar-thumb": { bgcolor: "#ddd", borderRadius: 2 },
                                                        }}
                                                    >
                                                        {item.instruction}
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {dayjs(item.updatedAt).format("DD/MM/YYYY HH:mm")}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                </Paper>
            </Container>
        </AdminLayout>
    );
}
