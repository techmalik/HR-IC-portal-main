import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { getCurrencySymbol } from "@/lib/currency";

export interface LineItem {
  description: string;
  rate: string;
  quantity: string;
  expenseId?: string;
}

export const formatCurrency = (value: number): string => {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const calculateLineTotal = (rate: string, quantity: string): number => {
  const r = parseFloat(rate.replace(/,/g, "")) || 0;
  const q = parseFloat(quantity) || 0;
  return r * q;
};

export const calculateSubtotal = (lineItems: LineItem[]): number => {
  return Math.round(
    lineItems.reduce((sum, item) => sum + calculateLineTotal(item.rate, item.quantity), 0) * 100
  );
};

export interface GenerateInvoicePDFParams {
  lineItems: LineItem[];
  issueDate: string;
  invoiceNumber: string;
  selectedMonth: string;
  selectedYear: string;
  contractorName: string;
  contractorAddress: string;
  contractorPhone: string;
  contractorEmail: string;
  contractorVatNo: string;
  billToName: string;
  billToAddress: string;
  billToVatNo: string;
  currencySymbol: string;
  bankDetailsText: string;
  accountFirstName: string;
  accountLastName: string;
  bankName: string;
  swiftCode: string;
  ibanNumber: string;
  accountNumber: string;
  routingNumber: string;
  accountType: string;
}

export const generateInvoicePDF = (params: GenerateInvoicePDFParams): jsPDF => {
  const {
    lineItems,
    issueDate,
    invoiceNumber,
    selectedMonth,
    selectedYear,
    contractorName,
    contractorAddress,
    contractorPhone,
    contractorEmail,
    contractorVatNo,
    billToName,
    billToAddress,
    billToVatNo,
    currencySymbol,
    bankDetailsText,
    accountFirstName,
    accountLastName,
    bankName,
    swiftCode,
    ibanNumber,
    accountNumber,
    routingNumber,
    accountType,
  } = params;

  const doc = new jsPDF();
  const subtotalCents = calculateSubtotal(lineItems);
  const subtotalDollars = formatCurrency(subtotalCents / 100);
  const validLineItems = lineItems.filter((item) => item.description && item.rate);
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  doc.setFontSize(24);
  doc.setTextColor(30, 58, 95);
  doc.text("INVOICE", 20, y);

  doc.setFontSize(10);
  doc.setTextColor(51, 51, 51);
  doc.text(`Date: ${format(new Date(issueDate), "MMM d, yyyy")}`, pageWidth - 20, y, { align: "right" });
  y += 6;
  doc.text(`Invoice No: ${invoiceNumber}`, pageWidth - 20, y, { align: "right" });
  y += 6;
  const periodMonthName = selectedMonth
    ? new Date(2000, parseInt(selectedMonth) - 1).toLocaleString("default", { month: "long" })
    : "";
  doc.text(`Period: ${periodMonthName} ${selectedYear}`, pageWidth - 20, y, { align: "right" });
  y += 20;

  doc.setFontSize(8);
  doc.setTextColor(102, 102, 102);
  doc.text("CONTRACTOR", 20, y);
  doc.text("BILL TO", 110, y);
  y += 6;

  doc.setFontSize(10);
  doc.setTextColor(51, 51, 51);
  doc.setFont("helvetica", "bold");
  doc.text(contractorName, 20, y);
  doc.text(billToName, 110, y);
  y += 5;
  doc.setFont("helvetica", "normal");

  const contractorLines = contractorAddress.split("\n");
  contractorLines.forEach((line) => {
    doc.text(line, 20, y);
    y += 4;
  });
  if (contractorPhone) { doc.text(`Phone: ${contractorPhone}`, 20, y); y += 4; }
  if (contractorEmail) { doc.text(`Email: ${contractorEmail}`, 20, y); y += 4; }
  if (contractorVatNo) { doc.text(`VAT No: ${contractorVatNo}`, 20, y); y += 4; }

  let billY =
    y -
    contractorLines.length * 4 -
    (contractorPhone ? 4 : 0) -
    (contractorEmail ? 4 : 0) -
    (contractorVatNo ? 4 : 0);
  const billToLines = billToAddress.split("\n");
  billToLines.forEach((line) => {
    doc.text(line, 110, billY);
    billY += 4;
  });
  if (billToVatNo) { doc.text(`VAT No: ${billToVatNo}`, 110, billY); }

  y += 10;

  doc.setFillColor(30, 58, 95);
  doc.rect(20, y, pageWidth - 40, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text("Description", 22, y + 5.5);
  doc.text("Qty", 120, y + 5.5);
  doc.text("Rate", 145, y + 5.5);
  doc.text("Total", pageWidth - 22, y + 5.5, { align: "right" });
  y += 12;

  doc.setTextColor(51, 51, 51);
  validLineItems.forEach((item) => {
    const total = calculateLineTotal(item.rate, item.quantity);
    doc.text(item.description.substring(0, 50), 22, y);
    doc.text(item.quantity, 120, y);
    doc.text(`${currencySymbol}${formatCurrency(parseFloat(item.rate.replace(/,/g, "")))}`, 145, y);
    doc.text(`${currencySymbol}${formatCurrency(total)}`, pageWidth - 22, y, { align: "right" });
    doc.setDrawColor(229, 229, 229);
    doc.line(20, y + 2, pageWidth - 20, y + 2);
    y += 8;
  });

  y += 10;
  const summaryRightMargin = 20;
  const summaryAmountX = pageWidth - summaryRightMargin;
  const amountColumnWidth = 50;
  const labelColumnX = summaryAmountX - amountColumnWidth - 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text("Sub-Total:", labelColumnX, y, { align: "right" });
  doc.text(`${currencySymbol}${subtotalDollars}`, summaryAmountX, y, { align: "right" });

  y += 14;
  doc.setDrawColor(30, 58, 95);
  doc.setLineWidth(0.5);
  doc.line(labelColumnX - 30, y - 4, summaryAmountX, y - 4);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 58, 95);
  doc.text("Balance Due:", labelColumnX, y, { align: "right" });
  doc.text(`${currencySymbol}${subtotalDollars}`, summaryAmountX, y, { align: "right" });
  doc.setLineWidth(0.2);

  if (bankDetailsText) {
    y += 20;
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(20, y, pageWidth - 40, 50, 3, 3, "F");
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 58, 95);
    doc.text("Payment Instructions", 25, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(51, 51, 51);
    if (accountFirstName || accountLastName) { doc.text(`Name: ${accountFirstName} ${accountLastName}`, 25, y); y += 5; }
    if (bankName) { doc.text(`Bank: ${bankName}`, 25, y); y += 5; }
    if (swiftCode) { doc.text(`SWIFT: ${swiftCode}`, 25, y); y += 5; }
    if (ibanNumber) { doc.text(`IBAN: ${ibanNumber}`, 25, y); y += 5; }
    if (accountNumber) { doc.text(`Account: ${accountNumber}`, 25, y); y += 5; }
    if (routingNumber) { doc.text(`Routing: ${routingNumber}`, 25, y); y += 5; }
    if (accountType) { doc.text(`Type: ${accountType}`, 25, y); }
  }

  return doc;
};
