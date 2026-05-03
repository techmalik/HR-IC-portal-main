import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { jsPDF } from "jspdf";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Upload, FileText, Download, Loader2, Plus, FileCheck, Trash2, Save, Eye, AlertCircle, RefreshCw } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import type { Invoice, Timesheet, IcPaymentDetails, OvertimeRequest, DailyEntry, Organization } from "@shared/schema";
import { formatMoney, getCurrencySymbol, normalizeCurrency } from "@/lib/currency";
import { OnboardingTour, invoicesTourConfig } from "@/components/onboarding-tour";

interface LineItem {
  description: string;
  rate: string;
  quantity: string;
}

const formatCurrency = (value: number): string => {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function InvoicesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [amount, setAmount] = useState("");
  const [showTour, setShowTour] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const userCurrency = normalizeCurrency((user as any)?.currency);
  const currencySymbol = getCurrencySymbol(userCurrency);

  useEffect(() => {
    if (!user) return;
    const completedOnboarding = (user.completedOnboarding as Record<string, boolean>) || {};
    if (completedOnboarding.invoices !== true) {
      const timer = setTimeout(() => setShowTour(true), 500);
      return () => clearTimeout(timer);
    }
  }, [user]);

  // Generate tab state
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issueDate, setIssueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [contractorName, setContractorName] = useState("");
  const [contractorAddress, setContractorAddress] = useState("");
  const [contractorPhone, setContractorPhone] = useState("");
  const [contractorEmail, setContractorEmail] = useState("");
  const [contractorVatNo, setContractorVatNo] = useState("");
  const [billToName, setBillToName] = useState("");
  const [billToAddress, setBillToAddress] = useState("");
  const [billToVatNo, setBillToVatNo] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([{ description: "", rate: "", quantity: "1" }]);

  // Contractor category state
  const [contractorCategory, setContractorCategory] = useState("");

  // Payment details state
  const [bankName, setBankName] = useState("");
  const [accountFirstName, setAccountFirstName] = useState("");
  const [accountLastName, setAccountLastName] = useState("");
  const [swiftCode, setSwiftCode] = useState("");
  const [ibanNumber, setIbanNumber] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [accountType, setAccountType] = useState("");
  const [bankAddress, setBankAddress] = useState("");

  // Delete state
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);

  // Invoice submission confirmation state
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [pendingSubmitType, setPendingSubmitType] = useState<"upload" | "generate" | null>(null);

  const { data: invoices, isLoading, isFetching, refetch: refetchInvoices } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices", { userId: user?.id }],
    queryFn: async () => {
      const res = await fetch(`/api/invoices?userId=${user?.id}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch invoices");
      return res.json();
    },
    enabled: !!user?.id,
  });

  const { data: timesheets, refetch: refetchTimesheets } = useQuery<Timesheet[]>({
    queryKey: ["/api/timesheets", { userId: user?.id }],
    queryFn: async () => {
      const res = await fetch(`/api/timesheets?userId=${user?.id}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch timesheets");
      return res.json();
    },
    enabled: !!user?.id,
  });

  // Get the selected timesheet id for overtime query
  const selectedTimesheetId = timesheets?.find(ts => 
    ts.month === parseInt(selectedMonth || "0") && ts.year === parseInt(selectedYear || "0")
  )?.id;

  // Query overtime requests for the selected timesheet to check for pending approvals
  const { data: overtimeRequests, refetch: refetchOvertimeRequests, isLoading: isLoadingOvertime } = useQuery<OvertimeRequest[]>({
    queryKey: ["/api/overtime-requests", { timesheetId: selectedTimesheetId }],
    queryFn: async () => {
      const res = await fetch(`/api/overtime-requests?timesheetId=${selectedTimesheetId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch overtime requests");
      return res.json();
    },
    enabled: !!selectedTimesheetId,
  });

  // Query daily entries for the selected timesheet to count days logged
  const { data: dailyEntries } = useQuery<DailyEntry[]>({
    queryKey: ["/api/timesheets", selectedTimesheetId, "entries"],
    queryFn: async () => {
      const res = await fetch(`/api/timesheets/${selectedTimesheetId}/entries`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch daily entries");
      return res.json();
    },
    enabled: !!selectedTimesheetId,
  });

  // Helper to get pending overtime/weekend work requests
  const getPendingApprovals = () => {
    if (!overtimeRequests) return { hasPending: false, pendingOvertime: 0, pendingWeekend: 0, totalPending: 0 };
    
    const pendingRequests = overtimeRequests.filter(r => r.status === "pending");
    const pendingOvertime = pendingRequests.filter(r => !r.isWeekendWork).length;
    const pendingWeekend = pendingRequests.filter(r => r.isWeekendWork).length;
    
    return {
      hasPending: pendingRequests.length > 0,
      pendingOvertime,
      pendingWeekend,
      totalPending: pendingRequests.length,
    };
  };

  const { data: savedPaymentDetails } = useQuery<IcPaymentDetails | null>({
    queryKey: ["/api/ic-payment-details", user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/ic-payment-details/${user?.id}`, {
        credentials: "include",
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user?.id,
  });

  const { data: organization } = useQuery<Organization | null>({
    queryKey: ["/api/organization"],
    queryFn: async () => {
      const res = await fetch("/api/organization", {
        credentials: "include",
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (user) {
      setContractorName(`${user.firstName} ${user.lastName}`);
      setContractorEmail(user.email);
      if ((user as any).contractorCategory) {
        setContractorCategory((user as any).contractorCategory);
      }
    }
  }, [user]);

  useEffect(() => {
    if (organization) {
      if (organization.name) {
        setBillToName(organization.name);
      }
      if (organization.address) {
        setBillToAddress(organization.address);
      }
      if (organization.vatNumber) {
        setBillToVatNo(organization.vatNumber);
      }
    }
  }, [organization]);

  useEffect(() => {
    if (savedPaymentDetails) {
      setBankName(savedPaymentDetails.bankName || "");
      setAccountFirstName(savedPaymentDetails.accountHolderFirstName || "");
      setAccountLastName(savedPaymentDetails.accountHolderLastName || "");
      setSwiftCode(savedPaymentDetails.swiftCode || "");
      setIbanNumber(savedPaymentDetails.ibanNumber || "");
      setAccountNumber(savedPaymentDetails.accountNumber || "");
      setRoutingNumber(savedPaymentDetails.routingNumber || "");
      setAccountType(savedPaymentDetails.accountType || "");
      setBankAddress(savedPaymentDetails.address || "");
    }
  }, [savedPaymentDetails]);

  // Initialize month/year to current month when dialog opens
  useEffect(() => {
    if (isDialogOpen && !selectedMonth && !selectedYear) {
      const now = new Date();
      setSelectedMonth(String(now.getMonth() + 1));
      setSelectedYear(String(now.getFullYear()));
    }
  }, [isDialogOpen, selectedMonth, selectedYear]);

  useEffect(() => {
    if (isDialogOpen && activeTab === "generate" && user?.id) {
      fetch(`/api/invoices/next-number/${user.id}`, {
        credentials: "include",
      })
        .then((res) => res.json())
        .then((data) => setInvoiceNumber(data.invoiceNumber))
        .catch(() => {});
    }
  }, [isDialogOpen, activeTab, user?.id]);

  useEffect(() => {
    if (isDialogOpen && activeTab === "generate" && user?.hourlyRate) {
      const rateInDollars = formatCurrency(user.hourlyRate / 100);
      setLineItems((prev) => {
        if (prev.length === 1 && !prev[0].rate) {
          return [{ ...prev[0], rate: rateInDollars }];
        }
        return prev;
      });
    }
  }, [isDialogOpen, activeTab, user?.hourlyRate]);

  useEffect(() => {
    if (selectedMonth && selectedYear && timesheets) {
      const monthInt = parseInt(selectedMonth);
      const yearInt = parseInt(selectedYear);
      const matchingTimesheet = timesheets.find(
        (ts) => ts.month === monthInt && ts.year === yearInt && ts.status === "approved"
      );
      if (matchingTimesheet && matchingTimesheet.totalHours > 0) {
        setLineItems((prev) => {
          if (prev.length === 1) {
            return [{ ...prev[0], quantity: matchingTimesheet.totalHours.toString() }];
          }
          return prev;
        });
      }
    }
  }, [selectedMonth, selectedYear, timesheets]);

  const savePaymentDetailsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/ic-payment-details", {
        userId: user?.id,
        bankName,
        accountHolderFirstName: accountFirstName,
        accountHolderLastName: accountLastName,
        swiftCode,
        ibanNumber,
        accountNumber,
        routingNumber,
        accountType,
        address: bankAddress,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ic-payment-details"] });
      toast({
        title: "Payment details saved",
        description: "Your payment details have been saved for future invoices.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save payment details.",
        variant: "destructive",
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error("No file selected");

      const reader = new FileReader();
      const fileData = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      const monthName = months.find((m) => m.value === selectedMonth)?.label || selectedMonth;
      const userName = user ? `${user.firstName}_${user.lastName}` : "Unknown";
      const sanitizedName = userName.replace(/[^a-zA-Z0-9_]/g, "").substring(0, 30);
      const ext = selectedFile.name.split(".").pop() || "pdf";
      const standardizedFileName = `Invoice-${sanitizedName}-${monthName}-${selectedYear}.${ext}`;

      const response = await apiRequest("POST", "/api/invoices", {
        userId: user?.id,
        invoiceNumber: `UPLOAD-${Date.now()}`,
        issueDate: format(new Date(), "yyyy-MM-dd"),
        month: parseInt(selectedMonth),
        year: parseInt(selectedYear),
        fileName: standardizedFileName,
        fileUrl: fileData,
        amount: amount ? parseFloat(amount) * 100 : null,
        currency: userCurrency,
        contractorCategory: contractorCategory || undefined,
      });

      // Save category to user profile for future invoices
      if (contractorCategory && user?.id) {
        await apiRequest("PATCH", `/api/users/${user.id}`, {
          contractorCategory,
        });
        // Update auth context with new category
        updateUser({ contractorCategory } as any);
      }

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
      toast({
        title: "Invoice uploaded",
        description: "Your invoice has been uploaded successfully.",
      });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload invoice. Please try again.",
        variant: "destructive",
      });
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const calculatedSubtotal = calculateSubtotal();
      const doc = generateInvoicePDF();
      const pdfBlob = doc.output("blob");
      const fileData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(pdfBlob);
      });

      const monthName = months.find((m) => m.value === selectedMonth)?.label || selectedMonth;
      const sanitizedName = contractorName.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30);
      const fileName = `Invoice-${sanitizedName}-${invoiceNumber}-${monthName}-${selectedYear}.pdf`;

      const bankDetailsText = formatBankDetailsText();

      const invoiceResponse = await apiRequest("POST", "/api/invoices", {
        userId: user?.id,
        invoiceNumber,
        issueDate,
        month: parseInt(selectedMonth),
        year: parseInt(selectedYear),
        fileName,
        fileUrl: fileData,
        amount: calculatedSubtotal,
        subtotal: calculatedSubtotal,
        currency: userCurrency,
        contractorName,
        contractorAddress,
        contractorPhone,
        contractorEmail,
        contractorVatNo: contractorVatNo || null,
        billToName,
        billToAddress,
        billToVatNo: billToVatNo || null,
        bankDetails: bankDetailsText || null,
        contractorCategory: contractorCategory || undefined,
      });

      const invoice = await invoiceResponse.json();

      const validLineItems = lineItems.filter((item) => item.description && item.rate);
      for (let i = 0; i < validLineItems.length; i++) {
        const item = validLineItems[i];
        const rateCents = Math.round(parseFloat(item.rate.replace(/,/g, "")) * 100);
        const qty = parseInt(item.quantity) || 1;
        const totalCents = rateCents * qty;
        
        await apiRequest("POST", `/api/invoices/${invoice.id}/line-items`, {
          description: item.description,
          rate: rateCents,
          quantity: qty,
          total: totalCents,
          sortOrder: i,
        });
      }

      // Save category to user profile for future invoices
      if (contractorCategory && user?.id) {
        await apiRequest("PATCH", `/api/users/${user.id}`, {
          contractorCategory,
        });
        // Update auth context with new category
        updateUser({ contractorCategory } as any);
      }

      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, "_blank");

      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
      toast({
        title: "Invoice generated",
        description: "Your PDF invoice has been generated. A preview window has opened.",
      });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate invoice. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      await apiRequest("DELETE", `/api/invoices/${invoiceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Invoice deleted",
        description: "The invoice has been deleted successfully.",
      });
      setInvoiceToDelete(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete invoice. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Helper to get the timesheet for selected month/year
  const getSelectedTimesheet = () => {
    if (!selectedMonth || !selectedYear || !timesheets) return null;
    const monthInt = parseInt(selectedMonth);
    const yearInt = parseInt(selectedYear);
    return timesheets.find(ts => ts.month === monthInt && ts.year === yearInt) || null;
  };

  // Helper to count working days in a month (Mon-Fri)
  const getWorkingDaysInMonth = (month: number, year: number): number => {
    const daysInMonth = new Date(year, month, 0).getDate();
    let workingDays = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not weekend
        workingDays++;
      }
    }
    return workingDays;
  };

  // Get timesheet summary for confirmation dialog
  const getTimesheetSummary = () => {
    const timesheet = getSelectedTimesheet();
    if (!timesheet) {
      return {
        exists: false,
        status: "none",
        totalHours: 0,
        daysLogged: 0,
        workingDays: 0,
        isDraft: true,
        incompleteDays: 0,
      };
    }

    const monthInt = parseInt(selectedMonth);
    const yearInt = parseInt(selectedYear);
    const workingDays = getWorkingDaysInMonth(monthInt, yearInt);
    
    // Count days with entries from the dailyEntries query
    const daysWithHours = new Set<string>();
    if (dailyEntries) {
      for (const entry of dailyEntries) {
        if (entry.hours > 0) {
          daysWithHours.add(entry.date);
        }
      }
    }
    const daysLogged = daysWithHours.size;

    return {
      exists: true,
      status: timesheet.status,
      totalHours: timesheet.totalHours || 0,
      daysLogged,
      workingDays,
      isDraft: timesheet.status === "draft",
      incompleteDays: workingDays - daysLogged,
    };
  };

  // State for syncing indicator
  const [isSyncingTimesheet, setIsSyncingTimesheet] = useState(false);

  // Handle submit confirmation - wait for any pending saves and refetch timesheets and overtime requests
  const handleSubmitClick = async (type: "upload" | "generate") => {
    setIsSyncingTimesheet(true);
    try {
      // Wait for any in-flight saves from timesheet page to complete
      // The timesheet page triggers save-on-unmount, which needs time to persist
      // Use multiple short delays with refetches to ensure we get the latest data
      for (let attempt = 0; attempt < 3; attempt++) {
        await new Promise(resolve => setTimeout(resolve, attempt === 0 ? 300 : 500));
        await refetchTimesheets();
      }
      // Also refetch overtime requests to get latest pending approvals
      if (selectedTimesheetId) {
        await refetchOvertimeRequests();
      }
    } finally {
      setIsSyncingTimesheet(false);
    }
    setPendingSubmitType(type);
    setShowSubmitConfirm(true);
  };

  // Perform the actual submission after confirmation
  const handleConfirmSubmit = () => {
    setShowSubmitConfirm(false);
    if (pendingSubmitType === "upload") {
      uploadMutation.mutate();
    } else if (pendingSubmitType === "generate") {
      generateMutation.mutate();
    }
    setPendingSubmitType(null);
  };

  const formatBankDetailsText = () => {
    const parts: string[] = [];
    if (accountFirstName || accountLastName) parts.push(`Name: ${accountFirstName} ${accountLastName}`);
    if (bankName) parts.push(`Bank: ${bankName}`);
    if (swiftCode) parts.push(`SWIFT: ${swiftCode}`);
    if (ibanNumber) parts.push(`IBAN: ${ibanNumber}`);
    if (accountNumber) parts.push(`Account: ${accountNumber}`);
    if (routingNumber) parts.push(`Routing: ${routingNumber}`);
    if (accountType) parts.push(`Type: ${accountType}`);
    if (bankAddress) parts.push(`Address: ${bankAddress}`);
    return parts.join("\n");
  };

  const calculateLineTotal = (rate: string, quantity: string): number => {
    const r = parseFloat(rate.replace(/,/g, "")) || 0;
    const q = parseFloat(quantity) || 0;
    return r * q;
  };

  const calculateSubtotal = (): number => {
    return Math.round(
      lineItems.reduce((sum, item) => sum + calculateLineTotal(item.rate, item.quantity), 0) * 100
    );
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { description: "", rate: "", quantity: "1" }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const generateInvoicePDF = (): jsPDF => {
    const doc = new jsPDF();
    const subtotalCents = calculateSubtotal();
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
    const periodMonthName = selectedMonth ? new Date(2000, parseInt(selectedMonth) - 1).toLocaleString('default', { month: 'long' }) : '';
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

    let billY = y - (contractorLines.length * 4) - (contractorPhone ? 4 : 0) - (contractorEmail ? 4 : 0) - (contractorVatNo ? 4 : 0);
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

    if (formatBankDetailsText()) {
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

  const resetForm = () => {
    setSelectedFile(null);
    setSelectedMonth("");
    setSelectedYear("");
    setAmount("");
    setLineItems([{ description: "", rate: "", quantity: "1" }]);
    setActiveTab("upload");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const MAX_SIZE = 5 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => currentYear - i);

  const canUpload = selectedFile && selectedMonth && selectedYear;
  const canGenerate =
    selectedMonth &&
    selectedYear &&
    lineItems.some((item) => item.description && item.rate);

  const subtotalDisplay = formatCurrency(calculateSubtotal() / 100);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Invoices</h1>
          <p className="text-muted-foreground mt-1">
            Upload and manage your monthly invoices
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchInvoices()}
            disabled={isFetching}
            data-testid="button-refresh-invoices"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="tour-target-invoice-new">
                <Upload className="w-4 h-4 mr-2" />
                Submit Invoice
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Submit Invoice</DialogTitle>
              <DialogDescription>
                Upload your own invoice or generate one automatically
              </DialogDescription>
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload" data-testid="tab-upload">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </TabsTrigger>
                <TabsTrigger value="generate" data-testid="tab-generate">
                  <FileCheck className="w-4 h-4 mr-2" />
                  Generate
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="mt-4">
                <ScrollArea className="h-[50vh] pr-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Month</Label>
                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                          <SelectTrigger data-testid="select-month">
                            <SelectValue placeholder="Select month" />
                          </SelectTrigger>
                          <SelectContent>
                            {months.map((month) => (
                              <SelectItem key={month.value} value={month.value}>
                                {month.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Year</Label>
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                          <SelectTrigger data-testid="select-year">
                            <SelectValue placeholder="Select year" />
                          </SelectTrigger>
                          <SelectContent>
                            {years.map((year) => (
                              <SelectItem key={year} value={year.toString()}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Amount ({userCurrency})</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        data-testid="input-amount"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Invoice File</Label>
                      <div
                        className="border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {selectedFile ? (
                          <div className="flex items-center justify-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            <span className="text-sm font-medium">{selectedFile.name}</span>
                          </div>
                        ) : (
                          <div>
                            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              Click to upload or drag and drop
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              PDF, PNG, JPG up to 5MB
                            </p>
                          </div>
                        )}
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={handleFileChange}
                        className="hidden"
                        data-testid="input-file"
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 pb-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsDialogOpen(false);
                          resetForm();
                        }}
                        data-testid="button-cancel"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => handleSubmitClick("upload")}
                        disabled={!canUpload || uploadMutation.isPending || isSyncingTimesheet}
                        data-testid="button-submit-invoice"
                      >
                        {isSyncingTimesheet ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Syncing...
                          </>
                        ) : uploadMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          "Upload Invoice"
                        )}
                      </Button>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="generate" className="mt-4">
                <ScrollArea className="h-[60vh] pr-4">
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Month <span className="text-destructive">*</span></Label>
                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                          <SelectTrigger data-testid="select-month-gen">
                            <SelectValue placeholder="Select month" />
                          </SelectTrigger>
                          <SelectContent>
                            {months.map((month) => (
                              <SelectItem key={month.value} value={month.value}>
                                {month.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Year <span className="text-destructive">*</span></Label>
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                          <SelectTrigger data-testid="select-year-gen">
                            <SelectValue placeholder="Select year" />
                          </SelectTrigger>
                          <SelectContent>
                            {years.map((year) => (
                              <SelectItem key={year} value={year.toString()}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Invoice Number</Label>
                        <Input
                          value={invoiceNumber}
                          onChange={(e) => setInvoiceNumber(e.target.value)}
                          placeholder="INV-2026-0001"
                          data-testid="input-invoice-number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Issue Date</Label>
                        <Input
                          type="date"
                          value={issueDate}
                          onChange={(e) => setIssueDate(e.target.value)}
                          data-testid="input-issue-date"
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-medium text-sm">Contractor Info</h4>
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Name</Label>
                            <Input
                              value={contractorName}
                              onChange={(e) => setContractorName(e.target.value)}
                              placeholder="Your name"
                              data-testid="input-contractor-name"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Address</Label>
                            <Input
                              value={contractorAddress}
                              onChange={(e) => setContractorAddress(e.target.value)}
                              placeholder="Street, City, Country"
                              data-testid="input-contractor-address"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Phone</Label>
                            <Input
                              value={contractorPhone}
                              onChange={(e) => setContractorPhone(e.target.value)}
                              placeholder="+1 555 123 4567"
                              data-testid="input-contractor-phone"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Email</Label>
                            <Input
                              value={contractorEmail}
                              onChange={(e) => setContractorEmail(e.target.value)}
                              placeholder="email@example.com"
                              data-testid="input-contractor-email"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">VAT No (Optional)</Label>
                            <Input
                              value={contractorVatNo}
                              onChange={(e) => setContractorVatNo(e.target.value)}
                              placeholder="VAT number"
                              data-testid="input-contractor-vat"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-medium text-sm">Bill To</h4>
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Company Name</Label>
                            <Input
                              value={billToName}
                              onChange={(e) => setBillToName(e.target.value)}
                              placeholder="Company name"
                              data-testid="input-billto-name"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Address</Label>
                            <Input
                              value={billToAddress}
                              onChange={(e) => setBillToAddress(e.target.value)}
                              placeholder="Company address"
                              data-testid="input-billto-address"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">VAT No (Optional)</Label>
                            <Input
                              value={billToVatNo}
                              onChange={(e) => setBillToVatNo(e.target.value)}
                              placeholder="VAT number"
                              data-testid="input-billto-vat"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">Line Items</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={addLineItem}
                          data-testid="button-add-line-item"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Item
                        </Button>
                      </div>

                      <div className="space-y-3">
                        <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground">
                          <div className="col-span-5">Description</div>
                          <div className="col-span-2">Rate ({currencySymbol})</div>
                          <div className="col-span-2">Qty</div>
                          <div className="col-span-2 text-right">Total</div>
                          <div className="col-span-1"></div>
                        </div>

                        {lineItems.map((item, index) => (
                          <div key={index} className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-5">
                              <Input
                                value={item.description}
                                onChange={(e) =>
                                  updateLineItem(index, "description", e.target.value)
                                }
                                placeholder="Service description"
                                data-testid={`input-line-desc-${index}`}
                              />
                            </div>
                            <div className="col-span-2">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.rate}
                                onChange={(e) => updateLineItem(index, "rate", e.target.value)}
                                placeholder="0.00"
                                data-testid={`input-line-rate-${index}`}
                              />
                            </div>
                            <div className="col-span-2">
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateLineItem(index, "quantity", e.target.value)}
                                placeholder="1"
                                data-testid={`input-line-qty-${index}`}
                              />
                            </div>
                            <div className="col-span-2 text-right font-medium">
                              {currencySymbol}{formatCurrency(calculateLineTotal(item.rate, item.quantity))}
                            </div>
                            <div className="col-span-1 flex justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeLineItem(index)}
                                disabled={lineItems.length === 1}
                                data-testid={`button-remove-line-${index}`}
                              >
                                <Trash2 className="w-4 h-4 text-muted-foreground" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-end pt-2">
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Subtotal</div>
                          <div className="text-xl font-semibold">{currencySymbol}{subtotalDisplay}</div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">Payment Details (Optional)</h4>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <Label className="text-xs">First Name</Label>
                            <Input
                              value={accountFirstName}
                              onChange={(e) => setAccountFirstName(e.target.value)}
                              placeholder="Account holder first name"
                              data-testid="input-account-firstname"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Last Name</Label>
                            <Input
                              value={accountLastName}
                              onChange={(e) => setAccountLastName(e.target.value)}
                              placeholder="Account holder last name"
                              data-testid="input-account-lastname"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Bank Name</Label>
                            <Input
                              value={bankName}
                              onChange={(e) => setBankName(e.target.value)}
                              placeholder="Bank name"
                              data-testid="input-bank-name"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">SWIFT Code</Label>
                            <Input
                              value={swiftCode}
                              onChange={(e) => setSwiftCode(e.target.value)}
                              placeholder="SWIFT/BIC code"
                              data-testid="input-swift"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">IBAN Number</Label>
                            <Input
                              value={ibanNumber}
                              onChange={(e) => setIbanNumber(e.target.value)}
                              placeholder="IBAN number"
                              data-testid="input-iban"
                            />
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Account Number</Label>
                            <Input
                              value={accountNumber}
                              onChange={(e) => setAccountNumber(e.target.value)}
                              placeholder="Account number"
                              data-testid="input-account-number"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Routing Number</Label>
                            <Input
                              value={routingNumber}
                              onChange={(e) => setRoutingNumber(e.target.value)}
                              placeholder="Routing number (US)"
                              data-testid="input-routing"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Account Type</Label>
                            <Select value={accountType} onValueChange={setAccountType}>
                              <SelectTrigger data-testid="select-account-type">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="checking">Checking</SelectItem>
                                <SelectItem value="savings">Savings</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Address</Label>
                            <Input
                              value={bankAddress}
                              onChange={(e) => setBankAddress(e.target.value)}
                              placeholder="Bank/Account address"
                              data-testid="input-bank-address"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => savePaymentDetailsMutation.mutate()}
                          disabled={savePaymentDetailsMutation.isPending}
                          data-testid="button-save-payment-details"
                        >
                          {savePaymentDetailsMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4 mr-1" />
                          )}
                          Save for Future
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsDialogOpen(false);
                            resetForm();
                          }}
                          data-testid="button-cancel-gen"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSubmitClick("generate")}
                          disabled={!canGenerate || generateMutation.isPending || isSyncingTimesheet}
                          data-testid="button-generate-invoice"
                        >
                          {isSyncingTimesheet ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Syncing...
                            </>
                          ) : generateMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <FileCheck className="w-4 h-4 mr-2" />
                              Generate & Submit
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : invoices && invoices.length > 0 ? (
        <Card data-testid="tour-target-invoice-list">
          <CardHeader>
            <CardTitle className="text-base">All Invoices</CardTitle>
            <CardDescription>Your uploaded invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invoices.map((invoice, index) => (
                <div
                  key={invoice.id}
                  className="flex flex-col p-4 rounded-md bg-muted/50 gap-2"
                  data-testid={`invoice-${invoice.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{invoice.fileName}</p>
                          <StatusBadge status={invoice.status || "pending_review"} />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {invoice.invoiceNumber && `${invoice.invoiceNumber} - `}
                          {format(new Date(invoice.year, invoice.month - 1), "MMMM yyyy")} -{" "}
                          {format(new Date(invoice.uploadedAt!), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3" data-testid={index === 0 ? "tour-target-invoice-status" : undefined}>
                      {invoice.amount && (
                        <span className="font-semibold text-lg" data-testid={`amount-${invoice.id}`}>
                          {formatMoney(invoice.amount, invoice.currency)}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (invoice.fileUrl) {
                            const filename = invoice.fileName || "invoice.pdf";
                            // Handle both relative and absolute URLs
                            let urlStr = invoice.fileUrl;
                            if (!invoice.fileUrl.startsWith("http")) {
                              const url = new URL(invoice.fileUrl, window.location.origin);
                              url.searchParams.set("filename", filename);
                              urlStr = url.toString();
                            }
                            window.open(urlStr, "_blank");
                          }
                        }}
                        data-testid={`button-view-${invoice.id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (invoice.fileUrl) {
                            const filename = invoice.fileName || "invoice.pdf";
                            // Handle both relative and absolute URLs
                            let urlStr = invoice.fileUrl;
                            if (!invoice.fileUrl.startsWith("http")) {
                              const url = new URL(invoice.fileUrl, window.location.origin);
                              url.searchParams.set("filename", filename);
                              url.searchParams.set("download", "true");
                              urlStr = url.toString();
                            }
                            const link = document.createElement("a");
                            link.href = urlStr;
                            link.download = filename;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }
                        }}
                        data-testid={`button-download-${invoice.id}`}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      {(invoice.status !== "approved" && invoice.status !== "paid") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setInvoiceToDelete(invoice)}
                          data-testid={`button-delete-${invoice.id}`}
                          title={invoice.status === "revision_requested" ? "Delete to upload revised invoice" : "Delete invoice"}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {invoice.status === "rejected" && invoice.reviewNote && (
                    <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                      <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-destructive">Rejection Reason</p>
                        <p className="text-sm text-destructive/80" data-testid={`rejection-note-${invoice.id}`}>{invoice.reviewNote}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          You can delete this invoice and resubmit with corrections.
                        </p>
                      </div>
                    </div>
                  )}
                  {invoice.status === "revision_requested" && invoice.reviewNote && (
                    <div className="flex items-start gap-2 p-3 rounded-md bg-orange-500/10 border border-orange-500/20">
                      <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Revision Requested</p>
                        <p className="text-sm text-orange-600/80 dark:text-orange-400/80" data-testid={`revision-note-${invoice.id}`}>{invoice.reviewNote}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Please delete this invoice and upload an updated version with the requested changes.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card data-testid="tour-target-invoice-list">
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground" data-testid="tour-target-invoice-status">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No invoices uploaded</p>
              <p className="mt-1">Upload your first invoice to get started</p>
              <Button
                className="mt-4"
                onClick={() => setIsDialogOpen(true)}
                data-testid="button-first-invoice"
              >
                <Plus className="w-4 h-4 mr-2" />
                Submit Invoice
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!invoiceToDelete} onOpenChange={(open) => !open && setInvoiceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{invoiceToDelete?.fileName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => invoiceToDelete && deleteMutation.mutate(invoiceToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invoice Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Invoice Submission</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                {(() => {
                  const summary = getTimesheetSummary();
                  const monthName = selectedMonth ? new Date(2000, parseInt(selectedMonth) - 1).toLocaleString('default', { month: 'long' }) : '';
                  
                  return (
                    <>
                      <div className="bg-muted/50 rounded-md p-4 space-y-2">
                        <p className="font-medium text-foreground">Timesheet Summary for {monthName} {selectedYear}</p>
                        {summary.exists ? (
                          <>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <span className="text-muted-foreground">Status:</span>
                              <span className="font-medium">{summary.status === 'draft' ? 'Draft' : summary.status}</span>
                              <span className="text-muted-foreground">Total Hours:</span>
                              <span className="font-medium">{summary.totalHours} hours</span>
                              <span className="text-muted-foreground">Days Logged:</span>
                              <span className="font-medium">{summary.daysLogged} of {summary.workingDays} working days</span>
                            </div>
                            {summary.incompleteDays > 0 && (
                              <div className="flex items-start gap-2 mt-3 p-2 bg-yellow-500/10 rounded text-yellow-600 dark:text-yellow-400 text-sm">
                                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>{summary.incompleteDays} working day(s) have no hours logged</span>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex items-start gap-2 p-2 bg-yellow-500/10 rounded text-yellow-600 dark:text-yellow-400 text-sm">
                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>No timesheet found for this period. A new timesheet will be created upon submission.</span>
                          </div>
                        )}
                      </div>

                      {summary.isDraft && summary.exists && (
                        <div className="flex items-start gap-2 p-3 bg-blue-500/10 rounded text-blue-600 dark:text-blue-400 text-sm">
                          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                          <span>Your draft timesheet will be automatically submitted along with this invoice.</span>
                        </div>
                      )}

                      {(() => {
                        // Show loading state when checking overtime requests
                        if (isLoadingOvertime && selectedTimesheetId) {
                          return (
                            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded text-muted-foreground text-sm">
                              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                              <span>Checking for pending approvals...</span>
                            </div>
                          );
                        }
                        
                        // Check if we have a timesheet for this period
                        if (!selectedTimesheetId && summary.exists) {
                          // Timesheet exists but ID wasn't resolved yet - this shouldn't normally happen
                          return null;
                        }
                        
                        const pendingApprovals = getPendingApprovals();
                        if (pendingApprovals.hasPending) {
                          const parts: string[] = [];
                          if (pendingApprovals.pendingOvertime > 0) {
                            parts.push(`${pendingApprovals.pendingOvertime} overtime request(s)`);
                          }
                          if (pendingApprovals.pendingWeekend > 0) {
                            parts.push(`${pendingApprovals.pendingWeekend} weekend work request(s)`);
                          }
                          return (
                            <div className="flex items-start gap-2 p-3 bg-orange-500/10 rounded text-orange-600 dark:text-orange-400 text-sm">
                              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                              <div>
                                <span className="font-medium">Pending Approvals: </span>
                                <span>You have {parts.join(' and ')} awaiting supervisor approval. These may affect your invoice total once approved.</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      <p className="text-sm text-muted-foreground">
                        Are you sure you want to submit this invoice? This will also finalize your timesheet for review.
                      </p>
                    </>
                  );
                })()}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => setPendingSubmitType(null)}
              data-testid="button-cancel-submit"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSubmit}
              data-testid="button-confirm-submit"
            >
              Submit Invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showTour && (
        <OnboardingTour
          tourId="invoices"
          steps={invoicesTourConfig.steps}
          onComplete={() => setShowTour(false)}
          onSkip={() => setShowTour(false)}
        />
      )}
    </div>
  );
}
