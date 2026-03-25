import { Breadcrumbs, Link, Typography, type SxProps, type Theme } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AppBreadcrumbsProps {
  items: BreadcrumbItem[];
  sx?: SxProps<Theme>;
}

export const AppBreadcrumbs = ({ items, sx }: AppBreadcrumbsProps) => (
  <Breadcrumbs
    separator={<NavigateNextIcon fontSize="small" />}
    aria-label="breadcrumb"
    sx={{ fontSize: "0.875rem", ...sx }}
  >
    {items.map((item, index) => {
      const isLast = index === items.length - 1;
      return isLast || !item.href ? (
        <Typography key={index} color="text.primary" fontSize="inherit">
          {item.label}
        </Typography>
      ) : (
        <Link
          key={index}
          component={RouterLink}
          to={item.href}
          color="inherit"
          underline="hover"
          fontSize="inherit"
        >
          {item.label}
        </Link>
      );
    })}
  </Breadcrumbs>
);
