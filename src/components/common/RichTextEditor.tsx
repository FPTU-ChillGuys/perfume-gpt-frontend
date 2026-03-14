import { useEffect, useRef } from "react";
import { Box, Typography } from "@mui/material";

interface RichTextEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  minHeight?: number;
  placeholder?: string;
}

const isLikelyHtml = (input: string) => /<\/?[a-z][\s\S]*>/i.test(input);

const escapeHtml = (input: string) =>
  input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const toEditorHtml = (input: string) => {
  if (!input) return "";
  if (isLikelyHtml(input)) return input;
  return escapeHtml(input).replace(/\r?\n/g, "<br />");
};

const normalizeHtml = (input: string) => {
  if (!input) return "";

  const container = document.createElement("div");
  container.innerHTML = input;

  const textContent = (container.textContent || "")
    .replace(/\u00a0/g, " ")
    .trim();

  if (!textContent) {
    return "";
  }

  // Keep line breaks as HTML tags (<br>, <p>, <div>) but strip raw newline chars
  // to avoid API validation errors on payload strings.
  return container.innerHTML.replace(/[\r\n]+/g, "").trim();
};

export default function RichTextEditor({
  label,
  value,
  onChange,
  disabled = false,
  minHeight = 140,
  placeholder = "Nhập nội dung...",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const nextHtml = toEditorHtml(value);
    if (editor.innerHTML !== nextHtml) {
      editor.innerHTML = nextHtml;
    }
  }, [value]);

  const focusEditor = () => {
    const editor = editorRef.current;
    if (!editor || disabled) return;
    editor.focus();
  };

  const executeCommand = (command: string, commandValue?: string) => {
    if (disabled) return;
    focusEditor();
    document.execCommand(command, false, commandValue);
    const currentHtml = editorRef.current?.innerHTML ?? "";
    onChange(normalizeHtml(currentHtml));
  };

  const handleInput = () => {
    const currentHtml = editorRef.current?.innerHTML ?? "";
    onChange(normalizeHtml(currentHtml));
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    const html = escapeHtml(text).replace(/\r?\n/g, "<br />");
    document.execCommand("insertHTML", false, html);
    handleInput();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const isMod = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();

    if (isMod && key === "b") {
      event.preventDefault();
      executeCommand("bold");
      return;
    }

    if (isMod && key === "i") {
      event.preventDefault();
      executeCommand("italic");
      return;
    }

    if (!isMod && event.key === "Enter") {
      event.preventDefault();
      executeCommand("insertLineBreak");
    }
  };

  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={600} mb={1}>
        {label}
      </Typography>

      <Typography variant="caption" color="text.secondary" display="block" mb={1.25}>
        Phim tat: Ctrl+B (in dam), Ctrl+I (in nghieng), Enter (xuong dong)
      </Typography>

      <Box
        ref={editorRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          px: 1.5,
          py: 1.25,
          minHeight,
          fontSize: 14,
          lineHeight: 1.6,
          outline: "none",
          bgcolor: disabled ? "action.disabledBackground" : "background.paper",
          color: "text.primary",
          cursor: disabled ? "not-allowed" : "text",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          "&:focus": {
            borderColor: "primary.main",
            boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.main}22`,
          },
          "&:empty:before": {
            content: "attr(data-placeholder)",
            color: "text.disabled",
            pointerEvents: "none",
          },
        }}
      />
    </Box>
  );
}
