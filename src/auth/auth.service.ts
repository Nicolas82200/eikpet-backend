import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from './repositories/users.repository';
import { RefreshTokensRepository } from './repositories/refresh-tokens.repository';
import { TokenService } from './token.service';
import { HouseholdsRepository } from '../households/households.repository';
import { generateInviteCode } from '../households/invite-code.util';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const BCRYPT_ROUNDS = 12;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly refreshTokensRepository: RefreshTokensRepository,
    private readonly householdsRepository: HouseholdsRepository,
    private readonly tokenService: TokenService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokens> {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Un compte existe deja avec cet email');
    }

    if (!dto.householdName && !dto.inviteCode) {
      throw new BadRequestException(
        "Indiquez un nom de foyer a creer ou un code d'invitation",
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.usersRepository.create(
      dto.email,
      passwordHash,
      dto.firstName,
      dto.lastName,
    );

    if (dto.inviteCode) {
      const household = await this.householdsRepository.findByInviteCode(
        dto.inviteCode,
      );
      if (!household) {
        throw new BadRequestException("Code d'invitation invalide");
      }
      await this.householdsRepository.addMember(
        household.id,
        user.id,
        'member',
      );
    } else if (dto.householdName) {
      const household = await this.householdsRepository.create(
        dto.householdName,
        generateInviteCode(),
      );
      await this.householdsRepository.addMember(household.id, user.id, 'owner');
    }

    return this.issueTokens(user.id, user.email);
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.usersRepository.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Identifiants invalides');
    }
    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Identifiants invalides');
    }
    return this.issueTokens(user.id, user.email);
  }

  async joinHousehold(userId: number, inviteCode: string) {
    const household =
      await this.householdsRepository.findByInviteCode(inviteCode);
    if (!household) {
      throw new BadRequestException("Code d'invitation invalide");
    }
    const alreadyMember = await this.householdsRepository.isMember(
      household.id,
      userId,
    );
    if (!alreadyMember) {
      await this.householdsRepository.addMember(household.id, userId, 'member');
    }
    return household;
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const tokenHash = this.tokenService.hashRefreshToken(refreshToken);
    const stored =
      await this.refreshTokensRepository.findValidByHash(tokenHash);
    if (!stored) {
      throw new UnauthorizedException('Refresh token invalide ou expire');
    }
    const user = await this.usersRepository.findById(stored.userId);
    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    // Rotation : on revoque l'ancien refresh token et on en emet un nouveau
    await this.refreshTokensRepository.revoke(stored.id);
    return this.issueTokens(user.id, user.email);
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.tokenService.hashRefreshToken(refreshToken);
    const stored =
      await this.refreshTokensRepository.findValidByHash(tokenHash);
    if (stored) {
      await this.refreshTokensRepository.revoke(stored.id);
    }
  }

  async logoutAll(userId: number): Promise<void> {
    await this.refreshTokensRepository.revokeAllForUser(userId);
  }

  private async issueTokens(
    userId: number,
    email: string,
  ): Promise<AuthTokens> {
    const accessToken = this.tokenService.signAccessToken({
      sub: userId,
      email,
    });
    const refreshToken = this.tokenService.generateRefreshToken();
    const tokenHash = this.tokenService.hashRefreshToken(refreshToken);
    const expiresAt = new Date(
      Date.now() + this.tokenService.getRefreshExpiresInMs(),
    );
    await this.refreshTokensRepository.create(userId, tokenHash, expiresAt);
    return { accessToken, refreshToken };
  }
}
