import { useEffect, useMemo, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Switch,
  Typography,
} from "@mui/material";
import type {
  Banner,
  BannerLinkType,
  BannerPosition,
  CreateBannerPayload,
  UpdateBannerPayload,
} from "@/types/banner";
import type { ProductLookupItem, VariantLookupItem } from "@/types/product";
import { bannerService } from "@/services/bannerService";
import { productService } from "@/services/productService";
import {
  campaignService,
  type CampaignLookupItem,
} from "@/services/campaignService";
import {
  brandService,
  type BrandLookupItem,
} from "@/services/brandService";

interface BannerFormDialogProps {
  open: boolean;
  initialData?: Banner | null;
  saving?: boolean;
  onClose: () => void;
  onSubmit: (
    payload: CreateBannerPayload | UpdateBannerPayload,
    bannerId?: string,
  ) => Promise<void> | void;
}

const positionOptions: { value: BannerPosition; label: string }[] = [
  { value: "HomeHeroSlider", label: "Hero Slider trang chủ" },
  { value: "HomeSubBanner", label: "Sub Banner trang chủ" },
  { value: "Popup", label: "Popup" },
  { value: "CategoryTop", label: "Đầu danh mục" },
];

const linkTypeOptions: { value: BannerLinkType; label: string }[] = [
  { value: "Campaign", label: "Chiến dịch" },
  { value: "Product", label: "Sản phẩm" },
  { value: "ProductVariant", label: "Biến thể sản phẩm" },
  { value: "Brand", label: "Thương hiệu" },
];

export const BannerFormDialog = ({
  open,
  initialData,
  saving,
  onClose,
  onSubmit,
}: BannerFormDialogProps) => {
  const defaultValues = useMemo(
    () => ({
      title: "",
      altText: "",
      position: "HomeHeroSlider" as BannerPosition,
      displayOrder: 0,
      isActive: true,
      startDate: "",
      endDate: "",
      linkType: "Campaign" as BannerLinkType,
      linkTarget: "",
    }),
    [],
  );

  const [values, setValues] = useState(defaultValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [mobileFile, setMobileFile] = useState<File | null>(null);
  const [heroPreview, setHeroPreview] = useState<string>("");
  const [mobilePreview, setMobilePreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  // Product lookup state
  const [productOptions, setProductOptions] = useState<ProductLookupItem[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] =
    useState<ProductLookupItem | null>(null);

  // Variant lookup state
  const [variantOptions, setVariantOptions] = useState<VariantLookupItem[]>([]);
  const [variantLoading, setVariantLoading] = useState(false);
  const [selectedVariant, setSelectedVariant] =
    useState<VariantLookupItem | null>(null);

  // Campaign lookup state
  const [campaignOptions, setCampaignOptions] = useState<CampaignLookupItem[]>(
    [],
  );
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [selectedCampaign, setSelectedCampaign] =
    useState<CampaignLookupItem | null>(null);

  // Brand lookup state
  const [brandOptions, setBrandOptions] = useState<BrandLookupItem[]>([]);
  const [brandLoading, setBrandLoading] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<BrandLookupItem | null>(
    null,
  );

  useEffect(() => {
    if (open) {
      if (initialData) {
        setValues({
          title: initialData.title,
          altText: initialData.altText || "",
          position: initialData.position,
          displayOrder: initialData.displayOrder,
          isActive: initialData.isActive,
          startDate: initialData.startDate
            ? initialData.startDate.slice(0, 16)
            : "",
          endDate: initialData.endDate
            ? initialData.endDate.slice(0, 16)
            : "",
          linkType: initialData.linkType,
          linkTarget: initialData.linkTarget || "",
        });
        setHeroPreview(initialData.imageUrl || "");
        setMobilePreview(initialData.mobileImageUrl || "");
      } else {
        setValues(defaultValues);
        setHeroPreview("");
        setMobilePreview("");
      }
      setHeroFile(null);
      setMobileFile(null);
      setSelectedProduct(null);
      setSelectedVariant(null);
      setSelectedCampaign(null);
      setSelectedBrand(null);
      setErrors({});
    }
  }, [open, initialData, defaultValues]);

  // Load product lookup when dialog opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const loadProducts = async () => {
      try {
        setProductLoading(true);
        const items = await productService.lookupProducts();
        if (!cancelled) {
          setProductOptions(items);
          // If editing and linkType is Product, find the matching product
          if (initialData?.linkType === "Product" && initialData.linkTarget) {
            const match = items.find((p) => p.id === initialData.linkTarget);
            if (match) setSelectedProduct(match);
          }
        }
      } catch (error) {
        console.error("Failed to load product lookup", error);
      } finally {
        if (!cancelled) setProductLoading(false);
      }
    };
    loadProducts();
    return () => {
      cancelled = true;
    };
  }, [open, initialData]);

  // Load variant lookup when dialog opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const loadVariants = async () => {
      try {
        setVariantLoading(true);
        const items = await productService.getProductVariants();
        if (!cancelled) {
          setVariantOptions(items);
          if (initialData?.linkType === "ProductVariant" && initialData.linkTarget) {
            const match = items.find((v) => v.id === initialData.linkTarget);
            if (match) setSelectedVariant(match);
          }
        }
      } catch (error) {
        console.error("Failed to load variant lookup", error);
      } finally {
        if (!cancelled) setVariantLoading(false);
      }
    };
    loadVariants();
    return () => {
      cancelled = true;
    };
  }, [open, initialData]);

  // Load campaign lookup when dialog opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const loadCampaigns = async () => {
      try {
        setCampaignLoading(true);
        const items = await campaignService.getActiveCampaigns();
        if (!cancelled) {
          setCampaignOptions(items);
          if (
            initialData?.linkType === "Campaign" &&
            initialData.linkTarget
          ) {
            const match = items.find((c) => c.id === initialData.linkTarget);
            if (match) setSelectedCampaign(match);
          }
        }
      } catch (error) {
        console.error("Failed to load campaign lookup", error);
      } finally {
        if (!cancelled) setCampaignLoading(false);
      }
    };
    loadCampaigns();
    return () => {
      cancelled = true;
    };
  }, [open, initialData]);

  // Load brand lookup when dialog opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const loadBrands = async () => {
      try {
        setBrandLoading(true);
        const items = await brandService.getBrandsLookup();
        if (!cancelled) {
          setBrandOptions(items);
          if (initialData?.linkType === "Brand" && initialData.linkTarget) {
            const match = items.find(
              (b) => String(b.id) === initialData.linkTarget,
            );
            if (match) setSelectedBrand(match);
          }
        }
      } catch (error) {
        console.error("Failed to load brand lookup", error);
      } finally {
        if (!cancelled) setBrandLoading(false);
      }
    };
    loadBrands();
    return () => {
      cancelled = true;
    };
  }, [open, initialData]);

  const handleChange = (
    field: keyof typeof values,
    value: string | number | boolean,
  ) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleHeroFileChange = (file?: File) => {
    if (!file) return;
    setHeroFile(file);
    setHeroPreview(URL.createObjectURL(file));
  };

  const handleMobileFileChange = (file?: File) => {
    if (!file) return;
    setMobileFile(file);
    setMobilePreview(URL.createObjectURL(file));
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!values.title.trim()) {
      nextErrors.title = "Tiêu đề banner không được bỏ trống";
    }
    if (!initialData && !heroFile) {
      nextErrors.heroImage = "Cần tải lên hình ảnh banner";
    }
    if (!values.linkTarget.trim()) {
      nextErrors.linkTarget = "Link target không được bỏ trống";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setUploading(true);

      let temporaryImageId: string | undefined;
      let temporaryMobileImageId: string | undefined;

      const filesToUpload: File[] = [];
      const fileMapping: { type: "hero" | "mobile"; index: number }[] = [];

      if (heroFile) {
        fileMapping.push({ type: "hero", index: filesToUpload.length });
        filesToUpload.push(heroFile);
      }
      if (mobileFile) {
        fileMapping.push({ type: "mobile", index: filesToUpload.length });
        filesToUpload.push(mobileFile);
      }

      if (filesToUpload.length > 0) {
        const uploaded =
          await bannerService.uploadTemporaryImages(filesToUpload);
        for (const mapping of fileMapping) {
          const img = uploaded[mapping.index];
          if (!img) continue;
          if (mapping.type === "hero") {
            temporaryImageId = img.id;
          } else {
            temporaryMobileImageId = img.id;
          }
        }
      }

      if (initialData) {
        const payload: UpdateBannerPayload = {
          title: values.title.trim(),
          temporaryImageId: temporaryImageId || null,
          temporaryMobileImageId: temporaryMobileImageId || null,
          altText: values.altText.trim() || null,
          position: values.position,
          displayOrder: values.displayOrder,
          isActive: values.isActive,
          startDate: values.startDate ? new Date(values.startDate).toISOString() : null,
          endDate: values.endDate ? new Date(values.endDate).toISOString() : null,
          linkType: values.linkType,
          linkTarget: values.linkTarget.trim(),
        };
        await onSubmit(payload, initialData.id);
      } else {
        if (!temporaryImageId) {
          setErrors({ heroImage: "Cần tải lên hình ảnh banner" });
          return;
        }
        const payload: CreateBannerPayload = {
          title: values.title.trim(),
          temporaryImageId,
          temporaryMobileImageId: temporaryMobileImageId || null,
          altText: values.altText.trim() || null,
          position: values.position,
          displayOrder: values.displayOrder,
          isActive: values.isActive,
          startDate: values.startDate ? new Date(values.startDate).toISOString() : null,
          endDate: values.endDate ? new Date(values.endDate).toISOString() : null,
          linkType: values.linkType,
          linkTarget: values.linkTarget.trim(),
        };
        await onSubmit(payload);
      }
    } catch (error) {
      console.error("Failed to submit banner", error);
    } finally {
      setUploading(false);
    }
  };

  const isSaving = saving || uploading;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {initialData ? "Chỉnh sửa banner" : "Tạo banner mới"}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Tiêu đề"
            value={values.title}
            onChange={(event) => handleChange("title", event.target.value)}
            error={Boolean(errors.title)}
            helperText={errors.title}
            fullWidth
            inputProps={{ maxLength: 200 }}
          />
          <TextField
            label="Alt text"
            value={values.altText}
            onChange={(event) => handleChange("altText", event.target.value)}
            fullWidth
          />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <FormControl fullWidth>
              <InputLabel id="banner-position-label">Vị trí</InputLabel>
              <Select
                labelId="banner-position-label"
                label="Vị trí"
                value={values.position}
                onChange={(event) =>
                  handleChange("position", event.target.value as BannerPosition)
                }
              >
                {positionOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Thứ tự hiển thị"
              type="number"
              inputProps={{ min: 0 }}
              value={values.displayOrder}
              onChange={(event) =>
                handleChange("displayOrder", Number(event.target.value))
              }
              fullWidth
            />
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <FormControl fullWidth>
              <InputLabel id="banner-linktype-label">Loại liên kết</InputLabel>
              <Select
                labelId="banner-linktype-label"
                label="Loại liên kết"
                value={values.linkType}
                onChange={(event) => {
                  const next = event.target.value as BannerLinkType;
                  handleChange("linkType", next);
                  if (next !== "Product") setSelectedProduct(null);
                  if (next !== "ProductVariant") setSelectedVariant(null);
                  if (next !== "Campaign") setSelectedCampaign(null);
                  if (next !== "Brand") setSelectedBrand(null);
                  handleChange("linkTarget", "");
                }}
              >
                {linkTypeOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {values.linkType === "Product" ? (
              <Autocomplete
                fullWidth
                options={productOptions}
                loading={productLoading}
                value={selectedProduct}
                getOptionLabel={(option) =>
                  `${option.name} (${option.brandName})`
                }
                isOptionEqualToValue={(option, value) =>
                  option.id === value.id
                }
                onChange={(_event, newValue) => {
                  setSelectedProduct(newValue);
                  handleChange("linkTarget", newValue?.id || "");
                }}
                renderOption={(props, option) => (
                  <Box
                    component="li"
                    {...props}
                    key={option.id}
                    sx={{ display: "flex", gap: 1.5, alignItems: "center" }}
                  >
                    {option.primaryImageUrl && (
                      <Box
                        component="img"
                        src={option.primaryImageUrl}
                        alt={option.name}
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 1,
                          objectFit: "cover",
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <Box>
                      <Typography variant="body2">{option.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.brandName}
                      </Typography>
                    </Box>
                  </Box>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Chọn sản phẩm"
                    error={Boolean(errors.linkTarget)}
                    helperText={errors.linkTarget}
                    slotProps={{
                      input: {
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {productLoading ? (
                              <CircularProgress size={18} />
                            ) : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      },
                    }}
                  />
                )}
              />
            ) : values.linkType === "ProductVariant" ? (
              <Autocomplete
                fullWidth
                options={variantOptions}
                loading={variantLoading}
                value={selectedVariant}
                getOptionLabel={(option) =>
                  `${option.displayName} — ${option.sku}`
                }
                isOptionEqualToValue={(option, value) =>
                  option.id === value.id
                }
                onChange={(_event, newValue) => {
                  setSelectedVariant(newValue);
                  handleChange("linkTarget", newValue?.id || "");
                }}
                renderOption={(props, option) => (
                  <Box
                    component="li"
                    {...props}
                    key={option.id}
                    sx={{ display: "flex", gap: 1.5, alignItems: "center" }}
                  >
                    {option.primaryImageUrl && (
                      <Box
                        component="img"
                        src={option.primaryImageUrl}
                        alt={option.displayName}
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 1,
                          objectFit: "cover",
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <Box>
                      <Typography variant="body2">{option.displayName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.sku} · {option.volumeMl}ml · {option.concentrationName}
                      </Typography>
                    </Box>
                  </Box>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Chọn biến thể"
                    error={Boolean(errors.linkTarget)}
                    helperText={errors.linkTarget}
                    slotProps={{
                      input: {
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {variantLoading ? (
                              <CircularProgress size={18} />
                            ) : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      },
                    }}
                  />
                )}
              />
            ) : values.linkType === "Campaign" ? (
              <Autocomplete
                fullWidth
                options={campaignOptions}
                loading={campaignLoading}
                value={selectedCampaign}
                getOptionLabel={(option) => option.name}
                isOptionEqualToValue={(option, value) =>
                  option.id === value.id
                }
                onChange={(_event, newValue) => {
                  setSelectedCampaign(newValue);
                  handleChange("linkTarget", newValue?.id || "");
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Chọn chiến dịch"
                    error={Boolean(errors.linkTarget)}
                    helperText={errors.linkTarget}
                    slotProps={{
                      input: {
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {campaignLoading ? (
                              <CircularProgress size={18} />
                            ) : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      },
                    }}
                  />
                )}
              />
            ) : values.linkType === "Brand" ? (
              <Autocomplete
                fullWidth
                options={brandOptions}
                loading={brandLoading}
                value={selectedBrand}
                getOptionLabel={(option) => option.name || ""}
                isOptionEqualToValue={(option, value) =>
                  option.id === value.id
                }
                onChange={(_event, newValue) => {
                  setSelectedBrand(newValue);
                  handleChange("linkTarget", newValue ? String(newValue.id) : "");
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Chọn thương hiệu"
                    error={Boolean(errors.linkTarget)}
                    helperText={errors.linkTarget}
                    slotProps={{
                      input: {
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {brandLoading ? (
                              <CircularProgress size={18} />
                            ) : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      },
                    }}
                  />
                )}
              />
            ) : (
              <TextField
                label="Link target"
                value={values.linkTarget}
                onChange={(event) =>
                  handleChange("linkTarget", event.target.value)
                }
                error={Boolean(errors.linkTarget)}
                helperText={errors.linkTarget}
                fullWidth
              />
            )}
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Ngày bắt đầu"
              type="datetime-local"
              value={values.startDate}
              onChange={(event) =>
                handleChange("startDate", event.target.value)
              }
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Ngày kết thúc"
              type="datetime-local"
              value={values.endDate}
              onChange={(event) =>
                handleChange("endDate", event.target.value)
              }
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>
          <FormControlLabel
            control={
              <Switch
                checked={values.isActive}
                onChange={(event) =>
                  handleChange("isActive", event.target.checked)
                }
              />
            }
            label="Kích hoạt"
          />
          <Divider>Hình ảnh</Divider>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" sx={{ mb: 1, display: "block" }}>
                Hero / Desktop
              </Typography>
              <Button component="label" variant="outlined" fullWidth>
                {heroPreview ? "Thay đổi" : "Tải hình"}
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    handleHeroFileChange(event.target.files?.[0])
                  }
                />
              </Button>
              {errors.heroImage && (
                <Typography variant="caption" color="error">
                  {errors.heroImage}
                </Typography>
              )}
              {heroPreview && (
                <Box
                  component="img"
                  src={heroPreview}
                  alt="Hero preview"
                  sx={{
                    width: "100%",
                    mt: 1,
                    borderRadius: 2,
                    objectFit: "cover",
                    height: 160,
                  }}
                />
              )}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" sx={{ mb: 1, display: "block" }}>
                Mobile
              </Typography>
              <Button component="label" variant="outlined" fullWidth>
                {mobilePreview ? "Thay đổi" : "Tải hình"}
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    handleMobileFileChange(event.target.files?.[0])
                  }
                />
              </Button>
              {mobilePreview && (
                <Box
                  component="img"
                  src={mobilePreview}
                  alt="Mobile preview"
                  sx={{
                    width: "100%",
                    mt: 1,
                    borderRadius: 2,
                    objectFit: "cover",
                    height: 160,
                  }}
                />
              )}
            </Box>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Hủy</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isSaving}
        >
          {isSaving ? "Đang lưu..." : "Lưu banner"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
