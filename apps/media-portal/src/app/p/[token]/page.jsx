import { notFound } from "next/navigation";
import { cache } from "react";
import { getPortalProfile } from "@/lib/access";
import MediaExperience from "@/components/MediaExperience";

export const dynamic = "force-dynamic";
const getCachedPortalProfile = cache(getPortalProfile);

export async function generateMetadata({ params }) {
  const { token } = await params;
  const data = await getCachedPortalProfile(token);
  const firstName = data?.player.firstName?.trim();

  return {
    title: firstName || { absolute: "FootballBank" },
    robots: {
      index: false,
      follow: false,
      noarchive: true,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true,
        noarchive: true,
      },
    },
  };
}

export default async function Page({ params, searchParams }) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const data = await getCachedPortalProfile(token);
  if (!data) notFound();

  const availableViews = new Set(["media", "profile", "playlists"]);
  const requestedView = Array.isArray(query.view) ? query.view[0] : query.view;
  const selectedView = availableViews.has(requestedView)
    ? requestedView
    : "media";
  const activePage =
    selectedView === "playlists" && !data.playlists.length
      ? "media"
      : selectedView;
  const requestedType = Array.isArray(query.type) ? query.type[0] : query.type;
  const initialMediaType = requestedType === "photos" ? "photos" : "videos";
  const requestedCollection = Array.isArray(query.collection)
    ? query.collection[0]
    : query.collection;
  const initialCollection = ["FULL_MATCH", "HIGHLIGHT"].includes(
    requestedCollection,
  )
    ? requestedCollection
    : "ALL";
  const requestedPage = Number(
    Array.isArray(query.page) ? query.page[0] : query.page,
  );
  const initialGalleryPage =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;
  const requestedVideoId = Array.isArray(query.video)
    ? query.video[0]
    : query.video;
  const initialVideoId = data.media.some((item) => item.id === requestedVideoId)
    ? requestedVideoId
    : "";
  const playerPhotos = [
    ...new Set(
      [
        ...(Array.isArray(data.player.imageUrl) ? data.player.imageUrl : []),
        data.player.headshotUrl,
      ].filter(Boolean),
    ),
  ];
  const requestedPhotoIndex = Number(
    Array.isArray(query.photo) ? query.photo[0] : query.photo,
  );
  const initialPhotoIndex =
    Number.isSafeInteger(requestedPhotoIndex) &&
    requestedPhotoIndex >= 0 &&
    requestedPhotoIndex < playerPhotos.length
      ? requestedPhotoIndex
      : null;

  return (
    <MediaExperience
      token={token}
      data={data}
      activePage={activePage}
      initialMediaType={initialMediaType}
      initialCollection={initialCollection}
      initialGalleryPage={initialGalleryPage}
      initialVideoId={initialVideoId}
      initialPhotoIndex={initialPhotoIndex}
    />
  );
}
