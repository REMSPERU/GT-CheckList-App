import { QuoteCodeDetail } from '@/components/admin/alexperto/quote-code-detail';

export const dynamicParams = true;

export default async function QuoteCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <QuoteCodeDetail code={code} />;
}
