import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { createHash, randomInt } from 'crypto';
import { UsersRepository } from './repositories/users.repository';
import { RefreshTokensRepository } from './repositories/refresh-tokens.repository';
import { PasswordResetTokensRepository } from './repositories/password-reset-tokens.repository';
import { TokenService } from './token.service';
import { HouseholdsRepository } from '../households/households.repository';
import { HouseholdsService } from '../households/households.service';
import { generateInviteCode } from '../households/invite-code.util';
import { EmailService } from '../email/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const BCRYPT_ROUNDS = 12;
const PASSWORD_RESET_CODE_TTL_MS = 15 * 60 * 1000;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly refreshTokensRepository: RefreshTokensRepository,
    private readonly passwordResetTokensRepository: PasswordResetTokensRepository,
    private readonly householdsRepository: HouseholdsRepository,
    private readonly householdsService: HouseholdsService,
    private readonly tokenService: TokenService,
    private readonly emailService: EmailService,
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

  /** Renvoie toujours le meme resultat que l'email existe ou non, pour eviter l'enumeration de comptes. */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersRepository.findByEmail(email);
    if (!user) {
      return;
    }
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const codeHash = this.hashCode(code);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_CODE_TTL_MS);
    await this.passwordResetTokensRepository.create(
      user.id,
      codeHash,
      expiresAt,
    );
    await this.emailService.sendPasswordResetCode(user.email, code);
  }

  async resetPassword(
    email: string,
    code: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.usersRepository.findByEmail(email);
    if (!user) {
      throw new BadRequestException('Code invalide ou expire');
    }
    const codeHash = this.hashCode(code);
    const token =
      await this.passwordResetTokensRepository.findValidByUserAndCodeHash(
        user.id,
        codeHash,
      );
    if (!token) {
      throw new BadRequestException('Code invalide ou expire');
    }
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.usersRepository.updatePasswordHash(user.id, passwordHash);
    await this.passwordResetTokensRepository.markUsed(token.id);
    await this.refreshTokensRepository.revokeAllForUser(user.id);
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }
    const passwordMatches = await bcrypt.compare(
      currentPassword,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Mot de passe actuel incorrect');
    }
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.usersRepository.updatePasswordHash(userId, passwordHash);
    await this.refreshTokensRepository.revokeAllForUser(userId);
  }

  async deleteAccount(userId: number, password: string): Promise<void> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }
    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Mot de passe incorrect');
    }

    // Les foyers dont l'utilisateur est simple membre sont quittes automatiquement
    // (cascade SQL sur household_members.user_id). Les foyers dont il est proprietaire
    // sont supprimes entierement (memes consequences que la suppression manuelle d'un
    // foyer : plus personne, y compris les autres membres, n'y a acces ensuite).
    const households = await this.householdsRepository.listForUser(userId);
    const ownedHouseholds = households.filter((h) => h.role === 'owner');
    for (const household of ownedHouseholds) {
      await this.householdsService.deleteHousehold(userId, household.id);
    }

    await this.usersRepository.delete(userId);
  }

  private hashCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
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
