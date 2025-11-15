import type { SupabaseClient } from '@supabase/supabase-js';
import {
  DEFAULT_PLAN_ID,
  PLAN_RECORD,
  type PlanDefinition,
  type PlanTier,
} from './pricing';

type PlanRow = {
  id: PlanTier;
  name?: string;
  ghost_mini_quota: number | null;
  ghost_pro_quota: number | null;
  max_words: number | null;
};

type SubscriptionRow = {
  plan_id: PlanTier;
};

export type UsageCounterRow = {
  id: string;
  plan_id: PlanTier;
  ghost_mini_used: number;
  ghost_pro_used: number;
};

export type UsageMode = 'ghost_mini' | 'ghost_pro';

export function countWordsApprox(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return 0;

  return trimmed
    .replace(/[\r\n]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .reduce((acc, segment) => {
      const containsCjk = /[\u4E00-\u9FFF\u3400-\u4DBF]/.test(segment);
      return acc + (containsCjk ? segment.length : 1);
    }, 0);
}

export function todayIsoDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function mapPlanRow(row?: PlanRow | null) {
  if (!row) return null;
  const fallback = PLAN_RECORD[row.id] ?? PLAN_RECORD[DEFAULT_PLAN_ID];
  return {
    ...fallback,
    id: row.id,
    name: row.name ?? fallback.name,
    limits: {
      ghostMiniQuota: row.ghost_mini_quota ?? fallback.limits.ghostMiniQuota,
      ghostProQuota: row.ghost_pro_quota ?? fallback.limits.ghostProQuota,
      maxWords: row.max_words ?? fallback.limits.maxWords,
    },
  } satisfies PlanDefinition;
}

export async function getActivePlanDefinition(
  supabase: SupabaseClient,
  userId: string,
  nowIso: string
) {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select<SubscriptionRow>('plan_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .gt('current_period_end', nowIso)
    .order('current_period_end', { ascending: false })
    .limit(1)
    .maybeSingle();

  const planId = subscription?.plan_id ?? DEFAULT_PLAN_ID;

  const { data: planRow } = await supabase
    .from('plans')
    .select<PlanRow>('id, name, ghost_mini_quota, ghost_pro_quota, max_words')
    .eq('id', planId)
    .maybeSingle();

  return mapPlanRow(planRow) ?? PLAN_RECORD[planId] ?? PLAN_RECORD[DEFAULT_PLAN_ID];
}

export function resolveUsageMode(plan: PlanDefinition): UsageMode {
  const { ghostProQuota, ghostMiniQuota } = plan.limits;
  if ((ghostProQuota ?? 0) <= 0 && (ghostMiniQuota ?? 0) > 0) {
    return 'ghost_mini';
  }
  return 'ghost_pro';
}

export async function getTodayUsageCounter(
  supabase: SupabaseClient,
  userId: string,
  usageDate: string
): Promise<UsageCounterRow | null> {
  const { data } = await supabase
    .from('usage_counters')
    .select<UsageCounterRow>('id, plan_id, ghost_mini_used, ghost_pro_used')
    .eq('user_id', userId)
    .eq('usage_date', usageDate)
    .maybeSingle();

  return data ?? null;
}


