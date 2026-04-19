import { useState, useEffect, useMemo } from "react";
import { Box, Typography } from "@mui/material";
import { AdminLayout } from "@/layouts/AdminLayout";
import { aiAcceptanceService } from "@/services/ai/aiAcceptanceService";
import { useToast } from "@/hooks/useToast";
import type { AiAcceptanceRecord } from "@/types/chatbot";
import { AIAcceptanceStatsCards } from "@/components/ai/AIAcceptanceStatsCards";
import { AIAcceptanceFilters, type FilterStatus } from "@/components/ai/AIAcceptanceFilters";
import { AIAcceptanceTable } from "@/components/ai/AIAcceptanceTable";

export const AIAcceptancePage = () => {
    const { showToast } = useToast();
    const [records, setRecords] = useState<AiAcceptanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [rateAccepted, setRateAccepted] = useState<number | null>(null);
    const [rateRejected, setRateRejected] = useState<number | null>(null);
    const [rateLoading, setRateLoading] = useState(true);

    // Pagination
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Filters
    const [searchInput, setSearchInput] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadData = async () => {
        setLoading(true);
        setRateLoading(true);
        try {
            const [allRecords, accepted, rejected] = await Promise.all([
                aiAcceptanceService.getAllAcceptanceStatus(),
                aiAcceptanceService.getAcceptanceRate(true),
                aiAcceptanceService.getAcceptanceRate(false),
            ]);
            setRecords(allRecords);
            setRateAccepted(accepted);
            setRateRejected(rejected);
        } catch (error) {
            console.error("Failed to load AI acceptance data:", error);
            showToast("Không thể tải dữ liệu AI Acceptance.", "error");
        } finally {
            setLoading(false);
            setRateLoading(false);
        }
    };

    const handleSearch = () => {
        setSearchTerm(searchInput);
        setPage(0);
    };

    const handleClearFilters = () => {
        setSearchInput("");
        setSearchTerm("");
        setFilterStatus("all");
        setPage(0);
    };

    const filteredRecords = useMemo(() => records.filter((r) => {
        const matchesSearch = !searchTerm
            || r.id?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus =
            filterStatus === "all" ||
            (filterStatus === "accepted" && r.isAccepted) ||
            (filterStatus === "rejected" && !r.isAccepted);
        return matchesSearch && matchesStatus;
    }), [records, searchTerm, filterStatus]);

    const paginated = useMemo(() => {
        const start = page * rowsPerPage;
        return filteredRecords.slice(start, start + rowsPerPage);
    }, [filteredRecords, page, rowsPerPage]);

    const totalAccepted = records.filter((r) => r.isAccepted).length;
    const totalRejected = records.filter((r) => !r.isAccepted).length;

    return (
        <AdminLayout>
            <Box>
                <Typography variant="h4" fontWeight="bold" mb={3}>
                    Quản lý AI Acceptance
                </Typography>

                <AIAcceptanceStatsCards
                    loading={rateLoading}
                    totalRecords={records.length}
                    totalAccepted={totalAccepted}
                    totalRejected={totalRejected}
                    rateAccepted={rateAccepted}
                    rateRejected={rateRejected}
                />

                <AIAcceptanceFilters
                    searchInput={searchInput}
                    filterStatus={filterStatus}
                    onSearchInputChange={setSearchInput}
                    onSearch={handleSearch}
                    onFilterStatusChange={(s) => { setFilterStatus(s); setPage(0); }}
                    onClearFilters={handleClearFilters}
                />

                <AIAcceptanceTable
                    loading={loading}
                    records={paginated}
                    totalCount={filteredRecords.length}
                    page={page}
                    rowsPerPage={rowsPerPage}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                />
            </Box>
        </AdminLayout>
    );
};

export default AIAcceptancePage;

