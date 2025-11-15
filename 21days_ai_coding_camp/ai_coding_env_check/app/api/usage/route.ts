import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import {
  getActivePlanDefinition,
  getTodayUsageCounter,
  todayIsoDate,
} from '@/lib/quota';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : null;

    if (!accessToken) {
      return NextResponse.json(
        { error: '缺少授權資訊，請重新登入。' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseAdminClient(accessToken);
    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);

    if (userError || !userData.user) {
      console.error('Usage API auth error', userError);
      return NextResponse.json(
        { error: '登入狀態失效，請重新登入。' },
        { status: 401 }
      );
    }

    const userId = userData.user.id;
    const nowIso = new Date().toISOString();

    const plan = await getActivePlanDefinition(supabase, userId, nowIso);
    const usageDate = todayIsoDate();
    const usage = await getTodayUsageCounter(supabase, userId, usageDate);

    const ghostProLimit = plan.limits.ghostProQuota;
    const ghostProUsed = usage?.ghost_pro_used ?? 0;
    const ghostMiniLimit = plan.limits.ghostMiniQuota;
    const ghostMiniUsed = usage?.ghost_mini_used ?? 0;

    const response = {
      plan: {
        id: plan.id,
        name: plan.name,
        limits: plan.limits,
      },
      usage: {
        date: usageDate,
        ghostMini: {
          used: ghostMiniUsed,
          limit: ghostMiniLimit,
          remaining:
            ghostMiniLimit === null ? null : Math.max(ghostMiniLimit - ghostMiniUsed, 0),
        },
        ghostPro: {
          used: ghostProUsed,
          limit: ghostProLimit,
          remaining:
            ghostProLimit === null ? null : Math.max(ghostProLimit - ghostProUsed, 0),
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Usage API error', error);
    return NextResponse.json(
      { error: '無法取得使用紀錄，請稍後再試。' },
      { status: 500 }
    );
  }
}


