import { SubscriptionsService } from './subscriptions.service';
import type { SubscriptionsRepository } from './subscriptions.repository';
import type { RevenueCatWebhookPayload } from './dto/revenuecat-webhook.dto';

// Type mock en objet litteral (pas jest.Mocked<SubscriptionsRepository>) pour eviter que
// @typescript-eslint/unbound-method traite ces jest.fn() comme des methodes de classe liees.
interface MockSubscriptionsRepository {
  hasProcessedEvent: jest.Mock;
  recordEvent: jest.Mock;
  upsert: jest.Mock;
  isUserActive: jest.Mock;
  householdHasActiveMember: jest.Mock;
  findByUserId: jest.Mock;
}

describe('SubscriptionsService', () => {
  const makeRepository = (
    opts: { hasProcessedEvent?: boolean } = {},
  ): MockSubscriptionsRepository => ({
    hasProcessedEvent: jest
      .fn()
      .mockResolvedValue(opts.hasProcessedEvent ?? false),
    recordEvent: jest.fn().mockResolvedValue(undefined),
    upsert: jest.fn().mockResolvedValue(undefined),
    isUserActive: jest.fn().mockResolvedValue(false),
    householdHasActiveMember: jest.fn().mockResolvedValue(false),
    findByUserId: jest.fn().mockResolvedValue(null),
  });

  const makeService = (repository: MockSubscriptionsRepository) =>
    new SubscriptionsService(repository as unknown as SubscriptionsRepository);

  const buildPayload = (
    overrides: Partial<RevenueCatWebhookPayload['event']>,
  ): RevenueCatWebhookPayload => ({
    event: {
      id: 'evt_1',
      type: 'INITIAL_PURCHASE',
      app_user_id: '42',
      product_id: 'eikpet_premium_monthly',
      expiration_at_ms: Date.now() + 30 * 86_400_000,
      ...overrides,
    },
  });

  it('ignore un evenement deja traite (idempotence)', async () => {
    const repository = makeRepository({ hasProcessedEvent: true });
    const service = makeService(repository);

    await service.handleRevenueCatWebhook(buildPayload({}));

    expect(repository.upsert).not.toHaveBeenCalled();
    expect(repository.recordEvent).not.toHaveBeenCalled();
  });

  it('active l abonnement sur INITIAL_PURCHASE', async () => {
    const repository = makeRepository();
    const service = makeService(repository);

    await service.handleRevenueCatWebhook(buildPayload({}));

    expect(repository.upsert).toHaveBeenCalledWith(
      42,
      'active',
      'eikpet_premium_monthly',
      expect.any(Date),
    );
    expect(repository.recordEvent).toHaveBeenCalledWith(
      'evt_1',
      42,
      'INITIAL_PURCHASE',
      expect.anything(),
    );
  });

  it('passe l abonnement en grace_period sur BILLING_ISSUE', async () => {
    const repository = makeRepository();
    const service = makeService(repository);

    await service.handleRevenueCatWebhook(
      buildPayload({ id: 'evt_2', type: 'BILLING_ISSUE' }),
    );

    expect(repository.upsert).toHaveBeenCalledWith(
      42,
      'grace_period',
      'eikpet_premium_monthly',
      expect.any(Date),
    );
  });

  it('expire l abonnement sur EXPIRATION', async () => {
    const repository = makeRepository();
    const service = makeService(repository);

    await service.handleRevenueCatWebhook(
      buildPayload({ id: 'evt_3', type: 'EXPIRATION' }),
    );

    expect(repository.upsert).toHaveBeenCalledWith(
      42,
      'expired',
      'eikpet_premium_monthly',
      expect.any(Date),
    );
  });

  it('n appelle pas upsert pour un type d evenement inconnu mais enregistre quand meme l evenement', async () => {
    const repository = makeRepository();
    const service = makeService(repository);

    await service.handleRevenueCatWebhook(
      buildPayload({ id: 'evt_4', type: 'SUBSCRIBER_ALIAS' }),
    );

    expect(repository.upsert).not.toHaveBeenCalled();
    expect(repository.recordEvent).toHaveBeenCalledWith(
      'evt_4',
      42,
      'SUBSCRIBER_ALIAS',
      expect.anything(),
    );
  });
});
