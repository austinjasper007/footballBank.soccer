import { notFound } from "next/navigation";
import { getPlayerById } from "@/actions/publicActions";
import {
  getAuthorizedPlayerDetails,
  getPlayerAccess,
} from "@/actions/resumeRequestActions";
import { trackPlayerProfileView } from "@/actions/viewTrackingActions";
import { getDictionary } from "@/lib/dictionaries";
import { generateMetadata as generateSEOMetadata } from "@/lib/seo";
import PlayerMedia from "./PlayerMedia";

export async function generateMetadata({ params }) {
  const { id, lang } = await params;
  const player = await getPlayerById(id);
  if (!player) return {};
  await getDictionary(lang);
  return generateSEOMetadata({
    title: `${player.firstName} ${player.lastName} | FootballBank`,
    description: `View photos and football footage for ${player.firstName} ${player.lastName}.`,
    image: player.headshotUrl || player.imageUrl?.[0],
    url: `/${lang}/players/${id}`,
    type: "profile",
  });
}

export default async function PlayerPage({ params, searchParams }) {
  const { id, lang } = await params;
  const { tab } = await searchParams;
  const player = await getPlayerById(id);
  if (!player) notFound();

  await trackPlayerProfileView(id, lang);

  let access = { profileAccess: false, cvAccess: false };
  try {
    access = await getPlayerAccess(id);
  } catch {
    access = { profileAccess: false, cvAccess: false };
  }
  const privateDetails = access.profileAccess
    ? await getAuthorizedPlayerDetails(id)
    : null;
  const canViewDetails = Boolean(privateDetails);

  const publicPlayer = {
    id: player.id,
    firstName: player.firstName,
    lastName: player.lastName,
    position: player.position,
    country: player.country,
    currentClub: player.currentClub,
    headshotUrl: player.headshotUrl,
    imageUrl: player.imageUrl || [],
    videoPrimary: player.videoPrimary,
    videoAdditional: player.videoAdditional || [],
  };
  const approvedPlayer = privateDetails
    ? { ...publicPlayer, ...privateDetails }
    : publicPlayer;

  return (
    <PlayerMedia
      player={approvedPlayer}
      canViewDetails={canViewDetails}
      canDownloadResume={access.cvAccess}
      lang={lang}
      initialSection={tab === "media" ? "media" : "overview"}
      id={"highlights"}
    />
  );
}
