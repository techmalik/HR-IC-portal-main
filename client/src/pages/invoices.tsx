import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { RefreshCw } from "lucide-react";
import { trackFirst } from "@/lib/analytics";
import type { Expense } from "@shared/schema";
import type { Invoice, Timesheet, IcPaymentDetails, OvertimeRequest, DailyEntry, Organization } from "@shared/schema";
import { formatCurrency, calculateSubtotal, generateInvoicePDF, type LineItem } from "@/components/invoices/generate-invoice-pdf";
import { formatMoney, getCurrencySymbol, normalizeCurrency } from "@/lib/currency";
import { OnboardingTour, invoicesTourConfig } from "@/components/onboarding-tour";
import { InvoiceList } from "@/components/invoices/invoice-list";
import { InvoiceDeleteDialog } from "@/components/invoices/invoice-delete-dialog";
import { InvoiceSubmitConfirmDialog } from "@/components/invoices/invoice-submit-confirm-dialog";
import { InvoiceSubmitDialog } from "@/components/invoices/invoice-submit-dialog";

export default function InvoicesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [amount, setAmount] = useState("");
  const [showTour, setShowTour] = useState(false);
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const userCurrency = normalizeCurrency(user?.currency);
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
      const res = await fetch(`/api/invoices?userId=${user?.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch invoices");
      return res.json();
    },
    enabled: !!user?.id,
  });

  const { data: timesheets, refetch: refetchTimesheets } = useQuery<Timesheet[]>({
    queryKey: ["/api/timesheets", { userId: user?.id }],
    queryFn: async () => {
      const res = await fetch(`/api/timesheets?userId=${user?.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch timesheets");
      return res.json();
    },
    enabled: !!user?.id,
  });

  const selectedTimesheetId = timesheets?.find(
    (ts) => ts.month === parseInt(selectedMonth || "0") && ts.year === parseInt(selectedYear || "0")
  )?.id;

  const { data: overtimeRequests, refetch: refetchOvertimeRequests, isLoading: isLoadingOvertime } =
    useQuery<OvertimeRequest[]>({
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

  const getPendingApprovals = () => {
    if (!overtimeRequests) return { hasPending: false, pendingOvertime: 0, pendingWeekend: 0, totalPending: 0 };
    const pendingRequests = overtimeRequests.filter((r) => r.status === "pending");
    const pendingOvertime = pendingRequests.filter((r) => !r.isWeekendWork).length;
    const pendingWeekend = pendingRequests.filter((r) => r.isWeekendWork).length;
    return { hasPending: pendingRequests.length > 0, pendingOvertime, pendingWeekend, totalPending: pendingRequests.length };
  };

  const { data: savedPaymentDetails } = useQuery<IcPaymentDetails | null>({
    queryKey: ["/api/ic-payment-details", user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/ic-payment-details/${user?.id}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user?.id,
  });

  const { data: organization } = useQuery<Organization | null>({
    queryKey: ["/api/organization"],
    queryFn: async () => {
      const res = await fetch("/api/organization", { credentials: "include" });
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
      if (organization.name) setBillToName(organization.name);
      if (organization.address) setBillToAddress(organization.address);
      if (organization.vatNumber) setBillToVatNo(organization.vatNumber);
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

  useEffect(() => {
    if (isDialogOpen && !selectedMonth && !selectedYear) {
      const now = new Date();
      setSelectedMonth(String(now.getMonth() + 1));
      setSelectedYear(String(now.getFullYear()));
    }
  }, [isDialogOpen, selectedMonth, selectedYear]);

  useEffect(() => {
    if (isDialogOpen && activeTab === "generate" && user?.id) {
      fetch(`/api/invoices/next-number/${user.id}`, { credentials: "include" })
        .then((res) => res.json())
        .then((data) => setInvoiceNumber(data.invoiceNumber))
        .catch(() => {
          toast({ title: "Could not load invoice number", description: "Enter one manually.", variant: "destructive" });
        });
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

  const { data: approvedExpenses } = useQuery<Expense[]>({
    queryKey: ["/api/expenses/approved-for-invoice", { month: selectedMonth, year: selectedYear }],
    queryFn: async () => {
      const res = await fetch(
        `/api/expenses/approved-for-invoice?month=${selectedMonth}&year=${selectedYear}`,
        { credentials: "include" }
      );
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isDialogOpen && activeTab === "generate" && !!selectedMonth && !!selectedYear,
  });

  useEffect(() => {
    setLineItems((prev) => {
      const filtered = prev.filter((li) => !li.expenseId);
      if (filtered.length === prev.length) return prev;
      return filtered.length > 0 ? filtered : [{ description: "", rate: "", quantity: "1" }];
    });
  }, [selectedMonth, selectedYear]);

  const linkedExpenseIdsInLineItems = lineItems.map((li) => li.expenseId).filter((id): id is string => !!id);
  const availableApprovedExpenses = (approvedExpenses || []).filter(
    (e) => !linkedExpenseIdsInLineItems.includes(e.id)
  );

  const addApprovedExpensesAsLineItems = () => {
    if (availableApprovedExpenses.length === 0) return;
    const toAdd = availableApprovedExpenses;
    setLineItems((prev) => {
      const blankIndex = prev.findIndex((p) => !p.description.trim() && !p.rate && !p.expenseId);
      const newItems: LineItem[] = toAdd.map((e) => ({
        description: e.description,
        rate: (e.amount / 100).toFixed(2),
        quantity: "1",
        expenseId: e.id,
      }));
      const next = [...prev];
      if (blankIndex >= 0) next.splice(blankIndex, 1);
      return [...next, ...newItems];
    });
    toast({
      title: "Expenses added",
      description: `Added ${toAdd.length} approved expense${toAdd.length === 1 ? "" : "s"} as line items.`,
    });
  };

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
      toast({ title: "Payment details saved", description: "Your payment details have been saved for future invoices." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save payment details.", variant: "destructive" });
    },
  });

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

      if (contractorCategory && user?.id) {
        await apiRequest("PATCH", `/api/users/${user.id}`, { contractorCategory });
        updateUser({ contractorCategory } as any);
      }

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/team/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
      trackFirst("first_invoice_submitted", { method: "upload" });
      toast({ title: "Invoice uploaded", description: "Your invoice has been uploaded successfully." });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to upload invoice. Please try again.", variant: "destructive" });
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const calculatedSubtotal = calculateSubtotal(lineItems);
      const bankDetailsText = formatBankDetailsText();
      const doc = generateInvoicePDF({
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
      });
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

      if (contractorCategory && user?.id) {
        await apiRequest("PATCH", `/api/users/${user.id}`, { contractorCategory });
        updateUser({ contractorCategory } as any);
      }

      const expenseIdsToLink = lineItems
        .filter((li) => li.expenseId && li.description && li.rate)
        .map((li) => li.expenseId as string);
      if (expenseIdsToLink.length > 0) {
        try {
          await apiRequest("POST", "/api/expenses/link-invoice", {
            invoiceId: invoice.id,
            expenseIds: expenseIdsToLink,
          });
        } catch {
          toast({
            title: "Expenses not linked",
            description: "Invoice was created but some expenses could not be linked. Please link them manually.",
            variant: "destructive",
          });
        }
      }

      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, "_blank");
      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/team/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
      trackFirst("first_invoice_submitted", { method: "generate" });
      toast({ title: "Invoice generated", description: "Your PDF invoice has been generated. A preview window has opened." });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to generate invoice. Please try again.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      await apiRequest("DELETE", `/api/invoices/${invoiceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/team/invoices"] });
      toast({ title: "Invoice deleted", description: "The invoice has been deleted successfully." });
      setInvoiceToDelete(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete invoice. Please try again.", variant: "destructive" });
    },
  });

  const getWorkingDaysInMonth = (month: number, year: number): number => {
    const daysInMonth = new Date(year, month, 0).getDate();
    let workingDays = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) workingDays++;
    }
    return workingDays;
  };

  const getTimesheetSummary = () => {
    if (!selectedMonth || !selectedYear || !timesheets) {
      return { exists: false, status: "none", totalHours: 0, daysLogged: 0, workingDays: 0, isDraft: true, incompleteDays: 0 };
    }
    const monthInt = parseInt(selectedMonth);
    const yearInt = parseInt(selectedYear);
    const timesheet = timesheets.find((ts) => ts.month === monthInt && ts.year === yearInt) || null;
    if (!timesheet) {
      return { exists: false, status: "none", totalHours: 0, daysLogged: 0, workingDays: 0, isDraft: true, incompleteDays: 0 };
    }
    const workingDays = getWorkingDaysInMonth(monthInt, yearInt);
    const daysWithHours = new Set<string>();
    if (dailyEntries) {
      for (const entry of dailyEntries) {
        if (entry.hours > 0) daysWithHours.add(entry.date);
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

  const [isSyncingTimesheet, setIsSyncingTimesheet] = useState(false);

  const handleSubmitClick = async (type: "upload" | "generate") => {
    setIsSyncingTimesheet(true);
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 300 : 500));
        await refetchTimesheets();
      }
      if (selectedTimesheetId) {
        await refetchOvertimeRequests();
      }
    } finally {
      setIsSyncingTimesheet(false);
    }
    setPendingSubmitType(type);
    setShowSubmitConfirm(true);
  };

  const handleConfirmSubmit = () => {
    setShowSubmitConfirm(false);
    if (pendingSubmitType === "upload") uploadMutation.mutate();
    else if (pendingSubmitType === "generate") generateMutation.mutate();
    setPendingSubmitType(null);
  };

  const resetForm = () => {
    setSelectedFile(null);
    setSelectedMonth("");
    setSelectedYear("");
    setAmount("");
    setLineItems([{ description: "", rate: "", quantity: "1" }]);
    setActiveTab("upload");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const MAX_SIZE = 5 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        toast({ title: "File too large", description: "Please upload a file smaller than 5MB", variant: "destructive" });
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

  const canUpload = !!(selectedFile && selectedMonth && selectedYear);
  const canGenerate = !!(selectedMonth && selectedYear && lineItems.some((item) => item.description && item.rate));

  const subtotalDisplay = formatCurrency(calculateSubtotal(lineItems) / 100);

  const handleCancel = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Invoices</h1>
          <p className="text-muted-foreground mt-1">Upload and manage your monthly invoices</p>
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
          <InvoiceSubmitDialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            activeTab={activeTab}
            onActiveTabChange={setActiveTab}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onMonthChange={setSelectedMonth}
            onYearChange={setSelectedYear}
            months={months}
            years={years}
            selectedFile={selectedFile}
            onFileChange={handleFileChange}
            amount={amount}
            onAmountChange={setAmount}
            userCurrency={userCurrency}
            canUpload={canUpload}
            uploadIsPending={uploadMutation.isPending}
            isSyncingTimesheet={isSyncingTimesheet}
            onUploadSubmit={() => handleSubmitClick("upload")}
            invoiceNumber={invoiceNumber}
            onInvoiceNumberChange={setInvoiceNumber}
            issueDate={issueDate}
            onIssueDateChange={setIssueDate}
            contractorName={contractorName}
            onContractorNameChange={setContractorName}
            contractorAddress={contractorAddress}
            onContractorAddressChange={setContractorAddress}
            contractorPhone={contractorPhone}
            onContractorPhoneChange={setContractorPhone}
            contractorEmail={contractorEmail}
            onContractorEmailChange={setContractorEmail}
            contractorVatNo={contractorVatNo}
            onContractorVatNoChange={setContractorVatNo}
            billToName={billToName}
            onBillToNameChange={setBillToName}
            billToAddress={billToAddress}
            onBillToAddressChange={setBillToAddress}
            billToVatNo={billToVatNo}
            onBillToVatNoChange={setBillToVatNo}
            lineItems={lineItems}
            onAddLineItem={() => setLineItems([...lineItems, { description: "", rate: "", quantity: "1" }])}
            onRemoveLineItem={(index) => {
              if (lineItems.length > 1) setLineItems(lineItems.filter((_, i) => i !== index));
            }}
            onUpdateLineItem={(index, field, value) => {
              const updated = [...lineItems];
              updated[index] = { ...updated[index], [field]: value };
              setLineItems(updated);
            }}
            currencySymbol={currencySymbol}
            availableApprovedExpenses={availableApprovedExpenses}
            onAddApprovedExpenses={addApprovedExpensesAsLineItems}
            subtotalDisplay={subtotalDisplay}
            accountFirstName={accountFirstName}
            onAccountFirstNameChange={setAccountFirstName}
            accountLastName={accountLastName}
            onAccountLastNameChange={setAccountLastName}
            bankName={bankName}
            onBankNameChange={setBankName}
            swiftCode={swiftCode}
            onSwiftCodeChange={setSwiftCode}
            ibanNumber={ibanNumber}
            onIbanNumberChange={setIbanNumber}
            accountNumber={accountNumber}
            onAccountNumberChange={setAccountNumber}
            routingNumber={routingNumber}
            onRoutingNumberChange={setRoutingNumber}
            accountType={accountType}
            onAccountTypeChange={setAccountType}
            bankAddress={bankAddress}
            onBankAddressChange={setBankAddress}
            savePaymentDetailsIsPending={savePaymentDetailsMutation.isPending}
            onSavePaymentDetails={() => savePaymentDetailsMutation.mutate()}
            canGenerate={canGenerate}
            generateIsPending={generateMutation.isPending}
            onGenerateSubmit={() => handleSubmitClick("generate")}
            onCancel={handleCancel}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <InvoiceList
          invoices={invoices || []}
          onDelete={setInvoiceToDelete}
          onOpenDialog={() => setIsDialogOpen(true)}
        />
      )}

      <InvoiceDeleteDialog
        invoice={invoiceToDelete}
        isDeleting={deleteMutation.isPending}
        onConfirm={() => invoiceToDelete && deleteMutation.mutate(invoiceToDelete.id)}
        onCancel={() => setInvoiceToDelete(null)}
      />

      <InvoiceSubmitConfirmDialog
        open={showSubmitConfirm}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        timesheetSummary={getTimesheetSummary()}
        pendingApprovals={getPendingApprovals()}
        isLoadingOvertime={isLoadingOvertime}
        selectedTimesheetId={selectedTimesheetId}
        onConfirm={handleConfirmSubmit}
        onCancel={() => {
          setShowSubmitConfirm(false);
          setPendingSubmitType(null);
        }}
      />

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
