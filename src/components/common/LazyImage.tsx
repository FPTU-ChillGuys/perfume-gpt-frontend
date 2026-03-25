import { useState } from "react";
import { Box, type SxProps, type Theme } from "@mui/material";

interface LazyImageProps {
  src?: string | null;
  alt?: string;
  sx?: SxProps<Theme>;
  fallbackSx?: SxProps<Theme>;
}

/**
 * Image with native lazy-loading and a blur-up placeholder while loading.
 */
export const LazyImage = ({ src, alt = "", sx, fallbackSx }: LazyImageProps) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <Box
        sx={{
          bgcolor: "grey.100",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...fallbackSx,
          ...sx,
        }}
      >
        <Box
          component="img"
          src="/placeholder-product.png"
          alt={alt}
          sx={{ width: "50%", opacity: 0.3 }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ position: "relative", overflow: "hidden", ...sx }}>
      {/* Blurred low-quality placeholder shown while loading */}
      {!loaded && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            bgcolor: "grey.100",
            backgroundImage: src ? `url(${src})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(12px)",
            transform: "scale(1.05)",
          }}
        />
      )}
      <Box
        component="img"
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        sx={{
          display: "block",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transition: "opacity 0.3s ease",
          opacity: loaded ? 1 : 0,
        }}
      />
    </Box>
  );
};
