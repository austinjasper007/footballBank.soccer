
import ContactClient from "./ContactClient";
import { generateMetadata as generateSEOMetadata, generateStructuredData } from "@/lib/seo";
import { getDictionary } from "@/lib/dictionaries";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  
  return generateSEOMetadata({
    title: `${dict.contact.title} - ${dict.contact.subtitle}`,
    description: `${dict.contact.title} FootballBank International for sports management, player representation, club recruitment and partnership opportunities.`,
    keywords: [
      "contact footballbank",
      "football agent contact",
      "soccer representation",
      "player management contact",
      "football scouting services",
      "sports management",
    ],
    url: `/${lang}/contact`,
    locale: lang,
  });
}

export default async function ContactPage({ params, searchParams }) {
  const [{ lang }, query] = await Promise.all([params, searchParams]);
  const dict = await getDictionary(lang);
  const requestedPlayer = Array.isArray(query.player) ? query.player[0] : query.player;
  const interestedPlayer = typeof requestedPlayer === "string"
    ? requestedPlayer.trim().slice(0, 120)
    : "";
  
  // Generate structured data for local business
  const localBusinessData = generateStructuredData("localBusiness", {
    url: `/${lang}/contact`
  });
  
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(localBusinessData)
        }}
      />
      <ContactClient lang={lang} dict={dict} interestedPlayer={interestedPlayer} />
    </>
  );
}
