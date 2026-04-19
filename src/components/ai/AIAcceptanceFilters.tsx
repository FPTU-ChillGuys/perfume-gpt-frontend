import { Box, IconButton, Paper, TextField, Tooltip } from "@mui/material";
import { Search as SearchIcon, Clear as ClearIcon } from "@mui/icons-material";

export type FilterStatus = "all" | "accepted" | "rejected";

interface Props {
    searchInput: string;
    filterStatus: FilterStatus;
    onSearchInputChange: (value: string) => void;
    onSearch: () => void;
    onFilterStatusChange: (status: FilterStatus) => void;
    onClearFilters: () => void;
}

export const AIAcceptanceFilters = ({
    searchInput,
    filterStatus,
    onSearchInputChange,
    onSearch,
    onFilterStatusChange,
    onClearFilters,
}: Props) => (
    <Paper sx={{ p: 3, mb: 3 }}>
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
                gap: 2,
                alignItems: "center",
            }}
        >
            <TextField
                fullWidth
                label="Tìm theo Record ID"
                placeholder="Nhập ID..."
                value={searchInput}
                onChange={(e) => onSearchInputChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") onSearch(); }}
                InputProps={{
                    endAdornment: (
                        <IconButton onClick={onSearch} edge="end">
                            <SearchIcon />
                        </IconButton>
                    ),
                }}
            />

            <TextField
                select
                fullWidth
                label="Trạng thái"
                value={filterStatus}
                onChange={(e) => onFilterStatusChange(e.target.value as FilterStatus)}
                SelectProps={{ native: true }}
            >
                <option value="all">Tất cả</option>
                <option value="accepted">Đã chấp nhận</option>
                <option value="rejected">Đã từ chối</option>
            </TextField>

            <Box />

            <Tooltip title="Xóa bộ lọc">
                <IconButton
                    onClick={onClearFilters}
                    sx={{ height: 56, borderRadius: 1, border: "1px solid", borderColor: "divider" }}
                >
                    <ClearIcon />
                </IconButton>
            </Tooltip>
        </Box>
    </Paper>
);
