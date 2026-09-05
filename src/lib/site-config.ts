import { z } from "zod";
import type { CSSProperties } from "react";
import { copyFields } from "@/lib/site-copy";

export const imageFields = [
  {
    key: "logo",
    label: "站点 Logo",
    description: "导航栏标志，留空时使用默认图标。",
    defaultValue: "",
  },
  {
    key: "favicon",
    label: "浏览器标签页图标",
    description: "建议使用正方形 PNG 图片。",
    defaultValue: "/favicon.ico",
  },
  {
    key: "hero",
    label: "首页背景图",
    description: "建议使用横向图片，文字区域保留深色遮罩。",
    defaultValue: "/arena-v2.webp",
  },
  {
    key: "event",
    label: "活动默认封面",
    description: "所有活动详情页使用的默认头图。",
    defaultValue: "/arena-v2.webp",
  },
] as const;
export type ImageKey = (typeof imageFields)[number]["key"];
export type SiteConfiguration = {
  texts: Record<string, string>;
  images: Record<ImageKey, string>;
  accent: string;
};
export const defaultSiteConfiguration: SiteConfiguration = {
  texts: {},
  images: Object.fromEntries(
    imageFields.map((field) => [field.key, field.defaultValue]),
  ) as SiteConfiguration["images"],
  accent: "#bb273b",
};
const fieldMap = new Map(copyFields.map((field) => [field.key, field]));
export function createSiteText(configuration: SiteConfiguration) {
  return (key: string): string =>
    configuration.texts[key] ?? fieldMap.get(key)?.defaultValue ?? key;
}
export function siteThemeStyle(
  configuration: SiteConfiguration,
): CSSProperties {
  const rgb = configuration.accent
    .slice(1)
    .match(/.{2}/g)!
    .map((value) => parseInt(value, 16));
  const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
  return {
    "--accent": configuration.accent,
    "--focus": configuration.accent,
    "--accent-foreground": brightness > 160 ? "#18181b" : "#ffffff",
    "--hero-image": configuration.images.hero
      ? "url(" + JSON.stringify(configuration.images.hero) + ")"
      : "none",
  } as CSSProperties;
}
export function isSafeImageSource(value: string) {
  if (
    value === "" ||
    value === "/favicon.ico" ||
    value === "/arena-cover.png" ||
    value === "/arena-v2.webp"
  )
    return true;
  if (/^\/api\/site-assets\/[a-z0-9]{20,40}$/.test(value)) return true;
  try {
    const url = new URL(value);
    return (
      ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}
const inputSchema = z
  .object({
    texts: z.record(z.string(), z.string().max(1000)).default({}),
    images: z.record(z.string(), z.string().max(2048)).default({}),
    accent: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .default("#bb273b"),
  })
  .strict();
export function validateSiteConfiguration(input: unknown): SiteConfiguration {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success)
    throw new Error(
      "设置格式有误。文字最多 1000 字，主题色需为六位十六进制颜色。",
    );
  const { texts: inputTexts, images, accent } = parsed.data;
  const texts: Record<string, string> = {};
  for (const [key, value] of Object.entries(inputTexts)) {
    const field = fieldMap.get(key);
    if (!field) throw new Error("包含无效的设置项，请刷新页面后重试。");
    if (field.required && !value.trim())
      throw new Error("「" + field.label + "」不能为空。");
    if (key === "brand.name" && value.length > 40)
      throw new Error("站点名称最多 40 字。");
    if (value !== field.defaultValue) texts[key] = value;
  }
  for (const [key, value] of Object.entries(images)) {
    if (
      !imageFields.some((field) => field.key === key) ||
      !isSafeImageSource(value)
    )
      throw new Error("图片地址只支持 HTTP、HTTPS 或本站上传的图片。");
  }
  return {
    texts,
    images: {
      ...defaultSiteConfiguration.images,
      ...Object.fromEntries(
        Object.entries(images).map(([key, value]) => [
          key,
          value === "/arena-cover.png" ? "/arena-v2.webp" : value,
        ]),
      ),
    },
    accent,
  };
}
