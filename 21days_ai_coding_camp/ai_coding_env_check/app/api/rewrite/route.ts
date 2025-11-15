import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient, getSupabaseAuthClient } from '@/lib/supabase-admin';
import {
  countWordsApprox,
  getActivePlanDefinition,
  getTodayUsageCounter,
  resolveUsageMode,
  todayIsoDate,
  type UsageMode,
} from '@/lib/quota';

const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/v1/chat/completions';
const SYSTEM_PROMPT = `You are a seasoned human copy editor from Taiwan. Rewrite the provided Traditional Chinese text so it sounds like it was written by a thoughtful person, with natural rhythm, varied sentence lengths, and specific word choices. Preserve every fact, claim, and instruction, keep the length comparable to the original, and retain any lists or formatting. Remove formulaic or generic phrasing, avoid buzzwords or AI cliches, and never mention AI, rewriting, or that you are an assistant. Respond with the polished text only.`;
const DEFAULT_USAGE_TYPE: UsageMode = 'ghost_pro';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const text = typeof body.text === 'string' ? body.text.trim() : '';

    if (!text) {
      return NextResponse.json({ error: '請提供要改寫的內容。' }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : null;

    if (!accessToken) {
      return NextResponse.json(
        { error: '請先登入，才能根據方案使用改寫額度。' },
        { status: 401 }
      );
    }

    const supabaseAuth = getSupabaseAuthClient(accessToken);
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(accessToken);

    if (userError || !userData.user) {
      console.error('Supabase auth error', userError);
      return NextResponse.json(
        { error: '登入狀態失效，請重新登入後再試。' },
        { status: 401 }
      );
    }

    const userId = userData.user.id;
    const nowIso = new Date().toISOString();

    const supabase = getSupabaseAdminClient(accessToken);
    const plan = await getActivePlanDefinition(supabase, userId, nowIso);
    const usageMode = resolveUsageMode(plan);
    const usageLabel = usageMode === 'ghost_mini' ? 'Ghost Mini' : 'Ghost Pro';

    const wordCount = countWordsApprox(text);
    const maxWords = plan.limits.maxWords;
    if (maxWords !== null && wordCount > maxWords) {
      return NextResponse.json(
        {
          error: `單次最多 ${maxWords.toLocaleString()} 字，請減少內容或升級方案。`,
        },
        { status: 413 }
      );
    }

    const usageDate = todayIsoDate();
    let usage = await getTodayUsageCounter(supabase, userId, usageDate);
    const usageLimit =
      usageMode === 'ghost_mini' ? plan.limits.ghostMiniQuota : plan.limits.ghostProQuota;
    const alreadyUsed =
      usageMode === 'ghost_mini' ? usage?.ghost_mini_used ?? 0 : usage?.ghost_pro_used ?? 0;

    if (usageLimit !== null && alreadyUsed >= usageLimit) {
      return NextResponse.json(
        {
          error: `今日已達 ${plan.name} 方案 ${usageLabel} 限額，請明日再試或升級方案（/pricing）。`,
        },
        { status: 429 }
      );
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      console.error('Missing DEEPSEEK_API_KEY environment variable');
      return NextResponse.json(
        { error: '伺服器尚未配置 DeepSeek API 金鑰。' },
        { status: 500 }
      );
    }

    const deepseekResponse = await fetch(DEEPSEEK_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `請改寫以下內容，讓語氣更像真人撰寫：\n\n${text}`,
          },
        ],
        temperature: 0.4,
        max_tokens: 800,
      }),
    });

    if (!deepseekResponse.ok) {
      const errorData = await deepseekResponse.json().catch(() => ({}));
      const message =
        (errorData as { error?: { message?: string } }).error?.message ??
        deepseekResponse.statusText;
      throw new Error(`DeepSeek API 錯誤：${message}`);
    }

    const payload = (await deepseekResponse.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const rewritten = payload.choices?.[0]?.message?.content?.trim();

    if (!rewritten) {
      throw new Error('DeepSeek API 未返回有效的改寫結果。');
    }

    const nextUsageValue = alreadyUsed + 1;

    const applyUsageUpdate = async (counterId: string, miniValue?: number, proValue?: number) => {
      const updatePayload: Record<string, unknown> = {
        plan_id: plan.id,
        updated_at: nowIso,
      };
      if (miniValue !== undefined) updatePayload.ghost_mini_used = miniValue;
      if (proValue !== undefined) updatePayload.ghost_pro_used = proValue;

      const { error: updateError } = await supabase
        .from('usage_counters')
        .update(updatePayload)
        .eq('id', counterId);

      if (updateError) {
        console.error('Update usage error', updateError);
      }
    };

    if (usage?.id) {
      const updatePayload: Record<string, unknown> = {
        plan_id: plan.id,
        updated_at: nowIso,
      };
      if (usageMode === 'ghost_mini') {
        updatePayload.ghost_mini_used = nextUsageValue;
      } else {
        updatePayload.ghost_pro_used = nextUsageValue;
      }

      const { error: updateError } = await supabase
        .from('usage_counters')
        .update(updatePayload)
        .eq('id', usage.id);

      if (updateError) {
        console.error('Update usage error', updateError);
      }
    } else {
      const insertPayload = {
        user_id: userId,
        plan_id: plan.id,
        usage_date: usageDate,
        ghost_mini_used: usageMode === 'ghost_mini' ? 1 : usage?.ghost_mini_used ?? 0,
        ghost_pro_used: usageMode === 'ghost_pro' ? 1 : usage?.ghost_pro_used ?? 0,
      };
      const { data: inserted, error: insertUsageError } = await supabase
        .from('usage_counters')
        .insert(insertPayload)
        .select('id, plan_id, ghost_mini_used, ghost_pro_used')
        .maybeSingle();

      if (insertUsageError) {
        if (insertUsageError.code === '23505') {
          const refreshed = await getTodayUsageCounter(supabase, userId, usageDate);
          if (refreshed?.id) {
            const miniValue =
              usageMode === 'ghost_mini'
                ? (refreshed.ghost_mini_used ?? 0) + 1
                : refreshed.ghost_mini_used ?? 0;
            const proValue =
              usageMode === 'ghost_pro'
                ? (refreshed.ghost_pro_used ?? 0) + 1
                : refreshed.ghost_pro_used ?? 0;
            await applyUsageUpdate(refreshed.id, miniValue, proValue);
          } else {
            console.error('Insert usage conflict but unable to refresh usage row');
          }
        } else {
          console.error('Insert usage error', insertUsageError);
        }
      } else if (inserted?.id) {
        usage = inserted;
      }
    }

    const { error: insertEventError } = await supabase.from('usage_events').insert({
      user_id: userId,
      plan_id: plan.id,
      usage_type: usageMode ?? DEFAULT_USAGE_TYPE,
      words_used: wordCount,
      metadata: { source: 'rewrite-api' },
    });

    if (insertEventError) {
      console.error('Insert usage event error', insertEventError);
    }

    return NextResponse.json({ rewritten }, { status: 200 });
  } catch (error) {
    console.error('Rewrite API error', error);
    const message = error instanceof Error ? error.message : '伺服器發生未知錯誤。';
    const status = message.includes('DeepSeek API 錯誤') ? 502 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

