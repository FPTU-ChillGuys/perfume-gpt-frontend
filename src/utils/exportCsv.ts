/**
 * Exports data to a CSV file that Excel can open natively.
 * No external library required — uses browser Blob + anchor download.
 */
export const exportToCsv = <T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  columns: { key: keyof T; header: string }[],
) => {
  const escape = (value: unknown): string => {
    const str = value == null ? "" : String(value);
    // Wrap in quotes if it contains comma, newline, or double-quote
    if (str.includes(",") || str.includes("\n") || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerRow = columns.map((col) => escape(col.header)).join(",");
  const dataRows = data.map((row) =>
    columns.map((col) => escape(row[col.key])).join(","),
  );

  // BOM for Excel to detect UTF-8 correctly
  const csvContent = "\uFEFF" + [headerRow, ...dataRows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    filename.endsWith(".csv") ? filename : `${filename}.csv`,
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
