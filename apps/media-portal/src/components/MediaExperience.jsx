"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PortalModal from "@/components/PortalModal";

const PAGE_SIZE = 9;
const NAV_ITEMS = [
  { id: "media", label: "Media" },
  { id: "profile", label: "Profile" },
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

function VideoGallery({
  items,
  token,
  photos = [],
  initialMediaType = "videos",
  initialCollection = "ALL",
  initialPage = 1,
  initialVideoId = "",
  initialPhotoIndex = null,
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
        <span className="media-total">{items.length + photos.length} items</span>
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
          description={[selectedVideo.season, selectedVideo.competition, selectedVideo.opponent]
            .filter(Boolean)
            .join(" · ")}
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

function formatLabel(value) {
  return value.replace(/([A-Z])/g, " $1").replace(/[_-]/g, " ").replace(/^./, (character) => character.toUpperCase());
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date);
}

function displayStat(value) {
  if (value === null || typeof value === "undefined" || value === "") return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function ProfileTab({ player }) {
  const stats = isRecord(player.stats) ? Object.entries(player.stats) : [];
  const clubs = Array.isArray(player.clubHistory) ? player.clubHistory : [];
  const preferredLeagues = Array.isArray(player.preferredLeagues)
    ? player.preferredLeagues
    : player.preferredLeagues ? [player.preferredLeagues] : [];
  const phoneNumber = player.contact?.phone?.trim() || "";

  return (
    <div className="cv-page">
      <header className="cv-heading">
        <div>
          <p className="eyebrow">FootballBank International · Athlete CV</p>
          <h2>{[player.firstName, player.lastName].filter(Boolean).join(" ")}</h2>
          <p>{[player.position, player.country].filter(Boolean).join(" · ")}</p>
        </div>
        <span className="cv-status">{player.contractStatus || "Player profile"}</span>
      </header>

      <div className="cv-layout">
        <aside className="cv-sidebar">
          {player.headshotUrl && (
            <img className="cv-portrait" src={player.headshotUrl} alt={`${player.firstName} ${player.lastName}`} />
          )}

          <section className="cv-sidebar-section">
            <p className="cv-section-label">Contact</p>
            {player.contact ? (
              <div className="cv-contact-list">
                {player.contact.email && (
                  <a href={`mailto:${player.contact.email}`}>
                    <span>Email</span>
                    <strong>{player.contact.email}</strong>
                  </a>
                )}
                {phoneNumber && (
                  <a href={`tel:${phoneNumber.replace(/[^\d+]/g, "")}`}>
                    <span>Phone</span>
                    <strong>{phoneNumber}</strong>
                  </a>
                )}
                {!player.contact.email && !phoneNumber && <p className="cv-muted">No contact details provided.</p>}
              </div>
            ) : (
              <p className="cv-muted">Contact details are hidden until the player’s consent to share them is recorded.</p>
            )}
          </section>

          <section className="cv-sidebar-section">
            <p className="cv-section-label">Player details</p>
            <dl className="cv-detail-list">
              {[
                ["Nationality", player.country],
                ["Current club", player.currentClub || "Independent"],
                ["Height", player.height],
                ["Weight", player.weight],
                ["Preferred foot", player.foot],
              ].filter(([, value]) => value).map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="cv-sidebar-section">
            <p className="cv-section-label">Availability</p>
            <dl className="cv-detail-list">
              <div>
                <dt>Available from</dt>
                <dd>{player.availableFrom || "To be confirmed"}</dd>
              </div>
              <div>
                <dt>Preferred leagues</dt>
                <dd>{preferredLeagues.join(", ") || "Open to opportunities"}</dd>
              </div>
            </dl>
          </section>
        </aside>

        <div className="cv-main">
          <section className="cv-section">
            <p className="cv-section-label">Professional profile</p>
            <p className="cv-summary">
              {player.description || "A football professional available for new opportunities."}
            </p>
          </section>

          <section className="cv-section">
            <p className="cv-section-label">Playing career</p>
            {clubs.length ? (
              <ol className="cv-career-list">
                {clubs.map((club, index) => (
                  <li key={`${club.clubName || "club"}-${index}`}>
                    <div>
                      <h3>{club.clubName || "Club"}</h3>
                      <p>{club.position || player.position}</p>
                    </div>
                    <span>{[club.startDate, club.endDate || "Present"].filter(Boolean).join(" — ")}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="cv-muted">Club history has not been added yet.</p>
            )}
          </section>

          <section className="cv-section">
            <p className="cv-section-label">Performance record</p>
            {stats.length ? (
              <div className="stats-grid">
                {stats.map(([group, values]) => {
                  const groupEntries = isRecord(values) ? Object.entries(values) : [["Total", values]];
                  const visibleEntries = groupEntries
                    .map(([label, value]) => [label, displayStat(value)])
                    .filter(([, value]) => value);
                  if (!visibleEntries.length) return null;
                  return (
                    <article key={group} className="stats-card">
                      <h3>{formatLabel(group)}</h3>
                      <dl>
                        {visibleEntries.map(([label, value]) => (
                          <div key={label}>
                            <dt>{formatLabel(label)}</dt>
                            <dd>{value}</dd>
                          </div>
                        ))}
                      </dl>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="cv-muted">Player statistics have not been added yet.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function PlaylistTab({ playlists, token, galleryOptions }) {
  return (
    <div className="playlist-content">
      {playlists.map((playlist) => (
        <section className="playlist-section" key={playlist.id}>
          <div className="playlist-heading">
            <p className="eyebrow">Curated collection</p>
            <h2>{playlist.title}</h2>
          </div>
          <VideoGallery items={playlist.media} token={token} view="playlists" {...galleryOptions} />
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
  };

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
          {NAV_ITEMS.filter((item) => item.id !== "playlists" || playlists.length > 0).map((item) => (
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
            photos={photos}
            {...galleryState}
          />
        )}
        {activePage === "profile" && <ProfileTab player={player} />}
        {activePage === "playlists" && playlists.length > 0 && (
          <PlaylistTab
            playlists={playlists}
            token={token}
            galleryOptions={galleryState}
          />
        )}
      </div>

      <footer className="portal-footer">
        <span>FootballBank International</span>
        <span>Confidential player footage · Shared securely</span>
      </footer>
    </main>
  );
}
