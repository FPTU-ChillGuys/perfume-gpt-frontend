import { type ReactNode } from "react";
import { Box } from "@mui/material";
import { Header } from "../components/layout/Header";
import { Footer } from "../components/layout/Footer";
import { ScrollToTop } from "../components/common/ScrollToTop";

interface MainLayoutProps {
  children: ReactNode;
  stickyHeader?: boolean;
}

export const MainLayout = ({ children, stickyHeader = true }: MainLayoutProps) => {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
      }}
    >
      <Header sticky={stickyHeader} />
      <Box component="main" sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {children}
      </Box>
      <Footer />
      <ScrollToTop />
    </Box>
  );
};
