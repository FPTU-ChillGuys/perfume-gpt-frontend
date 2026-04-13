import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Stack,
  Divider,
  Paper,
  Chip,
  alpha,
} from "@mui/material";
import QuizIcon from "@mui/icons-material/Quiz";
import QuestionAnswerIcon from "@mui/icons-material/QuestionAnswer";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import { quizService } from "@/services/ai/quizService";
import { useAuth } from "@/hooks/useAuth";
import type { UserQuizRecord } from "@/types/quiz";

export const QuizHistorySection = () => {
  const { user } = useAuth();
  const [record, setRecord] = useState<UserQuizRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    loadQuizHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadQuizHistory = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await quizService.getUserQuizRecord(user!.id);
      setRecord(res.data);
    } catch (err: any) {
      if (err?.message?.includes("not found") || err?.message?.includes("404")) {
        setRecord(null);
      } else {
        setError(err.message || "Không thể tải lịch sử khảo sát");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <Box textAlign="center" py={8}>
        <CircularProgress size={32} />
        <Typography variant="body2" color="text.secondary" mt={1.5}>
          Đang tải lịch sử khảo sát...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
          }}
        >
          <QuizIcon color="primary" />
        </Box>
        <Typography variant="h6" fontWeight="bold">
          Lịch sử khảo sát hương
        </Typography>
      </Stack>
      <Divider sx={{ mb: 3 }} />

      {error && (
        <Paper
          sx={{
            p: 2,
            mb: 2,
            bgcolor: (theme) => alpha(theme.palette.error.main, 0.06),
            border: "1px solid",
            borderColor: (theme) => alpha(theme.palette.error.main, 0.2),
            borderRadius: 2,
          }}
        >
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        </Paper>
      )}

      {!record || !record.details?.length ? (
        <Paper
          variant="outlined"
          sx={{
            py: 6,
            textAlign: "center",
            borderStyle: "dashed",
            borderRadius: 3,
          }}
        >
          <QuizIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
          <Typography color="text.secondary" fontWeight={500}>
            Bạn chưa thực hiện khảo sát nào.
          </Typography>
          <Typography variant="caption" color="text.disabled" mt={0.5} display="block">
            Hãy làm bài khảo sát để nhận gợi ý nước hoa phù hợp!
          </Typography>
        </Paper>
      ) : (
        <Box>
          {/* Date badge */}
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            mb={2.5}
          >
            <CalendarTodayIcon sx={{ fontSize: 16, color: "text.secondary" }} />
            <Typography variant="body2" color="text.secondary">
              Thực hiện lúc:{" "}
              <Typography
                component="span"
                variant="body2"
                fontWeight={600}
                color="text.primary"
              >
                {formatDate(record.createdAt)}
              </Typography>
            </Typography>
            <Chip
              label={`${record.details.length} câu hỏi`}
              size="small"
              variant="outlined"
              sx={{ borderRadius: 1.5, ml: "auto" }}
            />
          </Stack>

          {/* Q&A list */}
          <Stack spacing={0}>
            {record.details.map((detail, index) => (
              <Paper
                key={detail.id}
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: index === 0
                    ? "12px 12px 0 0"
                    : index === record.details.length - 1
                      ? "0 0 12px 12px"
                      : 0,
                  borderTop: index > 0 ? "none" : undefined,
                  transition: "background-color 0.15s",
                  "&:hover": {
                    bgcolor: (theme) =>
                      alpha(theme.palette.primary.main, 0.02),
                  },
                }}
              >
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  {/* Number badge */}
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: (theme) =>
                        alpha(theme.palette.primary.main, 0.08),
                      color: "primary.main",
                      fontWeight: 700,
                      fontSize: "0.8rem",
                      flexShrink: 0,
                      mt: 0.25,
                    }}
                  >
                    {index + 1}
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    {/* Question */}
                    <Stack
                      direction="row"
                      alignItems="flex-start"
                      spacing={0.75}
                    >
                      <QuestionAnswerIcon
                        sx={{
                          fontSize: 16,
                          color: "text.secondary",
                          mt: 0.25,
                          flexShrink: 0,
                        }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {detail.question}
                      </Typography>
                    </Stack>

                    {/* Answer */}
                    <Stack
                      direction="row"
                      alignItems="flex-start"
                      spacing={0.75}
                      mt={0.75}
                    >
                      <CheckCircleOutlineIcon
                        sx={{
                          fontSize: 16,
                          color: "success.main",
                          mt: 0.25,
                          flexShrink: 0,
                        }}
                      />
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        color="text.primary"
                      >
                        {detail.answer}
                      </Typography>
                    </Stack>
                  </Box>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
};
