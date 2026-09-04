const MAX_AVATAR_BYTES = 512 * 1024;

const ALLOWED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export type AvatarUploadError = "avatar-size" | "avatar-type";

function hasValidSignature(type: string, bytes: Uint8Array) {
  if (type === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (type === "image/png") {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }

  if (type === "image/webp") {
    return (
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  }

  if (type === "image/gif") {
    const signature = String.fromCharCode(...bytes.slice(0, 6));
    return signature === "GIF87a" || signature === "GIF89a";
  }

  return false;
}

export async function avatarFileToDataUrl(file: File) {
  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error("avatar-size" satisfies AvatarUploadError);
  }

  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    throw new Error("avatar-type" satisfies AvatarUploadError);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  if (!hasValidSignature(file.type, bytes)) {
    throw new Error("avatar-type" satisfies AvatarUploadError);
  }

  return `data:${file.type};base64,${Buffer.from(bytes).toString("base64")}`;
}

