import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  CircularProgress,
  TextField,
  Tabs,
  Tab,
  Alert,
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  LocalOffer as BrandIcon,
  Category as CategoryIcon,
  Science as ConcentrationIcon,
} from "@mui/icons-material";
import { AdminLayout } from "../layouts/AdminLayout";
import { brandService, type BrandResponse } from "../services/brandService";
import {
  categoryService,
  type CategoryResponse,
} from "../services/categoryService";
import {
  concentrationService,
  type ConcentrationResponse,
} from "../services/concentrationService";
import { useToast } from "../hooks/useToast";

type ItemType = { id?: number; name: string };

interface TabState {
  items: ItemType[];
  loading: boolean;
  error: string;
  dialogOpen: boolean;
  editing: ItemType | null;
  nameInput: string;
  saving: boolean;
  deleteTarget: ItemType | null;
  deleting: boolean;
}

const defaultTabState = (): TabState => ({
  items: [],
  loading: false,
  error: "",
  dialogOpen: false,
  editing: null,
  nameInput: "",
  saving: false,
  deleteTarget: null,
  deleting: false,
});

const TABS = [
  { label: "Thương Hiệu", icon: <BrandIcon /> },
  { label: "Danh Mục", icon: <CategoryIcon /> },
  { label: "Nồng Độ", icon: <ConcentrationIcon /> },
];

export const AttributeManagementPage = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState(0);
  const [states, setStates] = useState<TabState[]>([
    defaultTabState(),
    defaultTabState(),
    defaultTabState(),
  ]);

  const setTabState = (tabIdx: number, patch: Partial<TabState>) => {
    setStates((prev) =>
      prev.map((s, i) => (i === tabIdx ? { ...s, ...patch } : s)),
    );
  };

  const loadItems = useCallback(
    async (tabIdx: number) => {
      setTabState(tabIdx, { loading: true, error: "" });
      try {
        let items: ItemType[] = [];
        if (tabIdx === 0) {
          const data = await brandService.getAllBrands();
          items = data.map((d) => ({ id: d.id, name: d.name }));
        } else if (tabIdx === 1) {
          const data = await categoryService.getAllCategories();
          items = data.map((d) => ({ id: d.id, name: d.name }));
        } else {
          const data = await concentrationService.getAllConcentrations();
          items = data.map((d) => ({ id: d.id, name: d.name }));
        }
        setTabState(tabIdx, { items, loading: false });
      } catch (err: any) {
        setTabState(tabIdx, {
          loading: false,
          error: err.message || "Không thể tải dữ liệu",
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    loadItems(activeTab);
  }, [activeTab, loadItems]);

  const openAdd = () => {
    setTabState(activeTab, {
      dialogOpen: true,
      editing: null,
      nameInput: "",
    });
  };

  const openEdit = (item: ItemType) => {
    setTabState(activeTab, {
      dialogOpen: true,
      editing: item,
      nameInput: item.name,
    });
  };

  const closeDialog = () => {
    setTabState(activeTab, { dialogOpen: false, editing: null, nameInput: "" });
  };

  const handleSave = async () => {
    const s = states[activeTab]!;
    const trimmed = s.nameInput.trim();
    if (!trimmed) return;
    setTabState(activeTab, { saving: true });
    try {
      if (s.editing?.id != null) {
        if (activeTab === 0)
          await brandService.updateBrand(s.editing.id, trimmed);
        else if (activeTab === 1)
          await categoryService.updateCategory(s.editing.id, trimmed);
        else
          await concentrationService.updateConcentration(s.editing.id, trimmed);
        showToast("Cập nhật thành công", "success");
      } else {
        if (activeTab === 0) await brandService.createBrand(trimmed);
        else if (activeTab === 1) await categoryService.createCategory(trimmed);
        else await concentrationService.createConcentration(trimmed);
        showToast("Thêm mới thành công", "success");
      }
      closeDialog();
      await loadItems(activeTab);
    } catch (err: any) {
      showToast(err.message || "Có lỗi xảy ra", "error");
    } finally {
      setTabState(activeTab, { saving: false });
    }
  };

  const handleDelete = async () => {
    const s = states[activeTab]!;
    if (!s.deleteTarget?.id) return;
    setTabState(activeTab, { deleting: true });
    try {
      if (activeTab === 0) await brandService.deleteBrand(s.deleteTarget.id);
      else if (activeTab === 1)
        await categoryService.deleteCategory(s.deleteTarget.id);
      else await concentrationService.deleteConcentration(s.deleteTarget.id);
      showToast("Xóa thành công", "success");
      setTabState(activeTab, { deleteTarget: null });
      await loadItems(activeTab);
    } catch (err: any) {
      showToast(err.message || "Có lỗi xảy ra", "error");
    } finally {
      setTabState(activeTab, { deleting: false });
    }
  };

  const s = states[activeTab]!;
  const tab = TABS[activeTab]!;

  return (
    <AdminLayout>
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Paper variant="outlined" sx={{ mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            variant="fullWidth"
          >
            {TABS.map((tab, i) => (
              <Tab
                key={i}
                label={tab.label}
                icon={tab.icon}
                iconPosition="start"
              />
            ))}
          </Tabs>
        </Paper>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="subtitle1" fontWeight={600}>
            {tab.label}
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={openAdd}
            size="small"
          >
            Thêm mới
          </Button>
        </Box>
        {s.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {s.error}
          </Alert>
        )}
        {s.loading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell width={80}>ID</TableCell>
                  <TableCell>Tên</TableCell>
                  <TableCell width={120} align="right">
                    Thao tác
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {s.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        Chưa có dữ liệu.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  s.items.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell>{item.id}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Chỉnh sửa">
                          <IconButton
                            size="small"
                            onClick={() => openEdit(item)}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Xóa">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() =>
                              setTabState(activeTab, { deleteTarget: item })
                            }
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Add/Edit Dialog */}
      <Dialog open={s.dialogOpen} onClose={closeDialog} maxWidth="xs" fullWidth>
        <DialogTitle>
          {s.editing ? "Chỉnh sửa" : "Thêm mới"} {tab.label}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Tên"
            value={s.nameInput}
            onChange={(e) =>
              setTabState(activeTab, { nameInput: e.target.value })
            }
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={s.saving}>
            Hủy
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={s.saving || !s.nameInput.trim()}
            startIcon={s.saving ? <CircularProgress size={16} /> : undefined}
          >
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog
        open={Boolean(s.deleteTarget)}
        onClose={() => setTabState(activeTab, { deleteTarget: null })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Xác nhận xóa</DialogTitle>
        <DialogContent>
          <Typography>
            Bạn có chắc muốn xóa{" "}
            <strong>&ldquo;{s.deleteTarget?.name}&rdquo;</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setTabState(activeTab, { deleteTarget: null })}
            disabled={s.deleting}
          >
            Hủy
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={s.deleting}
            startIcon={s.deleting ? <CircularProgress size={16} /> : undefined}
          >
            Xóa
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
};

export default AttributeManagementPage;
