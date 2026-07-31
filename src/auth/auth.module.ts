import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenModule } from './token.module';
import { UsersRepository } from './repositories/users.repository';
import { RefreshTokensRepository } from './repositories/refresh-tokens.repository';
import { HouseholdsModule } from '../households/households.module';

@Module({
  imports: [TokenModule, HouseholdsModule],
  controllers: [AuthController],
  providers: [AuthService, UsersRepository, RefreshTokensRepository],
  exports: [UsersRepository],
})
export class AuthModule {}
