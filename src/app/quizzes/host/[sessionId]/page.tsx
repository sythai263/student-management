import { HostRoom } from "@components/quiz";

interface HostPageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function HostPage({ params }: HostPageProps) {
  const { sessionId } = await params;
  return <HostRoom sessionId={sessionId} />;
}
