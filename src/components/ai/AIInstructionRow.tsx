import React from "react";
import {
    Box,
    Chip,
    IconButton,
    TableCell,
    TableRow,
    Typography,
} from "@mui/material";
import { Edit as EditIcon } from "@mui/icons-material";
import type { AiInstruction } from "@/types/aiInstruction";
import dayjs from "dayjs";

interface Props {
    item: AiInstruction;
    onEdit: (item: AiInstruction) => void;
}

function AIInstructionRow({ item, onEdit }: Props) {
    return (
        <TableRow hover>
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
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                    {dayjs(item.updatedAt).format("DD/MM/YYYY HH:mm")}
                </Typography>
            </TableCell>
            <TableCell align="center">
                <IconButton
                    color="primary"
                    size="small"
                    onClick={() => onEdit(item)}
                    sx={{ bgcolor: "rgba(25, 118, 210, 0.08)", "&:hover": { bgcolor: "rgba(25, 118, 210, 0.15)" } }}
                >
                    <EditIcon fontSize="small" />
                </IconButton>
            </TableCell>
        </TableRow>
    );
}

export default React.memo(AIInstructionRow);
