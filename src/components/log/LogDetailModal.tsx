import {
    Box,
    Typography,
    Paper,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Divider,
    List,
    ListItem,
    ListItemText,
} from "@mui/material";
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import type { UserLog } from "@/types/log";

interface LogDetailModalProps {
    open: boolean;
    onClose: () => void;
    selectedLog: UserLog | null;
}

const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString("vi-VN");
};

export const LogDetailModal = ({ open, onClose, selectedLog }: LogDetailModalProps) => {
    if (!selectedLog) return null;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ fontWeight: "bold" }}>Chi tiết Log: {selectedLog.id}</DialogTitle>
            <DialogContent dividers>
                {selectedLog.userId && (
                    <Typography variant="subtitle1" gutterBottom>
                        <strong>User ID:</strong> {selectedLog.userId}
                    </Typography>
                )}

                {/* Messages Accordions */}
                <Typography variant="h6" gutterBottom sx={{ mt: 2, fontWeight: 600 }}>Message Logs ({selectedLog.userMessageLogs?.length || 0})</Typography>
                {selectedLog.userMessageLogs && selectedLog.userMessageLogs.length > 0 ? (
                    selectedLog.userMessageLogs.map((msgLog) => {
                        let parsedMessage = msgLog.message?.message;
                        try {
                            const parsed = JSON.parse(parsedMessage);
                            if (parsed.message) parsedMessage = parsed.message;
                        } catch {
                            // Ignore, keep as raw string if it's not JSON
                        }
                        return (
                            <Accordion key={msgLog.id} variant="outlined" sx={{ mb: 1 }}>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Typography fontWeight={500} color={msgLog.message?.sender === 'user' ? 'primary' : 'secondary'}>
                                        {formatDate(msgLog.createdAt)} - [{msgLog.message?.sender?.toUpperCase()}]
                                    </Typography>
                                </AccordionSummary>
                                <AccordionDetails sx={{ bgcolor: "grey.50", p: 2 }}>
                                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                                        {parsedMessage}
                                    </Typography>
                                </AccordionDetails>
                            </Accordion>
                        );
                    })
                ) : (
                    <Typography variant="body2" color="text.secondary">Không có tin nhắn nào</Typography>
                )}

                <Divider sx={{ my: 3 }} />

                {/* Quiz Logs Accordions */}
                <Typography variant="h6" gutterBottom sx={{ mt: 2, fontWeight: 600 }}>Quiz Logs ({selectedLog.userQuizLogs?.length || 0})</Typography>
                {selectedLog.userQuizLogs && selectedLog.userQuizLogs.length > 0 ? (
                    <List disablePadding>
                        {selectedLog.userQuizLogs.map((quizLog) => (
                            <Paper key={quizLog.id} variant="outlined" sx={{ mb: 1 }}>
                                <ListItem alignItems="flex-start">
                                    <ListItemText
                                        primary={
                                            <Typography variant="subtitle2" fontWeight={600} color="primary.dark">
                                                Q: {quizLog.quizQuesAnsDetail?.question?.question || "No Question"}
                                            </Typography>
                                        }
                                        secondary={
                                            <Typography variant="body2" sx={{ mt: 0.5, color: "text.primary" }}>
                                                <strong>A:</strong> {quizLog.quizQuesAnsDetail?.answer?.answer || "No Answer"}
                                                <Typography component="span" variant="caption" sx={{ display: 'block', mt: 0.5, color: "text.secondary" }}>
                                                    {formatDate(quizLog.createdAt)}
                                                </Typography>
                                            </Typography>
                                        }
                                    />
                                </ListItem>
                            </Paper>
                        ))}
                    </List>
                ) : (
                    <Typography variant="body2" color="text.secondary">Không có dữ liệu quiz</Typography>
                )}

                <Divider sx={{ my: 3 }} />

                {/* Search Logs */}
                <Typography variant="h6" gutterBottom sx={{ mt: 2, fontWeight: 600 }}>Search Logs ({selectedLog.userSearchLogs?.length || 0})</Typography>
                {selectedLog.userSearchLogs && selectedLog.userSearchLogs.length > 0 ? (
                    <Box component="pre" sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, overflowX: 'auto', fontSize: '0.875rem', maxHeight: 300 }}>
                        {JSON.stringify(selectedLog.userSearchLogs, null, 2)}
                    </Box>
                ) : (
                    <Typography variant="body2" color="text.secondary">Không có dữ liệu tìm kiếm</Typography>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} variant="contained" color="primary">Đóng</Button>
            </DialogActions>
        </Dialog>
    );
};
