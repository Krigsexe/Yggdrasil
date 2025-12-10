/**
 * Auth Service
 *
 * Handles authentication logic: login, registration, token management.
 */

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import {
  User,
  Role,
  TokenPair,
  JwtPayload,
  createLogger,
  generateId,
  InvalidCredentialsError,
  TokenExpiredError,
} from '@yggdrasil/shared';

const logger = createLogger('AuthService', 'info');

// In-memory user store for development
// TODO: Replace with Prisma when database is set up
const users = new Map<string, { id: string; email: string; passwordHash: string; role: Role }>();
const refreshTokens = new Map<string, { userId: string; expiresAt: Date }>();

@Injectable()
export class AuthService {
  private readonly bcryptRounds: number;
  private readonly jwtExpiresIn: string;
  private readonly refreshExpiresIn: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {
    this.bcryptRounds = this.configService.get<number>('BCRYPT_ROUNDS', 12);
    this.jwtExpiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '15m');
    this.refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
  }

  async register(email: string, password: string): Promise<User> {
    const existingUser = Array.from(users.values()).find((u) => u.email === email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    const passwordHash = await bcrypt.hash(password, this.bcryptRounds);
    const id = generateId();

    const user = {
      id,
      email,
      passwordHash,
      role: Role.USER,
    };

    users.set(id, user);

    logger.info('User registered', { userId: id, email });

    return {
      id,
      email,
      role: Role.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    };
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = Array.from(users.values()).find((u) => u.email === email);
    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    };
  }

  async login(email: string, password: string): Promise<{ user: User; tokens: TokenPair }> {
    const user = await this.validateUser(email, password);
    if (!user) {
      throw new InvalidCredentialsError();
    }

    const tokens = this.generateTokens(user);

    logger.info('User logged in', { userId: user.id });

    return { user, tokens };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const tokenData = refreshTokens.get(refreshToken);
    if (!tokenData) {
      throw new TokenExpiredError('refresh');
    }

    if (tokenData.expiresAt < new Date()) {
      refreshTokens.delete(refreshToken);
      throw new TokenExpiredError('refresh');
    }

    const userData = users.get(tokenData.userId);
    if (!userData) {
      throw new TokenExpiredError('refresh');
    }

    // Invalidate old refresh token
    refreshTokens.delete(refreshToken);

    const user: User = {
      id: userData.id,
      email: userData.email,
      role: userData.role,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    };

    return Promise.resolve(this.generateTokens(user));
  }

  logout(refreshToken: string): void {
    refreshTokens.delete(refreshToken);
    logger.info('User logged out');
  }

  private generateTokens(user: User): TokenPair {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      role: user.role,
      jti: generateId(),
    };

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = generateId();
    const refreshExpiresMs = this.parseExpiration(this.refreshExpiresIn);

    refreshTokens.set(refreshToken, {
      userId: user.id,
      expiresAt: new Date(Date.now() + refreshExpiresMs),
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpiration(this.jwtExpiresIn) / 1000,
      tokenType: 'Bearer',
    };
  }

  private parseExpiration(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 15 * 60 * 1000; // Default 15 minutes
    }

    const value = parseInt(match[1] ?? '15', 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 15 * 60 * 1000;
    }
  }

  getUserById(id: string): User | null {
    const userData = users.get(id);
    if (!userData) {
      return null;
    }

    return {
      id: userData.id,
      email: userData.email,
      role: userData.role,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    };
  }
}
