import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JoinHouseholdDto } from './dto/join-household.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedUser } from './guards/jwt-auth.guard';

// Limites tres hautes en test : les suites e2e enregistrent/connectent des dizaines
// d'utilisateurs en quelques secondes, ce qui declencherait le throttling a tort.
const isTest = process.env.NODE_ENV === 'test';
const AUTH_THROTTLE = {
  default: { limit: isTest ? 100_000 : 10, ttl: 60_000 },
};
const REFRESH_THROTTLE = {
  default: { limit: isTest ? 100_000 : 20, ttl: 60_000 },
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle(AUTH_THROTTLE)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_THROTTLE)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle(REFRESH_THROTTLE)
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Body() dto: RefreshDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  logoutAll(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.logoutAll(user.id);
  }

  @Post('households/join')
  @UseGuards(JwtAuthGuard)
  joinHousehold(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: JoinHouseholdDto,
  ) {
    return this.authService.joinHousehold(user.id, dto.inviteCode);
  }

  @Post('password/forgot')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle(AUTH_THROTTLE)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
  }

  @Post('password/reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle(AUTH_THROTTLE)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.email, dto.code, dto.newPassword);
  }

  @Patch('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
  }
}
