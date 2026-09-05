export const MAX_SITE_ASSET_BYTES = 2 * 1024 * 1024;
export async function validateSiteAsset(
  file: File,
): Promise<Uint8Array<ArrayBuffer>> {
  if (file.size > MAX_SITE_ASSET_BYTES || file.size === 0)
    throw new Error("图片不能为空，且不能超过 2 MB。");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const ascii = (start: number, end: number) =>
    String.fromCharCode(...bytes.slice(start, end));
  const valid =
    file.type === "image/png"
      ? bytes.length >= 24 &&
        [137, 80, 78, 71, 13, 10, 26, 10].every(
          (value, index) => bytes[index] === value,
        )
      : file.type === "image/jpeg"
        ? bytes.length >= 12 &&
          bytes[0] === 255 &&
          bytes[1] === 216 &&
          bytes[2] === 255
        : file.type === "image/webp"
          ? bytes.length >= 16 &&
            ascii(0, 4) === "RIFF" &&
            ascii(8, 12) === "WEBP"
          : file.type === "image/gif"
            ? bytes.length >= 13 && ["GIF87a", "GIF89a"].includes(ascii(0, 6))
            : false;
  if (!valid)
    throw new Error("图片格式不正确，只支持 PNG、JPEG、WebP 或 GIF。");
  return bytes;
}
