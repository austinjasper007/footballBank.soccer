"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PortalModal from "@/components/PortalModal";

const PAGE_SIZE = 9;
const fallbackViewerSessions = new Map();
const NAV_ITEMS = [
  { id: "media", label: "Media" },
  { id: "profile", label: "Profile" },
  { id: "documentation", label: "Documentation" },
  { id: "playlists", label: "Playlists" },
];

function VideoThumbnail({ item, selected, onClick }) {
  const [thumbnailFailed, setThumbnailFailed] = useState(false);

  return (
    <button
      type="button"
      className={`video-tile${selected ? " is-selected" : ""}`}
      onClick={onClick}
      aria-pressed={selected}
      aria-label={`Play ${item.title}`}
    >
      <span className="tile-image">
        {item.thumbnailUrl && !thumbnailFailed ? (
          <img
            src={item.thumbnailUrl}
            alt=""
            loading="lazy"
            onError={() => setThumbnailFailed(true)}
          />
        ) : (
          <span className="tile-fallback" aria-hidden="true">
            <span className="tile-fallback-mark">FB</span>
          </span>
        )}
        <span className="tile-play" aria-hidden="true">▶</span>
        <span className="tile-category">
          {item.category === "FULL_MATCH" ? "Match" : "Highlight"}
        </span>
      </span>
      <span className="tile-caption">
        <strong>{item.title}</strong>
        <span>{[item.season, item.competition].filter(Boolean).join(" · ") || "Player footage"}</span>
      </span>
    </button>
  );
}

function Pagination({ page, pageCount, onPageChange }) {
  if (pageCount < 2) return null;
  return (
    <nav className="pagination" aria-label="Gallery pages">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
      >
        Previous
      </button>
      <span>Page {page} of {pageCount}</span>
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page === pageCount}
      >
        Next
      </button>
    </nav>
  );
}

function getViewerSessionId(token) {
  const storageKey = `footballbank-media-session:${token}`;
  let sessionId;

  try {
    sessionId = sessionStorage.getItem(storageKey);
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem(storageKey, sessionId);
    }
  } catch (error) {
    console.warn("Browser session storage is unavailable for media activity tracking.", error);
    sessionId = fallbackViewerSessions.get(storageKey);
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      fallbackViewerSessions.set(storageKey, sessionId);
    }
  }

  return sessionId;
}

function reportPortalActivity(token, eventType, sessionId, mediaId = "") {
  if (!sessionId) return;
  async function sendActivity(attempt = 0) {
    const response = await fetch(`/api/p/${encodeURIComponent(token)}/activity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType, sessionId, ...(mediaId ? { mediaId } : {}) }),
      cache: "no-store",
      keepalive: true,
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      if (response.status === 503 && attempt === 0) return sendActivity(1);
      throw new Error(result.error || "Could not record media portal activity.");
    }
  }

  sendActivity().catch((error) => {
    console.error("Could not record media portal activity.", error);
  });
}

function VideoGallery({
  items,
  token,
  onVideoPlay,
  showInterestCta = false,
  contactHref = "",
  photos = [],
  initialMediaType = "videos",
  initialCollection = "ALL",
  initialPage = 1,
  initialVideoId = "",
  initialPhotoIndex = null,
  allowVideoDownload = false,
}) {
  const [mediaType, setMediaType] = useState(initialMediaType);
  const [collection, setCollection] = useState(initialCollection);
  const [page, setPage] = useState(initialPage);
  const [selectedVideoId, setSelectedVideoId] = useState(initialVideoId);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(initialPhotoIndex);
  const [playbackUrl, setPlaybackUrl] = useState("");
  const [playbackError, setPlaybackError] = useState("");
  const [playbackLoading, setPlaybackLoading] = useState(false);
  const filteredVideos = collection === "ALL"
    ? items
    : items.filter((item) => item.category === collection);
  const pageItems = mediaType === "videos" ? filteredVideos : photos;
  const pageCount = Math.max(1, Math.ceil(pageItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleItems = pageItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const selectedVideo = items.find((item) => item.id === selectedVideoId) || null;
  const selectedPhoto = selectedPhotoIndex === null ? null : photos[selectedPhotoIndex];

  useEffect(() => {
    if (!selectedVideo) {
      setPlaybackUrl("");
      setPlaybackError("");
      setPlaybackLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    setPlaybackUrl("");
    setPlaybackError("");
    setPlaybackLoading(true);

    async function loadPlayback() {
      try {
        const response = await fetch(
          `/api/p/${encodeURIComponent(token)}/media/${encodeURIComponent(selectedVideo.id)}/playback`,
          { cache: "no-store", signal: controller.signal },
        );
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Secure video playback could not be authorized.");
        }
        if (typeof result.url !== "string" || !result.url) {
          throw new Error("The playback service returned an invalid response.");
        }
        setPlaybackUrl(result.url);
      } catch (error) {
        if (!controller.signal.aborted) {
          setPlaybackError(error instanceof Error
            ? error.message
            : "Secure video playback could not be authorized.");
        }
      } finally {
        if (!controller.signal.aborted) setPlaybackLoading(false);
      }
    }

    loadPlayback();
    return () => controller.abort();
  }, [selectedVideo, token]);

  function closeViewer() {
    setSelectedVideoId("");
    setSelectedPhotoIndex(null);
  }

  function changeMediaType(nextType) {
    setMediaType(nextType);
    setPage(1);
    closeViewer();
  }

  function changeCollection(nextCollection) {
    setCollection(nextCollection);
    setPage(1);
    closeViewer();
  }

  return (
    <section className="media-panel" aria-label="Player media gallery">
      <div className="media-toolbar">
        <div>
          <p className="eyebrow">Private media room</p>
          <h2>Player media</h2>
          <p className="panel-description">Browse match footage, highlights, and player photos.</p>
        </div>
        <div className="media-toolbar-actions">
          {showInterestCta && (
            <a
              className="player-interest-link"
              href={contactHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              Interested in this player? Contact our team
            </a>
          )}
          <span className="media-total">{items.length + photos.length} items</span>
        </div>
      </div>

      <div className="media-controls">
        <div className="segmented-control" role="group" aria-label="Media type">
          <button
            type="button"
            onClick={() => changeMediaType("videos")}
            aria-pressed={mediaType === "videos"}
          >
            Videos <span>{items.length}</span>
          </button>
          <button
            type="button"
            onClick={() => changeMediaType("photos")}
            aria-pressed={mediaType === "photos"}
          >
            Photos <span>{photos.length}</span>
          </button>
        </div>
        {mediaType === "videos" && (
          <div className="collection-filter" role="group" aria-label="Video collection">
            {[
              { id: "ALL", label: "All videos" },
              { id: "FULL_MATCH", label: "Match" },
              { id: "HIGHLIGHT", label: "Highlights" },
            ].map((filter) => (
              <button
                type="button"
                key={filter.id}
                onClick={() => changeCollection(filter.id)}
                aria-pressed={collection === filter.id}
              >
                {filter.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {mediaType === "videos" && selectedVideo && (
        <PortalModal
          type="video"
          title={selectedVideo.title}
          src={playbackUrl}
          error={playbackError}
          loading={playbackLoading}
          onVideoPlay={() => onVideoPlay?.(selectedVideo.id)}
          description={[selectedVideo.season, selectedVideo.competition, selectedVideo.opponent]
            .filter(Boolean)
            .join(" · ")}
          downloadHref={allowVideoDownload
            ? `/api/p/${encodeURIComponent(token)}/media/${encodeURIComponent(selectedVideo.id)}/download`
            : ""}
          onClose={closeViewer}
        />
      )}

      {mediaType === "photos" && selectedPhoto && (
        <PortalModal
          type="photo"
          title={`Player photo ${selectedPhotoIndex + 1}`}
          src={selectedPhoto}
          onClose={closeViewer}
        />
      )}

      {pageItems.length ? (
        <>
          <div className="gallery-grid">
            {mediaType === "videos"
              ? visibleItems.map((item) => (
                <VideoThumbnail
                  key={item.id}
                  item={item}
                  selected={selectedVideo?.id === item.id}
                  onClick={() => {
                    setSelectedPhotoIndex(null);
                    setSelectedVideoId(item.id);
                  }}
                />
              ))
              : visibleItems.map((photo, index) => (
                <button
                  type="button"
                  key={`${photo}-${index}`}
                  className={`photo-tile${selectedPhoto === photo ? " is-selected" : ""}`}
                  onClick={() => {
                    setSelectedVideoId("");
                    setSelectedPhotoIndex(index + (currentPage - 1) * PAGE_SIZE);
                  }}
                  aria-label={`View player photo ${index + 1 + (currentPage - 1) * PAGE_SIZE}`}
                  aria-pressed={selectedPhoto === photo}
                >
                  <img src={photo} alt="" loading="lazy" />
                </button>
              ))}
          </div>
          <Pagination
            page={currentPage}
            pageCount={pageCount}
            onPageChange={(nextPage) => {
              setPage(nextPage);
              closeViewer();
            }}
          />
        </>
      ) : (
        <div className="empty-state">
          <span className="empty-state-mark">{mediaType === "videos" ? "▶" : "FB"}</span>
          <h3>{mediaType === "videos" ? "No footage in this collection yet" : "No player photos available"}</h3>
          <p>{mediaType === "videos" ? "Published matches and highlights will appear here." : "Player gallery images will appear here when available."}</p>
        </div>
      )}
    </section>
  );
}

function formatDocumentSize(value) {
  if (!Number.isFinite(value) || value <= 0) return "Size unavailable";
  if (value < 1024) return `${value} B`;
  const units = ["KB", "MB", "GB"];
  let size = value / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size < 10 ? 1 : 0)} ${units[unitIndex]}`;
}

function DocumentationTab({ token, playerName }) {
  const [documents, setDocuments] = useState([]);
  const [currentFolder, setCurrentFolder] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function loadDocuments() {
      try {
        const response = await fetch(`/api/p/${encodeURIComponent(token)}/documents`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Player documents could not be loaded.");
        if (!Array.isArray(result.documents)) throw new Error("The document service returned an invalid response.");
        setDocuments(result.documents);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : "Player documents could not be loaded.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadDocuments();
    return () => controller.abort();
  }, [token]);

  const folderNames = new Set();
  const currentFiles = [];
  const prefix = currentFolder ? `${currentFolder}/` : "";
  for (const document of documents) {
    const folderPath = document.folderPath || "";
    if (folderPath === currentFolder) {
      currentFiles.push(document);
      continue;
    }
    if (!folderPath.startsWith(prefix)) continue;
    const remainder = folderPath.slice(prefix.length);
    if (remainder) folderNames.add(remainder.split("/")[0]);
  }

  const folderParts = currentFolder ? currentFolder.split("/") : [];
  const archiveHref = `/api/p/${encodeURIComponent(token)}/documents/archive`;

  return (
    <section className="documentation-panel" aria-label="Player documentation">
      <header className="documentation-header">
        <div>
          <p className="eyebrow">Private player files</p>
          <h2>Documentation</h2>
          <p>Shared documents for {playerName || "this player"}.</p>
        </div>
        <a
          className={`documentation-archive${documents.length ? "" : " is-disabled"}`}
          href={documents.length ? archiveHref : undefined}
          aria-disabled={!documents.length}
          rel="noreferrer"
          referrerPolicy="no-referrer"
        >
          Download all as ZIP
        </a>
      </header>

      <nav className="documentation-breadcrumbs" aria-label="Document folders">
        <button type="button" onClick={() => setCurrentFolder("")}>Root</button>
        {folderParts.map((part, index) => {
          const path = folderParts.slice(0, index + 1).join("/");
          return (
            <span key={path}>
              <span aria-hidden="true">/</span>
              <button type="button" onClick={() => setCurrentFolder(path)}>{part}</button>
            </span>
          );
        })}
      </nav>

      {loading ? (
        <div className="documentation-empty" role="status">Loading shared documents…</div>
      ) : error ? (
        <div className="documentation-empty" role="alert">{error}</div>
      ) : folderNames.size || currentFiles.length ? (
        <div className="documentation-list">
          {[...folderNames].sort((a, b) => a.localeCompare(b)).map((folderName) => {
            const path = [currentFolder, folderName].filter(Boolean).join("/");
            return (
              <button
                type="button"
                className="documentation-entry documentation-folder"
                key={path}
                onClick={() => setCurrentFolder(path)}
              >
                <span className="documentation-entry-icon" aria-hidden="true">DIR</span>
                <span className="documentation-entry-details">
                  <strong>{folderName}</strong>
                  <small>Folder</small>
                </span>
                <span className="documentation-entry-action" aria-hidden="true">Open</span>
              </button>
            );
          })}
          {currentFiles.map((document) => (
            <a
              className="documentation-entry documentation-file"
              href={`/api/p/${encodeURIComponent(token)}/documents/${encodeURIComponent(document.id)}`}
              key={document.id}
              rel="noreferrer"
              referrerPolicy="no-referrer"
            >
              <span className="documentation-entry-icon" aria-hidden="true">FILE</span>
              <span className="documentation-entry-details">
                <strong>{document.fileName}</strong>
                <small>{document.mimeType} · {formatDocumentSize(document.fileSize)}</small>
              </span>
              <span className="documentation-entry-action" aria-hidden="true">Download</span>
            </a>
          ))}
        </div>
      ) : (
        <div className="documentation-empty">
          <span className="empty-state-mark" aria-hidden="true">FILE</span>
          <h3>{documents.length ? "This folder is empty" : "No documents have been shared"}</h3>
          <p>{documents.length ? "Choose another folder or return to the root folder." : "Documents shared with you will appear here."}</p>
        </div>
      )}
    </section>
  );
}

function profileValue(value) {
  if (Array.isArray(value)) return value.map(profileValue).filter(Boolean).join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  return "";
}

function profileRows(section, fields) {
  if (!section || typeof section !== "object") return [];
  return fields
    .map(([label, key]) => [label, profileValue(section[key])])
    .filter(([, value]) => value);
}

function ProfileSection({ title, rows, children, className = "" }) {
  if (!children && rows.length === 0) return null;
  return (
    <section className={`cv-section ${className}`}>
      <p className="cv-section-label">{title}</p>
      {rows.length > 0 && (
        <dl className="cv-detail-list cv-profile-rows">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {children}
    </section>
  );
}

function ProfilePhotoGroup({ title, photos }) {
  const items = (Array.isArray(photos) ? photos : [photos]).filter(Boolean);
  if (!items.length) return null;
  return (
    <div className="cv-photo-group">
      <h3>{title}</h3>
      <div className="cv-photo-grid">
        {items.map((url, index) => (
          <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer">
            <img src={url} alt={`${title} ${index + 1}`} loading="lazy" />
          </a>
        ))}
      </div>
    </div>
  );
}

function ProfileTab({ player }) {
  const profile = player.portalProfile || {};
  const personal = profile.personal || {};
  const playerDetails = profile.player || {};
  const club = profile.currentClub || {};
  const career = Array.isArray(profile.footballHistory) ? profile.footballHistory : [];
  const trials = Array.isArray(profile.trials) ? profile.trials : [];
  const photos = profile.photos || {};
  const hasProfilePhotos = [
    photos.professionalHeadshot,
    photos.fullBody,
    photos.action,
    photos.currentClubKit,
    photos.recentMatchesTraining,
    player.imageUrl,
  ].some((value) => Array.isArray(value) ? value.some(Boolean) : Boolean(value));
  const name = personal.fullName || [player.firstName, player.lastName].filter(Boolean).join(" ");
  const portrait = photos.professionalHeadshot || player.headshotUrl;

  return (
    <div className="cv-page">
      <header className="cv-heading">
        <div>
          <h2>{name}</h2>
          <p>{[playerDetails.mainPosition || player.position, personal.nationality || player.country].filter(Boolean).join(" · ")}</p>
        </div>
        <span className="cv-status">Player profile</span>
      </header>

      <div className="cv-layout">
        <aside className="cv-sidebar">
          {portrait && <img className="cv-portrait" src={portrait} alt={`${name} portrait`} />}
          <section className="cv-sidebar-section">
            <p className="cv-section-label">Personal information</p>
            <dl className="cv-detail-list">
              {profileRows(personal, [
                ["Date of birth", "dateOfBirth"],
                ["Place of birth", "placeOfBirth"],
                ["Nationality", "nationality"],
                ["Passport", "passportValid"],
                ["Passport expiry", "passportExpiry"],
                ["Current city", "currentCityCountry"],
              ]).map(([label, value]) => (
                <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
              ))}
            </dl>
          </section>
          <section className="cv-sidebar-section">
            <p className="cv-section-label">Player information</p>
            <dl className="cv-detail-list">
              {profileRows(playerDetails, [
                ["Height", "heightCm"],
                ["Weight", "weightKg"],
                ["Preferred foot", "preferredFoot"],
                ["Main position", "mainPosition"],
                ["Other positions", "otherPositions"],
                ["Current jersey number", "currentJerseyNumber"],
                ["Previous jersey numbers", "previousJerseyNumbers"],
              ]).map(([label, value]) => (
                <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
              ))}
            </dl>
          </section>
        </aside>

        <div className="cv-main">
          <ProfileSection
            title="Current club and contract"
            rows={profileRows(club, [
              ["Official club", "officialName"],
              ["Country", "country"],
              ["League / division", "league"],
              ["Date joined", "joinedDate"],
              ["Registered with club / federation", "registered"],
              ["Player status", "contractType"],
              ["Written contract", "writtenContract"],
              ["Contract start", "contractStartDate"],
              ["Contract expiry", "contractExpiryDate"],
              ["Player has contract copy", "hasContractCopy"],
              ["Club extension option", "extensionOption"],
              ["Release clause", "releaseClause"],
              ["Transfer / loan / release agreement", "transferAgreement"],
              ["Outstanding money", "moneyOwed"],
            ])}
          />

          <ProfileSection
            title="Current season"
            rows={profileRows(profile.season, [
              ["Team league matches", "teamMatches"],
              ["Matchday squads", "matchdaySquad"],
              ["Matches played", "matchesPlayed"],
              ["Starts", "starts"],
              ["Substitute appearances", "substituteAppearances"],
              ["Complete 90-minute matches", "completeMatches"],
              ["Total minutes", "totalMinutes"],
              ["Goals", "goals"],
              ["Assists", "assists"],
              ["Yellow cards", "yellowCards"],
              ["Red cards", "redCards"],
              ["Clean sheets", "cleanSheets"],
            ])}
          />

          <ProfileSection
            title="Official playing statistics"
            rows={profileRows(profile.officialStats, [
              ["Pass completion", "passCompletion"],
              ["Tackles", "tackles"],
              ["Tackles won", "tacklesWon"],
              ["Interceptions", "interceptions"],
              ["Clearances", "clearances"],
              ["Blocks", "blocks"],
              ["Ball recoveries", "ballRecoveries"],
              ["Progressive passes", "progressivePasses"],
              ["Long passes", "longPasses"],
              ["Long-pass accuracy", "longPassAccuracy"],
              ["Chances created", "chancesCreated"],
              ["Key passes", "keyPasses"],
              ["Other verified statistics", "other"],
            ])}
          />

          <ProfileSection
            title="Injury and current fitness"
            rows={profileRows(profile.injury, [
              ["Injury", "injury"],
              ["Injury date", "injuryDate"],
              ["Returned to full team training", "returnToFullTraining"],
              ["Medical clearance date", "medicallyClearedDate"],
              ["First competitive match after injury", "firstCompetitiveMatchAfter"],
              ["Training without restrictions", "trainingWithoutRestrictions"],
              ["Playing without restrictions", "playingWithoutRestrictions"],
              ["Receiving current treatment", "currentTreatment"],
              ["Medical report / clearance", "medicalReportAvailable"],
            ])}
          />

          <ProfileSection title="Football history" rows={[]}>
            {career.length ? (
              <div className="cv-repeat-list">
                {career.map((entry, index) => (
                  <article className="cv-repeat-entry" key={`${entry.academyOrClub || "club"}-${index}`}>
                    <h3>{entry.academyOrClub || "Club / academy"}</h3>
                    <dl className="cv-detail-list">
                      {profileRows(entry, [
                        ["Country", "country"],
                        ["Joined", "joined"],
                        ["Left", "left"],
                        ["Age joined", "ageJoined"],
                        ["Age left", "ageLeft"],
                        ["Level", "level"],
                        ["Position", "position"],
                        ["League / competition", "leagueCompetition"],
                        ["Appearances", "appearances"],
                        ["Goals / assists", "goalsAssists"],
                        ["Achievements", "achievements"],
                        ["Reason for leaving", "reasonLeft"],
                        ["Federation registered", "federationRegistered"],
                      ]).map(([label, value]) => (
                        <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
                      ))}
                    </dl>
                  </article>
                ))}
              </div>
            ) : <p className="cv-muted">No football history has been added.</p>}
          </ProfileSection>

          <ProfileSection
            title="National and representative football"
            rows={profileRows(profile.representative, [
              ["National-team camps", "nationalTeamCamps"],
              ["Representative teams", "representedTeams"],
            ])}
          />

          <ProfileSection
            title="Trials and international experience"
            rows={profileRows(profile.overseas, [["Played or lived outside home country", "experience"]])}
          >
            {trials.length > 0 && (
              <div className="cv-repeat-list">
                {trials.map((trial, index) => (
                  <article className="cv-repeat-entry" key={`${trial.club || "trial"}-${index}`}>
                    <h3>{trial.club || "Trial"}</h3>
                    <dl className="cv-detail-list">
                      {profileRows(trial, [
                        ["Country", "country"],
                        ["Date / year", "date"],
                        ["Length of trial", "duration"],
                        ["Outcome", "outcome"],
                      ]).map(([label, value]) => (
                        <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
                      ))}
                    </dl>
                  </article>
                ))}
              </div>
            )}
          </ProfileSection>

          {hasProfilePhotos && (
            <ProfileSection title="Player photos" rows={[]}>
              <div className="cv-photo-groups">
                <ProfilePhotoGroup title="Professional headshot" photos={photos.professionalHeadshot} />
                <ProfilePhotoGroup title="Full-body photo" photos={photos.fullBody} />
                <ProfilePhotoGroup title="Competitive match action" photos={photos.action?.length ? photos.action : player.imageUrl} />
                <ProfilePhotoGroup title="Current club kit" photos={photos.currentClubKit} />
                <ProfilePhotoGroup title="Recent matches and training" photos={photos.recentMatchesTraining} />
              </div>
            </ProfileSection>
          )}
        </div>
      </div>
    </div>
  );
}

function PlaylistTab({ playlists, token, onVideoPlay, galleryOptions }) {
  return (
    <div className="playlist-content">
      {playlists.map((playlist) => (
        <section className="playlist-section" key={playlist.id}>
          <div className="playlist-heading">
            <p className="eyebrow">Curated collection</p>
            <h2>{playlist.title}</h2>
          </div>
          <VideoGallery
            items={playlist.media}
            token={token}
            onVideoPlay={onVideoPlay}
            view="playlists"
            {...galleryOptions}
          />
        </section>
      ))}
    </div>
  );
}

export default function MediaExperience({
  token,
  data,
  activePage,
  initialMediaType,
  initialCollection,
  initialGalleryPage,
  initialVideoId,
  initialPhotoIndex,
}) {
  const [viewerSessionId, setViewerSessionId] = useState("");
  const player = data.player;
  const playerName = [player.firstName, player.lastName].filter(Boolean).join(" ");
  const portrait = player.headshotUrl || player.imageUrl?.[0];
  const photos = [...new Set([...(player.imageUrl || []), player.headshotUrl].filter(Boolean))];
  const playlists = data.playlists
    .map((playlist) => ({
      ...playlist,
      media: data.media.filter((item) => item.playlistIds.includes(playlist.id)),
    }))
    .filter((playlist) => playlist.media.length > 0);
  const galleryState = {
    initialMediaType,
    initialCollection,
    initialPage: initialGalleryPage,
    initialVideoId,
    initialPhotoIndex,
    allowVideoDownload: data.allowVideoDownload,
  };
  const contactUrl = new URL("https://footballbank.soccer/en/contact");
  if (playerName) contactUrl.searchParams.set("player", playerName);

  useEffect(() => {
    const sessionId = getViewerSessionId(token);
    setViewerSessionId(sessionId);
  }, [token]);

  useEffect(() => {
    if (viewerSessionId) reportPortalActivity(token, "PAGE_VIEW", viewerSessionId);
  }, [token, viewerSessionId]);

  function reportVideoPlay(mediaId) {
    reportPortalActivity(token, "VIDEO_PLAY", viewerSessionId, mediaId);
  }

  return (
    <main className="portal-shell">
      <header className="portal-header">
        <a className="brand-lockup" href="https://footballbank.soccer" aria-label="FootballBank International home">
          <img src="/logo/logo3.png" alt="" className="brand-logo" />
          <span className="brand-wordmark">
            <strong>FootballBank</strong>
            <small>INTERNATIONAL</small>
          </span>
        </a>
        <nav className="mini-nav" aria-label="Player portfolio">
          {NAV_ITEMS.filter((item) =>
            (item.id !== "playlists" || playlists.length > 0)
            && (item.id !== "documentation" || data.allowDocumentAccess)
          ).map((item) => (
            <Link
              key={item.id}
              href={`/p/${encodeURIComponent(token)}?view=${item.id}`}
              aria-current={activePage === item.id ? "page" : undefined}
              className={activePage === item.id ? "is-active" : ""}
            >
              {item.label}
              {item.id === "media" && <span>{data.media.length}</span>}
              {item.id === "playlists" && <span>{playlists.length}</span>}
            </Link>
          ))}
        </nav>
        <span className="private-badge">
          <span className="private-dot" />
          <span>Private access · {new Intl.DateTimeFormat("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
            timeZone: "UTC",
          }).format(new Date(data.shareExpiresAt))}</span>
        </span>
      </header>

      {activePage !== "profile" && (
        <section className="player-banner">
          {portrait ? (
            <img className="player-portrait" src={portrait} alt={`${playerName} portrait`} />
          ) : (
            <div className="player-portrait portrait-fallback" aria-hidden="true">
              {(player.firstName?.[0] || "") + (player.lastName?.[0] || "")}
            </div>
          )}
          <div className="player-intro">
            <p className="eyebrow">Player portfolio</p>
            <h1>{playerName}</h1>
            <p>{[player.position, player.currentClub || "Independent", player.country].filter(Boolean).join(" · ")}</p>
          </div>
        </section>
      )}

      <div className="page-content">
        {activePage === "media" && (
          <VideoGallery
            items={data.media}
            token={token}
            onVideoPlay={reportVideoPlay}
            showInterestCta
            contactHref={contactUrl.toString()}
            photos={photos}
            {...galleryState}
          />
        )}
        {activePage === "profile" && <ProfileTab player={player} />}
        {activePage === "playlists" && playlists.length > 0 && (
          <PlaylistTab
            playlists={playlists}
            token={token}
            onVideoPlay={reportVideoPlay}
            galleryOptions={galleryState}
          />
        )}
        {activePage === "documentation" && data.allowDocumentAccess && (
          <DocumentationTab token={token} playerName={playerName} />
        )}
      </div>

      <footer className="portal-footer">
        <span>FootballBank International</span>
        <span>Confidential player footage · Shared securely</span>
      </footer>
    </main>
  );
}
