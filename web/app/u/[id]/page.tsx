import { PublicProfile } from "@/components/PublicProfile";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main>
      <PublicProfile userId={id} />
    </main>
  );
}
