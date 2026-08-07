import { PlanLimitsService } from './plan-limits.service';
import { PlanLimitException } from './plan-limit.exception';
import type { SubscriptionsService } from './subscriptions.service';
import type { HouseholdsRepository } from '../households/households.repository';
import type { AnimalsRepository } from '../animals/animals.repository';

describe('PlanLimitsService', () => {
  const makeService = (opts: {
    isUserPremium?: boolean;
    isHouseholdPremium?: boolean;
    householdsForUser?: unknown[];
    animalsForHousehold?: unknown[];
  }) => {
    const subscriptionsService = {
      isUserPremium: jest.fn().mockResolvedValue(opts.isUserPremium ?? false),
      isHouseholdPremium: jest
        .fn()
        .mockResolvedValue(opts.isHouseholdPremium ?? false),
    } as unknown as SubscriptionsService;
    const householdsRepository = {
      listForUser: jest.fn().mockResolvedValue(opts.householdsForUser ?? []),
    } as unknown as HouseholdsRepository;
    const animalsRepository = {
      findByHousehold: jest
        .fn()
        .mockResolvedValue(opts.animalsForHousehold ?? []),
    } as unknown as AnimalsRepository;
    return new PlanLimitsService(
      subscriptionsService,
      householdsRepository,
      animalsRepository,
    );
  };

  describe('assertCanJoinOrCreateHousehold', () => {
    it('autorise un utilisateur gratuit sans foyer', async () => {
      const service = makeService({ householdsForUser: [] });
      await expect(
        service.assertCanJoinOrCreateHousehold(1),
      ).resolves.toBeUndefined();
    });

    it('bloque un utilisateur gratuit qui a deja 1 foyer', async () => {
      const service = makeService({ householdsForUser: [{ id: 1 }] });
      await expect(service.assertCanJoinOrCreateHousehold(1)).rejects.toThrow(
        PlanLimitException,
      );
    });

    it('autorise un utilisateur premium meme avec plusieurs foyers', async () => {
      const service = makeService({
        isUserPremium: true,
        householdsForUser: [{ id: 1 }, { id: 2 }],
      });
      await expect(
        service.assertCanJoinOrCreateHousehold(1),
      ).resolves.toBeUndefined();
    });
  });

  describe('assertCanAddAnimal', () => {
    it('autorise l ajout tant que le foyer gratuit a moins de 2 animaux', async () => {
      const service = makeService({ animalsForHousehold: [{ id: 1 }] });
      await expect(service.assertCanAddAnimal(1)).resolves.toBeUndefined();
    });

    it('bloque le 3e animal sur un foyer gratuit', async () => {
      const service = makeService({
        animalsForHousehold: [{ id: 1 }, { id: 2 }],
      });
      await expect(service.assertCanAddAnimal(1)).rejects.toThrow(
        PlanLimitException,
      );
    });

    it('autorise un nombre illimite d animaux sur un foyer premium', async () => {
      const service = makeService({
        isHouseholdPremium: true,
        animalsForHousehold: [{ id: 1 }, { id: 2 }, { id: 3 }],
      });
      await expect(service.assertCanAddAnimal(1)).resolves.toBeUndefined();
    });
  });

  describe('assertCanUploadDocument', () => {
    it('bloque tout document sur un foyer gratuit', async () => {
      const service = makeService({});
      await expect(service.assertCanUploadDocument(1)).rejects.toThrow(
        PlanLimitException,
      );
    });

    it('autorise les documents sur un foyer premium', async () => {
      const service = makeService({ isHouseholdPremium: true });
      await expect(service.assertCanUploadDocument(1)).resolves.toBeUndefined();
    });
  });

  describe('getHealthHistoryFloorDate', () => {
    it('renvoie null (pas de filtre) pour un foyer premium', async () => {
      const service = makeService({ isHouseholdPremium: true });
      await expect(service.getHealthHistoryFloorDate(1)).resolves.toBeNull();
    });

    it('renvoie une date il y a 12 mois pour un foyer gratuit', async () => {
      const service = makeService({});
      const floor = await service.getHealthHistoryFloorDate(1);
      expect(floor).not.toBeNull();
      const expected = new Date();
      expected.setUTCMonth(expected.getUTCMonth() - 12);
      expect(floor!.getUTCFullYear()).toBe(expected.getUTCFullYear());
      expect(floor!.getUTCMonth()).toBe(expected.getUTCMonth());
    });
  });

  describe('getNotificationOffsets', () => {
    it('renvoie uniquement le jour J pour un foyer gratuit', async () => {
      const service = makeService({});
      await expect(service.getNotificationOffsets(1)).resolves.toEqual([0]);
    });

    it('renvoie J-7/J-1/J0 pour un foyer premium', async () => {
      const service = makeService({ isHouseholdPremium: true });
      await expect(service.getNotificationOffsets(1)).resolves.toEqual([
        7, 1, 0,
      ]);
    });
  });
});
