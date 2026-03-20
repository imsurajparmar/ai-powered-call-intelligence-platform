import { CallDetailClient } from "./call-detail-client";

export default function CallPage({ params }: { params: { id: string } }) {
  return <CallDetailClient id={params.id} />;
}
