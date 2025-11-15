export type PlanTier = 'free' | 'basic' | 'standard' | 'premium';

export type PlanDefinition = {
  id: PlanTier;
  name: string;
  priceLabel: string;
  priceValue: string;
  highlight?: boolean;
  description: string;
  cta: string;
  ribbon?: string;
  limits: {
    ghostMiniQuota: number | null;
    ghostProQuota: number | null;
    maxWords: number | null;
  };
  features: string[];
};

export const PLAN_DEFINITIONS: PlanDefinition[] = [
  {
    id: 'free',
    name: 'Free',
    priceLabel: 'Free',
    priceValue: '永遠免費',
    description: 'Ghost Mini 每日 10 次改寫，提供入門使用與驗證。',
    cta: '目前方案',
    limits: {
      ghostMiniQuota: 10,
      ghostProQuota: 0,
      maxWords: 1000,
    },
    features: [
      'Ghost Mini：每日 10 次',
      'Ghost Pro：未包含',
      '單次最多 1,000 字',
      '可使用改寫器與產生器',
      '通過主流 AI 偵測',
      '電子郵件客服支援',
    ],
  },
  {
    id: 'basic',
    name: 'Basic',
    priceLabel: '$20',
    priceValue: '每月',
    description: '無限 Ghost Mini，Ghost Pro 每日 20 次，適合常規寫作者。',
    cta: '立即訂閱',
    limits: {
      ghostMiniQuota: null,
      ghostProQuota: 20,
      maxWords: 2000,
    },
    features: [
      'Ghost Mini：無限次數',
      'Ghost Pro：每日 20 次',
      '單次最多 2,000 字',
      '可使用改寫器與產生器',
      '通過主流 AI 偵測',
      '優先客服支援',
    ],
  },
  {
    id: 'standard',
    name: 'Standard',
    priceLabel: '$35',
    priceValue: '每月',
    description: '加倍 Ghost Pro 額度與字數限制，滿足團隊與高頻需求。',
    cta: '立即訂閱',
    limits: {
      ghostMiniQuota: null,
      ghostProQuota: 50,
      maxWords: 3000,
    },
    features: [
      'Ghost Mini：無限次數',
      'Ghost Pro：每日 50 次',
      '單次最多 3,000 字',
      '可使用改寫器與產生器',
      '通過主流 AI 偵測',
      '優先客服支援',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    priceLabel: '$50',
    priceValue: '每月',
    description: '最佳方案，Ghost Mini / Pro 皆無限，單次 5,000 字。',
    cta: '最佳選擇',
    ribbon: 'Best Option',
    highlight: true,
    limits: {
      ghostMiniQuota: null,
      ghostProQuota: null,
      maxWords: 5000,
    },
    features: [
      'Ghost Mini：無限次數',
      'Ghost Pro：無限次數',
      '單次最多 5,000 字',
      '可使用改寫器與產生器',
      '通過主流 AI 偵測',
      '專屬客服支援',
    ],
  },
];

export const PLAN_RECORD = PLAN_DEFINITIONS.reduce<Record<PlanTier, PlanDefinition>>(
  (acc, plan) => {
    acc[plan.id] = plan;
    return acc;
  },
  {} as Record<PlanTier, PlanDefinition>
);

export const DEFAULT_PLAN_ID: PlanTier = 'free';


