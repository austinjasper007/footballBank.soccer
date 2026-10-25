import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import test from "node:test";
import {
  assignBunnyVideoToCollection,
  ensureBunnyStreamCollection,
  ensureBunnyStreamCollections,
  getBunnyCollectionName,
  getBunnyStreamLibraryId,
  getBunnyStreamTokenAuthKey,
  getBunnyUploadCredentials,
  getBunnyWebhookSigningSecret,
  verifyBunnyWebhookSignature,
} from "./bunnyStream.js";

test("Bunny configuration accepts the environment variable names used by the app", () => {
  assert.equal(getBunnyStreamLibraryId({ BUNNY_LIBRARY_ID: "123" }), "123");
  assert.equal(getBunnyStreamLibraryId({ BUNNY_STREAM_LIBRARY_ID: "456", BUNNY_LIBRARY_ID: "123" }), "456");
  assert.equal(getBunnyStreamTokenAuthKey({ BUNNY_TOKEN_AUTH_KEY: "token-key" }), "token-key");
  assert.equal(getBunnyWebhookSigningSecret({ BUNNY_WEBHOOK_SECRET: "webhook-key" }), "webhook-key");
});

test("upload credentials are scoped to one video and expire after one day", () => {
  const credentials = getBunnyUploadCredentials({
    libraryId: "123",
    apiKey: "server-secret",
    videoId: "video-guid",
    nowSeconds: 1_700_000_000,
  });
  assert.equal(credentials.endpoint, "https://video.bunnycdn.com/tusupload");
  assert.equal(credentials.videoId, "video-guid");
  assert.equal(credentials.libraryId, "123");
  assert.equal(credentials.collectionId, undefined);
  assert.equal(credentials.expires, 1_700_086_400);
  assert.equal(
    credentials.signature,
    createHash("sha256")
      .update(`123server-secret${credentials.expires}video-guid`)
      .digest("hex"),
  );
});

test("Bunny media categories map to their named collections", () => {
  assert.equal(getBunnyCollectionName("FULL_MATCH"), "Match");
  assert.equal(getBunnyCollectionName("HIGHLIGHT"), "Highlights");
  assert.throws(() => getBunnyCollectionName("OTHER"), /Unsupported media category/);
});

test("Bunny collection lookup reuses an existing exact name", async () => {
  const calls = [];
  const collectionId = await ensureBunnyStreamCollection({
    libraryId: "123",
    apiKey: "server-secret",
    name: "Match",
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options });
      return Response.json({
        items: [
          { name: "Match recap", guid: "not-the-match-collection" },
          { name: "match", guid: "existing-match-id" },
        ],
      });
    },
  });
  assert.equal(collectionId, "existing-match-id");
  assert.equal(calls.length, 1);
  assert.equal(new URL(calls[0].url).searchParams.get("search"), "Match");
});

test("Bunny collection setup creates missing collections and returns category IDs", async () => {
  const createdNames = [];
  const collectionIds = await ensureBunnyStreamCollections({
    libraryId: "123",
    apiKey: "server-secret",
    fetchImpl: async (url, options = {}) => {
      if (options.method === "POST") {
        const { name } = JSON.parse(options.body);
        createdNames.push(name);
        return Response.json({ guid: `${name.toLowerCase()}-id` });
      }
      return Response.json({ items: [] });
    },
  });
  assert.deepEqual(new Set(createdNames), new Set(["Match", "Highlights"]));
  assert.deepEqual(collectionIds, { FULL_MATCH: "match-id", HIGHLIGHT: "highlights-id" });
});

test("Bunny video collection assignment uses the documented update endpoint", async () => {
  let request;
  await assignBunnyVideoToCollection({
    libraryId: "123",
    apiKey: "server-secret",
    videoId: "video-guid",
    collectionId: "collection-guid",
    fetchImpl: async (url, options) => {
      request = { url: String(url), options };
      return Response.json({ success: true });
    },
  });
  assert.equal(request.url, "https://video.bunnycdn.com/library/123/videos/video-guid");
  assert.equal(request.options.method, "POST");
  assert.deepEqual(JSON.parse(request.options.body), { collectionId: "collection-guid" });
});

test("Bunny collection lookup rejects malformed successful responses", async () => {
  await assert.rejects(
    ensureBunnyStreamCollection({
      libraryId: "123",
      apiKey: "server-secret",
      name: "Match",
      fetchImpl: async () => Response.json({ collections: [] }),
    }),
    /invalid collection list/i,
  );
});

test("Bunny webhook HMAC validates raw bytes and rejects invalid version or body", () => {
  const body = Buffer.from('{"VideoGuid":"abc","Status":3}');
  const signature = createHmac("sha256", "read-only-key").update(body).digest("hex");

  assert.equal(verifyBunnyWebhookSignature(body, signature, "v1", "hmac-sha256", "read-only-key"), true);
  assert.equal(verifyBunnyWebhookSignature(Buffer.from(`${body} `), signature, "v1", "hmac-sha256", "read-only-key"), false);
  assert.equal(verifyBunnyWebhookSignature(body, signature, "v2", "hmac-sha256", "read-only-key"), false);
  assert.equal(verifyBunnyWebhookSignature(body, "invalid", "v1", "hmac-sha256", "read-only-key"), false);
});
