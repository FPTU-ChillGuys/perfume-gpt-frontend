import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { SupplierCatalogPage } from "./SupplierCatalogPage";
import { supplierService } from "../services/supplierService";
import { Box, CircularProgress, Alert, Button } from "@mui/material";
import { ArrowBack } from "@mui/icons-material";

export const SupplierCatalogRoute = () => {
  const { supplierId } = useParams<{ supplierId: string }>();
  const navigate = useNavigate();
  const [supplierName, setSupplierName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadSupplier = async () => {
      if (!supplierId || isNaN(parseInt(supplierId))) {
        setError("ID nhà cung cấp không hợp lệ");
        setIsLoading(false);
        return;
      }

      try {
        const supplier = await supplierService.getById(parseInt(supplierId));
        setSupplierName(supplier.name || "");
      } catch (err: any) {
        setError(err?.message || "Không thể tải thông tin nhà cung cấp");
      } finally {
        setIsLoading(false);
      }
    };

    loadSupplier();
  }, [supplierId]);

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: 400,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate("/admin/suppliers")}
        >
          Quay lại danh sách nhà cung cấp
        </Button>
      </Box>
    );
  }

  return (
    <SupplierCatalogPage
      supplierId={parseInt(supplierId!)}
      supplierName={supplierName}
    />
  );
};
