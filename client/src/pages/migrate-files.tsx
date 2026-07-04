import { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, CheckCircle2, XCircle, FileIcon, Loader2 } from "lucide-react";

interface FileUploadResult {
  originalName: string;
  objectPath: string;
  success: boolean;
  error?: string;
}

interface UploadState {
  status: "idle" | "uploading" | "done";
  progress: number;
  results: FileUploadResult[];
  successCount: number;
  failCount: number;
}

export default function MigrateFilesPage() {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadState, setUploadState] = useState<UploadState>({
    status: "idle",
    progress: 0,
    results: [],
    successCount: 0,
    failCount: 0,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...files]);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...files]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearAll = useCallback(() => {
    setSelectedFiles([]);
    setUploadState({
      status: "idle",
      progress: 0,
      results: [],
      successCount: 0,
      failCount: 0,
    });
  }, []);

  const uploadFiles = useCallback(async () => {
    if (selectedFiles.length === 0) return;

    setUploadState({ status: "uploading", progress: 0, results: [], successCount: 0, failCount: 0 });

    const batchSize = 10;
    const allResults: FileUploadResult[] = [];
    let totalProcessed = 0;

    for (let i = 0; i < selectedFiles.length; i += batchSize) {
      const batch = selectedFiles.slice(i, i + batchSize);
      const formData = new FormData();
      batch.forEach((file) => formData.append("files", file));

      try {
        const response = await fetch("/api/admin/migrate-files", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: "Upload failed" }));
          batch.forEach((file) => {
            allResults.push({
              originalName: file.name,
              objectPath: "",
              success: false,
              error: err.error || "Upload failed",
            });
          });
        } else {
          const data = await response.json();
          allResults.push(...(data.results || []));
        }
      } catch (err: any) {
        batch.forEach((file) => {
          allResults.push({
            originalName: file.name,
            objectPath: "",
            success: false,
            error: err.message || "Network error",
          });
        });
      }

      totalProcessed += batch.length;
      setUploadState((prev) => ({
        ...prev,
        progress: Math.round((totalProcessed / selectedFiles.length) * 100),
        results: [...allResults],
      }));
    }

    setUploadState({
      status: "done",
      progress: 100,
      results: allResults,
      successCount: allResults.filter((r) => r.success).length,
      failCount: allResults.filter((r) => !r.success).length,
    });
  }, [selectedFiles]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] dark:bg-gray-950 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-normal text-neutral-900 dark:text-gray-100">File migration tool</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Upload files to Object Storage. Files will be stored under .private/uploads/ with their original filenames.
          </p>
        </div>

        <Card className="border-[1.5px] border-neutral-200 rounded-xl">
          <CardHeader>
            <CardTitle className="text-[13.5px] font-semibold text-neutral-900">Upload files</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              data-testid="drop-zone"
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-gray-300 dark:border-gray-700 hover:border-primary/50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-10 h-10 mx-auto mb-3 text-gray-400" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Drag & drop files here, or click to browse
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                PDF and image files supported (max 50MB each)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.svg"
                className="hidden"
                onChange={handleFileSelect}
                data-testid="input-file"
              />
            </div>

            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {selectedFiles.length} file{selectedFiles.length !== 1 ? "s" : ""} selected
                  </p>
                  <Button variant="ghost" size="sm" onClick={clearAll} data-testid="button-clear-all">
                    Clear all
                  </Button>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1 border rounded-lg p-2 bg-white dark:bg-gray-900">
                  {selectedFiles.map((file, idx) => (
                    <div
                      key={`${file.name}-${idx}`}
                      className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
                      data-testid={`file-item-${idx}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileIcon className="w-4 h-4 flex-shrink-0 text-gray-400" />
                        <span className="truncate text-gray-700 dark:text-gray-300">{file.name}</span>
                        <span className="text-xs text-gray-400 flex-shrink-0">{formatFileSize(file.size)}</span>
                      </div>
                      {uploadState.status === "idle" && (
                        <button
                          onClick={() => removeFile(idx)}
                          className="text-gray-400 hover:text-destructive ml-2"
                          data-testid={`button-remove-file-${idx}`}
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {uploadState.status === "uploading" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Uploading... {uploadState.progress}%</span>
                </div>
                <Progress value={uploadState.progress} className="h-2" />
              </div>
            )}

            {uploadState.status === "done" && (
              <Card className="bg-gray-50 dark:bg-gray-900 border">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="w-4 h-4" /> {uploadState.successCount} succeeded
                    </span>
                    {uploadState.failCount > 0 && (
                      <span className="flex items-center gap-1 text-red-600">
                        <XCircle className="w-4 h-4" /> {uploadState.failCount} failed
                      </span>
                    )}
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {uploadState.results.map((result, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-2 text-sm py-1 px-2 rounded ${
                          result.success
                            ? "text-green-700 dark:text-green-400"
                            : "text-red-700 dark:text-red-400"
                        }`}
                        data-testid={`result-item-${idx}`}
                      >
                        {result.success ? (
                          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 flex-shrink-0" />
                        )}
                        <span className="truncate">{result.originalName}</span>
                        {result.success && (
                          <span className="text-xs text-gray-400 truncate ml-auto">{result.objectPath}</span>
                        )}
                        {!result.success && result.error && (
                          <span className="text-xs text-red-400 truncate ml-auto">{result.error}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-2">
              <Button
                onClick={uploadFiles}
                disabled={selectedFiles.length === 0 || uploadState.status === "uploading"}
                className="flex-1"
                data-testid="button-upload"
              >
                {uploadState.status === "uploading" ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload {selectedFiles.length > 0 ? `${selectedFiles.length} File${selectedFiles.length !== 1 ? "s" : ""}` : "Files"}
                  </>
                )}
              </Button>
              {uploadState.status === "done" && (
                <Button variant="outline" onClick={clearAll} data-testid="button-reset">
                  Upload More
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
