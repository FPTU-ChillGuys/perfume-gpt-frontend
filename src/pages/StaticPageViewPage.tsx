import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { alpha } from "@mui/material/styles";
import {
  Box,
  CircularProgress,
  Container,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  Collapse,
  Paper,
} from "@mui/material";
import {
  ExpandLess,
  ExpandMore,
  ShoppingCartOutlined,
  GavelOutlined,
  HandymanOutlined,
  InfoOutlined,
  ArticleOutlined,
} from "@mui/icons-material";
import { pageService } from "@/services/pageService";
import type { StaticPage } from "@/services/pageService";
import { MainLayout } from "@/layouts/MainLayout";

// ─── Sidebar category config ─────────────────────────────────────────────────
interface SidebarCategory {
  label: string;
  icon: React.ReactNode;
  /** Slugs (or slug prefixes) that belong to this category */
  slugPatterns: string[];
}

const SIDEBAR_CATEGORIES: SidebarCategory[] = [
  {
    label: "Hỗ Trợ Khách Hàng",
    icon: <InfoOutlined fontSize="small" />,
    slugPatterns: ["huong-dan", "mua-hang", "thanh-toan", "van-chuyen", "giao-hang"],
  },
  {
    label: "Chính sách",
    icon: <GavelOutlined fontSize="small" />,
    slugPatterns: ["chinh-sach", "bao-mat", "hoan-tra", "doi-tra", "bao-hanh", "privacy", "policy"],
  },
  {
    label: "Hướng dẫn sử dụng",
    icon: <HandymanOutlined fontSize="small" />,
    slugPatterns: ["su-dung", "huong-dan-su-dung", "cach-dung", "usage", "guide"],
  },
  {
    label: "Về Chúng Tôi",
    icon: <InfoOutlined fontSize="small" />,
    slugPatterns: ["gioi-thieu", "gioi-thieu-ve-perfumegpt", "ve-chung-toi", "about", "lich-su", "tam-nhin"],
  },
];

/** Assign a page to the first matching category, or "Khác" */
const getCategoryIndex = (slug: string): number => {
  const lower = slug.toLowerCase();
  for (let i = 0; i < SIDEBAR_CATEGORIES.length; i++) {
    if (SIDEBAR_CATEGORIES[i]?.slugPatterns.some((p) => lower.includes(p))) {
      return i;
    }
  }
  return -1; // uncategorised
};

// ─── Sidebar component ────────────────────────────────────────────────────────
interface SidebarProps {
  pages: StaticPage[];
  currentSlug: string;
}

const PageSidebar = ({ pages, currentSlug }: SidebarProps) => {
  const [openCats, setOpenCats] = useState<boolean[]>(
    SIDEBAR_CATEGORIES.map(() => true),
  );
  const [openOther, setOpenOther] = useState(true);

  const toggle = (i: number) =>
    setOpenCats((prev) => prev.map((v, idx) => (idx === i ? !v : v)));

  // Group pages by category
  const grouped: StaticPage[][] = SIDEBAR_CATEGORIES.map(() => []);
  const other: StaticPage[] = [];

  pages.forEach((p) => {
    const idx = getCategoryIndex(p.slug);
    if (idx >= 0) grouped[idx]?.push(p);
    else other.push(p);
  });

  // Auto-expand the category containing the current page
  useEffect(() => {
    const idx = getCategoryIndex(currentSlug);
    if (idx >= 0) {
      setOpenCats((prev) => prev.map((v, i) => (i === idx ? true : v)));
    }
  }, [currentSlug]);

  const renderLink = (page: StaticPage) => {
    const isActive = page.slug === currentSlug;
    return (
      <ListItemButton
        key={page.id}
        component={Link}
        to={`/pages/${page.slug}`}
        selected={isActive}
        sx={{
          pl: 3.5,
          py: 0.75,
          borderRadius: 1,
          mb: 0.25,
          // active: dùng màu primary của hệ thống
          color: isActive ? "primary.main" : "text.secondary",
          borderLeft: isActive ? "3px solid" : "3px solid transparent",
          borderLeftColor: isActive ? "primary.main" : "transparent",
          "&.Mui-selected": {
            backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.07),
            color: "primary.main",
            "&:hover": {
              backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.12),
            },
          },
          "&:hover": {
            backgroundColor: (theme) => alpha(theme.palette.secondary.main, 0.05),
          },
          transition: "all 0.15s ease",
        }}
      >
        <ListItemText
          primary={page.title}
          primaryTypographyProps={{
            fontSize: "0.875rem",
            fontWeight: isActive ? 600 : 400,
            lineHeight: 1.5,
            color: isActive ? "primary.main" : "text.secondary",
          }}
        />
      </ListItemButton>
    );
  };

  return (
    <Paper
      elevation={0}
      sx={{
        width: 260,
        minWidth: 240,
        flexShrink: 0,
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
        position: "sticky",
        top: 80,
        maxHeight: "calc(100vh - 100px)",
        overflowY: "auto",
        backgroundColor: "background.paper",
        "&::-webkit-scrollbar": { width: 4 },
        "&::-webkit-scrollbar-thumb": {
          backgroundColor: (theme) => alpha(theme.palette.secondary.main, 0.2),
          borderRadius: 4,
        },
      }}
    >
      {/* Header — dùng màu primary (đỏ) của hệ thống */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          backgroundColor: "primary.main",
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <ArticleOutlined sx={{ color: "white", fontSize: 18 }} />
        <Typography
          variant="subtitle2"
          sx={{ color: "white", fontWeight: 700, letterSpacing: 0.8, fontSize: "0.8rem" }}
        >
          MỤC LỤC
        </Typography>
      </Box>

      <List dense disablePadding sx={{ py: 1 }}>
        {SIDEBAR_CATEGORIES.map((cat, idx) => {
          const catPages = grouped[idx];
          if (!catPages || catPages.length === 0) return null;
          return (
            <Box key={cat.label}>
              <ListItemButton
                onClick={() => toggle(idx)}
                sx={{
                  px: 2,
                  py: 0.875,
                  "&:hover": {
                    backgroundColor: (theme) => alpha(theme.palette.secondary.main, 0.05),
                  },
                }}
              >
                <Box sx={{ mr: 1, color: "secondary.main", display: "flex", opacity: 0.7 }}>
                  {cat.icon}
                </Box>
                <ListItemText
                  primary={cat.label}
                  primaryTypographyProps={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: "text.secondary",
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                  }}
                />
                {openCats[idx] ? (
                  <ExpandLess fontSize="small" sx={{ color: "text.disabled", fontSize: 16 }} />
                ) : (
                  <ExpandMore fontSize="small" sx={{ color: "text.disabled", fontSize: 16 }} />
                )}
              </ListItemButton>

              <Collapse in={openCats[idx]} timeout="auto" unmountOnExit>
                <List dense disablePadding sx={{ px: 1 }}>
                  {catPages?.map(renderLink)}
                </List>
              </Collapse>
              <Divider sx={{ mx: 2, my: 0.5 }} />
            </Box>
          );
        })}

        {/* Uncategorised pages */}
        {other.length > 0 && (
          <Box>
            <ListItemButton
              onClick={() => setOpenOther((v) => !v)}
              sx={{
                px: 2,
                py: 0.875,
                "&:hover": {
                  backgroundColor: (theme) => alpha(theme.palette.secondary.main, 0.05),
                },
              }}
            >
              <Box sx={{ mr: 1, color: "secondary.main", display: "flex", opacity: 0.7 }}>
                <ArticleOutlined fontSize="small" />
              </Box>
              <ListItemText
                primary="Khác"
                primaryTypographyProps={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: "text.secondary",
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                }}
              />
              {openOther ? (
                <ExpandLess fontSize="small" sx={{ color: "text.disabled", fontSize: 16 }} />
              ) : (
                <ExpandMore fontSize="small" sx={{ color: "text.disabled", fontSize: 16 }} />
              )}
            </ListItemButton>
            <Collapse in={openOther} timeout="auto" unmountOnExit>
              <List dense disablePadding sx={{ px: 1 }}>
                {other.map(renderLink)}
              </List>
            </Collapse>
          </Box>
        )}
      </List>
    </Paper>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────
export const StaticPageViewPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [page, setPage] = useState<StaticPage | null>(null);
  const [sidebarPages, setSidebarPages] = useState<StaticPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load sidebar pages list (published only)
  useEffect(() => {
    pageService
      .getPages({ IsPublished: true, PageSize: 100 })
      .then(({ items }) => setSidebarPages(items))
      .catch(() => {/* sidebar is non-critical, ignore errors */});
  }, []);

  // Load current page content
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
      <Box sx={{ minHeight: "60vh", py: { xs: 3, md: 6 } }}>
        <Container maxWidth="xl">
          <Box
            sx={{
              display: "flex",
              gap: 3,
              alignItems: "flex-start",
            }}
          >
            {/* ── Left sidebar (hidden on mobile) ── */}
            <Box sx={{ display: { xs: "none", md: "block" } }}>
              <PageSidebar pages={sidebarPages} currentSlug={slug ?? ""} />
            </Box>

            {/* ── Main content ── */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Paper
                elevation={0}
                sx={{
                  borderRadius: 2,
                  p: { xs: 3, md: 5 },
                  border: "1px solid",
                  borderColor: "divider",
                  backgroundColor: "background.paper",
                }}
              >
                {/* Rich-text content rendered safely */}
                <Box
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
                    "& ul": {
                      pl: 4,
                      mb: 2,
                      fontSize: "1.05rem",
                      lineHeight: 1.8,
                      listStyleType: "disc",
                    },
                    "& ol": {
                      pl: 4,
                      mb: 2,
                      fontSize: "1.05rem",
                      lineHeight: 1.8,
                      listStyleType: "decimal",
                    },
                    "& li": {
                      mb: 1,
                      display: "list-item",
                    },
                  }}
                  dangerouslySetInnerHTML={{ __html: page.htmlContent }}
                />
              </Paper>
            </Box>
          </Box>
        </Container>
      </Box>
    </MainLayout>
  );
};
