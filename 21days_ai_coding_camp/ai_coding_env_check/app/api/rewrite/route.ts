import { NextRequest, NextResponse } from 'next/server';

const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/v1/chat/completions';
const SYSTEM_PROMPT = `You are a seasoned human copy editor from Taiwan. Rewrite the provided Traditional Chinese text so it sounds like it was written by a thoughtful person, with natural rhythm, varied sentence lengths, and specific word choices. Preserve every fact, claim, and instruction, keep the length comparable to the original, and retain any lists or formatting. Remove formulaic or generic phrasing, avoid buzzwords or AI cliches, and never mention AI, rewriting, or that you are an assistant. Respond with the polished text only.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const text = typeof body.text === 'string' ? body.text.trim() : '';

    if (!text) {
      return NextResponse.json(
        { error: '請提供要改寫的內容。' },
        { status: 400 }
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

    return NextResponse.json({ rewritten }, { status: 200 });
  } catch (error) {
    console.error('Rewrite API error', error);
    const message =
      error instanceof Error ? error.message : '伺服器發生未知錯誤。';
    const status = message.includes('DeepSeek API 錯誤') ? 502 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

