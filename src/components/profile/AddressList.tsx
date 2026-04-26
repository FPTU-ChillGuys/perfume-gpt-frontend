import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import DeleteIcon from "@mui/icons-material/Delete";
import type { AddressResponse } from "@/types/address";
import AddAddressDialog from "./AddAddressDialog";
import EditAddressDialog from "./EditAddressDialog";
import { addressService } from "@/services/addressService";
import { useToast } from "@/hooks/useToast";

interface AddressListProps {
  addresses: AddressResponse[];
  isLoading: boolean;
  onRefresh: () => void;
}

const AddressList = ({ addresses, isLoading, onRefresh }: AddressListProps) => {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] =
    useState<AddressResponse | null>(null);
  const [settingDefault, setSettingDefault] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<AddressResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { showToast } = useToast();

  const handleAddSuccess = () => {
    onRefresh();
  };

  const handleEditClick = (address: AddressResponse) => {
    setSelectedAddress(address);
    setEditDialogOpen(true);
  };

  const handleEditSuccess = () => {
    onRefresh();
  };

  const handleSetDefault = async (address: AddressResponse) => {
    if (!address.id || address.isDefault) return;

    setSettingDefault(address.id);
    try {
      await addressService.setDefaultAddress(address.id);
      onRefresh();
    } catch (err: any) {
      console.error("Error setting default address:", err);
      // Optionally show error message to user
    } finally {
      setSettingDefault(null);
    }
  };

  const handleDeleteClick = (address: AddressResponse) => {
    setAddressToDelete(address);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!addressToDelete?.id) return;
    setIsDeleting(true);
    try {
      await addressService.deleteAddress(addressToDelete.id);
      showToast("Xóa địa chỉ thành công", "success");
      setDeleteDialogOpen(false);
      setAddressToDelete(null);
      onRefresh();
    } catch (err: any) {
      console.error("Error deleting address:", err);
      showToast(err.message || "Xóa địa chỉ thất bại", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h6" fontWeight="bold">
          Địa chỉ của tôi
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setAddDialogOpen(true)}
        >
          Thêm địa chỉ
        </Button>
      </Box>

      {isLoading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : addresses.length === 0 ? (
        <Alert severity="info">
          Bạn chưa có địa chỉ nào. Thêm địa chỉ để dễ dàng đặt hàng hơn.
        </Alert>
      ) : (
        <Stack spacing={2}>
          {addresses.map((address) => (
            <Card key={address.id} variant="outlined">
              <CardContent>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="start"
                  mb={1}
                >
                  <Box display="flex" alignItems="center" gap={1}>
                    <HomeIcon color="primary" />
                    <Typography variant="subtitle1" fontWeight="bold">
                      {address.recipientName}
                    </Typography>
                    {address.isDefault && (
                      <Chip
                        label="Mặc định"
                        size="small"
                        color="success"
                        icon={<CheckCircleIcon />}
                      />
                    )}
                  </Box>
                  <Box display="flex" gap={1}>
                    <IconButton
                      size="small"
                      onClick={() => handleEditClick(address)}
                      title="Chỉnh sửa"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleSetDefault(address)}
                      disabled={
                        address.isDefault || settingDefault === address.id
                      }
                      title={
                        address.isDefault
                          ? "Địa chỉ mặc định"
                          : "Đặt làm mặc định"
                      }
                    >
                      {settingDefault === address.id ? (
                        <CircularProgress size={20} />
                      ) : address.isDefault ? (
                        <StarIcon fontSize="small" color="warning" />
                      ) : (
                        <StarBorderIcon fontSize="small" />
                      )}
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteClick(address)}
                      disabled={address.isDefault}
                      title={
                        address.isDefault
                          ? "Không thể xóa địa chỉ mặc định"
                          : "Xóa địa chỉ"
                      }
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {address.recipientPhoneNumber}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {[
                    address.street,
                    address.ward,
                    address.district,
                    address.city,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <AddAddressDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onSuccess={handleAddSuccess}
      />

      <EditAddressDialog
        open={editDialogOpen}
        address={selectedAddress}
        onClose={() => {
          setEditDialogOpen(false);
          setSelectedAddress(null);
        }}
        onSuccess={handleEditSuccess}
      />

      <Dialog
        open={deleteDialogOpen}
        onClose={() => !isDeleting && setDeleteDialogOpen(false)}
      >
        <DialogTitle>Xác nhận xóa</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Bạn có chắc chắn muốn xóa địa chỉ của{" "}
            <strong>{addressToDelete?.recipientName}</strong> không?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            disabled={isDeleting}
          >
            Hủy
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={20} /> : undefined}
          >
            Xóa
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AddressList;
