/**
 * Sous-ensemble du payload webhook RevenueCat que l'on exploite.
 * Cf. https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields
 */
export interface RevenueCatWebhookEvent {
  id: string;
  type: string;
  app_user_id: string;
  product_id?: string;
  expiration_at_ms?: number | null;
}

export interface RevenueCatWebhookPayload {
  event: RevenueCatWebhookEvent;
}
