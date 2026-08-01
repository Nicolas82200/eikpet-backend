import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HealthEntriesRepository } from '../health/repositories/health-entries.repository';
import { ReminderNotificationsRepository } from './reminder-notifications.repository';
import { PushTokensRepository } from './push-tokens.repository';
import { FcmService } from './fcm.service';
import { PlanLimitsService } from '../subscriptions/plan-limits.service';

const MS_PER_DAY = 86_400_000;

@Injectable()
export class ReminderSchedulerService {
  private readonly logger = new Logger(ReminderSchedulerService.name);

  constructor(
    private readonly healthEntriesRepository: HealthEntriesRepository,
    private readonly reminderNotificationsRepository: ReminderNotificationsRepository,
    private readonly pushTokensRepository: PushTokensRepository,
    private readonly fcmService: FcmService,
    private readonly planLimitsService: PlanLimitsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendDueReminders(): Promise<void> {
    const entries =
      await this.healthEntriesRepository.findAllWithUpcomingReminders();
    const today = startOfDay(new Date());

    for (const entry of entries) {
      const reminderDate = startOfDay(new Date(entry.nextReminderDate!));
      const daysUntil = Math.round(
        (reminderDate.getTime() - today.getTime()) / MS_PER_DAY,
      );
      const offsets = await this.planLimitsService.getNotificationOffsets(
        entry.householdId,
      );
      if (!offsets.includes(daysUntil)) {
        continue;
      }

      const alreadySent =
        await this.reminderNotificationsRepository.hasBeenSent(
          entry.id,
          daysUntil,
        );
      if (alreadySent) {
        continue;
      }

      const tokens = await this.pushTokensRepository.listForHousehold(
        entry.householdId,
      );
      await this.fcmService.sendToTokens(
        tokens,
        `Rappel sante — ${entry.animalName}`,
        buildReminderMessage(entry, daysUntil),
      );
      await this.reminderNotificationsRepository.markSent(entry.id, daysUntil);
      this.logger.log(
        `Rappel envoye pour l'entree ${entry.id} (J-${daysUntil})`,
      );
    }
  }
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function buildReminderMessage(
  entry: { type: string; customTypeLabel: string | null },
  daysUntil: number,
): string {
  const label = entry.customTypeLabel ?? entry.type;
  if (daysUntil === 0) {
    return `${label} prevu aujourd'hui`;
  }
  return `${label} prevu dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''}`;
}
