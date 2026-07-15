import { ensureDefaultSources, syncSource } from "../lib/sources/sync";

async function main() {
  await ensureDefaultSources();
  const r = await syncSource("portal_directory");
  console.log(JSON.stringify(r));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
