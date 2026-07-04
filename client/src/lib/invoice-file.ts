function buildInvoiceFileUrl(fileUrl: string, filename: string, download: boolean): string {
  if (fileUrl.startsWith("http")) return fileUrl;
  const url = new URL(fileUrl, window.location.origin);
  url.searchParams.set("filename", filename);
  if (download) url.searchParams.set("download", "true");
  return url.toString();
}

export function openInvoiceFile(fileUrl: string | null | undefined, fileName?: string | null): void {
  if (!fileUrl) return;
  const filename = fileName || "invoice.pdf";
  window.open(buildInvoiceFileUrl(fileUrl, filename, false), "_blank");
}

export function downloadInvoiceFile(fileUrl: string | null | undefined, fileName?: string | null): void {
  if (!fileUrl) return;
  const filename = fileName || "invoice.pdf";
  const link = document.createElement("a");
  link.href = buildInvoiceFileUrl(fileUrl, filename, true);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
