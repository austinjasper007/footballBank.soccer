import { notFound } from "next/navigation";
import { getPortalProfile } from "@/lib/access";
import { createSignedEmbedUrl } from "@/lib/playback";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false, nocache: true } };

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function signedEmbedUrl(videoId, shareExpiresAt) {
  return createSignedEmbedUrl({
    libraryId: process.env.BUNNY_STREAM_LIBRARY_ID || process.env.BUNNY_LIBRARY_ID,
    tokenKey: process.env.BUNNY_STREAM_TOKEN_AUTH_KEY || process.env.BUNNY_TOKEN_AUTH_KEY,
    videoId,
    shareExpiresAt,
  })?.url || null;
}

function Video({ item, expiresAt, featured = false }) {
  const src = signedEmbedUrl(item.bunnyVideoId, expiresAt);
  return (
    <div className="video-frame">
      {src ? (
        <iframe
          className="video"
          title={item.title}
          src={src}
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
          allowFullScreen
          loading={featured ? "eager" : "lazy"}
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <div className="video-placeholder">
          <span className="video-placeholder-icon" aria-hidden="true">▶</span>
          <p>Secure playback is not configured</p>
        </div>
      )}
    </div>
  );
}

function MediaCard({ item, expiresAt }) {
  const details = [
    item.season,
    item.competition,
    item.playerClub && item.opponent ? `${item.playerClub} vs ${item.opponent}` : item.playerClub || item.opponent,
    item.matchDate && dateFormatter.format(new Date(item.matchDate)),
  ].filter(Boolean);

  return (
    <article className="media-card">
      <Video item={item} expiresAt={expiresAt} />
      <div className="media-card-body">
        <span className="media-type">{item.category === "FULL_MATCH" ? "Full match" : "Highlight"}</span>
        <h3>{item.title}</h3>
        {details.length > 0 && <p className="media-details">{details.join(" · ")}</p>}
        {item.description && <p className="media-description">{item.description}</p>}
      </div>
    </article>
  );
}

export default async function Page({ params }) {
  const { token } = await params;
  const data = await getPortalProfile(token);
  if (!data) notFound();

  const featured = data.media.find((item) => item.isFeatured) || data.media[0];
  const groups = [
    ["HIGHLIGHT", "Highlights"],
    ["FULL_MATCH", "Full matches"],
  ].map(([category, label]) => [
    label,
    data.media.filter((item) => item.category === category && item.id !== featured.id),
  ]);
  const playlistGroups = data.playlists
    .map((playlist) => ({
      ...playlist,
      media: data.media.filter((item) => item.playlistIds.includes(playlist.id)),
    }))
    .filter((playlist) => playlist.media.length > 0);
  const playerName = [data.player.firstName, data.player.lastName].filter(Boolean).join(" ");
  const portrait = data.player.headshotUrl || data.player.imageUrl[0];

  return (
    <main className="portal-shell">
      <header className="portal-header">
        <div className="brand-lockup" aria-label="FootballBank">
          <span className="brand-mark">FB</span>
          <span className="brand-name">Football<span>Bank</span></span>
        </div>
        <span className="private-badge"><span className="private-dot" />Private media room</span>
      </header>

      <section className="profile-hero">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-line" />Player portfolio</p>
          <h1>{playerName}</h1>
          <p className="hero-role">
            {[data.player.position, data.player.currentClub || "Independent", data.player.country]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {data.player.description && <p className="hero-description">{data.player.description}</p>}
          <div className="profile-facts">
            {data.player.height && <span><small>Height</small>{data.player.height}</span>}
            {data.player.weight && <span><small>Weight</small>{data.player.weight}</span>}
            {data.player.foot && <span><small>Preferred foot</small>{data.player.foot}</span>}
            <span><small>Footage</small>{data.media.length} {data.media.length === 1 ? "video" : "videos"}</span>
          </div>
        </div>
        <div className="portrait-wrap">
          {portrait ? (
            <img className="portrait" src={portrait} alt={`${playerName} portrait`} />
          ) : (
            <div className="portrait portrait-fallback" aria-hidden="true">
              {(data.player.firstName?.[0] || "") + (data.player.lastName?.[0] || "")}
            </div>
          )}
          <span className="portrait-caption">FOOTBALLBANK<br />PLAYER PROFILE</span>
        </div>
        <div className="hero-index" aria-hidden="true">FB<span> / MEDIA</span></div>
      </section>

      <div className="access-note">
        <span className="access-icon" aria-hidden="true">◷</span>
        <span>This private collection is available until <strong>{dateFormatter.format(new Date(data.shareExpiresAt))}</strong>.</span>
      </div>

      <section className="featured-section">
        <div className="section-heading featured-heading">
          <div>
            <p className="eyebrow"><span className="eyebrow-line" />Selected footage</p>
            <h2>Featured performance</h2>
          </div>
          <span className="section-count">01 <i>/</i> {String(data.media.length).padStart(2, "0")}</span>
        </div>
        <article className="featured-card">
          <Video item={featured} expiresAt={data.shareExpiresAt} featured />
          <div className="featured-caption">
            <div>
              <span className="media-type">{featured.category === "FULL_MATCH" ? "Full match" : "Highlight"}</span>
              <h3>{featured.title}</h3>
              {featured.description && <p>{featured.description}</p>}
            </div>
            <span className="featured-mark" aria-hidden="true">FB</span>
          </div>
        </article>
      </section>

      {groups.map(([label, items]) => items.length ? (
        <section key={label} className="library-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow"><span className="eyebrow-line" />The library</p>
              <h2>{label}</h2>
            </div>
            <span className="section-count">{String(items.length).padStart(2, "0")} <i>VIDEOS</i></span>
          </div>
          <div className="media-grid">
            {items.map((item) => <MediaCard key={item.id} item={item} expiresAt={data.shareExpiresAt} />)}
          </div>
        </section>
      ) : null)}

      {playlistGroups.map((playlist) => (
        <section key={playlist.id} className="library-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow"><span className="eyebrow-line" />Curated collection</p>
              <h2>{playlist.title}</h2>
            </div>
            <span className="section-count">{String(playlist.media.length).padStart(2, "0")} <i>VIDEOS</i></span>
          </div>
          <div className="media-grid">
            {playlist.media.map((item) => <MediaCard key={item.id} item={item} expiresAt={data.shareExpiresAt} />)}
          </div>
        </section>
      ))}

      <footer className="portal-footer">
        <span className="footer-brand">FB <span>FOOTBALLBANK</span></span>
        <span>Confidential player footage · Shared securely</span>
      </footer>
    </main>
  );
}
