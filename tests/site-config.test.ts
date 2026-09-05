import test from "node:test";
import assert from "node:assert/strict";
import {
  createSiteText,
  validateSiteConfiguration,
  isSafeImageSource,
} from "../src/lib/site-config";
import { editableCopyFields } from "../src/lib/site-copy";
import { validateSiteAsset, MAX_SITE_ASSET_BYTES } from "../src/lib/site-asset";

test("defaults render existing copy and overrides stay scoped to one UI location", () => {
  const defaults = validateSiteConfiguration({});
  assert.equal(createSiteText(defaults)("brand.name"), "上海交大守望先锋");
  const custom = validateSiteConfiguration({
    texts: { "home.title1": "周末集结", "brand.name": "测试社区" },
  });
  assert.equal(createSiteText(custom)("home.title1"), "周末集结");
  assert.equal(createSiteText(custom)("brand.name"), "测试社区");
  assert.equal(
    createSiteText(custom)("brand.subtitle"),
    createSiteText(defaults)("brand.subtitle"),
  );
  assert.equal(
    createSiteText(custom)("用户自己填写的活动标题"),
    "用户自己填写的活动标题",
  );
});

test("empty optional copy stays empty, required labels cannot disappear, defaults normalize", () => {
  assert.equal(
    createSiteText(validateSiteConfiguration({ texts: { "footer.note": "" } }))(
      "footer.note",
    ),
    "",
  );
  assert.throws(() =>
    validateSiteConfiguration({ texts: { "brand.name": "  " } }),
  );
  assert.throws(() =>
    validateSiteConfiguration({ texts: { "brand.name": "站".repeat(41) } }),
  );
  assert.deepEqual(
    validateSiteConfiguration({ texts: { "brand.name": "上海交大守望先锋" } })
      .texts,
    {},
  );
  assert.throws(() =>
    validateSiteConfiguration({ texts: { removedKey: "unknown" } }),
  );
});

test("asset URLs and legacy theme values reject executable or unknown configuration", () => {
  for (const url of [
    "javascript:alert(1)",
    "data:image/svg+xml,<svg/>",
    "//example.org/image.png",
    "/api/private",
    "https://user:pass@example.org/a.png",
  ])
    assert.equal(isSafeImageSource(url), false);
  assert.equal(isSafeImageSource("https://example.org/a.png?q=test"), true);
  assert.equal(
    isSafeImageSource("/api/site-assets/c123456789012345678901234"),
    true,
  );
  assert.throws(() =>
    validateSiteConfiguration({ images: { hero: "javascript:alert(1)" } }),
  );
  assert.throws(() =>
    validateSiteConfiguration({ accent: "red;display:none" }),
  );
  assert.throws(() => validateSiteConfiguration({ icons: {} }));
});

test("editing branding preserves retired copy and colors while allowing images to be cleared", () => {
  const stored = validateSiteConfiguration({
    texts: {
      "brand.subtitle": "An earlier subtitle",
      "home.eyebrow": "An earlier heading",
      "footer.text": "An earlier footer",
    },
    accent: "#00ff88",
    images: {
      logo: "https://example.org/logo.png",
      favicon: "https://example.org/icon.png",
    },
  });
  const saved = validateSiteConfiguration({
    ...stored,
    texts: { ...stored.texts, "brand.name": "新站名" },
    images: { ...stored.images, logo: "", favicon: "" },
  });
  assert.equal(saved.accent, stored.accent);
  assert.equal(saved.texts["brand.subtitle"], stored.texts["brand.subtitle"]);
  assert.equal(saved.texts["home.eyebrow"], stored.texts["home.eyebrow"]);
  assert.equal(saved.texts["footer.text"], stored.texts["footer.text"]);
  assert.equal(saved.images.logo, "");
  assert.equal(saved.images.favicon, "");
  assert.equal(saved.texts["brand.name"], "新站名");
  for (const key of [
    "brand.badge",
    "brand.subtitle",
    "home.eyebrow",
    "footer.text",
  ]) {
    assert.equal(
      editableCopyFields.some((field) => field.key === key),
      false,
    );
  }
});

test("uploads enforce size and MIME signatures, including spoofed SVG", async () => {
  const gif = Uint8Array.from([71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 0, 0, 0]);
  assert.deepEqual(
    await validateSiteAsset(
      new File([gif], "pixel.gif", { type: "image/gif" }),
    ),
    gif,
  );
  await assert.rejects(
    validateSiteAsset(
      new File(["<svg onload='alert(1)'/>"], "fake.png", { type: "image/png" }),
    ),
  );
  await assert.rejects(
    validateSiteAsset(new File([gif], "pixel.svg", { type: "image/svg+xml" })),
  );
  await assert.rejects(
    validateSiteAsset(
      new File([new Uint8Array(MAX_SITE_ASSET_BYTES + 1)], "large.png", {
        type: "image/png",
      }),
    ),
  );
  await assert.rejects(
    validateSiteAsset(new File([], "empty.png", { type: "image/png" })),
  );
});
