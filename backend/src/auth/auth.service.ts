import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, User, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { formatUserName } from '../common/user-name';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto';

type TokenUser = Pick<
  User,
  'id' | 'email' | 'lastName' | 'firstName' | 'middleName' | 'phone' | 'role' | 'status'
>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) {
      throw new BadRequestException('Пользователь с таким email уже существует');
    }

    let user: User;
    try {
      user = await this.prisma.user.create({
        data: {
          email,
          lastName: dto.lastName.trim(),
          firstName: dto.firstName.trim(),
          middleName: dto.middleName?.trim() || null,
          phone: dto.phone.trim(),
          passwordHash: await bcrypt.hash(dto.password, 10),
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException('Пользователь с таким email уже существует');
      }
      throw error;
    }

    return this.issueAuthPayload(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.trim().toLowerCase() } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    if (user.status === UserStatus.BLOCKED) {
      throw new UnauthorizedException('Аккаунт заблокирован');
    }

    return this.issueAuthPayload(user);
  }

  async refresh(refreshToken: string) {
    const { sessionId, secret } = this.parseRefreshToken(refreshToken);
    const session = await this.prisma.refreshToken.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token недействителен');
    }

    if (!(await bcrypt.compare(secret, session.refreshTokenHash))) {
      throw new UnauthorizedException('Refresh token недействителен');
    }
    if (session.user.status === UserStatus.BLOCKED) {
      throw new UnauthorizedException('Аккаунт заблокирован');
    }

    await this.prisma.refreshToken.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    return this.issueAuthPayload(session.user);
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) {
      return { ok: true };
    }

    const { sessionId } = this.parseRefreshToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { ok: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        lastName: true,
        firstName: true,
        middleName: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
    return { ...user, displayName: formatUserName(user) };
  }

  private async issueAuthPayload(user: TokenUser) {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, role: user.role },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('ACCESS_TOKEN_TTL') ?? '15m',
      },
    );

    const secret = randomBytes(32).toString('hex');
    const days = Number(this.config.get<string>('REFRESH_TOKEN_TTL_DAYS') ?? 30);
    const session = await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        refreshTokenHash: await bcrypt.hash(secret, 10),
        expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken,
      refreshToken: `${session.id}.${secret}`,
      user: this.toPublicUser(user),
    };
  }

  private parseRefreshToken(refreshToken: string) {
    const [sessionId, secret] = refreshToken.split('.');
    if (!sessionId || !secret) {
      throw new UnauthorizedException('Refresh token недействителен');
    }
    return { sessionId, secret };
  }

  private toPublicUser(user: TokenUser) {
    return {
      id: user.id,
      email: user.email,
      lastName: user.lastName,
      firstName: user.firstName,
      middleName: user.middleName,
      displayName: formatUserName(user),
      phone: user.phone,
      role: user.role,
      status: user.status,
    };
  }
}
