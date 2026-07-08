import { useState, useRef, useEffect } from "react";
import { X, Paperclip, Send, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const MAX_FILES = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp", "application/pdf"];

type State = "idle" | "loading" | "success" | "error";

export function SupportBubble() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && user?.email) {
      setEmail(user.email);
    }
  }, [open, user?.email]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function reset() {
    setState("idle");
    setErrorMsg("");
    setSubject("");
    setMessage("");
    setFiles([]);
    setFileError("");
    if (!user?.email) setEmail("");
  }

  function handleToggle() {
    if (open) {
      setOpen(false);
    } else {
      reset();
      setOpen(true);
      if (user?.email) setEmail(user.email);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError("");
    const selected = Array.from(e.target.files || []);
    const combined = [...files, ...selected];

    if (combined.length > MAX_FILES) {
      setFileError(`Maximum ${MAX_FILES} files allowed.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    for (const f of selected) {
      if (!ALLOWED_TYPES.includes(f.type)) {
        setFileError("Only PNG, JPG, GIF, WebP, and PDF files are allowed.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      if (f.size > MAX_FILE_SIZE) {
        setFileError(`"${f.name}" exceeds the 5 MB limit.`);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
    }
    setFiles(combined);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setFileError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFileError("");
    setErrorMsg("");

    if (!email.trim() || !subject.trim() || !message.trim()) return;

    setState("loading");

    const fd = new FormData();
    fd.append("email", email.trim());
    fd.append("subject", subject.trim());
    fd.append("message", message.trim());
    files.forEach((f) => fd.append("attachments", f));

    try {
      const res = await fetch("/api/support/ticket", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      setState("success");
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong. Please try again.");
      setState("error");
    }
  }

  function formatBytes(bytes: number) {
    return bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(0)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3" ref={panelRef}>
      {open && (
        <div className="w-80 rounded-2xl border border-border bg-background shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
          <div className="flex items-center justify-between px-4 py-3 bg-primary">
            <span className="text-sm font-semibold text-primary-foreground">Contact Support</span>
            <button
              onClick={() => setOpen(false)}
              className="text-primary-foreground/80 hover:text-primary-foreground transition-colors"
              aria-label="Close support panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 flex-1 overflow-y-auto max-h-[70vh]">
            {state === "success" ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <CheckCircle className="w-12 h-12 text-green-500" />
                <p className="font-semibold text-sm">We got your message!</p>
                <p className="text-xs text-muted-foreground">We'll get back to you as soon as possible.</p>
                <button
                  onClick={reset}
                  className="mt-2 text-xs text-primary hover:underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-foreground">Your email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    disabled={state === "loading"}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-foreground">Subject *</label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief description of the issue"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    disabled={state === "loading"}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-foreground">Message *</label>
                  <textarea
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your issue in detail..."
                    rows={4}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                    disabled={state === "loading"}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-foreground">
                    Attachments <span className="text-muted-foreground font-normal">(optional, max 3 files · 5 MB each)</span>
                  </label>

                  {files.length > 0 && (
                    <ul className="flex flex-col gap-1 mb-1">
                      {files.map((f, i) => (
                        <li key={i} className="flex items-center justify-between rounded-md bg-muted px-2 py-1 text-xs">
                          <span className="truncate max-w-[200px] text-foreground">{f.name}</span>
                          <span className="text-muted-foreground ml-2 shrink-0">{formatBytes(f.size)}</span>
                          <button
                            type="button"
                            onClick={() => removeFile(i)}
                            className="ml-2 text-muted-foreground hover:text-destructive transition-colors"
                            aria-label="Remove file"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {files.length < MAX_FILES && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={state === "loading"}
                      className="flex items-center gap-2 rounded-md border border-dashed border-input px-3 py-2 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                    >
                      <Paperclip className="w-3 h-3" />
                      Attach file (PNG, JPG, GIF, WebP, PDF)
                    </button>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp,application/pdf"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {fileError && (
                    <p className="text-xs text-destructive mt-1">{fileError}</p>
                  )}
                </div>

                {state === "error" && errorMsg && (
                  <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
                    <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                    <p className="text-xs text-destructive">{errorMsg}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={state === "loading" || !email.trim() || !subject.trim() || !message.trim()}
                  className="flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {state === "loading" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send message
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <button
        onClick={handleToggle}
        aria-label="Open support"
        className="w-13 h-13 rounded-full bg-primary shadow-lg flex items-center justify-center hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
        style={{ width: 52, height: 52 }}
      >
        {open ? (
          <X className="w-5 h-5 text-primary-foreground" />
        ) : (
          <img
            src="/favicon.svg"
            alt="Support"
            className="w-7 h-7"
            style={{ filter: "brightness(0) invert(1)" }}
          />
        )}
      </button>
    </div>
  );
}
