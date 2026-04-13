const VIETNAM_TIME_ZONE = "Asia/Ho_Chi_Minh";

const HAS_TIMEZONE_PATTERN = /(Z|[+-]\d{2}:?\d{2})$/i;
const ISO_WITHOUT_TZ_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/;

const normalizeServerDateString = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }

  // Backend may return UTC datetime without timezone suffix.
  // Treat those values as UTC to avoid a 7-hour drift in VN display.
  if (
    ISO_WITHOUT_TZ_PATTERN.test(trimmed) &&
    !HAS_TIMEZONE_PATTERN.test(trimmed)
  ) {
    return `${trimmed}Z`;
  }

  return trimmed;
};

export const parseServerDate = (value?: string | number | Date | null) => {
  if (value == null) {
    return null;
  }

  const parsed =
    typeof value === "string"
      ? new Date(normalizeServerDateString(value))
      : new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatDateVN = (value?: string | number | Date | null) => {
  const date = parseServerDate(value);
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: VIETNAM_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

export const formatDateTimeVN = (
  value?: string | number | Date | null,
  withSeconds = true,
) => {
  const date = parseServerDate(value);
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: VIETNAM_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: withSeconds ? "2-digit" : undefined,
    hour12: false,
  }).format(date);
};

export const formatDateTimeCompactVN = (
  value?: string | number | Date | null,
) => {
  const date = parseServerDate(value);
  if (!date) {
    return null;
  }

  const parts = new Intl.DateTimeFormat("vi-VN", {
    timeZone: VIETNAM_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const day = parts.find((part) => part.type === "day")?.value ?? "--";
  const month = parts.find((part) => part.type === "month")?.value ?? "--";
  const year = parts.find((part) => part.type === "year")?.value ?? "----";
  const hour = parts.find((part) => part.type === "hour")?.value ?? "--";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "--";

  return `${hour}:${minute} ${day}-${month}-${year}`;
};
