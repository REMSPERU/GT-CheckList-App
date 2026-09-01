import { RequestCodeDetail } from '@/components/admin/alexperto/request-code-detail';

export const dynamicParams = true;

export default async function RequestCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <RequestCodeDetail code={code} />;
}
