import { ensureDefaultSources, syncSource } from "../lib/sources/sync";

const KEYS = ["remoteok", "remotive", "jobicy", "arbeitnow"] as const;

async function main() {
  await ensureDefaultSources();
  for (const key of KEYS) {
    const started = Date.now();
    try {
      const r = await syncSource(key);
      console.log(JSON.stringify({ ...r, ms: Date.now() - started }));
    } catch (e) {
      console.log(
        JSON.stringify({
          key,
          error: e instanceof Error ? e.message : String(e),
          ms: Date.now() - started,
        }),
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
