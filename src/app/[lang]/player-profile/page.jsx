"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Calendar,
  Camera,
  Edit3,
  FileText,
  Footprints,
  Mail,
  MapPin,
  Maximize2,
  Phone,
  Play,
  Ruler,
  Shield,
  TrendingUp,
  User,
  Weight,
  X,
} from "lucide-react";
import { useAuth } from "@/context/NewAuthContext";
import { Button } from "@/components/ui/button";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { formatPhoneNumber } from "@/lib/formatPhoneNumber";
import { getClientDictionary } from "@/lib/client-dictionaries";

const tabKeys = ["overview", "stats", "career", "media", "contact"];

export default function PlayerProfilePage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const lang = pathname?.split("/")[1] || "en";
  const [dict, setDict] = useState(null);
  const t = dict?.playerProfilePage;
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedImage, setSelectedImage] = useState(null);
  useBodyScrollLock(selectedImage !== null);

  useEffect(() => {
    getClientDictionary(lang).then(setDict);
  }, [lang]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetch("/api/profile/player", { credentials: "include" })
        .then((response) => response.json())
        .then((data) => setPlayer(data?.error ? null : data))
        .catch(() => setPlayer(null))
        .finally(() => setLoading(false));
    }
  }, [isAuthenticated, user]);

  if (authLoading || loading)
    return (
      <main className="flex min-h-screen items-center justify-center bg-primary-bg">
        <p className="text-sm text-primary-muted">{t?.loading || "Loading player profile..."}</p>
      </main>
    );
  if (!isAuthenticated)
    return (
      <EmptyState
        icon={Shield}
        title={t?.authRequiredTitle || "Authentication required"}
        copy={t?.authRequiredCopy || "Please sign in to access your player profile."}
        action={t?.signIn || "Sign in"}
        href="/en/auth/login"
      />
    );
  if (!player)
    return (
      <EmptyState
        icon={User}
        title={t?.notFoundTitle || "No player profile found"}
        copy={t?.notFoundCopy || "Your approved player profile will appear here."}
        action={t?.returnHome || "Return home"}
        href="/en"
      />
    );

  const fullName = `${player.firstName} ${player.lastName}`;
  const images = player.imageUrl?.length
    ? player.imageUrl
    : ["/logo/logo3.svg"];
  const headshot = player.headshotUrl || images[0];
  const videos = [
    player.videoPrimary,
    ...(player.videoAdditional || []),
  ].filter(Boolean);
  const age = player.dob ? calculateAge(player.dob) : "-";

  return (
    <main className="min-h-screen bg-primary-bg text-primary-text">
      <section className="bg-primary-navy text-primary-text-inverse">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-10 lg:px-12 lg:py-14">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-center gap-5 sm:gap-7">
              <div className="relative size-24 shrink-0 overflow-hidden bg-primary-text-inverse/10 sm:size-32">
                {images[0] ? (
                  <Image
                    src={headshot}
                    alt={fullName}
                    fill
                    sizes="128px"
                    className="object-cover"
                  />
                ) : (
                  <User className="m-auto size-10" />
                )}
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary-accent">
                  {t?.playerProfileLabel || "Player profile"}
                </p>
                <h1 className="mt-3 font-heading text-4xl font-semibold leading-none tracking-tight sm:text-6xl">
                  {fullName}
                </h1>
                <p className="mt-3 text-base text-primary-text-inverse/65">
                  {player.position}{" "}
                  <span className="mx-2 text-primary-accent">/</span>{" "}
                  {player.country}
                </p>
              </div>
            </div>
            <Button variant="onNavy" asChild>
              <Link href={`/${lang}/profile/settings`}>
                <Edit3 className="size-4" />
                {t?.editProfile || "Edit profile"}
              </Link>
            </Button>
          </div>
          <div className="mt-10 grid grid-cols-2 border-t border-primary-text-inverse/15 pt-6 sm:grid-cols-4">
            {[
              [t?.age || "Age", age],
              [t?.height || "Height", player.height],
              [t?.weight || "Weight", player.weight],
              [t?.preferredFoot || "Preferred foot", player.foot],
            ].map(([label, value]) => (
              <div
                key={label}
                className="border-r border-primary-text-inverse/15 px-4 first:pl-0 last:border-0 sm:px-6"
              >
                <p className="text-xs uppercase tracking-[0.14em] text-primary-text-inverse/50">
                  {label}
                </p>
                <p className="mt-2 font-heading text-xl font-semibold sm:text-2xl">
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
          {tabKeys.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold capitalize transition-colors ${activeTab === tab ? "border-primary-action text-primary-action" : "border-transparent text-primary-muted hover:text-primary-text"}`}
            >
              {t?.tabs?.[tab] || tab}
            </button>
          ))}
        </nav>

        {activeTab === "overview" && (
          <section className="mt-10 grid gap-10 lg:grid-cols-[1.25fr_0.75fr]">
            <div>
              <p className="eyebrow">{t?.aboutEyebrow || "About the player"}</p>
              <h2 className="mt-5 font-heading text-3xl font-semibold sm:text-4xl">
                {t?.aboutTitle || "A profile built for the next opportunity."}
              </h2>
              <p className="mt-6 max-w-2xl text-base leading-8 text-primary-muted">
                {player.description ||
                  (t?.descriptionFallback || "Your player biography will appear here once it has been added to your profile.")}
              </p>
            </div>
            <div className="border-l border-divider pl-6 sm:pl-8">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-action">
                {t?.availability || "Availability"}
              </p>
              <dl className="mt-5 space-y-5 text-sm">
                <div>
                  <dt className="text-primary-muted">{t?.contractStatus || "Contract status"}</dt>
                  <dd className="mt-1 font-semibold">
                    {player.contractStatus || (t?.available || "Available")}
                  </dd>
                </div>
                <div>
                  <dt className="text-primary-muted">{t?.availableFrom || "Available from"}</dt>
                  <dd className="mt-1 font-semibold">
                    {player.availableFrom || (t?.immediately || "Immediately")}
                  </dd>
                </div>
                <div>
                  <dt className="text-primary-muted">{t?.preferredLeagues || "Preferred leagues"}</dt>
                  <dd className="mt-1 font-semibold">
                    {Array.isArray(player.preferredLeagues)
                      ? player.preferredLeagues.join(", ") || (t?.openToAll || "Open to all")
                      : player.preferredLeagues || (t?.openToAll || "Open to all")}
                  </dd>
                </div>
              </dl>
            </div>
          </section>
        )}

        {activeTab === "stats" && (
          <section className="mt-10">
            <SectionHeading
              icon={TrendingUp}
              eyebrow={t?.performanceEyebrow || "Performance"}
              title={t?.statsTitle || "Statistics without the clutter."}
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
                text={t?.statsEmpty || "Statistics have not been added yet."}
              />
            )}
          </section>
        )}

        {activeTab === "career" && (
          <section className="mt-10">
            <SectionHeading
              icon={Award}
              eyebrow={t?.careerEyebrow || "Career path"}
              title={t?.careerTitle || "Club history and progression."}
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
                      {club.startDate || ""} - {club.endDate || (t?.present || "Present")}
                    </p>
                    <h3 className="mt-2 font-heading text-2xl font-semibold">
                      {club.clubName}
                    </h3>
                    <p className="mt-1 text-sm text-primary-muted">
                      {club.position || player.position}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyInline
                  icon={Award}
                  text={t?.careerEmpty || "Club history has not been added yet."}
                />
              )}
            </div>
          </section>
        )}

        {activeTab === "media" && (
          <section className="mt-10">
            <SectionHeading
              icon={Camera}
              eyebrow={t?.mediaEyebrow || "Your media"}
              title={t?.mediaTitle || "Photos and footage."}
            />
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
                </button>
              ))}
            </div>
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
                      className="aspect-video w-full bg-primary-navy"
                    />
                    <p className="p-4 text-sm font-semibold">
                      {index === 0
                        ? (t?.primaryHighlights || "Primary highlights")
                        : `${t?.additionalVideo || "Additional video"} ${index}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "contact" && (
          <section className="mt-10 max-w-2xl">
            <SectionHeading
              icon={Mail}
              eyebrow={t?.representationEyebrow || "Representation"}
              title={t?.contactTitle || "Keep your contact details ready."}
            />
            <div className="mt-8 grid gap-5 border-t border-divider pt-6 sm:grid-cols-2">
              <Info icon={Mail} label={t?.email || "Email"} value={player.email} />
              <Info
                icon={Phone}
                label={t?.phone || "Phone"}
                value={formatPhoneNumber(player.phone, player.phoneCountryCode)}
              />
              <Info icon={MapPin} label={t?.country || "Country"} value={player.country} />
              <Info
                icon={Calendar}
                label={t?.dateOfBirth || "Date of birth"}
                value={
                  player.dob ? new Date(player.dob).toLocaleDateString() : "-"
                }
              />
            </div>
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

function calculateAge(date) {
  const birth = new Date(date);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  )
    age -= 1;
  return age;
}
function SectionHeading({ icon: Icon, eyebrow, title }) {
  return (
    <div>
      <p className="eyebrow flex items-center gap-3">
        <Icon className="size-4" />
        {eyebrow}
      </p>
      <h2 className="mt-5 font-heading text-3xl font-semibold sm:text-4xl">
        {title}
      </h2>
    </div>
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
function EmptyInline({ icon: Icon, text }) {
  return (
    <div className="mt-8 border-t border-divider pt-8 text-center">
      <Icon className="mx-auto size-10 text-primary-muted" />
      <p className="mt-3 text-sm text-primary-muted">{text}</p>
    </div>
  );
}
function EmptyState({ icon: Icon, title, copy, action, href }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-primary-bg px-5">
      <div className="max-w-md text-center">
        <Icon className="mx-auto size-14 text-primary-action" />
        <h1 className="mt-5 font-heading text-3xl font-semibold">{title}</h1>
        <p className="mt-3 text-primary-muted">{copy}</p>
        <Button className="mt-6" variant="action" asChild>
          <Link href={href}>{action}</Link>
        </Button>
      </div>
    </main>
  );
}
