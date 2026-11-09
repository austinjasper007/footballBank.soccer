"use client";

import { useEffect, useMemo, useState } from "react";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from "firebase/storage";
import {
  ArrowDownToLine,
  ChevronRight,
  File,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderOpen,
  LoaderCircle,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { storage } from "@/firebase/config";
import {
  MAX_PLAYER_DOCUMENT_BYTES,
  normalizeDocumentFolder,
} from "@/lib/playerDocumentRules";

const fieldClass = "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100";

const formatFileSize = (bytes) => {
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${bytes} bytes`;
};

const getFileIcon = (fileName, mimeType) => {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (mimeType.startsWith("image/")) return FileImage;
  if (["xls", "xlsx", "csv"].includes(extension)) return FileSpreadsheet;
  if (["pdf", "doc", "docx", "txt"].includes(extension)) return FileText;
  if (["zip", "rar", "7z"].includes(extension)) return FileArchive;
  return File;
};

function uploadToStorage(file, storagePath, onProgress) {
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(ref(storage, storagePath), file, {
      contentType: file.type || "application/octet-stream",
    });
    task.on(
      "state_changed",
      (snapshot) => onProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)),
      reject,
      async () => {
        try {
          resolve(await getDownloadURL(task.snapshot.ref));
        } catch (error) {
          reject(error);
        }
      },
    );
  });
}

export default function PlayerDocuments({ playerId, canManage = false }) {
  const [documents, setDocuments] = useState([]);
  const [folder, setFolder] = useState("");
  const [activeFolder, setActiveFolder] = useState("");
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [uploadProgress, setUploadProgress] = useState(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  async function refreshDocuments() {
    const response = await fetch(`/api/players/${encodeURIComponent(playerId)}/documents`, {
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Player documents could not be loaded.");
    setDocuments(result.documents);
  }

  useEffect(() => {
    let active = true;
    fetch(`/api/players/${encodeURIComponent(playerId)}/documents`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Player documents could not be loaded.");
        if (active) setDocuments(result.documents);
      })
      .catch((error) => {
        if (active) setNotice(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [playerId]);

  const currentDocuments = useMemo(
    () => documents.filter((document) => document.folderPath === activeFolder),
    [documents, activeFolder],
  );
  const childFolders = useMemo(() => {
    const prefix = activeFolder ? `${activeFolder}/` : "";
    return [...new Set(documents
      .filter((document) =>
        document.folderPath.startsWith(prefix) &&
        document.folderPath !== activeFolder
      )
      .map((document) => document.folderPath.slice(prefix.length).split("/")[0])
      .filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));
  }, [documents, activeFolder]);
  const breadcrumbs = activeFolder ? activeFolder.split("/") : [];

  async function uploadFiles(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("documents");
    const files = Array.from(fileInput?.files || []);
    if (!files.length) {
      setNotice("Choose one or more files to upload.");
      return;
    }

    let folderPath;
    try {
      folderPath = normalizeDocumentFolder(folder);
    } catch (error) {
      setNotice(error.message);
      return;
    }

    setBusy(true);
    setNotice("");
    try {
      for (const file of files) {
        if (!file.size || file.size > MAX_PLAYER_DOCUMENT_BYTES) {
          throw new Error(`${file.name}: documents must be between 1 byte and 25 MB.`);
        }
        const storagePath = [
          "players",
          playerId,
          "documents",
          folderPath,
          `${Date.now()}-${globalThis.crypto.randomUUID()}-${file.name}`,
        ].filter(Boolean).join("/");
        let downloadUrl;
        try {
          downloadUrl = await uploadToStorage(file, storagePath, (progress) => {
            setUploadProgress({ fileName: file.name, progress });
          });
          const response = await fetch(`/api/admin/players/${encodeURIComponent(playerId)}/documents`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileName: file.name,
              folderPath,
              storagePath,
              downloadUrl,
              mimeType: file.type || "application/octet-stream",
              fileSize: file.size,
            }),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "Document details could not be saved.");
        } catch (error) {
          try {
            await deleteObject(ref(storage, storagePath));
          } catch (cleanupError) {
            if (cleanupError.code !== "storage/object-not-found") {
              throw new Error(`${error.message} The uploaded file could not be cleaned up: ${cleanupError.message}`);
            }
          }
          throw error;
        }
      }
      await refreshDocuments();
      form.reset();
      setActiveFolder(folderPath);
      setNotice(`${files.length} document${files.length === 1 ? "" : "s"} uploaded.`);
    } catch (error) {
      setNotice(error.message || "Document upload failed.");
    } finally {
      setUploadProgress(null);
      setBusy(false);
    }
  }

  async function deleteDocument(document) {
    if (!window.confirm(`Permanently delete "${document.fileName}"?`)) return;
    setDeletingId(document.id);
    setNotice("");
    try {
      const documentUrl = `/api/admin/players/${encodeURIComponent(playerId)}/documents/${encodeURIComponent(document.id)}`;
      const metadataResponse = await fetch(documentUrl, { cache: "no-store" });
      const metadata = await metadataResponse.json();
      if (!metadataResponse.ok) throw new Error(metadata.error || "The document storage path could not be verified.");
      try {
        await deleteObject(ref(storage, metadata.storagePath));
      } catch (error) {
        if (error.code !== "storage/object-not-found") throw error;
      }

      const deleteResponse = await fetch(documentUrl, {
        method: "DELETE",
      });
      const result = await deleteResponse.json();
      if (!deleteResponse.ok) throw new Error(result.error || "Document metadata could not be removed.");
      await refreshDocuments();
      setNotice("Document deleted.");
    } catch (error) {
      setNotice(error.message || "Document could not be deleted.");
    } finally {
      setDeletingId("");
    }
  }

  return (
    <div className="space-y-5">
      {canManage && (
        <form onSubmit={uploadFiles} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <UploadCloud className="size-5" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-semibold text-slate-900">Upload player documents</h3>
              <p className="mt-1 text-sm text-slate-500">Access is limited to the player, approved profile viewers, active media invite recipients, and admins. Maximum 25 MB per file.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label>
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Folder</span>
              <input value={folder} onChange={(event) => setFolder(event.target.value)} placeholder="e.g. Identity/Passport" className={fieldClass} />
            </label>
            <label>
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Files</span>
              <input required name="documents" type="file" multiple disabled={busy} className="block h-11 w-full text-sm text-slate-600 file:mr-3 file:h-10 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:text-sm file:font-semibold file:text-slate-700" />
            </label>
            <button disabled={busy} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60">
              {busy ? <LoaderCircle className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
              Upload
            </button>
          </div>
          {uploadProgress && (
            <p className="mt-3 text-xs text-blue-700">
              Uploading {uploadProgress.fileName} · {uploadProgress.progress}%
            </p>
          )}
        </form>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Player files</p>
            <h3 className="mt-1 font-heading text-xl font-semibold text-slate-900">Documentation</h3>
          </div>
          <a
            href={`/api/players/${encodeURIComponent(playerId)}/documents/archive`}
            aria-disabled={!documents.length || loading}
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold ${documents.length && !loading ? "border-slate-200 text-slate-700 hover:bg-slate-50" : "pointer-events-none border-slate-100 text-slate-300"}`}
          >
            <ArrowDownToLine className="size-4" /> Download root folder ZIP
          </a>
        </div>

        <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 px-5 py-3 text-sm sm:px-6">
          <button type="button" onClick={() => setActiveFolder("")} className="font-semibold text-blue-700 hover:underline">
            <FolderOpen className="mr-1 inline size-4" /> Root
          </button>
          {breadcrumbs.map((part, index) => {
            const path = breadcrumbs.slice(0, index + 1).join("/");
            return (
              <span key={path} className="inline-flex items-center gap-1">
                <ChevronRight className="size-4 text-slate-300" />
                <button type="button" onClick={() => setActiveFolder(path)} className={`hover:underline ${path === activeFolder ? "font-semibold text-slate-900" : "text-blue-700"}`}>
                  {part}
                </button>
              </span>
            );
          })}
        </div>

        {notice && <p role="status" className="border-b border-slate-100 px-5 py-3 text-sm text-slate-600 sm:px-6">{notice}</p>}
        {loading ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">Loading documents…</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {childFolders.map((name) => {
              const path = [activeFolder, name].filter(Boolean).join("/");
              return (
                <button key={path} type="button" onClick={() => setActiveFolder(path)} className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-slate-50 sm:px-6">
                  <Folder className="size-5 text-amber-500" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{name}</span>
                  <ChevronRight className="size-4 text-slate-400" />
                </button>
              );
            })}
            {currentDocuments.map((document) => {
              const Icon = getFileIcon(document.fileName, document.mimeType || "");
              return (
                <div key={document.id} className="flex items-center gap-3 px-5 py-4 sm:px-6">
                  <Icon className="size-5 shrink-0 text-slate-500" />
                  <div className="min-w-0 flex-1">
                    <a href={`/api/players/${encodeURIComponent(playerId)}/documents/${encodeURIComponent(document.id)}`} className="block truncate text-sm font-semibold text-slate-800 hover:text-blue-700 hover:underline">
                      {document.fileName}
                    </a>
                    <p className="mt-1 text-xs text-slate-500">{formatFileSize(document.fileSize)}</p>
                  </div>
                  <a
                    href={`/api/players/${encodeURIComponent(playerId)}/documents/${encodeURIComponent(document.id)}`}
                    aria-label={`Download ${document.fileName}`}
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    <ArrowDownToLine className="size-4" />
                  </a>
                  {canManage && (
                    <button
                      type="button"
                      disabled={deletingId === document.id}
                      onClick={() => deleteDocument(document)}
                      aria-label={`Delete ${document.fileName}`}
                      className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-rose-100 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                    >
                      {deletingId === document.id ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                    </button>
                  )}
                </div>
              );
            })}
            {!childFolders.length && !currentDocuments.length && (
              <p className="px-5 py-10 text-center text-sm text-slate-500 sm:px-6">
                {documents.length ? "This folder is empty." : "No documents have been uploaded yet."}
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
