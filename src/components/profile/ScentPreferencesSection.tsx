import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Chip,
  Stack,
  Button,
  CircularProgress,
  Divider,
  Slider,
  TextField,
  InputAdornment,
  Paper,
  alpha,
  Card,
  CardContent,
  Tooltip,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import SpaIcon from "@mui/icons-material/Spa";
import LocalFloristIcon from "@mui/icons-material/LocalFlorist";
import StyleIcon from "@mui/icons-material/Style";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import EmojiNatureIcon from "@mui/icons-material/EmojiNature";
import { profileService } from "@/services/profileService";
import { scentNoteService } from "@/services/scentNoteService";
import { olfactoryService } from "@/services/olfactoryService";
import { attributeService } from "@/services/attributeService";
import { useToast } from "@/hooks/useToast";
import type { UserProfile, UpdateProfileRequest } from "@/types/profile";
import type {
  ScentNoteLookupItem,
  OlfactoryLookupItem,
  AttributeLookupItem,
  AttributeValueLookupItem,
} from "@/types/product";

interface ScentPreferencesSectionProps {
  profile: UserProfile | null;
  onProfileUpdated: () => void;
}

type NoteWithType = {
  noteId: number;
  noteType: "Top" | "Heart" | "Base";
  noteName: string;
};

export const ScentPreferencesSection = ({
  profile,
  onProfileUpdated,
}: ScentPreferencesSectionProps) => {
  const { showToast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingLookups, setIsLoadingLookups] = useState(false);

  // Lookups
  const [allNotes, setAllNotes] = useState<ScentNoteLookupItem[]>([]);
  const [allFamilies, setAllFamilies] = useState<OlfactoryLookupItem[]>([]);
  const [allAttributes, setAllAttributes] = useState<AttributeLookupItem[]>([]);
  const [allAttributeValues, setAllAttributeValues] = useState<
    Map<number, AttributeValueLookupItem[]>
  >(new Map());

  // Form state
  const [minBudget, setMinBudget] = useState<string>("");
  const [maxBudget, setMaxBudget] = useState<string>("");
  const [selectedFamilyIds, setSelectedFamilyIds] = useState<number[]>([]);
  const [selectedNotes, setSelectedNotes] = useState<NoteWithType[]>([]);
  const [selectedAttrValueIds, setSelectedAttrValueIds] = useState<number[]>(
    [],
  );

  const resetFormFromProfile = useCallback(() => {
    if (!profile) return;
    setMinBudget(profile.minBudget?.toString() || "");
    setMaxBudget(profile.maxBudget?.toString() || "");
    setSelectedFamilyIds(
      profile.familyPreferences?.map((f) => f.familyId!).filter(Boolean) || [],
    );
    setSelectedNotes(
      profile.notePreferences?.map((n) => ({
        noteId: n.noteId!,
        noteType: n.noteType as "Top" | "Heart" | "Base",
        noteName: n.noteName,
      })) || [],
    );
    setSelectedAttrValueIds(
      profile.attributePreferences
        ?.map((a) => a.attributeValueId!)
        .filter(Boolean) || [],
    );
  }, [profile]);

  useEffect(() => {
    resetFormFromProfile();
  }, [resetFormFromProfile]);

  const loadLookups = async () => {
    setIsLoadingLookups(true);
    try {
      const [notes, families, attributes] = await Promise.all([
        scentNoteService.getScentNotesLookup(),
        olfactoryService.getOlfactoryLookup(),
        attributeService.getAttributes(),
      ]);
      setAllNotes(notes);
      setAllFamilies(families);
      setAllAttributes(attributes);

      // Load attribute values for each attribute
      const valuesMap = new Map<number, AttributeValueLookupItem[]>();
      await Promise.all(
        attributes.map(async (attr) => {
          try {
            const values = await attributeService.getAttributeValues(attr.id!);
            valuesMap.set(attr.id!, values);
          } catch {
            /* ignore */
          }
        }),
      );
      setAllAttributeValues(valuesMap);
    } catch (err: any) {
      showToast("Không thể tải dữ liệu danh mục", "error");
    } finally {
      setIsLoadingLookups(false);
    }
  };

  const handleEdit = async () => {
    if (allNotes.length === 0) {
      await loadLookups();
    }
    setIsEditing(true);
  };

  const handleCancel = () => {
    resetFormFromProfile();
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const body: UpdateProfileRequest = {
        dateOfBirth: profile?.dateOfBirth ?? null,
        minBudget: minBudget ? parseFloat(minBudget) : null,
        maxBudget: maxBudget ? parseFloat(maxBudget) : null,
        familyPreferenceIds:
          selectedFamilyIds.length > 0 ? selectedFamilyIds : null,
        notePreferenceIds:
          selectedNotes.length > 0
            ? selectedNotes.map((n) => ({
                noteId: n.noteId,
                noteType: n.noteType,
              }))
            : null,
        attributePreferenceIds:
          selectedAttrValueIds.length > 0 ? selectedAttrValueIds : null,
      };
      await profileService.updateProfile(body);
      showToast("Cập nhật sở thích thành công", "success");
      setIsEditing(false);
      onProfileUpdated();
    } catch (err: any) {
      showToast(err.message || "Không thể cập nhật sở thích", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const noteTypeLabel = (type?: string) => {
    if (type === "Top") return "Hương đầu";
    if (type === "Heart") return "Hương giữa";
    if (type === "Base") return "Hương cuối";
    return type || "";
  };

  const formatCurrency = (value?: number | null) => {
    if (value == null) return null;
    return `${new Intl.NumberFormat("vi-VN").format(value)} ₫`;
  };

  // Flatten all attribute values for selection
  const flatAttrValues: (AttributeValueLookupItem & {
    attributeName: string;
  })[] = [];
  allAttributeValues.forEach((values, attrId) => {
    const attr = allAttributes.find((a) => a.id === attrId);
    values.forEach((v) =>
      flatAttrValues.push({
        ...v,
        attributeName: attr?.name || "",
      }),
    );
  });

  if (!profile) return null;

  // Read-only view
  if (!isEditing) {
    const budgetMin = formatCurrency(profile.minBudget);
    const budgetMax = formatCurrency(profile.maxBudget);
    const budgetText =
      budgetMin && budgetMax
        ? `${budgetMin} – ${budgetMax}`
        : budgetMin
          ? `Từ ${budgetMin}`
          : budgetMax
            ? `Đến ${budgetMax}`
            : null;

    const hasPreferences =
      budgetText ||
      profile.familyPreferences?.length > 0 ||
      profile.notePreferences?.length > 0 ||
      profile.attributePreferences?.length > 0;

    // Group notes by type for display
    const topNotes = profile.notePreferences?.filter((n) => n.noteType === "Top") || [];
    const heartNotes = profile.notePreferences?.filter((n) => n.noteType === "Heart") || [];
    const baseNotes = profile.notePreferences?.filter((n) => n.noteType === "Base") || [];

    return (
      <Box>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Typography variant="h6" fontWeight="bold">
            Sở thích & Ngân sách
          </Typography>
          <Button
            size="small"
            startIcon={<EditIcon />}
            onClick={handleEdit}
            variant="outlined"
          >
            Chỉnh sửa
          </Button>
        </Stack>
        <Divider sx={{ mb: 3 }} />

        {!hasPreferences ? (
          <Paper
            variant="outlined"
            sx={{
              py: 6,
              textAlign: "center",
              borderStyle: "dashed",
              borderRadius: 3,
            }}
          >
            <EmojiNatureIcon
              sx={{ fontSize: 48, color: "text.disabled", mb: 1 }}
            />
            <Typography color="text.secondary" mb={2}>
              Chưa thiết lập sở thích hương và ngân sách.
            </Typography>
            <Button variant="contained" size="small" onClick={handleEdit}>
              Thiết lập ngay
            </Button>
          </Paper>
        ) : (
          <Stack spacing={2.5}>
            {/* Budget Card */}
            {budgetText && (
              <Card
                variant="outlined"
                sx={{
                  borderRadius: 2.5,
                  bgcolor: (theme) =>
                    alpha(theme.palette.warning.main, 0.04),
                  borderColor: (theme) =>
                    alpha(theme.palette.warning.main, 0.2),
                }}
              >
                <CardContent sx={{ py: 2, "&:last-child": { pb: 2 } }}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: (theme) =>
                          alpha(theme.palette.warning.main, 0.12),
                      }}
                    >
                      <AccountBalanceWalletIcon
                        fontSize="small"
                        color="warning"
                      />
                    </Box>
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        textTransform="uppercase"
                        letterSpacing={0.5}
                        fontWeight={600}
                      >
                        Ngân sách nước hoa
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {budgetText}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Olfactory Families Card */}
            {profile.familyPreferences?.length > 0 && (
              <Card
                variant="outlined"
                sx={{
                  borderRadius: 2.5,
                  bgcolor: (theme) =>
                    alpha(theme.palette.secondary.main, 0.03),
                  borderColor: (theme) =>
                    alpha(theme.palette.secondary.main, 0.15),
                }}
              >
                <CardContent sx={{ py: 2, "&:last-child": { pb: 2 } }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1.5}
                    mb={1.5}
                  >
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: (theme) =>
                          alpha(theme.palette.secondary.main, 0.12),
                      }}
                    >
                      <LocalFloristIcon
                        fontSize="small"
                        color="secondary"
                      />
                    </Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      textTransform="uppercase"
                      letterSpacing={0.5}
                      fontWeight={600}
                    >
                      Nhóm hương yêu thích
                    </Typography>
                  </Stack>
                  <Stack direction="row" flexWrap="wrap" gap={0.75}>
                    {profile.familyPreferences.map((f) => (
                      <Chip
                        key={f.familyId}
                        label={f.familyName}
                        size="small"
                        color="secondary"
                        sx={{ fontWeight: 500, borderRadius: 1.5 }}
                      />
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Scent Notes Card */}
            {profile.notePreferences?.length > 0 && (
              <Card
                variant="outlined"
                sx={{
                  borderRadius: 2.5,
                  bgcolor: (theme) =>
                    alpha(theme.palette.primary.main, 0.03),
                  borderColor: (theme) =>
                    alpha(theme.palette.primary.main, 0.15),
                }}
              >
                <CardContent sx={{ py: 2, "&:last-child": { pb: 2 } }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1.5}
                    mb={1.5}
                  >
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: (theme) =>
                          alpha(theme.palette.primary.main, 0.12),
                      }}
                    >
                      <SpaIcon fontSize="small" color="primary" />
                    </Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      textTransform="uppercase"
                      letterSpacing={0.5}
                      fontWeight={600}
                    >
                      Nốt hương ưa thích
                    </Typography>
                  </Stack>
                  <Stack spacing={1.5}>
                    {topNotes.length > 0 && (
                      <Box>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          fontWeight={500}
                          mb={0.5}
                          display="block"
                        >
                          Hương đầu
                        </Typography>
                        <Stack
                          direction="row"
                          flexWrap="wrap"
                          gap={0.75}
                        >
                          {topNotes.map((n) => (
                            <Chip
                              key={`${n.noteId}-Top`}
                              label={n.noteName}
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{ borderRadius: 1.5 }}
                            />
                          ))}
                        </Stack>
                      </Box>
                    )}
                    {heartNotes.length > 0 && (
                      <Box>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          fontWeight={500}
                          mb={0.5}
                          display="block"
                        >
                          Hương giữa
                        </Typography>
                        <Stack
                          direction="row"
                          flexWrap="wrap"
                          gap={0.75}
                        >
                          {heartNotes.map((n) => (
                            <Chip
                              key={`${n.noteId}-Heart`}
                              label={n.noteName}
                              size="small"
                              color="primary"
                              sx={{ borderRadius: 1.5 }}
                            />
                          ))}
                        </Stack>
                      </Box>
                    )}
                    {baseNotes.length > 0 && (
                      <Box>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          fontWeight={500}
                          mb={0.5}
                          display="block"
                        >
                          Hương cuối
                        </Typography>
                        <Stack
                          direction="row"
                          flexWrap="wrap"
                          gap={0.75}
                        >
                          {baseNotes.map((n) => (
                            <Chip
                              key={`${n.noteId}-Base`}
                              label={n.noteName}
                              size="small"
                              variant="outlined"
                              sx={{
                                borderRadius: 1.5,
                                borderColor: (theme) =>
                                  alpha(
                                    theme.palette.primary.main,
                                    0.4,
                                  ),
                                color: "primary.dark",
                              }}
                            />
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Attribute Preferences Card */}
            {profile.attributePreferences?.length > 0 && (
              <Card
                variant="outlined"
                sx={{
                  borderRadius: 2.5,
                  bgcolor: (theme) =>
                    alpha(theme.palette.info.main, 0.03),
                  borderColor: (theme) =>
                    alpha(theme.palette.info.main, 0.15),
                }}
              >
                <CardContent sx={{ py: 2, "&:last-child": { pb: 2 } }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1.5}
                    mb={1.5}
                  >
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: (theme) =>
                          alpha(theme.palette.info.main, 0.12),
                      }}
                    >
                      <StyleIcon fontSize="small" color="info" />
                    </Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      textTransform="uppercase"
                      letterSpacing={0.5}
                      fontWeight={600}
                    >
                      Thuộc tính yêu thích
                    </Typography>
                  </Stack>
                  <Stack direction="row" flexWrap="wrap" gap={0.75}>
                    {profile.attributePreferences.map((a) => (
                      <Chip
                        key={a.attributeValueId}
                        label={a.attributeValueName}
                        size="small"
                        color="info"
                        sx={{ fontWeight: 500, borderRadius: 1.5 }}
                      />
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}
          </Stack>
        )}
      </Box>
    );
  }

  const BUDGET_MIN = 0;
  const BUDGET_MAX = 10_000_000;
  const BUDGET_STEP = 100_000;

  const budgetSliderValue: [number, number] = [
    minBudget ? Math.max(Number(minBudget), BUDGET_MIN) : BUDGET_MIN,
    maxBudget ? Math.min(Number(maxBudget), BUDGET_MAX) : BUDGET_MAX,
  ];

  const handleBudgetSliderChange = (_: unknown, value: number | number[]) => {
    const [lo, hi] = value as number[];
    setMinBudget(lo.toString());
    setMaxBudget(hi.toString());
  };

  const toggleFamily = (id: number) => {
    setSelectedFamilyIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleNote = (noteId: number, noteType: "Top" | "Heart" | "Base", noteName: string) => {
    setSelectedNotes((prev) => {
      const exists = prev.some(
        (s) => s.noteId === noteId && s.noteType === noteType,
      );
      if (exists) return prev.filter((s) => !(s.noteId === noteId && s.noteType === noteType));
      return [...prev, { noteId, noteType, noteName }];
    });
  };

  const toggleAttrValue = (id: number) => {
    setSelectedAttrValueIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  // Edit view
  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h6" fontWeight="bold">
          Chỉnh sửa Sở thích & Ngân sách
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<CloseIcon />}
            onClick={handleCancel}
            disabled={isSaving}
          >
            Huỷ
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={
              isSaving ? <CircularProgress size={16} /> : <SaveIcon />
            }
            onClick={handleSave}
            disabled={isSaving}
          >
            Lưu thay đổi
          </Button>
        </Stack>
      </Stack>
      <Divider sx={{ mb: 3 }} />

      {isLoadingLookups ? (
        <Box textAlign="center" py={6}>
          <CircularProgress size={32} />
          <Typography variant="body2" color="text.secondary" mt={1.5}>
            Đang tải danh mục...
          </Typography>
        </Box>
      ) : (
        <Stack spacing={3.5}>
          {/* Budget Range — slider + inputs */}
          <Card
            variant="outlined"
            sx={{
              borderRadius: 2.5,
              bgcolor: (theme) => alpha(theme.palette.warning.main, 0.03),
              borderColor: (theme) =>
                alpha(theme.palette.warning.main, 0.2),
            }}
          >
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 1.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: (theme) =>
                      alpha(theme.palette.warning.main, 0.12),
                  }}
                >
                  <AccountBalanceWalletIcon
                    sx={{ fontSize: 20 }}
                    color="warning"
                  />
                </Box>
                <Typography variant="subtitle2" fontWeight={600}>
                  Ngân sách nước hoa
                </Typography>
              </Stack>
              <Box px={1} mb={0.5}>
                <Slider
                  value={budgetSliderValue}
                  onChange={handleBudgetSliderChange}
                  min={BUDGET_MIN}
                  max={BUDGET_MAX}
                  step={BUDGET_STEP}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(v) =>
                    `${new Intl.NumberFormat("vi-VN").format(v)} ₫`
                  }
                  color="warning"
                  sx={{
                    "& .MuiSlider-thumb": {
                      width: 20,
                      height: 20,
                      "&:hover, &.Mui-focusVisible": {
                        boxShadow: (theme) =>
                          `0 0 0 8px ${alpha(theme.palette.warning.main, 0.16)}`,
                      },
                    },
                    "& .MuiSlider-track": { height: 6 },
                    "& .MuiSlider-rail": { height: 6, opacity: 0.2 },
                  }}
                />
              </Box>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Tối thiểu"
                  type="number"
                  size="small"
                  value={minBudget}
                  onChange={(e) => setMinBudget(e.target.value)}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">₫</InputAdornment>
                      ),
                    },
                    htmlInput: { min: 0 },
                  }}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Tối đa"
                  type="number"
                  size="small"
                  value={maxBudget}
                  onChange={(e) => setMaxBudget(e.target.value)}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">₫</InputAdornment>
                      ),
                    },
                    htmlInput: { min: 0 },
                  }}
                  sx={{ flex: 1 }}
                />
              </Stack>
            </CardContent>
          </Card>

          {/* Olfactory Families — checkbox grid */}
          <Card
            variant="outlined"
            sx={{
              borderRadius: 2.5,
              bgcolor: (theme) =>
                alpha(theme.palette.secondary.main, 0.02),
              borderColor: (theme) =>
                alpha(theme.palette.secondary.main, 0.15),
            }}
          >
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 1.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: (theme) =>
                      alpha(theme.palette.secondary.main, 0.12),
                  }}
                >
                  <LocalFloristIcon
                    sx={{ fontSize: 20 }}
                    color="secondary"
                  />
                </Box>
                <Box>
                  <Typography variant="subtitle2" fontWeight={600}>
                    Nhóm hương yêu thích
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Tick chọn các nhóm hương bạn yêu thích
                  </Typography>
                </Box>
              </Stack>
              <Box
                sx={{
                  maxHeight: 240,
                  overflow: "auto",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 1,
                }}
              >
                {allFamilies.map((f) => {
                  const checked = selectedFamilyIds.includes(f.id!);
                  return (
                    <Tooltip key={f.id} title={f.name} arrow enterDelay={500}>
                      <Chip
                        label={f.name}
                        size="medium"
                        color={checked ? "secondary" : "default"}
                        variant={checked ? "filled" : "outlined"}
                        onClick={() => toggleFamily(f.id!)}
                        sx={{
                          fontWeight: checked ? 600 : 400,
                          borderRadius: 2,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          ...(checked && {
                            boxShadow: (theme) =>
                              `0 0 0 1px ${theme.palette.secondary.main}`,
                          }),
                          "&:hover": {
                            transform: "translateY(-1px)",
                            boxShadow: 1,
                          },
                        }}
                      />
                    </Tooltip>
                  );
                })}
              </Box>
            </CardContent>
          </Card>

          {/* Scent Notes — checkbox grid per type */}
          <Card
            variant="outlined"
            sx={{
              borderRadius: 2.5,
              bgcolor: (theme) =>
                alpha(theme.palette.primary.main, 0.02),
              borderColor: (theme) =>
                alpha(theme.palette.primary.main, 0.15),
            }}
          >
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 1.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: (theme) =>
                      alpha(theme.palette.primary.main, 0.12),
                  }}
                >
                  <SpaIcon sx={{ fontSize: 20 }} color="primary" />
                </Box>
                <Box>
                  <Typography variant="subtitle2" fontWeight={600}>
                    Nốt hương ưa thích
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Chọn nốt hương cho từng tầng hương
                  </Typography>
                </Box>
              </Stack>
              {(["Top", "Heart", "Base"] as const).map((type, i) => (
                <Box
                  key={type}
                  sx={{
                    mb: i < 2 ? 2.5 : 0,
                    ...(i < 2 && {
                      pb: 2.5,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                    }),
                  }}
                >
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    mb={1}
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.75,
                      "&::before": {
                        content: '""',
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor:
                          type === "Top"
                            ? "success.main"
                            : type === "Heart"
                              ? "error.main"
                              : "warning.dark",
                      },
                    }}
                  >
                    {noteTypeLabel(type)}
                  </Typography>
                  <Box
                    sx={{
                      maxHeight: 200,
                      overflow: "auto",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 1,
                    }}
                  >
                    {allNotes.map((n) => {
                      const checked = selectedNotes.some(
                        (s) => s.noteId === n.id && s.noteType === type,
                      );
                      return (
                        <Chip
                          key={n.id}
                          label={n.name}
                          size="medium"
                          color={checked ? "primary" : "default"}
                          variant={checked ? "filled" : "outlined"}
                          onClick={() => toggleNote(n.id!, type, n.name)}
                          sx={{
                            fontWeight: checked ? 600 : 400,
                            borderRadius: 2,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            ...(checked && {
                              boxShadow: (theme) =>
                                `0 0 0 1px ${theme.palette.primary.main}`,
                            }),
                            "&:hover": {
                              transform: "translateY(-1px)",
                              boxShadow: 1,
                            },
                          }}
                        />
                      );
                    })}
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>

          {/* Attribute Preferences — chip grid grouped by attribute */}
          {allAttributes.length > 0 && (
            <Card
              variant="outlined"
              sx={{
                borderRadius: 2.5,
                bgcolor: (theme) =>
                  alpha(theme.palette.info.main, 0.02),
                borderColor: (theme) =>
                  alpha(theme.palette.info.main, 0.15),
              }}
            >
              <CardContent>
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1.5}
                  mb={2}
                >
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 1.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: (theme) =>
                        alpha(theme.palette.info.main, 0.12),
                    }}
                  >
                    <StyleIcon sx={{ fontSize: 20 }} color="info" />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600}>
                      Thuộc tính yêu thích
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Chọn các thuộc tính phù hợp với bạn
                    </Typography>
                  </Box>
                </Stack>
                {allAttributes.map((attr, i) => {
                  const values = allAttributeValues.get(attr.id!) || [];
                  if (values.length === 0) return null;
                  return (
                    <Box
                      key={attr.id}
                      sx={{
                        mb:
                          i < allAttributes.length - 1 ? 2.5 : 0,
                        ...(i < allAttributes.length - 1 && {
                          pb: 2.5,
                          borderBottom: "1px solid",
                          borderColor: "divider",
                        }),
                      }}
                    >
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        mb={1}
                      >
                        {attr.name}
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 1,
                        }}
                      >
                        {values.map((v) => {
                          const checked =
                            selectedAttrValueIds.includes(v.id!);
                          return (
                            <Chip
                              key={v.id}
                              label={v.value}
                              size="medium"
                              color={checked ? "info" : "default"}
                              variant={checked ? "filled" : "outlined"}
                              onClick={() => toggleAttrValue(v.id!)}
                              sx={{
                                fontWeight: checked ? 600 : 400,
                                borderRadius: 2,
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                                ...(checked && {
                                  boxShadow: (theme) =>
                                    `0 0 0 1px ${theme.palette.info.main}`,
                                }),
                                "&:hover": {
                                  transform: "translateY(-1px)",
                                  boxShadow: 1,
                                },
                              }}
                            />
                          );
                        })}
                      </Box>
                    </Box>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </Stack>
      )}
    </Box>
  );
};
