import { ForbiddenException } from '@nestjs/common';

export type PlanLimitCode =
  | 'PLAN_LIMIT_HOUSEHOLD'
  | 'PLAN_LIMIT_ANIMAL'
  | 'PLAN_LIMIT_DOCUMENT'
  | 'PLAN_LIMIT_PENSION'
  | 'PLAN_LIMIT_BUDGET';

/**
 * Levee quand une action est bloquee par les limites du plan gratuit (cf. cahier des
 * charges §6). Le mobile distingue errorCode='PLAN_LIMIT_*' d'une erreur metier classique
 * pour afficher l'ecran d'abonnement plutot qu'un message d'erreur generique.
 */
export class PlanLimitException extends ForbiddenException {
  constructor(
    public readonly errorCode: PlanLimitCode,
    message: string,
  ) {
    super({ errorCode, message });
  }
}
