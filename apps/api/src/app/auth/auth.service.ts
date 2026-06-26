import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

type AuthenticatedUser = {
  id: string;
  role: UserRole;
  email: string | null;
  displayName: string;
  controlNumber?: string;
  group?: string | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async login(dto: LoginDto) {
    const identifier = dto.identifier.trim();

    const user = await this.findUserByIdentifier(identifier);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const authUser: AuthenticatedUser = {
      id: user.id,
      role: user.role,
      email: user.email,
      displayName:
        user.studentProfile?.fullName ||
        user.teacherProfile?.fullName ||
        user.email ||
        'Usuario',
      controlNumber: user.studentProfile?.controlNumber,
      group: user.studentProfile?.group,
    };

    const accessToken = await this.jwtService.signAsync({
      sub: authUser.id,
      role: authUser.role,
      email: authUser.email,
      controlNumber: authUser.controlNumber,
    });

    return {
      accessToken,
      user: authUser,
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        studentProfile: true,
        teacherProfile: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Sesión inválida');
    }

    return {
      id: user.id,
      role: user.role,
      email: user.email,
      displayName:
        user.studentProfile?.fullName ||
        user.teacherProfile?.fullName ||
        user.email ||
        'Usuario',
      controlNumber: user.studentProfile?.controlNumber,
      group: user.studentProfile?.group,
    };
  }

  private async findUserByIdentifier(identifier: string) {
    const normalized = identifier.toLowerCase();

    if (normalized.includes('@')) {
      return this.prisma.user.findUnique({
        where: {
          email: normalized,
        },
        include: {
          studentProfile: true,
          teacherProfile: true,
        },
      });
    }

    const student = await this.prisma.studentProfile.findUnique({
      where: {
        controlNumber: identifier,
      },
      include: {
        user: {
          include: {
            studentProfile: true,
            teacherProfile: true,
          },
        },
      },
    });

    return student?.user ?? null;
  }
}
