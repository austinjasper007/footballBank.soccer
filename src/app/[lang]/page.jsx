import Image from "next/image";
import Link from "next/link";
import "aos/dist/aos.css";
import {
  getFeaturedPlayers,
  getFeaturedPosts,
  getHomepageHeroConfig,
} from "@/actions/publicActions";
import { getAgentInfo } from "@/actions/adminActions";
import { getAuthUser } from "@/lib/oauth";
import { generateMetadata as generateSEOMetadata } from "@/lib/seo";
import { getDictionary } from "@/lib/dictionaries";
import { formatTimeAgo } from "@/utils/dateHelper";
import {
  ArrowUpRight,
  FileSignature,
  Globe2Icon,
  Play,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return generateSEOMetadata({
    title: dict.seo.defaultTitle,
    description: dict.seo.defaultDescription,
    keywords: [
      "football talent",
      "soccer players",
      "football scouts",
      "player profiles",
      "football recruitment",
      "soccer talent bank",
      "football opportunities",
      "player showcase",
    ],
    url: "/",
  });
}

const BRIEF_STEPS = [
  {
    n: "01",
    title: "Define the requirement",
    copy: "Position, playing level, market and budget.",
  },
  {
    n: "02",
    title: "Review relevant profiles",
    copy: "FootballBank identifies and presents players aligned with the club's requirements.",
  },
  {
    n: "03",
    title: "Coordinate the next step",
    copy: "Verified enquiries, introductions and appropriate representation support.",
  },
];

const DIRECTION = [
  {
    n: "01",
    title: "Player representation",
    copy: "Career strategy, opportunities and representation through licensed football-agent services.",
  },
  {
    n: "02",
    title: "Talent identification",
    copy: "Player assessment, profiling and opportunity matching.",
  },
  {
    n: "03",
    title: "Club recruitment",
    copy: "Targeted player identification according to club requirements.",
  },
  {
    n: "04",
    title: "Career development",
    copy: "Long-term planning focused on progression and professional growth.",
  },
];

export default async function HomePage({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const home = dict?.homepage;
  const briefSteps = home?.briefSteps || BRIEF_STEPS;
  const directionItems = home?.directionItems || DIRECTION;
  try {
    const user = await getAuthUser();
    // User sync is now handled automatically by the authentication system
  } catch (error) {
    console.error("Error getting user:", error);
  }
  const [agentInfo, featuredPosts, featuredPlayers, homepageHero] =
    await Promise.all([
      getAgentInfo(),
      getFeaturedPosts(),
      getFeaturedPlayers(),
      getHomepageHeroConfig(),
    ]);
  const heroPlayer =
    homepageHero?.player ||
    featuredPlayers.find((player) => player.playerOfTheWeek);
  const heroImageUrl =
    homepageHero?.imageUrl ||
    heroPlayer?.headshotUrl ||
    heroPlayer?.imageUrl?.[0];
  const heroPlayerNameClass =
    (heroPlayer?.firstName?.trim().length || 0) > 12
      ? "text-2xl md:text-sm lg:text-base"
      : "text-3xl md:text-sm lg:text-base";

  return (
    <div className="min-h-screen bg-primary-bg">
      {/* HERO SECTION */}

      <section className="relative overflow-hidden bg-navy">
        <img
          src="/heroPhotos/Hero-section-bg-darkened.jpg"
          alt="Footballer walking on the pitch"
          width={1600}
          height={1008}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-r from-primary-navy via-primary-navy/30 to-transparent" />

        <div className="relative mx-auto grid max-w-8xl grid-cols-1 items-center gap-0 px-4 py-5 sm:px-6 md:grid-cols-[1.02fr_0.98fr] md:py-4 md:pl-10 md:pr-1">
          <section className="flex min-w-0 flex-col justify-center px-1 py-6 sm:px-2 md:py-12 md:pl-6 lg:pl-10">
            <p className="eyebrow">
              {home?.heroEyebrow ||
                "Representation · Recruitment · Opportunity"}
            </p>
            <h1 className="mt-5 max-w-xl font-heading text-3xl leading-[1.2] text-primary-text-inverse uppercase sm:mt-6 sm:text-4xl lg:text-6xl lg:leading-[1.2]">
              {home?.heroTitleLine1 || "Connecting football"}
              <br />
              {home?.heroTitleLine2 || "talent, clubs &"}
              <br />
              <span className="text-primary-accent">
                {home?.heroTitleLine3 || "global opportunity."}
              </span>
            </h1>
            <p className="mt-5 max-w-lg text-sm md:text-base leading-6 text-primary-text-inverse/70 sm:mt-7 sm:leading-relaxed">
              {home?.heroSubtitle ||
                "FootballBank International is a sports management company connecting players, clubs and football organizations through talent identification, recruitment, development, club partnerships and international football opportunities."}
            </p>
            <div className="mt-7 flex w-full flex-col gap-3 sm:mt-9 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
              <Button
                variant="action"
                size="lg"
                asChild
                className="w-full px-5 sm:w-auto sm:px-8"
              >
                <Link href={`/${lang}/players`}>
                  {home?.explorePlayers || "Explore players"} <ArrowUpRight />
                </Link>
              </Button>
              <Button
                variant="onNavy"
                size="lg"
                asChild
                className="w-full px-5 sm:w-auto sm:px-8"
              >
                <Link href={`/${lang}/clubs-scouts`}>
                  {home?.workWithFootballBank || "Work with FootballBank"}{" "}
                  <ArrowUpRight />
                </Link>
              </Button>
            </div>
            <a
              href={`/${lang}/contact`}
              className="mt-6 inline-flex items-center gap-2 text-xs leading-5 text-primary-text-inverse/60 transition-colors hover:text-primary-accent sm:mt-8"
            >
              {home?.seekingRepresentation || "Seeking representation?"}{" "}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </section>

          <div className="relative min-h-97.5 w-full sm:min-h-115 md:min-h-140 lg:min-h-full hidden md:block">
          
            {heroImageUrl ? (
              <Image
                src={heroImageUrl}
                alt={`${heroPlayer?.firstName || "Featured player"} ${heroPlayer?.lastName || ""}`.trim()}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                className="z-10 -translate-x-6 object-contain object-bottom-left drop-shadow-[0_18px_28px_rgba(0,0,0,0.42)] sm:-translate-x-10 md:-translate-x-14"
              />
            ) : (
              <div className="z-10 mb-16 font-heading text-lg font-bold text-primary-text-inverse/20">
                {heroPlayer?.firstName?.[0] || "F"}
              </div>
            )}

            {heroPlayer && (
              <div className="absolute bottom-[28%] z-20 w-max left-[35%]">
                <p
                  className={`whitespace-nowrap italic leading-none text-primary-text-inverse uppercase ${heroPlayerNameClass}`}
                  style={{
                    fontFamily: '"Segoe Script", "Brush Script MT", cursive',
                  }}
                >
                  {heroPlayer.firstName}
                </p>
                <p className="whitespace-nowrap text-[9px] font-medium text-primary-text-inverse/80 uppercase mt-2 tracking-[0.24em]">
                  FootballBank Talent
                </p>
                <span className="mt-3 block h-1 w-12 bg-primary-accent" />
              </div>
            )}

            <div className="absolute right-[8%] bottom-[20%] z-20 hidden text-left text-xs leading-6 tracking-[0.3em] text-primary-text-inverse/85 uppercase sm:block">
              <p>Talent</p>
              <p>Beyond</p>
              <p>Borders</p>
              <span className="mt-3 block h-1 w-12 bg-primary-accent" />
            </div>
          </div>
        </div>
      </section>

      {/* <HeroSection
        home={home}
        lang={lang}
        heroPlayer={heroPlayer}
        heroImageUrl={heroImageUrl}
      /> */}
      {/* Assurance strip */}

      <div className="relative border-t border-white/10 bg-[#07182b]/90">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-white/10 sm:grid-cols-4">
          <div className="flex items-center gap-3 px-5 py-3 sm:px-6">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary-accent/40 text-primary-accent">
              <UserRound className="h-3.5 w-3.5" />
            </span>

            <span className="text-[9px] font-medium tracking-[0.12em] text-white/60 uppercase">
              {home?.assuranceStrip?.playerRepresentation ||
                "Player representation"}
            </span>
          </div>

          <div className="flex items-center gap-3 px-5 py-3 sm:px-6">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary-accent/40 text-primary-accent">
              <FileSignature className="h-3.5 w-3.5" />
            </span>

            <span className="text-[9px] font-medium tracking-[0.12em] text-white/60 uppercase">
              {home?.assuranceStrip?.clubRecruitment || "Club recruitment"}
            </span>
          </div>

          <div className="flex items-center gap-3 px-5 py-3 sm:px-6">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary-accent/40 text-primary-accent">
              <Globe2Icon className="h-3.5 w-3.5" />
            </span>

            <span className="text-[9px] font-medium tracking-[0.12em] text-white/60 uppercase">
              {home?.assuranceStrip?.internationalOpportunities ||
                "International opportunities"}
            </span>
          </div>

          <div className="flex items-center gap-3 px-5 py-3 sm:px-6">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary-accent/40 text-primary-accent">
              <TrendingUp className="h-3.5 w-3.5" />
            </span>

            <span className="text-[9px] font-medium tracking-[0.12em] text-white/60 uppercase">
              {home?.assuranceStrip?.careerDevelopment || "Career development"}
            </span>
          </div>
        </div>
      </div>

      <div className="w-full">
        {/* FEATURED PLAYERS */}
        <section className="mx-auto max-w-7xl px-6 py-14">
          <p className="eyebrow">
            {home?.featuredSection?.eyebrow || "The player collection"}
          </p>
          <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-heading text-[1.6rem] md:text-4xl uppercase">
                {home?.featuredSection?.title || "Talent worth a closer look."}
              </h2>

              <p className="mt-3 text-sm text-muted-foreground">
                {home?.featuredSection?.subtitle ||
                  "Individual profiles. Relevant football information. A direct conversation with FootballBank."}
              </p>
            </div>
            <Link
              href={`/${lang}/players`}
              className="inline-flex items-center gap-2 text-sm font-medium text-primary-action hover:underline"
            >
              {home?.featuredSection?.exploreAll || "Explore all players"}{" "}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {featuredPlayers.map((player, index) => (
              <article
                key={player.id}
                className="group overflow-hidden rounded-lg border border-divider bg-primary-card"
              >
                <div className="relative">
                  <Link
                    href={`/${lang}/players/${player.id}`}
                    className="relative"
                  >
                    <Image
                      src={
                        player.headshotUrl ||
                        player.imageUrl?.[0] ||
                        "/logo/logo3.svg"
                      }
                      alt={player.firstName}
                      width={800}
                      height={900}
                      loading="lazy"
                      className="h-52 w-full object-cover"
                    />
                    <span className="absolute top-4 left-4 rounded-sm bg-primary-navy/90 px-2.5 py-1 text-[0.6rem] tracking-[0.18em] text-primary-text-inverse uppercase">
                      {player.position}
                    </span>
                    <span className="absolute right-4 bottom-4 flex h-9 w-9 items-center justify-center rounded-full bg-primary-card text-primary-text transition-transform group-hover:-translate-y-1">
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </Link>
                </div>

                <div className="p-4">
                  <div className="flex items-center justify-between text-[0.7rem] text-primary-muted">
                    <p className=" uppercase">{player.country}</p>
                    <span>
                      {home?.playerCard?.age || "Age"}:{" "}
                      {player.dob
                        ? new Date().getFullYear() -
                          new Date(player.dob).getFullYear()
                        : "N/A"}
                    </span>
                  </div>

                  <h3 className="mt-2 font-heading text-sm md:text-xl">
                    {player.firstName} {player.lastName}
                  </h3>

                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-divider pt-4 text-[0.7rem] text-primary-muted">
                    {/* <span>
                      {home?.playerCard?.age || "Age"}:{" "}
                      {player.dob
                        ? new Date().getFullYear() -
                          new Date(player.dob).getFullYear()
                        : "N/A"}
                    </span> */}
                    {/* {player.foot && <span>{home?.playerCard?.foot || "Foot"}: {player.foot}</span>} */}
                  </div>
                  <p className="mt-2 text-[0.7rem] text-primary-muted">
                    {home?.playerCard?.clubAvailability ||
                      "Club & availability on confirmation"}
                  </p>
                  <div className="mt-4 flex items-center justify-between border-t border-divider pt-3">
                    <Link
                      href={`/${lang}/players/${player.id}`}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-action hover:underline"
                    >
                      {dict.homepage.featuredPlayers.viewProfile}{" "}
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                    <Link
                      href={`/${lang}/players/${player.id}?tab=media#media`}
                      className="inline-flex items-center gap-1.5 text-sm text-primary-text"
                    >
                      <Play className="h-3.5 w-3.5" />{" "}
                      {home?.playerCard?.watchHighlights || "Watch highlights"}
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Recruitment brief */}
        <section className="bg-secondary-bg-alt">
          <div className="mx-auto grid max-w-7xl gap-14 px-6 py-14 lg:grid-cols-2">
            <div>
              <p className="eyebrow">
                {home?.recruitmentBrief?.eyebrow || "For clubs & partners"}
              </p>
              <h2 className="mt-5 font-heading text-[1.6rem] md:text-4xl leading-tight uppercase">
                {home?.recruitmentBrief?.titleLine1 ||
                  "Your recruitment brief."}
                <br />
                {home?.recruitmentBrief?.titleLine2 || "Our starting point."}
              </h2>
              <p className="mt-5 max-w-md text-sm text-primary-muted">
                {home?.recruitmentBrief?.subtitle ||
                  "Tell us the player profile, position, market, budget or sporting requirement. FootballBank will identify relevant talent and coordinate the next stage of the recruitment process."}
              </p>
              <Button variant="default" size="lg" className="mt-8 ">
                <Link href={`/${lang}/players`}>
                  {home?.recruitmentBrief?.requestPlayer || "Request a player"}
                </Link>
              </Button>
            </div>
            <div>
              {briefSteps.map((s, index) => (
                <div
                  key={s.title || index}
                  className="flex items-start justify-between gap-6 border-b border-divider py-6 first:border-t"
                >
                  <div className="flex gap-5">
                    <span className="font-heading text-xs text-primary-accent-strong">
                      {s.n || BRIEF_STEPS[index]?.n || `0${index + 1}`}
                    </span>
                    <div>
                      <h3 className="text-base font-medium">{s.title}</h3>
                      <p className="mt-1.5 text-sm text-primary-muted">
                        {s.copy}
                      </p>
                    </div>
                  </div>
                  {/* <ArrowUpRight className="mt-1 h-4 w-4 text-primary-muted" /> */}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BLOG */}
        <section className="py-14 " id="blog">
          <div
            className="max-w-7xl mx-auto px-4 text-center"
            data-aos="fade-up"
          >
            <h2 className="text-[1.6rem] md:text-4xl font-bold mb-4 text-primary-text">
              {home?.blog?.title || dict.homepage.blog.title}
            </h2>
            <div className="w-24 h-1 bg-primary-accent mx-auto mb-4" />

            <div className="relative z-10 max-w-7xl mx-auto">
              <div className="flex flex-col lg:flex-row justify-end items-center mb-4 px-4 sm:px-6 lg:px-8 xl:px-12">
                <Link
                  href={`/${lang}/blog`}
                  className="group inline-flex items-center px-6 lg:px-8 py-3 lg:py-4 bg-primary-navy/5 backdrop-blur-sm border border-primary-navy/10 rounded-xl text-primary-action hover:bg-primary-navy/10 hover:border-primary-navy/20 transition-all duration-300"
                >
                  <span className="font-semibold text-sm lg:text-base">
                    {dict.homepage.blog.visitBlog}
                  </span>
                  <svg
                    className="ml-2 w-4 h-4 lg:w-5 lg:h-5 group-hover:translate-x-1 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              </div>
              <div
                className="text-left grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 px-4 py-4 sm:px-6 lg:px-8 xl:px-12"
                data-aos="fade-up"
              >
                {featuredPosts.map((post) => (
                  <article
                    key={post.id}
                    className="bg-primary-surface rounded-xl shadow hover:shadow-md transition"
                    data-aos="fade-up"
                  >
                    <Image
                      src={
                        post.imageUrl &&
                        post.imageUrl.length > 0 &&
                        post.imageUrl[0]
                          ? post.imageUrl[0]
                          : "/logo/logo3.svg"
                      }
                      alt={post.title}
                      width={400}
                      height={200}
                      className="w-full h-48 object-cover"
                    />
                    <div className="p-6">
                      <div className="text-xs md:text-sm text-primary-muted mb-2">
                        {formatTimeAgo(post.createdAt)}
                      </div>
                      <h3 className="text-lg font-semibold mb-2 text-primary-text">
                        {post.title.length > 50
                          ? post.title.slice(0, 50) + "..."
                          : post.title}
                      </h3>
                      <p className="hidden lg:block text-sm text-primary-muted mb-4 line-clamp-3">
                        {post.content.replace(/<[^>]*>/g, "").slice(0, 100)}...
                      </p>
                      <Link href={`/${lang}/blog/${post.id}`}>
                        <span className="text-primary-action hover:underline text-sm font-medium">
                          {dict.homepage.blog.readMore}
                        </span>
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
            {/* <div className="mt-10 flex justify-end"></div> */}
          </div>
        </section>

        {/* Direction */}
        <section className="mx-auto max-w-7xl px-6 py-12">
          <p className="eyebrow">
            {home?.direction?.eyebrow || "Beyond the highlight reel"}
          </p>
          <h2 className="mt-5 font-heading text-[1.6rem] md:text-4xl uppercase">
            {home?.direction?.title || "A career deserves a clear direction."}
          </h2>
          <div className="mt-8 grid gap-10 md:grid-cols-2 lg:grid-cols-4">
            {directionItems.map((d, index) => (
              <div key={d.title || index} className="rule-divider pt-5">
                <span className="text-[0.7rem] text-primary-muted">
                  {DIRECTION[index]?.n || `0${index + 1}`}
                </span>
                <h3 className="mt-6 text-base font-medium">{d.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-primary-muted">
                  {d.copy}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Founder */}
        <section className="bg-primary-navy">
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 py-16 lg:grid-cols-2">
            <div className="relative aspect-4/3 w-full overflow-hidden lg:w-[80%]">
              <Image
                src={agentInfo?.profilePhoto || "/FootballBank_agent.jpg"}
                alt={`${agentInfo?.name || "Ayodeji Michael F."} portrait`}
                loading="lazy"
                fill
                sizes="(max-width: 1024px) 100vw, 30vw"
                className="rounded-lg object-left object-cover"
              />
            </div>
            {/* <img
              src={agentInfo?.profilePhoto || "/FootballBank_agent.jpg"}
              alt={
                agentInfo?.name ||
                "Ayodeji Michael F."
              }
              width={1008}
              height={1104}
              loading="lazy"
              className="h-112 w-full rounded-lg object-left object-cover md:object-center"
            /> */}
            <div>
              <p className="eyebrow">
                {home?.founder?.eyebrow || "The people behind the pathway"}
              </p>
              <h2 className="mt-5 font-heading text-[1.6rem] md:text-4xl leading-tight text-primary-text-inverse uppercase">
                {home?.founder?.titleLine1 || "Licensed representation."}
                <br />
                <span className="text-primary-accent">
                  {home?.founder?.titleLine2 || "Personal commitment."}
                </span>
              </h2>
              <p className="mt-5 max-w-lg text-sm leading-relaxed text-primary-text-inverse/70">
                {home?.founder?.bio ||
                  "Ayodeji Fatade is the founder of FootballBank International and a FIFA Licensed Football Agent, providing licensed football-agent services within FootballBank's wider sports management and football business activities."}
              </p>
              <p className="mt-8 font-heading text-lg text-primary-text-inverse">
                {home?.founder?.name || "Ayodeji Michael .F"}
              </p>
              <p className="text-xs text-primary-text-inverse/60">
                {home?.founder?.credential || "FIFA Licensed Football Agent"}
              </p>
              <Button
                variant="onNavy"
                size="lg"
                className="mt-7 px-5 sm:w-auto sm:px-8"
              >
                <Link href={`/${lang}/agent`} className="flex gap-2">
                  {home?.founder?.meetRepresentative ||
                    "Meet our representative"}{" "}
                  <ArrowUpRight />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* CTA SECTION*/}
        <section className="bg-secondary-bg">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="eyebrow">
                {home?.ctaSection?.eyebrow || "The next conversation matters"}
              </p>
              <h2 className="mt-5 font-heading text-[1.6rem] md:text-4xl leading-tight text-primary-text-inverse uppercase">
                {home?.ctaSection?.titleLine1 || "The right talent."}
                <br />
                {home?.ctaSection?.titleLine2 || "The right opportunity."}
              </h2>
            </div>
            <div>
              <p className="text-sm text-primary-text-inverse/70">
                {home?.ctaSection?.subtitle ||
                  "Whether you're recruiting for a club, exploring a football partnership or planning the next stage of your career, start the conversation with FootballBank."}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={`/${lang}/contact`}>
                  <Button
                    variant="action"
                    size="lg"
                    className="w-full px-5 sm:w-auto sm:px-8"
                  >
                    {home?.ctaSection?.workWithUs || "Work with us"}{" "}
                    <ArrowUpRight />
                  </Button>
                </Link>

                <Link href={`/${lang}/agent`}>
                  <Button
                    variant="onNavy"
                    size="lg"
                    className="w-full px-5 sm:w-auto sm:px-8"
                  >
                    {home?.ctaSection?.seekRepresentation ||
                      "Seek representation"}{" "}
                    <ArrowUpRight />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
