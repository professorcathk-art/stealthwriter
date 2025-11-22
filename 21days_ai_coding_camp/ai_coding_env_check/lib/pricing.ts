export type BillingCycle = 'monthly' | 'yearly';

export const PRO_PLAN = {
  name: 'StealthWriter Pro',
  description: 'AI 驗證 + Ghost Mini/Pro 改寫，提供月/年選項。',
  price: {
    monthly: {
      label: '$7.99',
      detail: '每月',
    },
    yearly: {
      label: '$59',
      detail: '每年 (省兩個月)',
    },
  },
  features: [
    'Ghost Mini / Pro：每月 / 每年高頻改寫',
    '單次可改寫最高 5,000 字',
    '支援 DeepSeek 改寫與 AI 偵測驗證',
    '登入即能追蹤當日使用量與訂閱紀錄',
    '優先客服與專屬策略',
  ],
};


