import { prisma } from '../../config/database.js';
import { NotFoundError } from '../../utils/errors.js';
import { PlanTier, BillingInterval } from '@prisma/client';

export class PlanService {
  async listPlans(apiId: string) {
    return prisma.apiPlan.findMany({
      where: { apiId },
      orderBy: { price: 'asc' },
    });
  }

  async createPlan(
    apiId: string,
    data: {
      name: string;
      tier: PlanTier;
      requestsPerMinute: number;
      dailyQuota: number;
      monthlyQuota: number;
      price?: number;
      billingInterval?: BillingInterval;
      features?: string[];
    }
  ) {
    return prisma.apiPlan.create({
      data: {
        apiId,
        name: data.name,
        tier: data.tier,
        requestsPerMinute: data.requestsPerMinute,
        dailyQuota: data.dailyQuota,
        monthlyQuota: data.monthlyQuota,
        price: data.price ?? 0,
        billingInterval: data.billingInterval ?? 'MONTHLY',
        features: (data.features as any) || undefined,
        status: 'ACTIVE',
      },
    });
  }

  async updatePlan(planId: string, data: any) {
    const plan = await prisma.apiPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundError('Plan not found.');

    return prisma.apiPlan.update({
      where: { id: planId },
      data,
    });
  }
}

export const planService = new PlanService();
