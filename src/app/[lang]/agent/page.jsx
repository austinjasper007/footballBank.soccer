import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  GraduationCap,
  IdCard,
  Mail,
  Phone,
  UsersRound,
} from "lucide-react";
import { getDictionary } from "@/lib/dictionaries";
import { getAgentInfo } from "@/actions/adminActions";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return {
    title: dict.agentPage.metadata.title,
    description: dict.agentPage.metadata.description,
  };
}



export default async function RepresentationPage({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const agentInfo = await getAgentInfo();
  const agentName = agentInfo?.name || dict.agentPage.hero.name;
  const credential = agentInfo?.credentials || dict.agentPage.hero.licence.title;
  const capabilities = [
    {
      icon: IdCard,
      title: dict.agentPage.hero.licence.title || credential,
      description: dict.agentPage.hero.licence.id,
    },
    {
      icon: BadgeCheck,
      title: dict.agentPage.hero.stats.experience.title,
      description: dict.agentPage.hero.stats.experience.subtitle,
    },
    {
      icon: UsersRound,
      title: dict.agentPage.capabilityPerspective?.title || "Global perspective",
      description: dict.agentPage.capabilityPerspective?.subtitle || "International football markets",
    },
    {
      icon: GraduationCap,
      title: dict.agentPage.capabilityDevelopment?.title || "Career development",
      description: dict.agentPage.capabilityDevelopment?.subtitle || "Guiding players with strategic planning and professional growth.",
    },
  ];

  return (
    <main className="bg-primary-card text-primary-text">
      <section className="relative isolate flex h-14 items-end overflow-hidden sm:h-18 lg:h-24">
        <Image
          src="/ball-bg.jpg"
          alt="Football pitch"
          fill
          priority
          sizes="100vw"
          className="-z-20 object-cover object-center"
        />
        <div className="absolute inset-0 -z-10 bg-primary-navy/55" />
        <div className="mx-auto w-full max-w-7xl px-5 py-4 ">
          <p className="text-center font-heading text-4xl font-semibold leading-none tracking-tight text-primary-text-inverse sm:text-5xl">
            {dict.agentPage.heroBanner || "Licensed Representation"}
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-10 sm:py-16 lg:grid-cols-[minmax(250px,0.65fr)_minmax(0,1.4fr)] lg:items-start lg:gap-12 lg:px-12 lg:py-20">
        <aside className="mx-auto w-full max-w-sm text-center">
          <div className="relative aspect-3/2 overflow-hidden border-2 border-primary-action bg-primary-bg">
            <Image
              src={agentInfo?.profilePhoto || "/FootballBank_agent.jpg"}
              alt={`${agentName} portrait`}
              fill
              sizes="(max-width: 1024px) 100vw, 30vw"
              className="object-cover object-center"
            />
          </div>
          <h1 className="mt-4 font-heading text-3xl font-semibold leading-none tracking-tight sm:text-4xl">
            {agentName}
          </h1>

          <div className="mt-4 bg-primary-navy px-5 py-6 text-left text-primary-text-inverse">
            <div className="text-center">
              <BadgeCheck className="mx-auto size-6 text-primary-accent" aria-hidden="true" />
              <h2 className="mt-2 font-heading text-2xl font-semibold leading-none">{dict.agentPage.directContact || "Direct contact"}</h2>
              <span className="mx-auto mt-3 block h-px w-24 bg-primary-accent" />
            </div>
            <div className="mt-5 space-y-3 text-sm">
              <a href="tel:+18623402213" className="flex items-center gap-3 transition-colors hover:text-primary-accent">
                <Phone className="size-4 shrink-0 text-primary-accent" aria-hidden="true" />
                +1 (862) 340-2213
              </a>
              <a href="mailto:contact@footballbank.soccer" className="flex items-center gap-3 break-all transition-colors hover:text-primary-accent">
                <Mail className="size-4 shrink-0 text-primary-accent" aria-hidden="true" />
                contact@footballbank.soccer
              </a>
            </div>
            <Link
              href={`/${lang}/contact`}
              className="mt-6 inline-flex w-full items-center justify-center gap-3 bg-primary-action px-4 py-3 text-sm font-semibold text-primary-text-inverse transition-colors hover:bg-primary-action-hover"
            >
              {dict.agentPage.discussRepresentation || "Discuss representation"}
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </aside>

        <div>
          <h2 className="font-heading text-2xl font-semibold leading-[1.08] tracking-tight sm:text-3xl">
            {dict.agentPage.pageHeadingLine1 || "Licensed representation."}<br />{dict.agentPage.pageHeadingLine2 || "Global perspective."}
          </h2>
          <div className="mt-5 border border-divider bg-primary-bg px-5 py-6 sm:px-8 sm:py-7">
            <p className="max-w-2xl text-base leading-7 text-primary-text">
              {dict.agentPage.bioParagraph ||
                "Meet the licensed football agent behind FootballBank's representation services. Ayodeji Michael .F is a FIFA Licensed Football Agent and founder of FootballBank International, a United States-based sports management company working across player development, club recruitment, international partnerships and football opportunities."}
            </p>

            <div className="mt-8 space-y-6">
              {capabilities.map(({ icon: Icon, title, description }) => (
                <div key={title} className="grid grid-cols-[2.5rem_1fr] gap-4 sm:grid-cols-[4.5rem_1fr] sm:gap-5">
                  <Icon className="mt-1 size-7 text-primary-accent sm:size-9" aria-hidden="true" />
                  <div className="border-l border-divider pl-4 sm:pl-5">
                    <h3 className="text-xl font-semibold leading-tight tracking-tight sm:text-2xl">{title}</h3>
                    <p className="mt-1.5 text-base leading-7 text-primary-muted">{description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-4 border-t border-divider pt-6 sm:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-primary-text">{dict.agentPage.hero.stats.experience.title}</p>
                <p className="mt-1 text-sm leading-6 text-primary-muted">{dict.agentPage.hero.stats.experience.subtitle}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-primary-text">{dict.agentPage.hero.stats.focus.title}</p>
                <p className="mt-1 text-sm leading-6 text-primary-muted">{dict.agentPage.hero.stats.focus.subtitle}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
