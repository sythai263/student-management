import { PlayerScreen } from "@components/play";

interface PlaySessionPageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function PlaySessionPage({
  params,
}: PlaySessionPageProps) {
  const { sessionId } = await params;
  return <PlayerScreen sessionId={sessionId} />;
}
