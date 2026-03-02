import { useEffect, useState } from "react";
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  IconButton,
} from "@mui/material";
import { ChevronLeft, ChevronRight } from "lucide-react";

type HeroSlide = {
  id: string;
  label: string;
  title: string[];
  description: string;
  notes: string[];
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  bottleImage: string;
  backgroundImage: string;
};

const SLIDE_INTERVAL = 8000;

const heroSlides: readonly HeroSlide[] = [
  {
    id: "elixir-absolu",
    label: "Exclusive Release",
    title: ["ELIXIR", "ABSOLU"],
    description:
      "Khơi gợi những nốt hương quyến rũ với hoa hồng, vani và xạ hương chuẩn haute couture.",
    notes: ["Rose", "Vanilla", "White Musk"],
    primaryCta: { label: "Mua ngay", href: "/products/elixir-absolu" },
    secondaryCta: { label: "Chi tiết", href: "/collections/exclusive" },
    bottleImage:
        "https://images.unsplash.com/photo-1615634260167-c8cdede054de?auto=format&fit=crop&w=900&q=80",
    backgroundImage:
      "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=80",
  },
  {
    id: "gris-dior",
    label: "Limited Re-Edition",
    title: ["GRIS", "DIOR"],
    description:
      "Bản phối 2026 mang sắc xám biểu tượng cùng hoa hồng Grasse và patchouli đầy cá tính.",
    notes: ["Rose", "Patchouli", "Cedar"],
    primaryCta: { label: "Đặt giữ chỗ", href: "/products/gris-dior" },
    secondaryCta: { label: "Trải nghiệm thử", href: "/booking" },
    bottleImage:
      "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=900&q=80",
    backgroundImage:
       "https://images.unsplash.com/photo-1508057198894-247b23fe5ade?auto=format&fit=crop&w=1600&q=80",
  },
  {
    id: "saffron-veil",
    label: "Boutique Drop",
    title: ["SAFFRON", "VEIL"],
    description:
      "Định nghĩa lại mùi hương tiệc đêm với nghệ tây Ma-rốc, gỗ tuyết tùng và hổ phách.",
    notes: ["Saffron", "Cedar", "Amber"],
    primaryCta: { label: "Khám phá", href: "/collections/night" },
    secondaryCta: { label: "Tư vấn cá nhân", href: "/concierge" },
    bottleImage:
      "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=900&q=80",
    backgroundImage:
       "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1600&q=80",
  },
];

const TOTAL_SLIDES = heroSlides.length;

export const HeroSection = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % TOTAL_SLIDES);
    }, SLIDE_INTERVAL);
    return () => window.clearInterval(timer);
  }, []);

  const goToSlide = (index: number) => {
    setActiveIndex(index);
  };

  const goNext = () => {
    setActiveIndex((prev) => (prev + 1) % TOTAL_SLIDES);
  };

  const goPrev = () => {
    setActiveIndex((prev) => (prev - 1 + TOTAL_SLIDES) % TOTAL_SLIDES);
  };

  const activeSlide = heroSlides[activeIndex];

  return (
    <Box
      sx={{
        position: "relative",
        minHeight: { xs: 520, md: 560 },
        overflow: "hidden",
        color: "white",
        backgroundImage: `linear-gradient(135deg, rgba(15,23,42,0.96) 0%, rgba(15,23,42,0.88) 45%, rgba(15,23,42,0.65) 100%), url(${activeSlide.backgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        transition: "background-image 0.8s ease",
      }}
    >
      <Container
        maxWidth="xl"
        sx={{
          height: "100%",
          position: "relative",
          py: { xs: 6, md: 10 },
        }}
      >
        <Grid container spacing={6} sx={{ alignItems: "center" }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography
              variant="overline"
              sx={{
                color: "rgba(255,255,255,0.7)",
                letterSpacing: 4,
                mb: 2,
                display: "block",
              }}
            >
              {activeSlide.label}
            </Typography>
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: "3rem", md: "4.2rem" },
                fontWeight: 700,
                lineHeight: 1.1,
                mb: 3,
              }}
              aria-live="polite"
            >
              {activeSlide.title.map((line, index) => (
                <span key={`${activeSlide.id}-${line}`}>
                  {line}
                  {index === 0 && <br />}
                </span>
              ))}
            </Typography>
            <Typography
              variant="body1"
              sx={{ color: "rgba(255,255,255,0.8)", mb: 4, maxWidth: 520, lineHeight: 1.7 }}
            >
              {activeSlide.description}
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mb: 4 }}>
              {activeSlide.notes.map((note) => (
                <Box
                  key={`${activeSlide.id}-${note}`}
                  sx={{
                    px: 2,
                    py: 0.5,
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.4)",
                    fontSize: 12,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                  }}
                >
                  {note}
                </Box>
              ))}
            </Box>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Button
                variant="contained"
                size="large"
                color="inherit"
                component="a"
                href={activeSlide.primaryCta.href}
                sx={{
                  bgcolor: "white",
                  color: "grey.900",
                  px: 4,
                  "&:hover": { bgcolor: "grey.100" },
                }}
              >
                {activeSlide.primaryCta.label}
              </Button>
              <Button
                variant="outlined"
                size="large"
                component="a"
                href={activeSlide.secondaryCta.href}
                sx={{
                  borderColor: "rgba(255,255,255,0.7)",
                  color: "white",
                  borderWidth: 2,
                  px: 4,
                  "&:hover": {
                    borderWidth: 2,
                    bgcolor: "rgba(255, 255, 255, 0.1)",
                  },
                }}
              >
                {activeSlide.secondaryCta.label}
              </Button>
            </Box>
          </Grid>

          <Grid
            size={{ xs: 12, md: 6 }}
            sx={{ display: "flex", justifyContent: "center" }}
          >
            <Box
              component="figure"
              sx={{
                width: { xs: "100%", md: 360 },
                height: { xs: 320, md: 420 },
                borderRadius: 6,
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.2)",
                backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02)), url(${activeSlide.bottleImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                boxShadow: "0 30px 120px rgba(15,23,42,0.45)",
                transition: "background-image 0.8s ease",
              }}
            />
          </Grid>
        </Grid>

        <Box
          sx={{
            mt: { xs: 4, md: 6 },
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", gap: 1 }}>
            {heroSlides.map((slide, index) => (
              <Box
                key={slide.id}
                component="button"
                type="button"
                onClick={() => goToSlide(index)}
                aria-label={`Chuyển đến banner ${slide.title.join(" ")}`}
                sx={{
                  width: index === activeIndex ? 36 : 12,
                  height: 12,
                  borderRadius: 999,
                  border: "none",
                  cursor: "pointer",
                  backgroundColor:
                    index === activeIndex
                      ? "white"
                      : "rgba(255,255,255,0.35)",
                  transition: "all 0.3s ease",
                }}
              />
            ))}
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <IconButton
              onClick={goPrev}
              aria-label="Banner trước"
              sx={{
                border: "1px solid rgba(255,255,255,0.4)",
                color: "white",
                "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
              }}
            >
              <ChevronLeft size={20} />
            </IconButton>
            <IconButton
              onClick={goNext}
              aria-label="Banner tiếp theo"
              sx={{
                border: "1px solid rgba(255,255,255,0.4)",
                color: "white",
                "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
              }}
            >
              <ChevronRight size={20} />
            </IconButton>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};
