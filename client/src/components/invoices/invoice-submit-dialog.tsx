import { useRef } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Upload,
  FileText,
  Loader2,
  Plus,
  FileCheck,
  Trash2,
  Save,
  Receipt,
  Camera,
} from "lucide-react";
import { formatCurrency, calculateLineTotal, type LineItem } from "./generate-invoice-pdf";
import type { Expense } from "@shared/schema";

interface InvoiceSubmitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTab: string;
  onActiveTabChange: (tab: string) => void;

  // Period
  selectedMonth: string;
  selectedYear: string;
  onMonthChange: (v: string) => void;
  onYearChange: (v: string) => void;
  months: { value: string; label: string }[];
  years: number[];

  // Upload tab
  selectedFile: File | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  amount: string;
  onAmountChange: (v: string) => void;
  userCurrency: string;
  canUpload: boolean;
  uploadIsPending: boolean;
  isSyncingTimesheet: boolean;
  onUploadSubmit: () => void;

  // Generate tab
  invoiceNumber: string;
  onInvoiceNumberChange: (v: string) => void;
  issueDate: string;
  onIssueDateChange: (v: string) => void;
  contractorName: string;
  onContractorNameChange: (v: string) => void;
  contractorAddress: string;
  onContractorAddressChange: (v: string) => void;
  contractorPhone: string;
  onContractorPhoneChange: (v: string) => void;
  contractorEmail: string;
  onContractorEmailChange: (v: string) => void;
  contractorVatNo: string;
  onContractorVatNoChange: (v: string) => void;
  billToName: string;
  onBillToNameChange: (v: string) => void;
  billToAddress: string;
  onBillToAddressChange: (v: string) => void;
  billToVatNo: string;
  onBillToVatNoChange: (v: string) => void;

  // Line items
  lineItems: LineItem[];
  onAddLineItem: () => void;
  onRemoveLineItem: (index: number) => void;
  onUpdateLineItem: (index: number, field: keyof LineItem, value: string) => void;
  currencySymbol: string;
  availableApprovedExpenses: Expense[];
  onAddApprovedExpenses: () => void;
  subtotalDisplay: string;

  // Payment details
  accountFirstName: string;
  onAccountFirstNameChange: (v: string) => void;
  accountLastName: string;
  onAccountLastNameChange: (v: string) => void;
  bankName: string;
  onBankNameChange: (v: string) => void;
  swiftCode: string;
  onSwiftCodeChange: (v: string) => void;
  ibanNumber: string;
  onIbanNumberChange: (v: string) => void;
  accountNumber: string;
  onAccountNumberChange: (v: string) => void;
  routingNumber: string;
  onRoutingNumberChange: (v: string) => void;
  accountType: string;
  onAccountTypeChange: (v: string) => void;
  bankAddress: string;
  onBankAddressChange: (v: string) => void;
  savePaymentDetailsIsPending: boolean;
  onSavePaymentDetails: () => void;

  canGenerate: boolean;
  generateIsPending: boolean;
  onGenerateSubmit: () => void;

  onCancel: () => void;
}

export function InvoiceSubmitDialog({
  open,
  onOpenChange,
  activeTab,
  onActiveTabChange,
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
  months,
  years,
  selectedFile,
  onFileChange,
  amount,
  onAmountChange,
  userCurrency,
  canUpload,
  uploadIsPending,
  isSyncingTimesheet,
  onUploadSubmit,
  invoiceNumber,
  onInvoiceNumberChange,
  issueDate,
  onIssueDateChange,
  contractorName,
  onContractorNameChange,
  contractorAddress,
  onContractorAddressChange,
  contractorPhone,
  onContractorPhoneChange,
  contractorEmail,
  onContractorEmailChange,
  contractorVatNo,
  onContractorVatNoChange,
  billToName,
  onBillToNameChange,
  billToAddress,
  onBillToAddressChange,
  billToVatNo,
  onBillToVatNoChange,
  lineItems,
  onAddLineItem,
  onRemoveLineItem,
  onUpdateLineItem,
  currencySymbol,
  availableApprovedExpenses,
  onAddApprovedExpenses,
  subtotalDisplay,
  accountFirstName,
  onAccountFirstNameChange,
  accountLastName,
  onAccountLastNameChange,
  bankName,
  onBankNameChange,
  swiftCode,
  onSwiftCodeChange,
  ibanNumber,
  onIbanNumberChange,
  accountNumber,
  onAccountNumberChange,
  routingNumber,
  onRoutingNumberChange,
  accountType,
  onAccountTypeChange,
  bankAddress,
  onBankAddressChange,
  savePaymentDetailsIsPending,
  onSavePaymentDetails,
  canGenerate,
  generateIsPending,
  onGenerateSubmit,
  onCancel,
}: InvoiceSubmitDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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

        <Tabs value={activeTab} onValueChange={onActiveTabChange} className="mt-4">
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

          {/* Upload tab */}
          <TabsContent value="upload" className="mt-4">
            <ScrollArea className="h-[50vh] pr-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Month</Label>
                    <Select value={selectedMonth} onValueChange={onMonthChange}>
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
                    <Select value={selectedYear} onValueChange={onYearChange}>
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
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => onAmountChange(e.target.value)}
                    placeholder="0.00"
                    className="h-11 text-base"
                    data-testid="input-amount"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Invoice File</Label>
                  <div
                    className="border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors min-h-[120px] flex items-center justify-center"
                    role="button"
                    tabIndex={0}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }
                    }}
                    aria-label="Choose invoice file or take a photo"
                  >
                    {selectedFile ? (
                      <div className="flex flex-col items-center justify-center gap-2 w-full">
                        {selectedFile.type.startsWith("image/") ? (
                          <img
                            src={URL.createObjectURL(selectedFile)}
                            alt="Invoice preview"
                            className="max-h-40 rounded border object-contain"
                            onLoad={(e) =>
                              URL.revokeObjectURL((e.target as HTMLImageElement).src)
                            }
                          />
                        ) : (
                          <FileText className="w-8 h-8 text-primary" />
                        )}
                        <span className="text-sm font-medium break-all">{selectedFile.name}</span>
                        <span className="text-xs text-muted-foreground">
                          Tap to choose a different file
                        </span>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-center gap-3 mb-2 text-muted-foreground">
                          <Camera className="w-7 h-7" />
                          <Upload className="w-7 h-7" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Tap to take a photo or choose a file
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
                    accept="image/*,.pdf"
                    capture="environment"
                    onChange={onFileChange}
                    className="hidden"
                    data-testid="input-file"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 pb-2">
                  <Button variant="outline" onClick={onCancel} data-testid="button-cancel">
                    Cancel
                  </Button>
                  <Button
                    onClick={onUploadSubmit}
                    disabled={!canUpload || uploadIsPending || isSyncingTimesheet}
                    data-testid="button-submit-invoice"
                  >
                    {isSyncingTimesheet ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : uploadIsPending ? (
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

          {/* Generate tab */}
          <TabsContent value="generate" className="mt-4">
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>
                      Month <span className="text-destructive">*</span>
                    </Label>
                    <Select value={selectedMonth} onValueChange={onMonthChange}>
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
                    <Label>
                      Year <span className="text-destructive">*</span>
                    </Label>
                    <Select value={selectedYear} onValueChange={onYearChange}>
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
                      onChange={(e) => onInvoiceNumberChange(e.target.value)}
                      placeholder="INV-2026-0001"
                      data-testid="input-invoice-number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Issue Date</Label>
                    <Input
                      type="date"
                      value={issueDate}
                      onChange={(e) => onIssueDateChange(e.target.value)}
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
                          onChange={(e) => onContractorNameChange(e.target.value)}
                          placeholder="Your name"
                          data-testid="input-contractor-name"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Address</Label>
                        <Input
                          value={contractorAddress}
                          onChange={(e) => onContractorAddressChange(e.target.value)}
                          placeholder="Street, City, Country"
                          data-testid="input-contractor-address"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Phone</Label>
                        <Input
                          value={contractorPhone}
                          onChange={(e) => onContractorPhoneChange(e.target.value)}
                          placeholder="+1 555 123 4567"
                          data-testid="input-contractor-phone"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Email</Label>
                        <Input
                          value={contractorEmail}
                          onChange={(e) => onContractorEmailChange(e.target.value)}
                          placeholder="email@example.com"
                          data-testid="input-contractor-email"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">VAT No (Optional)</Label>
                        <Input
                          value={contractorVatNo}
                          onChange={(e) => onContractorVatNoChange(e.target.value)}
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
                          onChange={(e) => onBillToNameChange(e.target.value)}
                          placeholder="Company name"
                          data-testid="input-billto-name"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Address</Label>
                        <Input
                          value={billToAddress}
                          onChange={(e) => onBillToAddressChange(e.target.value)}
                          placeholder="Company address"
                          data-testid="input-billto-address"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">VAT No (Optional)</Label>
                        <Input
                          value={billToVatNo}
                          onChange={(e) => onBillToVatNoChange(e.target.value)}
                          placeholder="VAT number"
                          data-testid="input-billto-vat"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Line Items */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">Line Items</h4>
                    <div className="flex items-center gap-2">
                      {availableApprovedExpenses.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onAddApprovedExpenses}
                          data-testid="button-add-approved-expenses"
                        >
                          <Receipt className="w-4 h-4 mr-1" />
                          Add {availableApprovedExpenses.length} Approved Expense
                          {availableApprovedExpenses.length === 1 ? "" : "s"}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onAddLineItem}
                        data-testid="button-add-line-item"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Item
                      </Button>
                    </div>
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
                            onChange={(e) => onUpdateLineItem(index, "description", e.target.value)}
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
                            onChange={(e) => onUpdateLineItem(index, "rate", e.target.value)}
                            placeholder="0.00"
                            data-testid={`input-line-rate-${index}`}
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => onUpdateLineItem(index, "quantity", e.target.value)}
                            placeholder="1"
                            data-testid={`input-line-qty-${index}`}
                          />
                        </div>
                        <div className="col-span-2 text-right font-medium">
                          {currencySymbol}
                          {formatCurrency(calculateLineTotal(item.rate, item.quantity))}
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onRemoveLineItem(index)}
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
                      <div className="text-xl font-semibold">
                        {currencySymbol}
                        {subtotalDisplay}
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Payment Details */}
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
                          onChange={(e) => onAccountFirstNameChange(e.target.value)}
                          placeholder="Account holder first name"
                          data-testid="input-account-firstname"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Last Name</Label>
                        <Input
                          value={accountLastName}
                          onChange={(e) => onAccountLastNameChange(e.target.value)}
                          placeholder="Account holder last name"
                          data-testid="input-account-lastname"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Bank Name</Label>
                        <Input
                          value={bankName}
                          onChange={(e) => onBankNameChange(e.target.value)}
                          placeholder="Bank name"
                          data-testid="input-bank-name"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">SWIFT Code</Label>
                        <Input
                          value={swiftCode}
                          onChange={(e) => onSwiftCodeChange(e.target.value)}
                          placeholder="SWIFT/BIC code"
                          data-testid="input-swift"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">IBAN Number</Label>
                        <Input
                          value={ibanNumber}
                          onChange={(e) => onIbanNumberChange(e.target.value)}
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
                          onChange={(e) => onAccountNumberChange(e.target.value)}
                          placeholder="Account number"
                          data-testid="input-account-number"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Routing Number</Label>
                        <Input
                          value={routingNumber}
                          onChange={(e) => onRoutingNumberChange(e.target.value)}
                          placeholder="Routing number (US)"
                          data-testid="input-routing"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Account Type</Label>
                        <Select value={accountType} onValueChange={onAccountTypeChange}>
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
                          onChange={(e) => onBankAddressChange(e.target.value)}
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
                      onClick={onSavePaymentDetails}
                      disabled={savePaymentDetailsIsPending}
                      data-testid="button-save-payment-details"
                    >
                      {savePaymentDetailsIsPending ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-1" />
                      )}
                      Save for Future
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onCancel}
                      data-testid="button-cancel-gen"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={onGenerateSubmit}
                      disabled={!canGenerate || generateIsPending || isSyncingTimesheet}
                      data-testid="button-generate-invoice"
                    >
                      {isSyncingTimesheet ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Syncing...
                        </>
                      ) : generateIsPending ? (
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
  );
}
