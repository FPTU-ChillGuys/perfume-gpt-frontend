import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  IconButton,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { bannerService } from "@/services/bannerService";
import type { Banner } from "@/types/banner";

type HeroSlide = {
  id: string;
  label: string;
  title: string[];
  description: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  mobileImage: string;
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
    primaryCta: { label: "Mua ngay", href: "/products" },
    secondaryCta: { label: "Chi tiết", href: "/products" },
    mobileImage:
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
    primaryCta: { label: "Đặt giữ chỗ", href: "/products" },
    secondaryCta: { label: "Trải nghiệm thử", href: "/products" },
    mobileImage:
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
    primaryCta: { label: "Khám phá", href: "/products" },
    secondaryCta: { label: "Tư vấn cá nhân", href: "/products" },
    mobileImage:
      "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=900&q=80",
    backgroundImage:
      "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1600&q=80",
  },
];

const FALLBACK_PRIMARY_CTA = { label: "Khám phá ngay", href: "/products" };
const FALLBACK_SECONDARY_CTA = {
  label: "Xem bộ sưu tập",
  href: "/products",
};
const FALLBACK_HERO_IMAGE =
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=80";

const ensureMinimumSlides = (candidate: HeroSlide[]): HeroSlide[] => {
  if (candidate.length >= 3) {
    return candidate;
  }

  const fallbackPool = heroSlides.filter(
    (slide) => !candidate.some((item) => item.id === slide.id),
  );
  const extended = [...candidate];
  const pool = fallbackPool.length > 0 ? fallbackPool : [...heroSlides];
  if (pool.length === 0) {
    return extended;
  }
  let index = 0;

  while (extended.length < 3) {
    const fallbackSlide = pool[index % pool.length];
    if (!fallbackSlide) {
      break;
    }
    extended.push({
      ...fallbackSlide,
      id: `${fallbackSlide.id}-fallback-${index}`,
    });
    index += 1;
  }

  return extended;
};

const resolveBannerLink = (banner: Banner): string => {
  if (!banner.linkTarget) return "/products";
  switch (banner.linkType) {
    case "Product":
      return `/products/${banner.linkTarget}`;
    case "ProductVariant":
      return `/products/${banner.linkTarget}`;
    case "Brand":
      return `/products?brand=${banner.linkTarget}`;
    case "Campaign":
    default:
      return banner.linkTarget.startsWith("/")
        ? banner.linkTarget
        : `/${banner.linkTarget}`;
  }
};

const mapBannerToSlide = (banner: Banner): HeroSlide => {
  const normalizedTitle = (banner.title || "PerfumeGPT")
    .split(/\n|\|/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  const href = resolveBannerLink(banner);
  // Only use altText as the overline label — never expose internal enum values
  const label = banner.altText?.trim() || "";
  return {
    id: banner.id,
    label,
    title: normalizedTitle.length
      ? normalizedTitle
      : [banner.title || "PerfumeGPT"],
    description: label || "Khám phá hương thơm được tuyển chọn dành riêng cho bạn.",
    primaryCta: {
      label: FALLBACK_PRIMARY_CTA.label,
      href,
    },
    secondaryCta: FALLBACK_SECONDARY_CTA,
    mobileImage:
      banner.mobileImageUrl || banner.imageUrl || FALLBACK_HERO_IMAGE,
    backgroundImage: banner.imageUrl || FALLBACK_HERO_IMAGE,
  };
};

/**
 * Module-level cache of URLs that are already in the browser's HTTP cache.
 * Persists across component re-mounts so we never shimmer a cached image.
 */
const imageLoadCache = new Set<string>();

/** Download an image URL imperatively; marks it in the cache when done. */
const preloadImage = (src: string): Promise<void> =>
  new Promise((resolve) => {
    if (imageLoadCache.has(src)) {
      resolve();
      return;
    }
    const img = new Image();
    img.onload = () => {
      imageLoadCache.add(src);
      resolve();
    };
    img.onerror = () => resolve(); // resolve anyway — gradient fallback covers it
    img.src = src;
  });

export const HeroSection = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [activeIndex, setActiveIndex] = useState(0);
  const [slides, setSlides] = useState<HeroSlide[]>([...heroSlides]);
  const totalSlides = slides.length;

  /**
   * loadedUrls: a STATE Set so that when a new URL finishes downloading,
   * React re-renders and `isImageLoaded` / slide opacity reads fresh data.
   * Seeded from the module-level cache so already-downloaded images show
   * immediately on re-mount.
   */
  const [loadedUrls, setLoadedUrls] = useState<Set<string>>(
    () => new Set(imageLoadCache),
  );

  /** Preload all slide images whenever the slides list changes. */
  useEffect(() => {
    let cancelled = false;
    slides.forEach((slide) => {
      const urls = [slide.backgroundImage, slide.mobileImage].filter(Boolean);
      urls.forEach((url) => {
        if (loadedUrls.has(url)) return; // already known — skip
        void preloadImage(url).then(() => {
          if (cancelled) return;
          // Produce a NEW Set reference so React detects the state change
          setLoadedUrls((prev) => new Set([...prev, url]));
        });
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides]);

  useEffect(() => {
    if (!totalSlides) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % totalSlides);
    }, SLIDE_INTERVAL);
    return () => window.clearInterval(timer);
  }, [totalSlides]);

  useEffect(() => {
    let mounted = true;
    const loadBanners = async () => {
      try {
        const data = await bannerService.getHomeBanners("HomeHeroSlider");
        const activeBanners = data.filter((banner) => banner.isActive);
        if (mounted && activeBanners.length > 0) {
          setSlides(ensureMinimumSlides(activeBanners.map(mapBannerToSlide)));
          setActiveIndex(0);
        }
      } catch (error) {
        console.error("Failed to load hero banners", error);
      }
    };
    void loadBanners();
    return () => {
      mounted = false;
    };
  }, []);

  const goToSlide = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  const goNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const goPrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  const activeSlide = slides[activeIndex % totalSlides];
  if (!activeSlide) {
    return null;
  }

  const currentBg = isMobile
    ? activeSlide.mobileImage
    : activeSlide.backgroundImage;

  const isImageLoaded = loadedUrls.has(currentBg);

  return (
    <Box
      sx={{
        position: "relative",
        // Fixed height prevents layout shift when switching slides
        height: { xs: 520, md: 560 },
        overflow: "hidden",
        color: "white",
        // Dark shimmer skeleton while the first image downloads
        background: `linear-gradient(110deg, #0f172a 30%, #1e293b 50%, #0f172a 70%)`,
        backgroundSize: "200% 100%",
        animation: isImageLoaded ? "none" : "heroShimmer 1.6s linear infinite",
        "@keyframes heroShimmer": {
          "0%": { backgroundPosition: "200% center" },
          "100%": { backgroundPosition: "-200% center" },
        },
      }}
    >
      {/* Per-slide image layer — absolute stack enables real CSS cross-fade */}
      {slides.map((slide, idx) => {
        const bgUrl = isMobile ? slide.mobileImage : slide.backgroundImage;
        const loaded = loadedUrls.has(bgUrl);
        return (
          <Box
            key={slide.id}
            aria-hidden="true"
            sx={{
              position: "absolute",
              inset: 0,
              zIndex: 0,
              backgroundImage: loaded
                ? `linear-gradient(135deg, rgba(15,23,42,0.72) 0%, rgba(15,23,42,0.55) 45%, rgba(15,23,42,0.35) 100%), url("${bgUrl}")`
                : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: idx === activeIndex && loaded ? 1 : 0,
              transition: "opacity 0.8s ease",
              pointerEvents: "none",
            }}
          />
        );
      })}
      <Container
        maxWidth="xl"
        sx={{
          height: "100%",
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          pt: { xs: 5, md: 8 },
          pb: { xs: 3, md: 4 },
        }}
      >
        <Grid container spacing={6} sx={{ alignItems: "flex-start" }}>
          <Grid size={{ xs: 12, md: 8 }}>
            {/* Overline: use banner altText if set, otherwise show slide counter */}
            <Typography
              variant="overline"
              sx={{
                color: "rgba(255,255,255,0.6)",
                letterSpacing: 5,
                mb: 1.5,
                display: "block",
                fontSize: "0.65rem",
                fontWeight: 600,
              }}
            >
              {activeSlide.label || "PERFUMEGPT"}
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
              sx={{
                color: "rgba(255,255,255,0.8)",
                mb: 4,
                maxWidth: 520,
                lineHeight: 1.7,
              }}
            >
              {activeSlide.description}
            </Typography>
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
        </Grid>

        {/* Controls: dot indicators + prev/next — pinned to bottom via flexbox */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            {slides.map((slide, index) => (
              <Box
                key={slide.id}
                component="button"
                type="button"
                onClick={() => goToSlide(index)}
                aria-label={`Chuyển đến banner ${index + 1}`}
                sx={{
                  width: index === activeIndex ? 36 : 12,
                  height: 12,
                  borderRadius: 999,
                  border: "none",
                  cursor: "pointer",
                  backgroundColor:
                    index === activeIndex ? "white" : "rgba(255,255,255,0.35)",
                  transition: "all 0.3s ease",
                  p: 0,
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
