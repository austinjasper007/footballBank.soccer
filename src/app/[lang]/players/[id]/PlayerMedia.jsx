"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Calendar,
  Camera,
  Download,
  Mail,
  MapPin,
  Maximize2,
  Phone,
  Play,
  ShieldCheck,
  TrendingUp,
  X,
} from "lucide-react";
import ResumeRequestForm from "./ResumeRequestForm";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { formatPhoneNumber } from "@/lib/formatPhoneNumber";

const sections = ["overview", "media", "stats", "career", "contact"];

export default function PlayerMedia({
  player,
  canViewDetails,
  canDownloadResume,
  lang,
  id,
}) {
  const [activeSection, setActiveSection] = useState("overview");
  const [selectedImage, setSelectedImage] = useState(null);
  useBodyScrollLock(selectedImage !== null);
  const images = [
    ...new Set(
      [
        player.headshotUrl,
        ...(Array.isArray(player.imageUrl) ? player.imageUrl : []),
      ].filter(Boolean),
    ),
  ];
  const headshot = player.headshotUrl || images[0];
  const videos = [
    player.videoPrimary,
    ...(player.videoAdditional || []),
  ].filter(Boolean);
  const fullName = `${player.firstName} ${player.lastName}`;

  return (
    <main
      className="min-h-screen bg-primary-surface text-primary-text"
      id={id}
    >
      <section className="bg-primary-navy text-primary-text-inverse">
        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-14">
          <div className="flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
            <div className="flex min-w-0 items-center gap-4 sm:gap-6">
              <div className="relative size-20 shrink-0 overflow-hidden bg-primary-text-inverse/10 sm:size-28 lg:size-32">
                {headshot && (
                  <Image
                    src={headshot}
                    alt={fullName}
                    fill
                    sizes="(max-width: 640px) 80px, 128px"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary-accent">
                  Player profile
                </p>
                <h1 className="mt-3 wrap-break-word font-heading text-3xl font-semibold leading-[0.98] tracking-tight sm:text-5xl lg:text-6xl">
                  {fullName}
                </h1>
                <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-primary-text-inverse/65 sm:text-base">
                  <span>{player.position}</span>
                  <span className="text-primary-accent">/</span>
                  <span>{player.country}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-primary-text-inverse/65">
              <ShieldCheck className="size-4 text-primary-accent" />{" "}
              FootballBank talent collection
            </div>
          </div>
          <div className="mt-10 grid grid-cols-3 border-t border-primary-text-inverse/15 pt-4 sm:pt-6">
            {[
              ["Position", player.position],
              ["Country", player.country],
              ["Access", canViewDetails ? "Approved" : "Preview"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="min-w-0 border-r border-primary-text-inverse/15 px-2 last:border-r-0 sm:px-6 sm:first:pl-0 sm:last:border-r-0"
              >
                <p className="text-[0.55rem] uppercase tracking-[0.12em] text-primary-text-inverse/50 sm:text-xs sm:tracking-[0.14em]">
                  {label}
                </p>
                <p className="mt-1 wrap-break-word font-heading text-sm font-semibold sm:mt-2 sm:text-xl lg:text-2xl">
                  {value || "-"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-10 lg:px-12 lg:py-12">
        <nav
          className="flex gap-2 overflow-x-auto border-b border-divider"
          aria-label="Player profile sections"
        >
          {sections.map((section) => (
            <button
              key={section}
              type="button"
              onClick={() => setActiveSection(section)}
              className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold capitalize transition-colors ${activeSection === section ? "border-primary-action text-primary-action" : "border-transparent text-primary-muted hover:text-primary-text"}`}
            >
              {section}
            </button>
          ))}
        </nav>

        {activeSection === "overview" && (
          <section className="mt-10 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="eyebrow">About the player</p>
              <h2 className="mt-5 font-heading text-3xl font-semibold sm:text-4xl">
                A profile built for the next opportunity.
              </h2>
              <p className="mt-6 max-w-2xl text-base leading-8 text-primary-muted">
                {canViewDetails && player.description
                  ? player.description
                  : "Explore the player media, then request the full profile when you are ready to take the next step."}
              </p>
              {!canViewDetails && (
                <div className="mt-8 max-w-xl">
                  <ResumeRequestForm playerId={player.id} lang={lang} />
                </div>
              )}
            </div>
            <div className="border-l border-divider pl-6 sm:pl-8">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-action">
                Profile access
              </p>
              <dl className="mt-5 space-y-5 text-sm">
                <div>
                  <dt className="text-primary-muted">Position</dt>
                  <dd className="mt-1 font-semibold">{player.position}</dd>
                </div>
                <div>
                  <dt className="text-primary-muted">Country</dt>
                  <dd className="mt-1 font-semibold">{player.country}</dd>
                </div>
                <div>
                  <dt className="text-primary-muted">Status</dt>
                  <dd className="mt-1 font-semibold">
                    {canViewDetails ? "Approved access" : "Media preview"}
                  </dd>
                </div>
              </dl>
            </div>
          </section>
        )}

        {activeSection === "media" && (
          <section className="mt-10">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow flex items-center gap-3">
                  <Camera className="size-4" /> Visual profile
                </p>
                <h2 className="mt-5 font-heading text-3xl font-semibold sm:text-4xl">
                  Photos and footage.
                </h2>
              </div>
              {images.length > 0 && (
                <p className="hidden text-sm text-primary-muted sm:block">
                  Select a photo to open the gallery.
                </p>
              )}
            </div>
            {images.length > 0 && (
              <div className="mt-8 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                {images.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() => setSelectedImage(index)}
                    className="group relative aspect-square overflow-hidden bg-primary-navy"
                  >
                    <Image
                      src={image}
                      alt={`${fullName} photo ${index + 1}`}
                      fill
                      sizes="(max-width: 640px) 33vw, 16vw"
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                    <span className="absolute right-2 bottom-2 inline-flex size-7 items-center justify-center bg-primary-card/90 text-primary-text">
                      <Maximize2 className="size-3.5" />
                    </span>
                  </button>
                ))}
              </div>
            )}
            {videos.length > 0 && (
              <div className="mt-12 grid gap-6 lg:grid-cols-2">
                {videos.map((video, index) => (
                  <div
                    key={video}
                    className="overflow-hidden border border-divider bg-primary-card"
                  >
                    <video
                      src={video}
                      controls
                      preload="metadata"
                      className="aspect-video w-full bg-primary-navy"
                    />
                    <p className="p-4 text-sm font-semibold">
                      {index === 0
                        ? "Primary highlights"
                        : `Additional video ${index}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {images.length === 0 && videos.length === 0 && (
              <EmptyInline icon={Camera} text="No media available." />
            )}
          </section>
        )}

        {activeSection === "stats" && canViewDetails && (
          <section className="mt-10">
            <SectionHeading
              icon={TrendingUp}
              eyebrow="Performance"
              title="Statistics without the clutter."
            />
            <div className="mt-8 grid gap-10 md:grid-cols-3">
              {Object.entries(player.stats || {}).map(([group, values]) => (
                <div key={group} className="border-t border-divider pt-5">
                  <h3 className="font-heading text-2xl font-semibold capitalize">
                    {group}
                  </h3>
                  <dl className="mt-5 divide-y divide-divider">
                    {Object.entries(values || {}).map(([label, value]) => (
                      <div
                        key={label}
                        className="flex justify-between gap-4 py-3 text-sm"
                      >
                        <dt className="text-primary-muted">
                          {label.replace(/([A-Z])/g, " $1")}
                        </dt>
                        <dd className="font-semibold">{value || "-"}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
            {!Object.keys(player.stats || {}).length && (
              <EmptyInline
                icon={TrendingUp}
                text="Statistics have not been added yet."
              />
            )}
          </section>
        )}

        {activeSection === "career" && canViewDetails && (
          <section className="mt-10">
            <SectionHeading
              icon={Award}
              eyebrow="Career path"
              title="Club history and progression."
            />
            <div className="mt-8 border-l-2 border-primary-action pl-6 sm:pl-8">
              {player.clubHistory?.length ? (
                player.clubHistory.map((club, index) => (
                  <div
                    key={index}
                    className="relative border-b border-divider pb-6 pt-1 last:border-0"
                  >
                    <span className="absolute left-[-2.05rem] top-1 size-3 rounded-full bg-primary-action ring-4 ring-primary-bg" />
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-action">
                      {club.startDate || ""} - {club.endDate || "Present"}
                    </p>
                    <h3 className="mt-2 font-heading text-2xl font-semibold">
                      {club.clubName || "Unnamed club"}
                    </h3>
                    <p className="mt-1 text-sm text-primary-muted">
                      {club.position || player.position}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyInline
                  icon={Award}
                  text="Club history has not been added yet."
                />
              )}
            </div>
          </section>
        )}

        {activeSection === "contact" && (
          <section className="mt-10 max-w-3xl">
            <p className="eyebrow">Representation</p>
            <h2 className="mt-5 font-heading text-3xl font-semibold sm:text-4xl">
              Keep the conversation moving.
            </h2>
            {canViewDetails ? (
              <div className="mt-8 grid gap-5 border-t border-divider pt-6 sm:grid-cols-2">
                <Info icon={Mail} label="Email" value={player.email} />
                <Info
                  icon={Phone}
                  label="Phone"
                  value={formatPhoneNumber(player.phone, player.phoneCountryCode)}
                />
                <Info icon={MapPin} label="Country" value={player.country} />
                <Info
                  icon={Calendar}
                  label="Date of birth"
                  value={
                    player.dob ? new Date(player.dob).toLocaleDateString() : "-"
                  }
                />
              </div>
            ) : (
              <div className="mt-8 max-w-xl">
                <ResumeRequestForm playerId={player.id} lang={lang} />
              </div>
            )}
          </section>
        )}

        {canViewDetails && (
          <section className="mt-16 border-t border-divider pt-10">
            <p className="eyebrow">Approved profile access</p>
            <h2 className="mt-5 font-heading text-3xl font-semibold">
              Player information
            </h2>
            <dl className="mt-8 grid gap-x-10 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Contract status", player.contractStatus || "Unavailable"],
                ["Available from", player.availableFrom || "Unavailable"],
                [
                  "Preferred leagues",
                  Array.isArray(player.preferredLeagues)
                    ? player.preferredLeagues.join(", ") || "Unavailable"
                    : player.preferredLeagues || "Unavailable",
                ],
                ["Preferred foot", player.foot || "Unavailable"],
              ].map(([label, value]) => (
                <div key={label} className="border-b border-divider pb-3">
                  <dt className="text-xs uppercase tracking-[0.14em] text-primary-muted">
                    {label}
                  </dt>
                  <dd className="mt-2 font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
            {canDownloadResume && (
              <a
                href={`/api/players/${player.id}/resume`}
                className="mt-8 inline-flex items-center gap-3 bg-primary-action px-5 py-3 text-sm font-semibold text-primary-text-inverse hover:bg-primary-action-hover"
              >
                <Download className="size-4" /> Download professional resume
              </a>
            )}
          </section>
        )}
      </div>

      {selectedImage !== null && (
        <div
          className="fixed inset-0 z-9999 flex items-center justify-center bg-primary-navy/95 p-5"
          role="dialog"
          aria-modal="true"
          aria-label="Player photo gallery"
        >
          <button
            type="button"
            onClick={() => setSelectedImage(null)}
            className="absolute top-5 right-5 z-10 text-primary-text-inverse hover:text-primary-accent"
            aria-label="Close gallery"
          >
            <X className="size-8" />
          </button>
          <button
            type="button"
            onClick={() =>
              setSelectedImage(
                (selectedImage - 1 + images.length) % images.length,
              )
            }
            className="absolute left-4 z-10 text-primary-text-inverse hover:text-primary-accent"
            aria-label="Previous photo"
          >
            <ArrowLeft className="size-8" />
          </button>
          <div className="relative h-[80vh] w-full max-w-5xl">
            <Image
              src={images[selectedImage]}
              alt={`${fullName} photo ${selectedImage + 1}`}
              fill
              sizes="100vw"
              className="object-contain"
              priority
            />
          </div>
          <button
            type="button"
            onClick={() =>
              setSelectedImage((selectedImage + 1) % images.length)
            }
            className="absolute right-4 z-10 text-primary-text-inverse hover:text-primary-accent"
            aria-label="Next photo"
          >
            <ArrowRight className="size-8" />
          </button>
        </div>
      )}
    </main>
  );
}

function Info({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 text-primary-action" />
      <div>
        <p className="text-xs uppercase tracking-[0.14em] text-primary-muted">
          {label}
        </p>
        <p className="mt-1 font-medium">{value || "-"}</p>
      </div>
    </div>
  );
}

function SectionHeading({ icon: Icon, eyebrow, title }) {
  return (
    <div>
      <p className="eyebrow flex items-center gap-3">
        <Icon className="size-4" /> {eyebrow}
      </p>
      <h2 className="mt-5 font-heading text-3xl font-semibold sm:text-4xl">
        {title}
      </h2>
    </div>
  );
}

function EmptyInline({ icon: Icon, text }) {
  return (
    <div className="mt-8 flex items-center gap-3 border border-dashed border-divider p-5 text-sm text-primary-muted">
      <Icon className="size-4 text-primary-action" /> {text}
    </div>
  );
}
