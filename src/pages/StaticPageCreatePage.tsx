import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  LinkOutlined as LinkIcon,
  Save as SaveIcon,
  ImageOutlined as ImageIcon,
} from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import DOMPurify from "dompurify";
import { AdminLayout } from "@/layouts/AdminLayout";
import { pageService } from "@/services/pageService";
import { useToast } from "@/hooks/useToast";

// ─── Slug helpers ─────────────────────────────────────────────────────────────

const VIETNAMESE_MAP: Record<string, string> = {
  à: "a", á: "a", ả: "a", ã: "a", ạ: "a",
  ă: "a", ắ: "a", ằ: "a", ẳ: "a", ẵ: "a", ặ: "a",
  â: "a", ấ: "a", ầ: "a", ẩ: "a", ẫ: "a", ậ: "a",
  è: "e", é: "e", ẻ: "e", ẽ: "e", ẹ: "e",
  ê: "e", ế: "e", ề: "e", ể: "e", ễ: "e", ệ: "e",
  ì: "i", í: "i", ỉ: "i", ĩ: "i", ị: "i",
  ò: "o", ó: "o", ỏ: "o", õ: "o", ọ: "o",
  ô: "o", ố: "o", ồ: "o", ổ: "o", ỗ: "o", ộ: "o",
  ơ: "o", ớ: "o", ờ: "o", ở: "o", ỡ: "o", ợ: "o",
  ù: "u", ú: "u", ủ: "u", ũ: "u", ụ: "u",
  ư: "u", ứ: "u", ừ: "u", ử: "u", ữ: "u", ự: "u",
  ỳ: "y", ý: "y", ỷ: "y", ỹ: "y", ỵ: "y",
  đ: "d",
  À: "a", Á: "a", Ả: "a", Ã: "a", Ạ: "a",
  Ă: "a", Ắ: "a", Ằ: "a", Ẳ: "a", Ẵ: "a", Ặ: "a",
  Â: "a", Ấ: "a", Ầ: "a", Ẩ: "a", Ẫ: "a", Ậ: "a",
  È: "e", É: "e", Ẻ: "e", Ẽ: "e", Ẹ: "e",
  Ê: "e", Ế: "e", Ề: "e", Ể: "e", Ễ: "e", Ệ: "e",
  Ì: "i", Í: "i", Ỉ: "i", Ĩ: "i", Ị: "i",
  Ò: "o", Ó: "o", Ỏ: "o", Õ: "o", Ọ: "o",
  Ô: "o", Ố: "o", Ồ: "o", Ổ: "o", Ỗ: "o", Ộ: "o",
  Ơ: "o", Ớ: "o", Ờ: "o", Ở: "o", Ỡ: "o", Ợ: "o",
  Ù: "u", Ú: "u", Ủ: "u", Ũ: "u", Ụ: "u",
  Ư: "u", Ứ: "u", Ừ: "u", Ử: "u", Ữ: "u", Ự: "u",
  Ỳ: "y", Ý: "y", Ỷ: "y", Ỹ: "y", Ỵ: "y",
  Đ: "d",
};

const toSlug = (text: string): string =>
  text
    .split("")
    .map((char) => VIETNAMESE_MAP[char] ?? char)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

// ─── Extract image URLs from HTML ─────────────────────────────────────────────

const extractImageUrlsFromHtml = (html: string): string[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const imgs = Array.from(doc.querySelectorAll("img"));
  return imgs.map((img) => img.getAttribute("src") ?? "").filter(Boolean);
};

// ─── Quill image handler ──────────────────────────────────────────────────────

type ImageUploadCallback = (file: File) => Promise<void>;
let _imageUploadCallback: ImageUploadCallback | null = null;

function quillImageHandler() {
  const input = document.createElement("input");
  input.setAttribute("type", "file");
  input.setAttribute("accept", "image/*");
  input.click();
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file || !_imageUploadCallback) return;
    await _imageUploadCallback(file);
  };
}

// ─── Quill config ─────────────────────────────────────────────────────────────

const quillModules = {
  toolbar: {
    container: [
      [{ header: [1, 2, 3, 4, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ color: [] }, { background: [] }],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ indent: "-1" }, { indent: "+1" }],
      [{ align: [] }],
      ["link", "image"],
      ["blockquote", "code-block"],
      ["clean"],
    ],
    handlers: { image: quillImageHandler },
  },
  clipboard: { matchVisual: false },
};

const quillFormats = [
  "header", "bold", "italic", "underline", "strike",
  "color", "background", "list", "indent", "align",
  "link", "image", "blockquote", "code-block",
];

// ─── Uploaded image state ─────────────────────────────────────────────────────

interface UploadedImage {
  id: string;
  url: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const StaticPageCreatePage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { pageSlug } = useParams<{ pageSlug?: string }>();
  const isEditMode = Boolean(pageSlug);

  const quillRef = useRef<ReactQuill | null>(null);

  // ─── CÁCH CHẶN PASTE CHÍNH XÁC NHẤT (Native DOM Event) ─────────────────────
  useEffect(() => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;

    // Gắn sự kiện lên thẳng container của Quill thay vì dùng React Synthetic Event
    const container = editor.container;

    const handleNativePaste = (e: ClipboardEvent) => {
      // Ép dừng toàn bộ các sự kiện paste khác của Quill
      e.preventDefault();
      e.stopImmediatePropagation();

      const html = e.clipboardData?.getData("text/html");
      const text = e.clipboardData?.getData("text/plain");

      if (!html && !text) return;

      let finalHtmlToPaste = "";

      if (html) {
        // Dọn dẹp khoảng trắng trước
        const preCleanedHtml = html.replace(/&nbsp;|\u00A0/g, " ");

        // Máy giặt DOMPurify
        finalHtmlToPaste = DOMPurify.sanitize(preCleanedHtml, {
          ALLOWED_TAGS: [
            "h1", "h2", "h3", "h4", "p", "br", "ul", "ol", "li",
            "strong", "em", "u", "a", "img", "blockquote", "code", "pre"
          ],
          ALLOWED_ATTR: ["href", "src", "alt", "target"],
          FORBID_TAGS: ["style", "script", "iframe", "object", "embed", "span", "div", "font"],
          FORBID_ATTR: ["style", "class", "id", "dir", "align"],
        });
      } else if (text) {
        finalHtmlToPaste = text.replace(/&nbsp;|\u00A0/g, " ");
      }

      const range = editor.getSelection(true) || { index: editor.getLength(), length: 0 };
      const lengthBefore = editor.getLength();

      // Bơm vào Editor
      editor.clipboard.dangerouslyPasteHTML(range.index, finalHtmlToPaste, "user");

      // Set lại con trỏ
      setTimeout(() => {
        const lengthAfter = editor.getLength();
        const addedLength = lengthAfter - lengthBefore;
        editor.setSelection(range.index + addedLength, 0, "user");
      }, 10);
    };

    // 'true' = Capture phase (Đánh chặn từ xa)
    container.addEventListener("paste", handleNativePaste, true);

    return () => {
      container.removeEventListener("paste", handleNativePaste, true);
    };
  }, []);

  // Form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [metaDescription, setMetaDescription] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [isPublished, setIsPublished] = useState(false);

  // Image state
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ─── Load existing page (edit mode) ────────────────────────────────────────

  useEffect(() => {
    if (!pageSlug) return;

    let cancelled = false;
    setIsLoading(true);

    pageService
      .getPageBySlug(pageSlug)
      .then((page) => {
        if (cancelled) return;
        setTitle(page.title);
        setSlug(page.slug);
        setSlugManuallyEdited(true);
        setMetaDescription(page.metaDescription ?? "");
        setHtmlContent(page.htmlContent ?? "");
        setIsPublished(page.isPublished);
      })
      .catch((err) => {
        if (cancelled) return;
        showToast(
          err instanceof Error ? err.message : "Không thể tải trang",
          "error",
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [pageSlug, showToast]);

  // ─── Slug auto-generation ─────────────────────────────────────────────────

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTitle(value);
    if (!slugManuallyEdited) {
      setSlug(toSlug(value));
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlug(e.target.value);
    setSlugManuallyEdited(true);
  };

  // ─── Image upload ─────────────────────────────────────────────────────────

  const handleImageUpload = useCallback(
    async (file: File) => {
      setIsUploadingImage(true);
      try {
        const result = await pageService.uploadTemporaryImage(file);

        setUploadedImages((prev) => [...prev, { id: result.id, url: result.url }]);

        // Insert at current cursor in editor
        const editor = quillRef.current?.getEditor();
        if (editor) {
          const range = editor.getSelection(true);
          editor.insertEmbed(range.index, "image", result.url, "user");
          editor.setSelection(range.index + 1, 0);
        }

        showToast("Đã tải ảnh lên thành công", "success");
      } catch (error) {
        showToast(
          error instanceof Error ? error.message : "Không thể tải ảnh lên",
          "error",
        );
      } finally {
        setIsUploadingImage(false);
      }
    },
    [showToast],
  );

  _imageUploadCallback = handleImageUpload;

  // ─── Active media IDs (garbage-collected) ────────────────────────────────

  const activeTemporaryMediaIds = useMemo<string[]>(() => {
    const urlsInContent = new Set(extractImageUrlsFromHtml(htmlContent));
    return uploadedImages
      .filter((img) => urlsInContent.has(img.url))
      .map((img) => img.id);
  }, [htmlContent, uploadedImages]);

  // ─── Validation ───────────────────────────────────────────────────────────

  const isSlugValid = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
  const isTitleEmpty = title.trim().length === 0;
  const isContentEmpty =
    !htmlContent ||
    htmlContent.replace(/<(.|\n)*?>/g, "").trim().length === 0;
  const canSubmit = !isTitleEmpty && !isContentEmpty && isSlugValid && !isSaving;

  // ─── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaveError(null);
    setIsSaving(true);

    // CHỐT CHẶN CUỐI CÙNG: Dọn dẹp HTML một lần nữa trước khi ném lên API
    // Phòng trường hợp user dùng thủ thuật nào đó sinh ra &nbsp; hoặc thẻ rác
    const preCleanedHtml = htmlContent.replace(/&nbsp;|\u00A0/g, " ");
    const finalCleanHtmlForAPI = DOMPurify.sanitize(preCleanedHtml, {
      ALLOWED_TAGS: [
        "h1", "h2", "h3", "h4", "p", "br", "ul", "ol", "li",
        "strong", "em", "u", "a", "img", "blockquote", "code", "pre"
      ],
      ALLOWED_ATTR: ["href", "src", "alt", "target"],
      FORBID_TAGS: ["style", "script", "iframe", "object", "embed", "span", "div", "font"],
      FORBID_ATTR: ["style", "class", "id", "dir", "align"],
    });

    const payload = {
      title: title.trim(),
      slug: slug.trim(),
      htmlContent: finalCleanHtmlForAPI, // <-- Dùng cái HTML đã dọn sạch
      isPublished,
      metaDescription: metaDescription.trim() || null,
      temporaryMediaIds: activeTemporaryMediaIds,
    };

    try {
      if (isEditMode && pageSlug) {
        await pageService.updatePage(pageSlug, payload);
        showToast("Đã cập nhật trang thành công", "success");
      } else {
        await pageService.createPage(payload);
        showToast("Đã tạo trang thành công", "success");
      }
      navigate("/admin/content");
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Không thể lưu trang";
      setSaveError(msg);
      showToast(msg, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <AdminLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Box>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={2} mb={3}>
          
          <Typography variant="h5" fontWeight={700} flex={1}>
            {isEditMode ? "Chỉnh sửa trang" : "Tạo trang nội dung"}
          </Typography>
          <Chip
            label={isPublished ? "Công khai" : "Bản nháp"}
            color={isPublished ? "success" : "default"}
            size="small"
          />
           <Button
            startIcon={<ArrowBackIcon />}
            variant="text"
            onClick={() => navigate("/admin/content")}
            sx={{ color: "text.secondary" }}
          >
            Danh sách trang
          </Button>
        </Stack>
         
        <Stack spacing={3}>
          {/* ── Meta panel ────────────────────────────────────────────── */}
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>
              Thông tin trang
            </Typography>

            {/* Title */}
            <TextField
              label="Tiêu đề *"
              fullWidth
              value={title}
              onChange={handleTitleChange}
              placeholder="Ví dụ: Chính sách đổi trả 2026"
              sx={{ mb: 1 }}
            />

            {/* Slug preview under title */}
            {slug && (
              <Stack direction="row" alignItems="center" spacing={0.75} mb={2}>
                <LinkIcon sx={{ fontSize: 15, color: "text.disabled" }} />
                <Typography variant="caption" color="text.secondary">
                  Đường dẫn:&nbsp;
                  <Box
                    component="span"
                    sx={{ fontFamily: "monospace", color: "primary.main" }}
                  >
                    /pages/{slug}
                  </Box>
                </Typography>
              </Stack>
            )}

            {/* Slug input */}
            <TextField
              label="Slug (Đường dẫn)"
              fullWidth
              value={slug}
              onChange={handleSlugChange}
              placeholder="chinh-sach-doi-tra-2026"
              error={slug.length > 0 && !isSlugValid}
              helperText={
                slug.length > 0 && !isSlugValid
                  ? "Slug chỉ được chứa chữ thường, số và dấu gạch ngang (-)"
                  : "Tự động điền từ tiêu đề. Bạn có thể chỉnh lại."
              }
              sx={{ mb: 2 }}
            />

            {/* Meta description */}
            <TextField
              label="Meta Description (SEO)"
              fullWidth
              multiline
              minRows={2}
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              placeholder="Mô tả ngắn gọn về nội dung trang để hiển thị trên Google..."
              inputProps={{ maxLength: 160 }}
              helperText={`${metaDescription.length}/160 ký tự`}
            />
          </Paper>

          {/* ── Rich text editor ──────────────────────────────────────── */}
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              mb={2}
            >
              <Typography variant="subtitle1" fontWeight={700}>
                Nội dung bài viết *
              </Typography>
              {isUploadingImage && (
                <Stack direction="row" alignItems="center" spacing={1}>
                  <CircularProgress size={16} />
                  <Typography variant="caption" color="text.secondary">
                    Đang tải ảnh lên...
                  </Typography>
                </Stack>
              )}
            </Stack>

            <Box
              // ĐÃ BỎ onPasteCapture ĐI, VÌ BÂY GIỜ TA DÙNG NATIVE EVENT Ở USEEFFECT TRÊN KIA
              sx={{
                "& .ql-container": {
                  fontSize: "15px",
                  fontFamily: "inherit",
                  minHeight: 320,
                  borderBottomLeftRadius: 4,
                  borderBottomRightRadius: 4,
                },
                "& .ql-editor": {
                  minHeight: 320,
                  lineHeight: 1.7,
                },
                "& .ql-toolbar": {
                  borderTopLeftRadius: 4,
                  borderTopRightRadius: 4,
                  background: "#f9fafb",
                },
                "& .ql-editor img": {
                  maxWidth: "100%",
                  borderRadius: "4px",
                  my: 1,
                },
              }}
            >
              <ReactQuill
                ref={quillRef}
                theme="snow"
                value={htmlContent}
                onChange={setHtmlContent}
                modules={quillModules}
                formats={quillFormats}
                placeholder="Bắt đầu soạn thảo... Bạn có thể paste văn bản có sẵn hoặc dùng nút 🖼 để chèn ảnh."
              />
            </Box>

            <Typography
              variant="caption"
              color="text.secondary"
              mt={1}
              display="block"
            >
              <ImageIcon
                sx={{ fontSize: 13, verticalAlign: "middle", mr: 0.5 }}
              />
              Nhấn nút hình ảnh trên thanh công cụ để chèn ảnh — ảnh sẽ hiển thị
              ngay trong bài.
            </Typography>

            {uploadedImages.length > 0 && (
              <Box mt={1}>
                <Typography variant="caption" color="text.secondary">
                  Ảnh đã tải lên:{" "}
                  <Box
                    component="span"
                    fontWeight={700}
                    color="success.main"
                  >
                    {activeTemporaryMediaIds.length}
                  </Box>
                  /{uploadedImages.length} đang hiển thị trong bài
                </Typography>
              </Box>
            )}
          </Paper>

          {/* ── Publish & Submit ──────────────────────────────────────── */}
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              alignItems={{ xs: "flex-start", sm: "center" }}
              justifyContent="space-between"
              spacing={2}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    color="success"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {isPublished ? "Công khai ngay" : "Lưu dưới dạng nháp"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {isPublished
                        ? "Trang sẽ hiển thị công khai cho người dùng."
                        : "Trang chỉ hiển thị trong hệ thống quản trị."}
                    </Typography>
                  </Box>
                }
              />

              <Stack direction="row" spacing={2}>
                <Button
                  variant="outlined"
                  onClick={() => navigate("/admin/content")}
                  disabled={isSaving}
                >
                  Hủy
                </Button>
                <Tooltip
                  title={
                    isTitleEmpty
                      ? "Vui lòng nhập tiêu đề"
                      : isContentEmpty
                        ? "Vui lòng nhập nội dung"
                        : !isSlugValid
                          ? "Slug không hợp lệ"
                          : ""
                  }
                  arrow
                >
                  <span>
                    <Button
                      variant="contained"
                      color="primary"
                      size="large"
                      startIcon={
                        isSaving ? (
                          <CircularProgress size={18} color="inherit" />
                        ) : (
                          <SaveIcon />
                        )
                      }
                      onClick={() => void handleSubmit()}
                      disabled={!canSubmit}
                      sx={{ minWidth: 140 }}
                    >
                      {isSaving
                        ? "Đang lưu..."
                        : isEditMode
                          ? "Lưu thay đổi"
                          : "Lưu trang"}
                    </Button>
                  </span>
                </Tooltip>
              </Stack>
            </Stack>
          </Paper>
        </Stack>
      </Box>
    </AdminLayout>
  );
};