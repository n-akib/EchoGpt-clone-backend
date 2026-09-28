import { SubscriptionPlan } from '../enums/subscription-plan.enum';

export interface PlanConfig {
  id: SubscriptionPlan;
  name: string;
  priceMonthly: number;
  monthlyRequestLimit: number;
  features: string[];
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, PlanConfig> = {
  [SubscriptionPlan.FREE]: {
    id: SubscriptionPlan.FREE,
    name: 'Free Plan',
    priceMonthly: 0,
    monthlyRequestLimit: 50,
    features: [
      '50 AI requests per month',
      'Standard response speed',
      'Basic chat history',
      'Single provider support',
    ],
  },
  [SubscriptionPlan.PREMIUM]: {
    id: SubscriptionPlan.PREMIUM,
    name: 'Premium Plan',
    priceMonthly: 19.99,
    monthlyRequestLimit: 1000,
    features: [
      '1,000 AI requests per month',
      'Priority response speed',
      'Multi-provider support (OpenAI, Anthropic, Gemini)',
      'Web search integration',
      'Full conversation history & export',
      'Early access to new models',
    ],
  },
};
