import { ensureDefaultSources, syncAllEnabledSources } from "../lib/sources/sync";

async function main() {
  await ensureDefaultSources();
  const results = await syncAllEnabledSources();
  console.log(JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
