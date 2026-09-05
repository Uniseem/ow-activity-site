import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from "fflate";
import { BACKUP_MAX_BYTES, BACKUP_MAX_MEDIA_BYTES, BACKUP_MAX_ASSET_BYTES, BACKUP_MAX_FILES, BackupError, backupManifestSchema, type BackupManifest } from "./backup-format";

export const BACKUP_MAX_ZIP_BYTES = BACKUP_MAX_BYTES + BACKUP_MAX_MEDIA_BYTES + 2 * 1024 * 1024;
const MANIFEST_MAX_BYTES = 1024 * 1024;
export async function backupDigest(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes).buffer);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Inspect every directory entry before inflation. fflate uses a fixed-size
// output buffer for deflate entries, bounded by these validated sizes.
export function inspectBackupZip(bytes: Uint8Array) {
  if (bytes.length > BACKUP_MAX_ZIP_BYTES || bytes.length < 22) throw new BackupError("ZIP 文件为空或超过备份大小上限。");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65_557); i--) {
    if (view.getUint32(i, true) === 0x06054b50 && i + 22 + view.getUint16(i + 20, true) === bytes.length) { end = i; break; }
  }
  if (end < 0) throw new BackupError("ZIP 文件尾部损坏。");
  const count = view.getUint16(end + 10, true);
  if (view.getUint16(end + 4, true) || view.getUint16(end + 6, true) || view.getUint16(end + 8, true) !== count || count < 2 || count > BACKUP_MAX_FILES + 1)
    throw new BackupError("仅支持本站生成的标准备份 ZIP。");
  const centralSize = view.getUint32(end + 12, true), centralStart = view.getUint32(end + 16, true);
  if (centralStart + centralSize !== end) throw new BackupError("ZIP 文件目录损坏。");
  let cursor = centralStart, mediaBytes = 0;
  const names = new Set<string>();
  const ranges: { start: number; end: number }[] = [];
  for (let index = 0; index < count; index++) {
    if (cursor + 46 > end || view.getUint32(cursor, true) !== 0x02014b50) throw new BackupError("ZIP 文件目录损坏。");
    const flags = view.getUint16(cursor + 8, true), method = view.getUint16(cursor + 10, true);
    const packed = view.getUint32(cursor + 20, true), size = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true), extraLength = view.getUint16(cursor + 30, true), commentLength = view.getUint16(cursor + 32, true);
    const offset = view.getUint32(cursor + 42, true);
    if (cursor + 46 + nameLength + extraLength + commentLength > end || (flags & 1) || ![0, 8].includes(method) || view.getUint16(cursor + 34, true)) throw new BackupError("ZIP 使用了不支持的格式。");
    const name = strFromU8(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
    if (!/^(?:manifest\.json|data\.json|media\/[A-Za-z0-9_-]+\.bin)$/.test(name) || names.has(name)) throw new BackupError("ZIP 包含重复文件或不允许的路径。");
    names.add(name);
    const limit = name === "manifest.json" ? MANIFEST_MAX_BYTES : name === "data.json" ? BACKUP_MAX_BYTES : BACKUP_MAX_ASSET_BYTES;
    if (!size || size > limit) throw new BackupError("ZIP 解压后超过允许大小。");
    if (name.startsWith("media/")) mediaBytes += size;
    if (mediaBytes > BACKUP_MAX_MEDIA_BYTES || offset + 30 > centralStart || view.getUint32(offset, true) !== 0x04034b50) throw new BackupError("ZIP 媒体过大或文件头损坏。");
    const localNameLength = view.getUint16(offset + 26, true), localExtraLength = view.getUint16(offset + 28, true);
    const dataStart = offset + 30 + localNameLength + localExtraLength;
    if (dataStart + packed > centralStart || view.getUint16(offset + 6, true) !== flags || view.getUint16(offset + 8, true) !== method || strFromU8(bytes.subarray(offset + 30, offset + 30 + localNameLength)) !== name)
      throw new BackupError("ZIP 文件头与目录不一致。");
    if (method === 0 && packed !== size) throw new BackupError("ZIP 文件大小声明不一致。");
    if (ranges.some((range) => offset < range.end && dataStart + packed > range.start)) throw new BackupError("ZIP 文件内容重叠。");
    ranges.push({ start: offset, end: dataStart + packed });
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  if (cursor !== end || !names.has("data.json") || !names.has("manifest.json")) throw new BackupError("ZIP 缺少备份清单或数据文件。");
}

export async function readBackupZip(bytes: Uint8Array) {
  inspectBackupZip(bytes);
  let files: Record<string, Uint8Array>;
  try { files = unzipSync(bytes); } catch { throw new BackupError("ZIP 文件损坏，无法解压。"); }
  let raw: unknown;
  try { raw = JSON.parse(strFromU8(files["manifest.json"])); } catch { throw new BackupError("备份清单损坏。"); }
  const result = backupManifestSchema.safeParse(raw);
  if (!result.success) throw new BackupError("备份版本不兼容或清单损坏。");
  if (Object.keys(files).length !== result.data.files.length + 1) throw new BackupError("ZIP 包含清单未列出的文件。");
  for (const file of result.data.files) {
    const data = files[file.path];
    if (!data || data.length !== file.bytes || await backupDigest(data) !== file.sha256) throw new BackupError(`备份文件 ${file.path} 校验失败。`);
  }
  delete files["manifest.json"];
  return { manifest: result.data, files };
}

export function createBackupZip(manifest: BackupManifest, files: Record<string, Uint8Array>) {
  const archive: Zippable = { "manifest.json": strToU8(JSON.stringify(manifest)) };
  for (const file of manifest.files) archive[file.path] = [files[file.path], { level: file.path === "data.json" ? 6 : 0 }];
  return zipSync(archive, { level: 6 });
}
export function bytesToBase64(bytes: Uint8Array) {
  let value = "";
  for (let i = 0; i < bytes.length; i += 8192) value += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(value);
}
export function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}
