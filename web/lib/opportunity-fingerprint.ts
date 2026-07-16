import { createHash } from "crypto";

export function postFingerprint(publisherId: string, title: string): string {
  return createHash("sha256")
    .update(`${publisherId}::${title.trim().toLowerCase()}`)
    .digest("hex")
    .slice(0, 24);
}
