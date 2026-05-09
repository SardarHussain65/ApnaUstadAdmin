// Lightweight CSV export — no dependencies
export function toCsv<T>(rows: T[], columns: { key: keyof T; header: string }[]): string {
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const head = columns.map(c => escape(c.header)).join(",");
  const body = rows.map(r => columns.map(c => escape(r[c.key])).join(",")).join("\n");
  return head + "\n" + body;
}

export function downloadCsv<T>(
  filename: string,
  rows: T[],
  columns: { key: keyof T; header: string }[],
) {
  const csv = toCsv(rows, columns);
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
