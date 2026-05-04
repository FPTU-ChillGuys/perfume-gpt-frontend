import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
  Tooltip,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
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

const POLICY_NAMES: Record<string, string> = {
  USAGE_STORAGE: "Hướng dẫn Sử dụng & Bảo quản",
  SHIPPING_RETURN: "Chính sách Vận chuyển & Đổi trả",
  GUIDE: "Hướng dẫn mua hàng & Thanh toán",
};

export const PolicyEditPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { policyCode } = useParams<{ policyCode: string }>();
  
  const quillRef = useRef<ReactQuill | null>(null);

  const [htmlContent, setHtmlContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // ─── Image upload ─────────────────────────────────────────────────────────

  const handleImageUpload = async (file: File) => {
    setIsUploadingImage(true);
    try {
      const result = await pageService.uploadTemporaryImage(file);

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
  };

  _imageUploadCallback = handleImageUpload;
  useEffect(() => {
    if (!policyCode) return;

    setIsLoading(true);
    pageService.getPolicy(policyCode)
      .then((content) => {
        setHtmlContent(content || "");
      })
      .catch((err) => {
        showToast(err instanceof Error ? err.message : "Không thể tải nội dung", "error");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [policyCode, showToast]);

  // Handle Paste (same as StaticPageCreatePage)
  useEffect(() => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;
    const container = editor.container;

    const handleNativePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopImmediatePropagation();

      const html = e.clipboardData?.getData("text/html");
      const text = e.clipboardData?.getData("text/plain");

      if (!html && !text) return;

      let finalHtmlToPaste = "";
      if (html) {
        const preCleanedHtml = html.replace(/&nbsp;|\u00A0/g, " ");
        finalHtmlToPaste = DOMPurify.sanitize(preCleanedHtml, {
          ALLOWED_TAGS: ["h1", "h2", "h3", "h4", "p", "br", "ul", "ol", "li", "strong", "em", "u", "a", "img", "blockquote", "code", "pre"],
          ALLOWED_ATTR: ["href", "src", "alt", "target"],
          FORBID_TAGS: ["style", "script", "iframe", "object", "embed", "span", "div", "font"],
          FORBID_ATTR: ["style", "class", "id", "dir", "align"],
        });
      } else if (text) {
        finalHtmlToPaste = text.replace(/&nbsp;|\u00A0/g, " ");
      }

      const range = editor.getSelection(true) || { index: editor.getLength(), length: 0 };
      editor.clipboard.dangerouslyPasteHTML(range.index, finalHtmlToPaste, "user");
    };

    container.addEventListener("paste", handleNativePaste, true);
    return () => container.removeEventListener("paste", handleNativePaste, true);
  }, []);

  const handleSubmit = async () => {
    if (!policyCode || isSaving) return;
    
    setIsSaving(true);
    try {
      const preCleanedHtml = htmlContent.replace(/&nbsp;|\u00A0/g, " ");
      const sanitizedHtml = DOMPurify.sanitize(preCleanedHtml, {
        ALLOWED_TAGS: ["h1", "h2", "h3", "h4", "p", "br", "ul", "ol", "li", "strong", "em", "u", "a", "img", "blockquote", "code", "pre", "div"],
        ALLOWED_ATTR: ["href", "src", "alt", "target", "style", "class"],
        FORBID_TAGS: ["style", "script", "iframe", "object", "embed", "span", "font"],
        FORBID_ATTR: ["id", "dir", "align"],
      });

      // Wrap in a professional container if not already wrapped
      let finalHtml = sanitizedHtml;
      if (!sanitizedHtml.includes('class="policy-content"')) {
        finalHtml = `<div class="policy-content" style="font-size: 14px; line-height: 1.6; color: #374151;">\n${sanitizedHtml}\n</div>`;
      }

      const title = POLICY_NAMES[policyCode] || "Chính sách";
      await pageService.updatePolicy(policyCode, title, finalHtml);
      showToast("Cập nhật thành công", "success");
      navigate("/admin/content");
    } catch (error: any) {
      showToast(error.message || "Cập nhật thất bại", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <Box display="flex" justifyContent="center" py={10}>
          <CircularProgress />
        </Box>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Box>
        <Stack direction="row" alignItems="center" spacing={2} mb={3}>
          <Typography variant="h5" fontWeight={700} flex={1}>
            Chỉnh sửa {POLICY_NAMES[policyCode || ""] || "Chính sách"}
          </Typography>
          <Button
            startIcon={<ArrowBackIcon />}
            variant="text"
            onClick={() => navigate("/admin/content")}
          >
            Quay lại
          </Button>
        </Stack>

        <Stack spacing={3}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            <Box sx={{ mb: 2 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="subtitle1" fontWeight={700}>
                  Nội dung chi tiết
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
              <Typography variant="caption" color="text.secondary">
                Hỗ trợ copy-paste từ Word/Web và giữ định dạng cơ bản.
              </Typography>
            </Box>

            <Box
              sx={{
                "& .ql-container": {
                  fontSize: "15px",
                  minHeight: 450,
                  borderBottomLeftRadius: 4,
                  borderBottomRightRadius: 4,
                },
                "& .ql-editor": {
                  minHeight: 450,
                  lineHeight: 1.7,
                  color: "#374151",
                  "& strong": { fontWeight: 700, color: "#111827" },
                  "& h1, & h2, & h3, & h4": {
                    fontWeight: 700,
                    color: "#111827",
                    mt: 2,
                    mb: 1,
                  },
                  "& p": { mb: 1.5 },
                  "& ul, & ol": { mb: 1.5 },
                },
                "& .ql-toolbar": {
                  borderTopLeftRadius: 4,
                  borderTopRightRadius: 4,
                  background: "#f9fafb",
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
                placeholder="Bắt đầu soạn thảo nội dung..."
              />
            </Box>

            <Typography variant="caption" color="text.secondary" mt={1} display="block">
              <ImageIcon sx={{ fontSize: 13, verticalAlign: "middle", mr: 0.5 }} />
              Dùng thanh công cụ để định dạng text hoặc chèn ảnh.
            </Typography>
          </Paper>

          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            <Stack direction="row" justifyContent="flex-end" spacing={2}>
              <Button variant="outlined" onClick={() => navigate("/admin/content")} disabled={isSaving}>
                Hủy bỏ
              </Button>
              <Button
                variant="contained"
                startIcon={isSaving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                onClick={handleSubmit}
                disabled={isSaving}
                sx={{ minWidth: 140 }}
              >
                {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </Stack>
          </Paper>
        </Stack>
      </Box>
    </AdminLayout>
  );
};
