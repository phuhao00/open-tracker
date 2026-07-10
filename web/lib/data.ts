import { promises as fs } from "fs";
import path from "path";
import type { TrackingSnapshot } from "./types";

const CANDIDATES = [
  path.join(process.cwd(), "..", "data", "history", "latest.json"),
  path.join(process.cwd(), "data", "history", "latest.json"),
  path.join(process.cwd(), "public", "data", "latest.json"),
];

export async function loadSnapshot(): Promise<TrackingSnapshot> {
  let lastError: unknown;
  for (const file of CANDIDATES) {
    try {
      const raw = await fs.readFile(file, "utf-8");
      return JSON.parse(raw) as TrackingSnapshot;
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(
    `找不到追踪数据 latest.json。请先在仓库根目录运行 opentacker run。最后错误: ${String(lastError)}`,
  );
}
