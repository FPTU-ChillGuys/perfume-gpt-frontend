import React from "react";
import {
    Box,
    Chip,
    Collapse,
    IconButton,
    List,
    ListItem,
    ListItemText,
    TableCell,
    TableRow,
    Tooltip,
    Typography,
} from "@mui/material";
import {
    Delete as DeleteIcon,
    Edit as EditIcon,
    ExpandLess as ExpandLessIcon,
    ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";
import { QuestionType } from "@/types/survey";
import type { SurveyQuestion } from "@/types/survey";
import dayjs from "dayjs";

interface Props {
    item: SurveyQuestion;
    isExpanded: boolean;
    onToggle: (id: string) => void;
    onEdit: (item: SurveyQuestion) => void;
    onDelete: (item: SurveyQuestion) => void;
}

function SurveyQuestionRow({ item, isExpanded, onToggle, onEdit, onDelete }: Props) {
    return (
        <>
            <TableRow
                hover
                sx={{ cursor: "pointer" }}
                onClick={() => onToggle(item.id)}
            >
                <TableCell padding="checkbox">
                    <IconButton size="small">
                        {isExpanded ? (
                            <ExpandLessIcon fontSize="small" />
                        ) : (
                            <ExpandMoreIcon fontSize="small" />
                        )}
                    </IconButton>
                </TableCell>
                <TableCell>
                    <Typography fontWeight={500} sx={{ fontSize: "0.9rem" }}>
                        {item.question}
                    </Typography>
                </TableCell>
                <TableCell>
                    <Chip
                        label={item.questionType === QuestionType.MULTIPLE ? "Nhiều đáp án" : "Một đáp án"}
                        size="small"
                        color={item.questionType === QuestionType.MULTIPLE ? "secondary" : "info"}
                        variant="outlined"
                    />
                </TableCell>
                <TableCell>
                    <Chip
                        label={`${item.answers.length} đáp án`}
                        size="small"
                        color="primary"
                        variant="outlined"
                    />
                </TableCell>
                <TableCell>
                    <Typography variant="body2" color="text.secondary">
                        {dayjs(item.createdAt).format("DD/MM/YYYY HH:mm")}
                    </Typography>
                </TableCell>
                <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                    <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}>
                        <Tooltip title="Chỉnh sửa">
                            <IconButton
                                size="small"
                                color="primary"
                                onClick={() => onEdit(item)}
                                sx={{
                                    bgcolor: "rgba(25,118,210,0.06)",
                                    "&:hover": { bgcolor: "rgba(25,118,210,0.14)" },
                                }}
                            >
                                <EditIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Xóa câu hỏi">
                            <IconButton
                                size="small"
                                color="error"
                                onClick={() => onDelete(item)}
                                sx={{
                                    bgcolor: "rgba(211,47,47,0.06)",
                                    "&:hover": { bgcolor: "rgba(211,47,47,0.14)" },
                                }}
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </TableCell>
            </TableRow>

            {/* Expandable answers */}
            <TableRow>
                <TableCell colSpan={6} sx={{ p: 0, border: isExpanded ? undefined : "none" }}>
                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Box sx={{ bgcolor: "#fafafa", px: 4, py: 2 }}>
                            <Typography
                                variant="subtitle2"
                                fontWeight="bold"
                                color="text.secondary"
                                sx={{ mb: 1 }}
                            >
                                Danh sách đáp án:
                            </Typography>
                            <List dense disablePadding>
                                {item.answers.map((ans, idx) => (
                                    <ListItem key={ans.id} disablePadding sx={{ py: 0.25 }}>
                                        <ListItemText
                                            primary={
                                                <Typography variant="body2" color="text.primary">
                                                    {idx + 1}. {ans.answer}
                                                </Typography>
                                            }
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </>
    );
}

export default React.memo(SurveyQuestionRow);
