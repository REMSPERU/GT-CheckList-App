import NetInfo from '@react-native-community/netinfo';

import { supabase } from '@/lib/supabase';
import { getLocalChecklistPropertyTemplate } from '@/services/db/checklist';
import type { ChecklistPropertyTemplate } from '@/types/checklist';

/** Resolve the published template for one property and asset type. */
export async function getChecklistPropertyTemplate(
  propertyId: string,
  equipamentoId: string,
): Promise<ChecklistPropertyTemplate | null> {
  const local = await getLocalChecklistPropertyTemplate(
    propertyId,
    equipamentoId,
  );
  if (local) return local;

  const network = await NetInfo.fetch();
  if (network.isConnected === false || network.isInternetReachable === false) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);

  try {
    const { data, error } = await supabase
      .from('current_checklist_property_templates')
      .select('*')
      .eq('property_id', propertyId)
      .eq('equipamento_id', equipamentoId)
      .abortSignal(controller.signal)
      .maybeSingle();

    if (error?.code === 'PGRST205' || error?.code === '42P01') return null;
    if (error) throw error;

    return data as ChecklistPropertyTemplate | null;
  } finally {
    clearTimeout(timeout);
  }
}
