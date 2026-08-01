import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenModule } from './token.module';
import { UsersRepository } from './repositories/users.repository';
import { RefreshTokensRepository } from './repositories/refresh-tokens.repository';
import { PasswordResetTokensRepository } from './repositories/password-reset-tokens.repository';
import { HouseholdsModule } from '../households/households.module';
import { EmailModule } from '../email/email.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [TokenModule, HouseholdsModule, EmailModule, SubscriptionsModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    UsersRepository,
    RefreshTokensRepository,
    PasswordResetTokensRepository,
  ],
  exports: [UsersRepository],
})
export class AuthModule {}
