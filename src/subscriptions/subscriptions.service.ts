import { Injectable, UnauthorizedException } from '@nestjs/common';
import {
  SubscriptionsRepository,
  type SubscriptionStatus,
} from './subscriptions.repository';
import type { RevenueCatWebhookPayload } from './dto/revenuecat-webhook.dto';

/** Types d'evenements RevenueCat qui accordent l'acces premium. */
const GRANTING_EVENT_TYPES = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'PRODUCT_CHANGE',
  'UNCANCELLATION',
  'TRANSFER',
]);
const CANCELLATION_EVENT_TYPE = 'CANCELLATION';
const BILLING_ISSUE_EVENT_TYPE = 'BILLING_ISSUE';
const EXPIRING_EVENT_TYPES = new Set(['EXPIRATION', 'SUBSCRIPTION_PAUSED']);

@Injectable()
export class SubscriptionsService {
  constructor(private readonly repository: SubscriptionsRepository) {}

  async isUserPremium(userId: number): Promise<boolean> {
    return this.repository.isUserActive(userId);
  }

  async isHouseholdPremium(householdId: number): Promise<boolean> {
    return this.repository.householdHasActiveMember(householdId);
  }

  async getStatusForUser(userId: number) {
    const subscription = await this.repository.findByUserId(userId);
    const isPremium = await this.repository.isUserActive(userId);
    return {
      isPremium,
      status: subscription?.status ?? 'expired',
      productId: subscription?.productId ?? null,
      currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
    };
  }

  /**
   * Traite un evenement webhook RevenueCat de facon idempotente : RevenueCat peut
   * renvoyer le meme evenement plusieurs fois (retries), on ne le traite qu'une fois.
   */
  async handleRevenueCatWebhook(
    payload: RevenueCatWebhookPayload,
  ): Promise<void> {
    const event = payload.event;
    if (!event?.id || !event.app_user_id) {
      throw new UnauthorizedException('Payload webhook invalide');
    }

    if (await this.repository.hasProcessedEvent(event.id)) {
      return;
    }

    const userId = parseInt(event.app_user_id, 10);
    if (Number.isNaN(userId)) {
      // app_user_id anonyme (avant login) : rien a synchroniser cote foyer.
      await this.repository.recordEvent(event.id, null, event.type, payload);
      return;
    }

    const status = mapEventToStatus(event.type);
    if (status) {
      const periodEnd = event.expiration_at_ms
        ? new Date(event.expiration_at_ms)
        : null;
      await this.repository.upsert(
        userId,
        status,
        event.product_id ?? null,
        periodEnd,
      );
    }

    await this.repository.recordEvent(event.id, userId, event.type, payload);
  }
}

function mapEventToStatus(eventType: string): SubscriptionStatus | null {
  if (GRANTING_EVENT_TYPES.has(eventType)) {
    return 'active';
  }
  if (eventType === CANCELLATION_EVENT_TYPE) {
    return 'canceled';
  }
  if (eventType === BILLING_ISSUE_EVENT_TYPE) {
    return 'grace_period';
  }
  if (EXPIRING_EVENT_TYPES.has(eventType)) {
    return 'expired';
  }
  return null;
}
