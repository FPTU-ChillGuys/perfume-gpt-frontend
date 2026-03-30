import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TextField,
  InputAdornment,
  Stack,
  CircularProgress,
  Alert,
  TablePagination,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Category as CategoryIcon,
} from "@mui/icons-material";
import { AdminLayout } from "../layouts/AdminLayout";
import { productService } from "../services/productService";
import type { ProductListItem } from "../types/product";
import CreateProductDialog from "../components/product/CreateProductDialog";
import EditProductDialog from "../components/product/EditProductDialog";
import ManageProductVariantsDialog from "../components/product/ManageProductVariantsDialog";
import ConfirmDialog from "../components/common/ConfirmDialog";

type ProductCategoryTab =
  | "all"
  | "men"
  | "women"
  | "unisex"
  | "niche"
  | "giftset";

const PRODUCT_CATEGORY_TAB_ITEMS: Array<{
  key: ProductCategoryTab;
  label: string;
}> = [
  { key: "all", label: "Tất cả" },
  { key: "men", label: "Nước hoa Nam" },
  { key: "women", label: "Nước hoa Nữ" },
  { key: "unisex", label: "Unisex" },
  { key: "niche", label: "Niche" },
  { key: "giftset", label: "Gifset" },
];

const PRODUCT_CATEGORY_ID_BY_TAB: Record<
  Exclude<ProductCategoryTab, "all">,
  number
> = {
  women: 1,
  men: 2,
  unisex: 3,
  niche: 4,
  giftset: 5,
};

const resolveCategoryIdByTab = (tab: ProductCategoryTab) => {
  if (tab === "all") {
    return undefined;
  }

  return PRODUCT_CATEGORY_ID_BY_TAB[tab];
};

const ProductManagement = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryTab, setSelectedCategoryTab] =
    useState<ProductCategoryTab>("all");
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(
    null,
  );
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [variantProduct, setVariantProduct] = useState<ProductListItem | null>(
    null,
  );
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    productId: null as string | null,
    title: "",
    description: "",
  });

  const selectedCategoryId = resolveCategoryIdByTab(selectedCategoryTab);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await productService.getProducts({
        CategoryId: selectedCategoryId ?? undefined,
        PageNumber: page + 1,
        PageSize: rowsPerPage,
      });
      setProducts(response.items);
      setTotalCount(response.totalCount);
    } catch (err: any) {
      setError(err.message || "Không thể tải danh sách sản phẩm");
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, selectedCategoryId]);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    setPage(0);
  }, [selectedCategoryTab]);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleAddProduct = () => {
    setDialogOpen(true);
  };

  const handleEditProduct = (productId: string) => {
    setEditingProductId(productId);
    setEditDialogOpen(true);
  };

  const handleManageVariants = (product: ProductListItem) => {
    setVariantProduct(product);
    setVariantDialogOpen(true);
  };

  const requestDeleteProduct = (product: ProductListItem) => {
    if (!product.id) {
      return;
    }
    setConfirmDialog({
      open: true,
      productId: product.id ?? null,
      title: "Xoá sản phẩm",
      description: `Bạn có chắc chắn muốn xoá "${product.name || "sản phẩm"}"? Hành động này không thể hoàn tác.`,
    });
  };

  const handleCloseConfirmDialog = () => {
    if (deletingProductId) {
      return;
    }
    setConfirmDialog((prev) => ({ ...prev, open: false, productId: null }));
  };

  const handleConfirmDelete = async () => {
    if (!confirmDialog.productId) {
      handleCloseConfirmDialog();
      return;
    }

    try {
      setDeletingProductId(confirmDialog.productId);
      setError(null);
      await productService.deleteProduct(confirmDialog.productId);
      await fetchProducts();
      handleCloseConfirmDialog();
    } catch (err: any) {
      console.error("Error deleting product:", err);
      setError(err.message || "Không thể xoá sản phẩm");
    } finally {
      setDeletingProductId(null);
    }
  };

  const filteredProducts = products.filter(
    (product) =>
      product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.brandName?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditingProductId(null);
  };

  const handleCloseVariantDialog = () => {
    setVariantDialogOpen(false);
    setVariantProduct(null);
  };

  const getDescriptionPreview = (description?: string | null) => {
    if (!description) return "Chưa có mô tả";

    const container = document.createElement("div");
    const normalizedHtml = description
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li)>/gi, "\n");

    container.innerHTML = normalizedHtml;

    const plainText = (container.textContent || "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return plainText || "Chưa có mô tả";
  };

  return (
    <AdminLayout>
      <Box>
        <Paper sx={{ width: "100%", overflow: "hidden" }}>
          <Box sx={{ p: 3 }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              sx={{ mb: 3 }}
              justifyContent="space-between"
            >
              <TextField
                size="small"
                placeholder="Tìm kiếm sản phẩm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ minWidth: { xs: "100%", sm: 300 } }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddProduct}
                  sx={{ textTransform: "none" }}
                >
                  Thêm sản phẩm
                </Button>
              </Box>
            </Stack>

            <Paper variant="outlined" sx={{ mb: 3 }}>
              <Tabs
                value={selectedCategoryTab}
                onChange={(_, value: ProductCategoryTab) =>
                  setSelectedCategoryTab(value)
                }
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
              >
                {PRODUCT_CATEGORY_TAB_ITEMS.map((tab) => (
                  <Tab key={tab.key} value={tab.key} label={tab.label} />
                ))}
              </Tabs>
            </Paper>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {loading ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  py: 8,
                }}
              >
                <CircularProgress />
              </Box>
            ) : (
              <>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: "grey.50" }}>
                        <TableCell width="120">Hình ảnh</TableCell>
                        <TableCell>Tên sản phẩm</TableCell>
                        <TableCell>Thương hiệu</TableCell>
                        <TableCell>Danh mục</TableCell>
                        <TableCell align="center">Số biến thể</TableCell>
                        <TableCell>Mô tả</TableCell>
                        <TableCell align="center">Thao tác</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredProducts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                            <Typography variant="body2" color="text.secondary">
                              Không tìm thấy sản phẩm nào
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredProducts.map((product) => (
                          <TableRow key={product.id} hover>
                            <TableCell>
                              {product.primaryImage?.url ? (
                                <Box
                                  component="img"
                                  src={product.primaryImage.url}
                                  alt={product.name || "Product"}
                                  sx={{
                                    width: 80,
                                    height: 80,
                                    objectFit: "cover",
                                    borderRadius: 1,
                                    border: 1,
                                    borderColor: "grey.300",
                                  }}
                                />
                              ) : (
                                <Box
                                  sx={{
                                    width: 80,
                                    height: 80,
                                    bgcolor: "grey.200",
                                    borderRadius: 1,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    border: 1,
                                    borderColor: "grey.300",
                                  }}
                                >
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    No Image
                                  </Typography>
                                </Box>
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={500}>
                                {product.name || "N/A"}
                              </Typography>
                            </TableCell>
                            <TableCell>{product.brandName || "N/A"}</TableCell>
                            <TableCell>
                              {product.categoryName || "N/A"}
                            </TableCell>
                            <TableCell align="center">
                              {product.numberOfVariants ?? 0}
                            </TableCell>
                            <TableCell>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                  maxWidth: 300,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {getDescriptionPreview(product.description)}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleEditProduct(product.id!)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="secondary"
                                onClick={() => handleManageVariants(product)}
                              >
                                <CategoryIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => requestDeleteProduct(product)}
                                disabled={deletingProductId === product.id}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25, 50]}
                  component="div"
                  count={totalCount}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  labelRowsPerPage="Số dòng mỗi trang:"
                  labelDisplayedRows={({ from, to, count }) =>
                    `${from}-${to} của ${count !== -1 ? count : `nhiều hơn ${to}`}`
                  }
                />
              </>
            )}
          </Box>
        </Paper>
      </Box>

      <CreateProductDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={fetchProducts}
      />
      <EditProductDialog
        open={editDialogOpen}
        productId={editingProductId}
        onClose={handleCloseEditDialog}
        onSuccess={fetchProducts}
      />
      <ManageProductVariantsDialog
        open={variantDialogOpen}
        product={variantProduct}
        onClose={handleCloseVariantDialog}
      />
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText="Xoá"
        onClose={handleCloseConfirmDialog}
        onConfirm={handleConfirmDelete}
        loading={Boolean(deletingProductId)}
      />
    </AdminLayout>
  );
};

export default ProductManagement;
