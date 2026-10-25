import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { createSignedEmbedUrl } from "./playback.js";

test("playback credentials expire after 15 minutes", () => {
  const signed = createSignedEmbedUrl({
    libraryId: "123",
    tokenKey: "token-key",
    videoId: "video-guid",
    shareExpiresAt: new Date(1_700_100_000 * 1000),
    nowSeconds: 1_700_000_000,
  });
  const token = createHash("sha256").update(`token-keyvideo-guid${1_700_000_900}`).digest("hex");

  assert.equal(signed.expires, 1_700_000_900);
  assert.equal(signed.url, `https://player.mediadelivery.net/embed/123/video-guid?token=${token}&expires=1700000900`);
});

test("playback expiry is capped at the share expiry", () => {
  const signed = createSignedEmbedUrl({
    libraryId: "123",
    tokenKey: "token-key",
    videoId: "video-guid",
    shareExpiresAt: new Date(1_700_000_100 * 1000),
    nowSeconds: 1_700_000_000,
  });
  assert.equal(signed.expires, 1_700_000_100);
});

test("expired shares and missing signing configuration do not produce an embed URL", () => {
  const options = {
    libraryId: "123",
    tokenKey: "token-key",
    videoId: "video-guid",
    shareExpiresAt: new Date(1_699_999_999 * 1000),
    nowSeconds: 1_700_000_000,
  };
  assert.equal(createSignedEmbedUrl(options), null);
  assert.equal(createSignedEmbedUrl({ ...options, shareExpiresAt: new Date(1_700_001_000 * 1000), tokenKey: "" }), null);
});
