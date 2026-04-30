import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, Button, CircularProgress, Container, Typography } from "@mui/material";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import { pageService } from "@/services/pageService";
import type { StaticPage } from "@/services/pageService";
import { MainLayout } from "@/layouts/MainLayout";

// Quill snow styles are needed so inline styles in htmlContent render correctly
import "react-quill-new/dist/quill.snow.css";

export const StaticPageViewPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [page, setPage] = useState<StaticPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    pageService
      .getPageBySlug(slug)
      .then((data) => {
        if (!cancelled) setPage(data);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Không tìm thấy trang");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <MainLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  if (error || !page) {
    return (
      <MainLayout>
        <Container maxWidth="md" sx={{ py: 12, textAlign: "center" }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Trang không tồn tại
          </Typography>
          <Typography color="text.secondary" fontSize="1.1rem" mb={4}>
            Rất tiếc, nội dung bạn đang tìm kiếm không tồn tại hoặc đã bị gỡ bỏ.
          </Typography>
        </Container>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Box sx={{ minHeight: "60vh", py: { xs: 4, md: 8 } }}>
        <Container maxWidth="lg">
          <Box
            sx={{
              backgroundColor: "background.paper",
              borderRadius: 2,
              p: { xs: 3, md: 6 },
              boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
            }}
          >
            {/* Rich-text content rendered safely */}
            <Box
              className="ql-editor"
              sx={{
                padding: 0,
                "& *": { fontFamily: "inherit" },
                "& img": {
                  maxWidth: "100%",
                  borderRadius: 2,
                  my: 3,
                  display: "block",
                },
                "& h1": { mt: 2, mb: 3, fontSize: { xs: "1.75rem", md: "2.25rem" }, fontWeight: 700 },
                "& h2": { mt: 4, mb: 2, fontSize: { xs: "1.5rem", md: "1.75rem" }, fontWeight: 600 },
                "& h3": { mt: 3, mb: 1.5, fontSize: { xs: "1.25rem", md: "1.5rem" }, fontWeight: 600 },
                "& p": { mb: 2, lineHeight: 1.8, color: "text.primary", fontSize: "1.05rem" },
                "& ul, & ol": { pl: 4, mb: 2, fontSize: "1.05rem", lineHeight: 1.8 },
                "& li": { mb: 1 },
              }}
              dangerouslySetInnerHTML={{ __html: page.htmlContent }}
            />
          </Box>
        </Container>
      </Box>
    </MainLayout>
  );
};
