import crypto from "node:crypto";

export const BUNNY_COLLECTION_NAMES = Object.freeze({
  FULL_MATCH: "Match",
  HIGHLIGHT: "Highlights",
});

export function getBunnyStreamLibraryId(env = process.env) {
  return (env.BUNNY_STREAM_LIBRARY_ID || env.BUNNY_LIBRARY_ID || "").trim();
}

export function getBunnyCollectionName(category) {
  const name = BUNNY_COLLECTION_NAMES[category];
  if (!name) throw new Error("Unsupported media category.");
  return name;
}

export function getBunnyStreamTokenAuthKey(env = process.env) {
  return (env.BUNNY_STREAM_TOKEN_AUTH_KEY || env.BUNNY_TOKEN_AUTH_KEY || "").trim();
}

export function getBunnyWebhookSigningSecret(env = process.env) {
  return (env.BUNNY_STREAM_READ_ONLY_API_KEY || env.BUNNY_WEBHOOK_SECRET || "").trim();
}

export function getBunnyUploadCredentials({
  libraryId,
  apiKey,
  videoId,
  collectionId,
  nowSeconds = Math.floor(Date.now() / 1000),
}) {
  const expires = nowSeconds + 24 * 60 * 60;
  const signature = crypto.createHash("sha256")
    .update(`${libraryId}${apiKey}${expires}${videoId}`)
    .digest("hex");
  return {
    endpoint: "https://video.bunnycdn.com/tusupload",
    libraryId,
    videoId,
    collectionId,
    expires,
    signature,
  };
}

export async function ensureBunnyStreamCollection({ libraryId, apiKey, name, fetchImpl = fetch }) {
  const baseUrl = `https://video.bunnycdn.com/library/${encodeURIComponent(libraryId)}/collections`;
  const listUrl = new URL(baseUrl);
  listUrl.searchParams.set("page", "1");
  listUrl.searchParams.set("itemsPerPage", "1000");
  listUrl.searchParams.set("search", name);

  const listResponse = await fetchImpl(listUrl, {
    headers: { AccessKey: apiKey, Accept: "application/json" },
    cache: "no-store",
  });
  if (!listResponse.ok) {
    throw new Error(`Bunny collection lookup failed with status ${listResponse.status}.`);
  }

  const collectionList = await listResponse.json();
  if (
    !collectionList
    || (collectionList.items !== null && !Array.isArray(collectionList.items))
  ) {
    throw new Error("Bunny returned an invalid collection list.");
  }
  const existing = collectionList.items?.find(
    (collection) => collection.name?.trim().toLowerCase() === name.toLowerCase(),
  );
  if (existing) {
    if (typeof existing.guid !== "string" || !existing.guid) {
      throw new Error("Bunny returned an invalid collection identifier.");
    }
    return existing.guid;
  }

  const createResponse = await fetchImpl(baseUrl, {
    method: "POST",
    headers: {
      AccessKey: apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ name }),
    cache: "no-store",
  });
  if (!createResponse.ok) {
    throw new Error(`Bunny collection creation failed with status ${createResponse.status}.`);
  }

  const created = await createResponse.json();
  if (typeof created.guid !== "string" || !created.guid) {
    throw new Error("Bunny returned an invalid collection identifier.");
  }
  return created.guid;
}

export async function ensureBunnyStreamCollections({ libraryId, apiKey, fetchImpl = fetch }) {
  const [matchCollectionId, highlightsCollectionId] = await Promise.all([
    ensureBunnyStreamCollection({
      libraryId,
      apiKey,
      name: getBunnyCollectionName("FULL_MATCH"),
      fetchImpl,
    }),
    ensureBunnyStreamCollection({
      libraryId,
      apiKey,
      name: getBunnyCollectionName("HIGHLIGHT"),
      fetchImpl,
    }),
  ]);
  return {
    FULL_MATCH: matchCollectionId,
    HIGHLIGHT: highlightsCollectionId,
  };
}

export async function assignBunnyVideoToCollection({
  libraryId,
  apiKey,
  videoId,
  collectionId,
  fetchImpl = fetch,
}) {
  const response = await fetchImpl(
    `https://video.bunnycdn.com/library/${encodeURIComponent(libraryId)}/videos/${encodeURIComponent(videoId)}`,
    {
      method: "POST",
      headers: {
        AccessKey: apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ collectionId }),
      cache: "no-store",
    },
  );
  if (!response.ok) {
    throw new Error(`Bunny video collection update failed with status ${response.status}.`);
  }
  const result = await response.json();
  if (result.success === false) {
    throw new Error(result.message || "Bunny did not update the video collection.");
  }
}

export function verifyBunnyWebhookSignature(rawBody, signature, version, algorithm, secret) {
  if (version !== "v1" || algorithm !== "hmac-sha256" || !/^[0-9a-f]{64}$/.test(signature || "")) {
    return false;
  }
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(signature, "utf8"));
}
