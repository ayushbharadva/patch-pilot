"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DATASETS_QUERY_KEY } from "@/components/DatasetList";
import { FileStatusRow, type FileStatus } from "@/components/FileStatusRow";
import {
  loadSampleData,
  pollIngestStatus,
  uploadFiles,
  type ContentType,
} from "@/lib/api";
import { useSearchSession } from "@/lib/search-session";

/** Content-type selector options + labels (D-01, copy from 02-UI-SPEC.md). */
const CONTENT_TYPE_OPTIONS: { value: ContentType; label: string }[] = [
  { value: "ticket", label: "Ticket" },
  { value: "chat", label: "Chat log" },
  { value: "changelog", label: "Changelog" },
  { value: "release_note", label: "Release note" },
];

const ALLOWED_EXTENSIONS = [".md", ".txt", ".json"];
/** D-24 copy, exact string from 02-UI-SPEC.md's Copywriting Contract. */
const UNSUPPORTED_FILE_MESSAGE =
  "That file type isn't supported. Upload a .md, .txt, or .json file.";
/** D-05 toast copy, exact string from 02-UI-SPEC.md's Copywriting Contract. */
const UPLOAD_ACCEPTED_TOAST = "Upload received — processing…";

const POLL_INTERVAL_MS = 2000;

interface UploadRow {
  id: string;
  filename: string;
  dataset: string;
  status: FileStatus;
  /** Retained for Retry (D-23) on real uploads; null for /sample/load rows
   * (no individual File object -- the seed docs live server-side). */
  file: File | null;
}

let rowIdCounter = 0;
function nextRowId(): string {
  rowIdCounter += 1;
  return `row-${rowIdCounter}-${Date.now()}`;
}

function hasAllowedExtension(filename: string): boolean {
  const lower = filename.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Typed multi-file upload panel (D-01/D-02/D-14/D-16) + Load Sample Data
 * (D-03), wired to backend/ingest.py. Owns the content-type selector,
 * multi-file picker, conditional release-version field, and the per-file
 * status rows that flip Uploading -> Processing -> Ready/Failed via polling
 * (D-05/D-22).
 */
export function UploadPanel() {
  const queryClient = useQueryClient();
  const { recordLifecycleEvent } = useSearchSession();
  const [contentType, setContentType] = useState<ContentType>("ticket");
  const [releaseVersion, setReleaseVersion] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // D-05/D-22: poll every "processing" row's dataset until it flips to
  // ready/failed. Cognee reports status per dataset, not per file, so every
  // row sharing a dataset flips together.
  useEffect(() => {
    const processingDatasets = Array.from(
      new Set(rows.filter((r) => r.status === "processing").map((r) => r.dataset)),
    );
    if (processingDatasets.length === 0) return;

    const interval = setInterval(() => {
      processingDatasets.forEach((dataset) => {
        void pollIngestStatus(dataset).then((status) => {
          if (status === "ready" || status === "failed") {
            setRows((prev) =>
              prev.map((r) =>
                r.dataset === dataset && r.status === "processing" ? { ...r, status } : r,
              ),
            );
            if (status === "ready") {
              // Cognify has finished for this dataset -- refresh the
              // dataset list so its doc count reflects the completed
              // ingest (D-15), e.g. a newly uploaded workarounds_v{N}.
              void queryClient.invalidateQueries({ queryKey: DATASETS_QUERY_KEY });
            }
          }
        });
      });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [rows, queryClient]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setPendingFiles(Array.from(event.target.files ?? []));
  }

  async function submitUpload(filesToUpload: File[]) {
    setFormError(null);

    const badFile = filesToUpload.find((f) => !hasAllowedExtension(f.name));
    if (badFile) {
      setFormError(UNSUPPORTED_FILE_MESSAGE);
      return;
    }
    if (contentType === "release_note" && !releaseVersion.trim()) {
      setFormError("Enter a release version, e.g. 1.9.");
      return;
    }

    // Optimistic "Uploading" rows while the request is in flight (D-22).
    const uploadingRows: UploadRow[] = filesToUpload.map((file) => ({
      id: nextRowId(),
      filename: file.name,
      dataset: "",
      status: "uploading",
      file,
    }));
    setRows((prev) => [...prev, ...uploadingRows]);
    const uploadingIds = new Set(uploadingRows.map((r) => r.id));

    setIsUploading(true);
    const response = await uploadFiles({
      files: filesToUpload,
      contentType,
      releaseVersion:
        contentType === "release_note"
          ? releaseVersion.trim().replace(/\./g, "_")
          : undefined,
    });
    setIsUploading(false);

    if (response.status === "error") {
      // Whole-batch rejection (validation failure) -- these files were
      // never queued at all, so drop the optimistic rows and surface a
      // single inline message rather than marking individual files Failed.
      setRows((prev) => prev.filter((r) => !uploadingIds.has(r.id)));
      setFormError(response.message);
      return;
    }

    toast.success(UPLOAD_ACCEPTED_TOAST);
    recordLifecycleEvent("remember");
    setRows((prev) =>
      prev.map((r) =>
        uploadingIds.has(r.id) ? { ...r, status: "processing", dataset: response.dataset } : r,
      ),
    );
    setPendingFiles([]);
    setFileInputKey((k) => k + 1);
    // A new workarounds_v{N} (or incidents) dataset may now exist -- refresh
    // the list immediately so its name is visible even before cognify
    // completes (D-15/D-16); the polling effect above refreshes again once
    // the doc count is final.
    void queryClient.invalidateQueries({ queryKey: DATASETS_QUERY_KEY });
  }

  function handleUploadClick() {
    if (pendingFiles.length === 0) {
      setFormError("Choose at least one file to upload.");
      return;
    }
    void submitUpload(pendingFiles);
  }

  async function handleLoadSample() {
    setFormError(null);
    setIsLoadingSample(true);
    const response = await loadSampleData();
    setIsLoadingSample(false);

    if (response.status === "error") {
      setFormError(response.message);
      return;
    }

    toast.success(UPLOAD_ACCEPTED_TOAST);
    recordLifecycleEvent("remember");
    const newRows: UploadRow[] = response.datasets.map((dataset) => ({
      id: nextRowId(),
      filename: dataset,
      dataset,
      status: "processing",
      file: null,
    }));
    setRows((prev) => [...prev, ...newRows]);
    void queryClient.invalidateQueries({ queryKey: DATASETS_QUERY_KEY });
  }

  function handleRetry(row: UploadRow) {
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    if (row.file) {
      void submitUpload([row.file]);
    } else {
      void handleLoadSample();
    }
  }

  return (
    <Card className="glow-soft gap-6 p-6">
      <CardHeader className="p-0">
        <h2 className="font-display text-xl font-semibold text-gradient">Upload</h2>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 p-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="font-sans text-sm font-semibold text-foreground">
              Content type
            </label>
            <Select
              value={contentType}
              onValueChange={(value) => setContentType(value as ContentType)}
            >
              <SelectTrigger className="glass h-10 w-full border-border/60 hover:border-accent-violet/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-strong">
                {CONTENT_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {contentType === "release_note" ? (
            <div className="flex flex-1 flex-col gap-1.5 animate-rise-in">
              <label className="font-sans text-sm font-semibold text-foreground">
                Release version
              </label>
              <Input
                value={releaseVersion}
                onChange={(event) => setReleaseVersion(event.target.value)}
                placeholder="1.9"
                className="h-10"
              />
              <p className="font-mono text-xs text-muted-foreground">
                Stored as workarounds_v1_9
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="font-sans text-sm font-semibold text-foreground">Files</label>
          <div className="glass rounded-lg px-3 py-2.5">
            <input
              key={fileInputKey}
              type="file"
              multiple
              accept=".md,.txt,.json"
              onChange={handleFileChange}
              aria-label="Choose files to upload"
              className="w-full font-sans text-sm text-foreground file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-border file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-secondary-foreground file:transition-colors hover:file:bg-secondary/70"
            />
          </div>
        </div>

        {formError ? (
          <p className="font-sans text-sm font-semibold text-destructive">{formError}</p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            onClick={handleUploadClick}
            disabled={isUploading}
            className="font-sans text-sm font-semibold"
          >
            Upload Files
          </Button>
          <Button
            type="button"
            onClick={() => void handleLoadSample()}
            disabled={isLoadingSample}
            className="font-sans text-sm font-semibold"
          >
            Load Sample Data
          </Button>
        </div>

        {rows.length > 0 ? (
          <div className="flex flex-col gap-2 pt-2">
            {rows.map((row) => (
              <FileStatusRow
                key={row.id}
                filename={row.filename}
                status={row.status}
                onRetry={row.status === "failed" ? () => handleRetry(row) : undefined}
              />
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
