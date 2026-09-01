import { notFound } from 'next/navigation';
import { PublicProgressDashboard } from '@/components/progress/public-progress-dashboard';
import { getPublicProgress } from '@/services/progress-public.service';
export const dynamic = 'force-dynamic';
export default async function PublicProgressPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const data = await getPublicProgress((await params).token);
  if (!data) notFound();
  return <PublicProgressDashboard data={data} />;
}
