"use client";

import { useEffect, useRef, useState } from "react";
import * as tus from "tus-js-client";
import {
  Check,
  ChevronDown,
  CircleAlert,
  Clock3,
  Film,
  FileText,
  FolderSync,
  GripVertical,
  ListVideo,
  Mail,
  Plus,
  Pause,
  Play,
  ShieldCheck,
  Trash2,
  UploadCloud,
  Users,
  Video,
} from "lucide-react";
import {
  createMediaPlaylist,
  deleteMediaShareHistory,
  getMediaPortalLibrary,
  getMediaPortalPlayers,
  revokeMediaShare,
  sendMediaShare,
  setMediaContactConsent,
  setMediaPublication,
  updatePlayerMedia,
} from "@/actions/mediaPortalActions";
import MediaPlayerProfileForm from "@/components/admin/views/MediaPlayerProfileForm";
import { useToast } from "@/hooks/use-toast";

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024 * 1024;
const MAX_VIDEO_WIDTH = 1920;
const MAX_VIDEO_HEIGHT = 1080;
const formatFileSize = (bytes) => {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
};
const readableStatus = (status) => ({
  UPLOADING: "Uploading",
  PROCESSING: "Processing",
  READY: "Ready",
  FAILED: "Failed",
  DELETED: "Deleted",
}[status] || status);

const fieldClass = "h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 hover:border-slate-300 focus:!outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500";
const labelClass = "mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500";
const sectionClass = "overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm";
const mediaPortalTabs = [
  { id: "profile", label: "Player profile", icon: FileText },
  { id: "upload", label: "Upload", icon: UploadCloud },
  { id: "library", label: "Media library", icon: ListVideo },
  { id: "invite", label: "Send invite", icon: Mail },
  { id: "shares", label: "Share history", icon: Users },
];

function readVideoDimensions(file) {
  return new Promise((resolve, reject) => {
    const source = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(source);
      resolve({ width: video.videoWidth, height: video.videoHeight });
    };
    video.onerror = () => {
      URL.revokeObjectURL(source);
      reject(new Error("The selected video could not be read."));
    };
    video.src = source;
  });
}

export default function MediaPortalView() {
  const [players, setPlayers] = useState([]);
  const [selected, setSelected] = useState("");
  const [activeTab, setActiveTab] = useState("upload");
  const [consent, setConsent] = useState(false);
  const [contactConsent, setContactConsent] = useState(false);
  const [library, setLibrary] = useState({ media: [], playlists: [], shares: [] });
  const [selectedShareIds, setSelectedShareIds] = useState([]);
  const [shareHistoryBusy, setShareHistoryBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [collectionsBusy, setCollectionsBusy] = useState(false);
  const [uploadReady, setUploadReady] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadPaused, setUploadPaused] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [draggedId, setDraggedId] = useState("");
  const uploadRef = useRef(null);
  const { toast } = useToast();

  const player = players.find((item) => item.id === selected);

  async function refreshPlayers() {
    setPlayers(await getMediaPortalPlayers());
  }

  async function refreshLibrary(playerId = selected) {
    if (!playerId) {
      setLibrary({ media: [], playlists: [], shares: [] });
      return;
    }
    setLibrary(await getMediaPortalLibrary(playerId));
  }

  function notifyUploadFailure(description) {
    setNotice(description);
    toast({ title: "Upload failed", description, variant: "destructive" });
  }

  async function toggleUploadPause() {
    const upload = uploadRef.current;
    if (!upload) return;

    if (uploadPaused) {
      upload.start();
      setUploadPaused(false);
      toast({ title: "Upload resumed", description: "Your video upload is continuing." });
      return;
    }

    try {
      await upload.abort(false);
      setUploadPaused(true);
      toast({ title: "Upload paused", description: "Your progress is saved. Resume when you’re ready." });
    } catch (error) {
      notifyUploadFailure(`Could not pause the upload: ${error.message}`);
    }
  }

  useEffect(() => {
    refreshPlayers().catch((error) => setNotice(error.message));
  }, []);

  useEffect(() => {
    setConsent(false);
    setContactConsent(Boolean(player?.publication?.contactConsentConfirmedAt));
    setActiveTab("upload");
    setSelectedShareIds([]);
    refreshLibrary(selected).catch((error) => setNotice(error.message));
  }, [selected]);

  async function publishPlayer() {
    try {
      await setMediaPublication(selected, {
        isPublished: !player?.publication?.isPublished,
        consentConfirmed: consent || Boolean(player?.publication?.consentConfirmedAt),
      });
      await refreshPlayers();
      setNotice("Player publication updated.");
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function saveContactConsent() {
    try {
      await setMediaContactConsent(selected, contactConsent);
      await refreshPlayers();
      const message = contactConsent
        ? "Consent to share player contact details recorded."
        : "Player contact details are now hidden from private CVs.";
      setNotice(message);
      toast({ title: "Contact sharing updated", description: message });
    } catch (error) {
      setNotice(error.message);
      toast({ title: "Could not update contact sharing", description: error.message, variant: "destructive" });
    }
  }

  async function createUpload(form) {
    const formData = new FormData(form);
    const file = formData.get("video");
    const title = String(formData.get("title") || "").trim();
    const category = String(formData.get("category") || "");
    const matchDate = formData.get("matchDate");

    if (!(file instanceof File) || !file.size) {
      notifyUploadFailure("Choose an MP4 or MOV video to upload.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      notifyUploadFailure("The video must be 20 GB or smaller.");
      return;
    }

    setBusy(true);
    setUploadProgress(0);
    setNotice("");
    try {
      const dimensions = await readVideoDimensions(file);
      const landscapeOrSquare = dimensions.width <= MAX_VIDEO_WIDTH && dimensions.height <= MAX_VIDEO_HEIGHT;
      const portrait = dimensions.width <= MAX_VIDEO_HEIGHT && dimensions.height <= MAX_VIDEO_WIDTH;
      if (!landscapeOrSquare && !portrait) {
        throw new Error("The video must be no larger than 1080p.");
      }
      const mimeType = file.type || (file.name.toLowerCase().endsWith(".mov") ? "video/quicktime" : "video/mp4");
      const metadata = {
        playerId: selected,
        title,
        category,
        fileName: file.name,
        fileSize: file.size,
        mimeType,
        description: formData.get("description"),
        season: formData.get("season"),
        competition: formData.get("competition"),
        playerClub: formData.get("playerClub"),
        opponent: formData.get("opponent"),
        matchDate: matchDate ? new Date(String(matchDate)).toISOString() : undefined,
      };
      const previousProbe = new tus.Upload(file, { endpoint: "https://video.bunnycdn.com/tusupload" });
      const previousUploads = await previousProbe.findPreviousUploads();
      const previousUpload = previousUploads.find((item) => item.metadata?.assetId);
      let credentials;
      if (previousUpload) {
        const resumeResponse = await fetch(`/api/admin/media/uploads/${previousUpload.metadata.assetId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(metadata),
        });
        credentials = await resumeResponse.json();
        if (!resumeResponse.ok) throw new Error(credentials.error || "Could not resume this upload.");
        if (credentials.alreadyUploaded) {
          await refreshLibrary();
          setBusy(false);
          setUploadReady(false);
          setUploadProgress(null);
          form.reset();
          setSelectedVideo(null);
          setNotice("This video is already uploaded and is being processed.");
          toast({ title: "Upload already complete", description: "Bunny is processing this video." });
          return;
        }
      } else {
        const response = await fetch("/api/admin/media/uploads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(metadata),
        });
        credentials = await response.json();
        if (!response.ok) throw new Error(credentials.error || "Could not start the upload.");
      }

      const upload = new tus.Upload(file, {
        endpoint: credentials.endpoint,
        retryDelays: [0, 3000, 5000, 10000, 20000, 60000, 60000],
        headers: {
          AuthorizationSignature: credentials.signature,
          AuthorizationExpire: String(credentials.expires),
          VideoId: credentials.videoId,
          LibraryId: credentials.libraryId,
        },
        metadata: {
          assetId: credentials.assetId,
          filetype: mimeType,
          title,
          collection: credentials.collectionId,
        },
        uploadSize: file.size,
        onError(error) {
          uploadRef.current = null;
          setBusy(false);
          setUploadReady(false);
          setUploadProgress(null);
          setUploadPaused(false);
          notifyUploadFailure(error.message);
        },
        onProgress(bytesUploaded, bytesTotal) {
          setUploadProgress(Math.floor((bytesUploaded / bytesTotal) * 100));
        },
        onSuccess() {
          uploadRef.current = null;
          setNotice("Upload completed. Bunny is processing the video.");
          setBusy(false);
          setUploadReady(false);
          setUploadProgress(null);
          setUploadPaused(false);
          form.reset();
          setSelectedVideo(null);
          toast({
            title: "Upload complete",
            description: "Your video was uploaded to Bunny Stream and is now processing.",
          });
          refreshLibrary().catch((error) => setNotice(error.message));
        },
      });
      uploadRef.current = upload;
      setUploadReady(true);
      if (previousUpload) upload.resumeFromPreviousUpload(previousUpload);
      upload.start();
    } catch (error) {
      uploadRef.current = null;
      setBusy(false);
      setUploadReady(false);
      setUploadProgress(null);
      setUploadPaused(false);
      notifyUploadFailure(error.message);
    }
  }

  async function changeMedia(mediaId, patch) {
    try {
      await updatePlayerMedia(mediaId, patch);
      await refreshLibrary();
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function createPlaylist(form) {
    const data = new FormData(form);
    try {
      await createMediaPlaylist(selected, data.get("title"));
      form.reset();
      await refreshLibrary();
      setNotice("Playlist created.");
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function updatePlaylistMembership(media, playlistId, checked) {
    const playlistIds = checked
      ? [...media.playlistIds, playlistId]
      : media.playlistIds.filter((id) => id !== playlistId);
    await changeMedia(media.id, { playlistIds });
  }

  async function reorderMedia(targetId) {
    if (!draggedId || draggedId === targetId) return;
    const ordered = [...library.media].sort((a, b) => a.displayOrder - b.displayOrder);
    const from = ordered.findIndex((item) => item.id === draggedId);
    const to = ordered.findIndex((item) => item.id === targetId);
    const [moved] = ordered.splice(from, 1);
    ordered.splice(to, 0, moved);
    setDraggedId("");
    try {
      await Promise.all(ordered.map((item, index) => updatePlayerMedia(item.id, { displayOrder: index })));
      await refreshLibrary();
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function removeAsset(media) {
    const accepted = window.confirm(
      "Permanently delete this Bunny video and every player placement that uses it? This cannot be undone.",
    );
    if (!accepted) return;
    try {
      const response = await fetch(`/api/admin/media/assets/${media.assetId}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not delete this video.");
      await refreshLibrary();
      setNotice("Video and all associated placements were permanently deleted.");
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function syncBunnyCollections() {
    if (!window.confirm("Move existing FootballBank videos into Bunny’s Match and Highlights collections?")) return;
    setCollectionsBusy(true);
    try {
      const response = await fetch("/api/admin/media/collections/sync", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not organize Bunny collections.");
      const conflictMessage = result.conflictingAssets
        ? ` ${result.conflictingAssets} video${result.conflictingAssets === 1 ? " has" : "s have"} conflicting categories and were skipped.`
        : "";
      const description = `${result.updated} video${result.updated === 1 ? "" : "s"} moved to the matching collection.${conflictMessage}`;
      setNotice(description);
      toast({ title: "Bunny collections organized", description });
    } catch (error) {
      setNotice(error.message);
      toast({
        title: "Could not organize collections",
        description: error.message || "Check Bunny API configuration and try again.",
        variant: "destructive",
      });
    } finally {
      setCollectionsBusy(false);
    }
  }

  async function sendShare(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    try {
      data.expiresAt = new Date(String(data.expiresAt)).toISOString();
      await sendMediaShare({ playerId: selected, ...data });
      form.reset();
      setNotice("Private access email sent.");
      toast({
        title: "Invite sent",
        description: "The private media access email was sent successfully.",
      });
    } catch (error) {
      setNotice(error.message);
      toast({
        title: "Could not send invite",
        description: error.message || "Check the profile and video publication status, then try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      await refreshLibrary();
    } catch (error) {
      setNotice("Invite sent, but the access list could not be refreshed.");
      toast({
        title: "Invite sent; refresh failed",
        description: error.message || "Reload the media portal to see the updated access list.",
        variant: "destructive",
      });
    }
  }

  async function revokeShare(shareId) {
    try {
      await revokeMediaShare(shareId);
      await refreshLibrary();
      setNotice("Recipient access revoked.");
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function clearShareHistory(shareIds = null) {
    const isClearAll = shareIds === null;
    const count = isClearAll ? library.shares.length : shareIds.length;
    if (!count) return;
    const confirmation = isClearAll
      ? `Clear all ${count} share history entries for this player? Active access links will be revoked.`
      : `Clear ${count} selected share history entr${count === 1 ? "y" : "ies"}? Active access links will be revoked.`;
    if (!window.confirm(confirmation)) return;

    setShareHistoryBusy(true);
    try {
      const result = await deleteMediaShareHistory(selected, shareIds);
      await refreshLibrary();
      setSelectedShareIds([]);
      const message = `${result.deletedCount} share history entr${result.deletedCount === 1 ? "y was" : "ies were"} cleared.`;
      setNotice(message);
      toast({ title: "Share history cleared", description: message });
    } catch (error) {
      setNotice(error.message);
      toast({
        title: "Could not clear share history",
        description: error.message || "Refresh the list and try again.",
        variant: "destructive",
      });
    } finally {
      setShareHistoryBusy(false);
    }
  }

  function toggleShareSelection(shareId) {
    setSelectedShareIds((current) => current.includes(shareId)
      ? current.filter((id) => id !== shareId)
      : [...current, shareId]);
  }

  const allSharesSelected = library.shares.length > 0
    && library.shares.every((share) => selectedShareIds.includes(share.id));

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      <section className="relative isolate overflow-hidden rounded-3xl bg-[#0b1220] p-6 text-white shadow-xl shadow-slate-900/10 sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-16 -top-28 -z-10 size-80 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-2 -top-16 -z-10 size-56 rounded-full border border-white/10" />
        <div className="grid gap-8 lg:grid-cols-[1fr_0.78fr] lg:items-end">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300 sm:text-xs">
              <Video className="size-3.5" />
              FootballBank · Media studio
            </span>
            <h2 className="mt-5 max-w-xl font-heading text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              A better way to share the game.
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-6 text-slate-300 sm:text-base">
              Curate player footage, organize match libraries, and give trusted recipients secure access.
            </p>
          </div>
          <div>
            <label htmlFor="media-player-select" className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
              Choose a player
            </label>
            <div className="relative">
              <Users className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <select
                id="media-player-select"
                className="h-14 w-full appearance-none rounded-2xl border border-white/15 bg-white/10 pl-11 pr-11 text-sm font-medium text-white shadow-lg transition hover:bg-white/[0.14] focus:!outline-none focus:ring-4 focus:ring-amber-300/20"
                value={selected}
                onChange={(event) => setSelected(event.target.value)}
              >
                <option value="" className="text-slate-900">Select a player to manage</option>
                {players.map((item) => (
                  <option key={item.id} value={item.id} className="text-slate-900">
                    {item.firstName} {item.lastName} — {item.position}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { label: "Videos", value: library.media.length },
                { label: "Playlists", value: library.playlists.length },
                { label: "Shares", value: library.shares.length },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-3 sm:px-4">
                  <p className="text-xl font-semibold text-white">{stat.value}</p>
                  <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400 sm:text-xs">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {player && (
          <div className="mt-8 flex flex-col gap-4 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              {player.headshotUrl ? (
                <img src={player.headshotUrl} alt="" className="size-11 rounded-xl object-cover ring-1 ring-white/15" />
              ) : (
                <div className="flex size-11 items-center justify-center rounded-xl bg-white/10 text-sm font-semibold text-amber-300">
                  {player.firstName?.[0]}{player.lastName?.[0]}
                </div>
              )}
              <div>
                <p className="font-semibold">{player.firstName} {player.lastName}</p>
                <p className="mt-0.5 text-xs text-slate-400">{player.position} · {player.currentClub || "Independent"}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {!player.publication?.consentConfirmedAt ? (
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-xs text-slate-200">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(event) => setConsent(event.target.checked)}
                    className="size-4 accent-amber-400 focus:ring-amber-300"
                  />
                  Consent confirmed
                </label>
              ) : (
                <span className="inline-flex items-center gap-2 text-xs text-emerald-300">
                  <ShieldCheck className="size-4" />
                  Consent recorded {new Date(player.publication.consentConfirmedAt).toLocaleDateString()}
                </span>
              )}
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-200">
                  <input
                    type="checkbox"
                    checked={contactConsent}
                    onChange={(event) => setContactConsent(event.target.checked)}
                    className="size-4 accent-amber-400 focus:ring-amber-300"
                  />
                  Consent to share email and phone
                </label>
                <button
                  type="button"
                  className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/15"
                  onClick={saveContactConsent}
                >
                  Save contact consent
                </button>
              </div>
              <button
                className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 ${player.publication?.isPublished ? "border border-white/15 bg-white/10 text-white hover:bg-white/15 focus-visible:ring-white/15" : "bg-amber-300 text-slate-950 shadow-lg shadow-amber-300/10 hover:bg-amber-200 focus-visible:ring-amber-300/25"}`}
                onClick={publishPlayer}
              >
                {player.publication?.isPublished ? "Unpublish profile" : "Publish profile"}
              </button>
            </div>
          </div>
        )}
      </section>

      {!player ? (
        <section className={`${sectionClass} flex flex-col items-center px-6 py-16 text-center sm:py-20`}>
          <div className="flex size-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Film className="size-7" />
          </div>
          <h3 className="mt-5 font-heading text-2xl font-semibold text-slate-900">Your media workspace starts here</h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
            Select a player above to upload footage, build playlists, and manage private recipient links.
          </p>
        </section>
      ) : (
        <>
          <nav
            aria-label="Player media sections"
            className="mb-5 grid grid-cols-2 gap-2 rounded-2xl border border-slate-200/80 bg-slate-100/80 p-2 sm:grid-cols-5"
          >
            {mediaPortalTabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                aria-pressed={activeTab === id}
                onClick={() => setActiveTab(id)}
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                  activeTab === id
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                    : "text-slate-500 hover:bg-white/70 hover:text-slate-800"
                }`}
              >
                <Icon className="size-4 shrink-0" />
                <span>{label}</span>
                {id === "library" && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${activeTab === id ? "bg-blue-50 text-blue-700" : "bg-slate-200 text-slate-600"}`}>
                    {library.media.length}
                  </span>
                )}
                {id === "shares" && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${activeTab === id ? "bg-blue-50 text-blue-700" : "bg-slate-200 text-slate-600"}`}>
                    {library.shares.length}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <section hidden={activeTab !== "profile"}>
            <MediaPlayerProfileForm key={player.id} player={player} onSaved={refreshPlayers} />
          </section>

          <section id="media-tab-upload" hidden={activeTab !== "upload"} className={sectionClass}>
            <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <UploadCloud className="size-5" />
                </div>
                <div>
                  <h3 className="font-heading text-xl font-semibold text-slate-900 sm:text-2xl">Add new footage</h3>
                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    Upload MP4 or MOV videos up to 20 GB. Your video stays private until it’s ready to publish.
                  </p>
                </div>
              </div>
            </div>
            <form
              className="space-y-6 p-5 sm:p-7"
              onSubmit={(event) => {
                event.preventDefault();
                createUpload(event.currentTarget);
              }}
            >
              <div className="grid gap-5 md:grid-cols-2">
                <label>
                  <span className={labelClass}>Video title <span className="text-rose-500">*</span></span>
                  <input required name="title" maxLength={180} placeholder="e.g. Season highlights vs. City FC" className={fieldClass} />
                </label>
                <label>
                  <span className={labelClass}>Footage type <span className="text-rose-500">*</span></span>
                  <select required name="category" className={`${fieldClass} appearance-none`}>
                    <option value="FULL_MATCH">Full match</option>
                    <option value="HIGHLIGHT">Highlight</option>
                  </select>
                </label>
                <label>
                  <span className={labelClass}>Season</span>
                  <input name="season" maxLength={80} placeholder="e.g. 2025 / 2026" className={fieldClass} />
                </label>
                <label>
                  <span className={labelClass}>Competition</span>
                  <input name="competition" maxLength={120} placeholder="League, cup, or tournament" className={fieldClass} />
                </label>
                <label>
                  <span className={labelClass}>Player’s club</span>
                  <input name="playerClub" maxLength={120} placeholder="Club name" className={fieldClass} />
                </label>
                <label>
                  <span className={labelClass}>Opponent</span>
                  <input name="opponent" maxLength={120} placeholder="Opposing club" className={fieldClass} />
                </label>
                <label>
                  <span className={labelClass}>Match date</span>
                  <input name="matchDate" type="date" className={fieldClass} />
                </label>
                <label>
                  <span className={labelClass}>Description</span>
                  <textarea
                    name="description"
                    maxLength={2000}
                    placeholder="Add context about this performance..."
                    className="min-h-12 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 hover:border-slate-300 focus:!outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                    rows={1}
                  />
                </label>
              </div>

              <label className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-5 py-8 text-center transition hover:border-blue-400 hover:bg-blue-50/50 sm:py-10">
                <input
                  required
                  name="video"
                  type="file"
                  accept=".mp4,.mov,video/mp4,video/quicktime"
                  className="sr-only"
                  onChange={(event) => setSelectedVideo(event.target.files?.[0] || null)}
                />
                <span className="flex size-12 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm ring-1 ring-slate-200 transition group-hover:scale-105">
                  <UploadCloud className="size-5" />
                </span>
                {selectedVideo ? (
                  <>
                    <span className="mt-4 max-w-full break-all text-sm font-semibold text-slate-900">{selectedVideo.name}</span>
                    <span className="mt-1 text-xs font-medium text-blue-700">
                      {formatFileSize(selectedVideo.size)} · Selected — click to change
                    </span>
                  </>
                ) : (
                  <>
                    <span className="mt-4 text-sm font-semibold text-slate-800">Choose a video file to upload</span>
                    <span className="mt-1 text-xs text-slate-500">MP4 or MOV · up to 20 GB · max 1080p</span>
                  </>
                )}
              </label>

              {busy && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-blue-900">
                    <span>{uploadPaused ? "Upload paused" : uploadRef.current ? "Uploading video" : "Preparing upload"}</span>
                    <span>{uploadProgress ?? 0}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-blue-100">
                    <div className="h-full rounded-full bg-blue-600 transition-[width]" style={{ width: `${uploadProgress ?? 0}%` }} />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-slate-500">Resumable upload · processed securely with Bunny Stream</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  {busy && (
                    <button
                      type="button"
                      disabled={!uploadReady}
                      onClick={toggleUploadPause}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {uploadPaused ? <Play className="size-4" /> : <Pause className="size-4" />}
                      {uploadPaused ? "Resume upload" : "Pause upload"}
                    </button>
                  )}
                  <button
                    disabled={busy}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#0b1220] px-5 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <UploadCloud className="size-4" />
                    {busy ? `${uploadPaused ? "Paused" : "Uploading"} ${uploadProgress ?? 0}%` : "Upload footage"}
                  </button>
                </div>
              </div>
            </form>
          </section>

          <section id="media-tab-library" hidden={activeTab !== "library"} className={sectionClass}>
            <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <ListVideo className="size-5" />
                </div>
                <div>
                  <h3 className="font-heading text-xl font-semibold text-slate-900 sm:text-2xl">Media library</h3>
                  <p className="mt-1 text-sm text-slate-500">Feature, organize, and publish player footage.</p>
                </div>
              </div>
              <button
                type="button"
                disabled={collectionsBusy}
                onClick={syncBunnyCollections}
                className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 disabled:cursor-wait disabled:opacity-60 sm:self-auto"
              >
                <FolderSync className="size-4" />
                {collectionsBusy ? "Organizing..." : "Organize Bunny collections"}
              </button>
              <form
                className="flex w-full gap-2 sm:w-auto"
                onSubmit={(event) => {
                  event.preventDefault();
                  createPlaylist(event.currentTarget);
                }}
              >
                <label className="sr-only" htmlFor="new-playlist-title">Playlist title</label>
                <input
                  id="new-playlist-title"
                  required
                  name="title"
                  maxLength={120}
                  placeholder="Name a playlist..."
                  className={`${fieldClass} min-w-0 sm:w-56`}
                />
                <button
                  aria-label="Create playlist"
                  title="Create playlist"
                  className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
                >
                  <Plus className="size-4" />
                  <span className="hidden sm:inline">Playlist</span>
                </button>
              </form>
            </div>

            <div className="space-y-3 p-4 sm:p-6">
              {[...library.media].sort((a, b) => a.displayOrder - b.displayOrder).map((media) => (
                <article
                  key={media.id}
                  draggable
                  onDragStart={() => setDraggedId(media.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => reorderMedia(media.id)}
                  className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-md sm:p-5"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 hidden cursor-grab rounded-lg p-1 text-slate-300 group-hover:text-slate-500 sm:block" title="Drag to reorder">
                      <GripVertical className="size-5" />
                    </div>
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                      <Film className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="truncate font-semibold text-slate-900">{media.title}</h4>
                        {media.isFeatured && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">Featured</span>}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                          {media.category === "FULL_MATCH" ? "Full match" : "Highlight"}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium ${media.status === "READY" ? "bg-emerald-50 text-emerald-700" : media.status === "FAILED" ? "bg-rose-50 text-rose-700" : "bg-blue-50 text-blue-700"}`}>
                          {media.status === "READY" ? <Check className="size-3" /> : media.status === "FAILED" ? <CircleAlert className="size-3" /> : <Clock3 className="size-3" />}
                          {readableStatus(media.status)}
                        </span>
                        {media.isPublished && <span className="rounded-full bg-green-50 px-2.5 py-1 font-medium text-green-700">Published</span>}
                      </div>
                    </div>
                    <button
                      aria-label={`Delete ${media.title}`}
                      title="Permanently delete video"
                      className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-100"
                      onClick={() => removeAsset(media)}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={media.isFeatured}
                        onChange={(event) => changeMedia(media.id, { isFeatured: event.target.checked })}
                        className="size-4 rounded accent-amber-500 focus:ring-amber-300"
                      />
                      Feature video
                    </label>
                    <label className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium ${media.status === "READY" ? "cursor-pointer bg-slate-50 text-slate-700" : "cursor-not-allowed bg-slate-50 text-slate-400"}`}>
                      <input
                        type="checkbox"
                        checked={media.isPublished}
                        disabled={media.status !== "READY"}
                        onChange={(event) => changeMedia(media.id, { isPublished: event.target.checked })}
                        className="size-4 rounded accent-blue-600 focus:ring-blue-300"
                      />
                      Publish
                    </label>
                    <details className="ml-auto w-full sm:w-auto">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 sm:justify-start">
                        Edit details <ChevronDown className="size-3.5" />
                      </summary>
                      <form
                        className="mt-4 grid gap-4 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          const values = Object.fromEntries(new FormData(event.currentTarget));
                          changeMedia(media.id, { ...values, matchDate: values.matchDate || null });
                        }}
                      >
                        <label className="sm:col-span-2">
                          <span className={labelClass}>Video title</span>
                          <input required name="title" defaultValue={media.title} maxLength={180} className={fieldClass} />
                        </label>
                        <label><span className={labelClass}>Season</span><input name="season" defaultValue={media.season} maxLength={80} className={fieldClass} /></label>
                        <label><span className={labelClass}>Competition</span><input name="competition" defaultValue={media.competition} maxLength={120} className={fieldClass} /></label>
                        <label><span className={labelClass}>Player’s club</span><input name="playerClub" defaultValue={media.playerClub} maxLength={120} className={fieldClass} /></label>
                        <label><span className={labelClass}>Opponent</span><input name="opponent" defaultValue={media.opponent} maxLength={120} className={fieldClass} /></label>
                        <label><span className={labelClass}>Match date</span><input name="matchDate" type="date" defaultValue={media.matchDate ? new Date(media.matchDate).toISOString().slice(0, 10) : ""} className={fieldClass} /></label>
                        <label className="sm:col-span-2">
                          <span className={labelClass}>Description</span>
                          <textarea name="description" defaultValue={media.description} maxLength={2000} rows={3} className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:!outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500" />
                        </label>
                        <button className="h-11 rounded-xl bg-[#0b1220] px-4 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 sm:col-span-2 sm:justify-self-end">
                          Save changes
                        </button>
                      </form>
                    </details>
                  </div>

                  {library.playlists.length > 0 && (
                    <fieldset className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                      <legend className="sr-only">Add video to playlists</legend>
                      {library.playlists.map((playlist) => (
                        <label key={playlist.id} className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 transition hover:border-violet-200 hover:bg-violet-50/50">
                          <input
                            type="checkbox"
                            checked={media.playlistIds.includes(playlist.id)}
                            onChange={(event) => updatePlaylistMembership(media, playlist.id, event.target.checked)}
                            className="size-3.5 rounded accent-violet-600"
                          />
                          {playlist.title}
                        </label>
                      ))}
                    </fieldset>
                  )}
                </article>
              ))}
              {library.media.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-5 py-12 text-center">
                  <Film className="mx-auto size-7 text-slate-300" />
                  <p className="mt-3 text-sm font-semibold text-slate-700">No videos in this library yet</p>
                  <p className="mt-1 text-xs text-slate-500">Upload your first match or highlight above.</p>
                </div>
              )}
            </div>
          </section>

          <section id="media-tab-invite" hidden={activeTab !== "invite"} className={sectionClass}>
            <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Mail className="size-5" />
                </div>
                <div>
                  <h3 className="font-heading text-xl font-semibold text-slate-900 sm:text-2xl">Invite a recipient</h3>
                  <p className="mt-1 text-sm text-slate-500">Send a unique, expiring link to this player’s published library.</p>
                </div>
              </div>
            </div>
            <form onSubmit={sendShare} className="space-y-5 p-5 sm:p-7">
              <div className="grid gap-5 md:grid-cols-2">
                <label>
                  <span className={labelClass}>Recipient name <span className="text-rose-500">*</span></span>
                  <input required name="recipientName" placeholder="Full name" className={fieldClass} />
                </label>
                <label>
                  <span className={labelClass}>Work email <span className="text-rose-500">*</span></span>
                  <input required name="recipientEmail" type="email" placeholder="name@organization.com" className={fieldClass} />
                </label>
                <label>
                  <span className={labelClass}>Organization</span>
                  <input name="organization" placeholder="Club, agency, or team" className={fieldClass} />
                </label>
                <label>
                  <span className={labelClass}>Access expires <span className="text-rose-500">*</span></span>
                  <input required name="expiresAt" type="datetime-local" className={fieldClass} />
                </label>
                <label className="md:col-span-2">
                  <span className={labelClass}>Personal message <span className="font-normal normal-case tracking-normal text-slate-400">Optional</span></span>
                  <textarea
                    name="customMessage"
                    maxLength={2000}
                    rows={3}
                    placeholder="Add a short note to include with the access email..."
                    className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 hover:border-slate-300 focus:!outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                  />
                </label>
              </div>
              <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                  <ShieldCheck className="size-4 text-emerald-600" />
                  Private link · recipient-specific · expires automatically
                </span>
                <button className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/10 transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100">
                  <Mail className="size-4" />
                  Send secure invite
                </button>
              </div>
            </form>
          </section>

          <section id="media-tab-shares" hidden={activeTab !== "shares"} className={sectionClass}>
            <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Users className="size-5" />
                </div>
                <div>
                  <h3 className="font-heading text-xl font-semibold text-slate-900 sm:text-2xl">Recipient access</h3>
                  <p className="mt-1 text-sm text-slate-500">Review invitations and opens. Clearing hides entries and revokes active links; audit records are retained.</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {library.shares.length > 0 && (
                  <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-600">
                    <input
                      type="checkbox"
                      checked={allSharesSelected}
                      disabled={shareHistoryBusy}
                      onChange={() => setSelectedShareIds(allSharesSelected ? [] : library.shares.map((share) => share.id))}
                      className="size-4 rounded accent-blue-600"
                    />
                    Select all
                  </label>
                )}
                {selectedShareIds.length > 0 && (
                  <button
                    type="button"
                    disabled={shareHistoryBusy}
                    onClick={() => clearShareHistory(selectedShareIds)}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-rose-200 px-3 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60"
                  >
                    <Trash2 className="size-3.5" />
                    Clear selected ({selectedShareIds.length})
                  </button>
                )}
                {library.shares.length > 0 && (
                  <button
                    type="button"
                    disabled={shareHistoryBusy}
                    onClick={() => clearShareHistory()}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-rose-600 px-3 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-wait disabled:opacity-60"
                  >
                    <Trash2 className="size-3.5" />
                    Clear all
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-3 p-4 sm:p-6">
              {library.shares.map((share) => (
                <article key={share.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 transition hover:bg-slate-50/70 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div className="flex min-w-0 items-start gap-3">
                    <input
                      type="checkbox"
                      aria-label={`Select ${share.recipientName} share history`}
                      checked={selectedShareIds.includes(share.id)}
                      disabled={shareHistoryBusy}
                      onChange={() => toggleShareSelection(share.id)}
                      className="mt-3 size-4 shrink-0 rounded accent-blue-600"
                    />
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                      <Mail className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{share.recipientName}</p>
                      <p className="mt-0.5 truncate text-sm text-slate-500">{share.recipientEmail}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        {share.organization && <>{share.organization} <span className="mx-1 text-slate-300">·</span></>}
                        Expires {new Date(share.expiresAt).toLocaleString()}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        First opened: {share.firstOpenedAt ? new Date(share.firstOpenedAt).toLocaleString() : "Not opened"}
                        {" · "}
                        Last opened: {share.lastOpenedAt ? new Date(share.lastOpenedAt).toLocaleString() : "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                    <span className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] ${share.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : share.status === "EXPIRED" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                      {share.status.toLowerCase()}
                    </span>
                    {share.status === "ACTIVE" && (
                      <button
                        className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-100"
                        onClick={() => revokeShare(share.id)}
                      >
                        Revoke access
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={shareHistoryBusy}
                      aria-label={`Delete ${share.recipientName} from share history`}
                      title="Remove from share history"
                      className="inline-flex size-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-100 disabled:cursor-wait disabled:opacity-50"
                      onClick={() => clearShareHistory([share.id])}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </article>
              ))}
              {library.shares.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-5 py-10 text-center">
                  <Mail className="mx-auto size-6 text-slate-300" />
                  <p className="mt-3 text-sm font-semibold text-slate-700">No invitations sent</p>
                  <p className="mt-1 text-xs text-slate-500">Recipient links you create will appear here.</p>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {notice && (
        <div role="status" className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-sm ${notice.toLowerCase().includes("fail") || notice.toLowerCase().includes("could not") || notice.toLowerCase().includes("must") ? "border-rose-200 bg-rose-50 text-rose-800" : "border-blue-100 bg-blue-50 text-blue-900"}`}>
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          <p>{notice}</p>
        </div>
      )}
    </div>
  );
}
