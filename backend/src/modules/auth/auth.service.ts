import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { blacklistJti } from '../../config/redis.js';
import { BadRequestError, UnauthorizedError, NotFoundError, AppError } from '../../utils/errors.js';
import { generateRandomToken } from '../../utils/crypto.js';

function databaseUnavailable(err: unknown): boolean {
  const error = err as { message?: string; code?: string };
  return error.code === 'P1001' || Boolean(error.message?.includes("Can't reach database server"));
}

export class AuthService {
  async register(data: {
    name: string;
    email: string;
    password: string;
    organizationName?: string;
    intent?: 'provider' | 'developer';
  }) {
    try {
      if (data.email.toLowerCase() === env.DEMO_USER_EMAIL.toLowerCase()) {
        throw new BadRequestError('This email is reserved for the public demo.');
      }

      const existing = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existing) {
        throw new BadRequestError('An account with this email already exists.');
      }

      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(data.password, salt);

      const orgName = data.organizationName || `${data.name}'s Org`;
      const orgSlug = orgName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') + `-${Date.now().toString(36)}`;

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name: data.name,
            email: data.email,
            passwordHash,
          },
        });

        const org = await tx.organization.create({
          data: {
            name: orgName,
            slug: orgSlug,
          },
        });

        await tx.organizationMember.create({
          data: {
            userId: user.id,
            organizationId: org.id,
            role: data.intent === 'developer' ? 'DEVELOPER' : 'OWNER',
            status: 'ACTIVE',
          },
        });

        return { user, org };
      });

      const token = this.generateToken(result.user);

      return {
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
        },
        organization: {
          id: result.org.id,
          name: result.org.name,
          slug: result.org.slug,
          role: data.intent === 'developer' ? 'DEVELOPER' : 'OWNER',
        },
        token,
      };
    } catch (err: any) {
      if (databaseUnavailable(err)) {
        throw new AppError('Database is unavailable.', 503);
      }
      throw err;
    }
  }

  async login(data: { email: string; password: string }) {
    try {
      if (data.email.toLowerCase() === env.DEMO_USER_EMAIL.toLowerCase()) {
        throw new UnauthorizedError('Open the public demo from the home page. This account has no password login.');
      }

      const user = await prisma.user.findUnique({
        where: { email: data.email },
        include: {
          memberships: {
            include: {
              organization: true,
            },
          },
        },
      });

      if (!user) {
        throw new UnauthorizedError('Invalid email or password.');
      }

      const validPassword = await bcrypt.compare(data.password, user.passwordHash);
      if (!validPassword) {
        throw new UnauthorizedError('Invalid email or password.');
      }

      const token = this.generateToken(user);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        organizations: user.memberships.map((m) => ({
          id: m.organization.id,
          name: m.organization.name,
          slug: m.organization.slug,
          role: m.role,
        })),
        token,
      };
    } catch (err: any) {
      if (databaseUnavailable(err)) {
        throw new AppError('Database is unavailable.', 503);
      }
      throw err;
    }
  }

  async getMe(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          memberships: {
            select: {
              role: true,
              status: true,
              organization: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundError('User not found.');
      }

      return user;
    } catch (err: any) {
      if (databaseUnavailable(err)) {
        throw new AppError('Database is unavailable.', 503);
      }
      throw err;
    }
  }

  async updateProfile(userId: string, data: { name?: string; currentPassword?: string; newPassword?: string }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found.');

    const updateData: { name?: string; passwordHash?: string } = {};

    if (data.name) updateData.name = data.name;

    if (data.newPassword) {
      if (data.currentPassword) {
        const valid = await bcrypt.compare(data.currentPassword, user.passwordHash);
        if (!valid) {
          throw new BadRequestError('Current password does not match.');
        }
      }
      const salt = await bcrypt.genSalt(12);
      updateData.passwordHash = await bcrypt.hash(data.newPassword, salt);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, email: true, name: true },
    });

    return updated;
  }

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Return success even if not found to prevent user enumeration
      return { message: 'If that email exists, a reset link has been dispatched.' };
    }

    const token = generateRandomToken(32);
    const expiry = new Date(Date.now() + 3600000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetTokenExpiry: expiry,
      },
    });

    return {
      message: 'If that email exists, a reset link has been dispatched.',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestError('Password reset token is invalid or has expired.');
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return { message: 'Password has been successfully updated.' };
  }

  async revokeSession(token: string | undefined): Promise<void> {
    if (!token) return;
    const decoded = jwt.decode(token) as { jti?: string; exp?: number } | null;
    if (!decoded?.jti || !decoded.exp) return;
    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) await blacklistJti(decoded.jti, ttl);
  }

  issueDemoToken(user: { id: string; email: string; name: string }) {
    return this.generateToken(user, true);
  }

  private generateToken(user: { id: string; email: string; name: string }, demo = false) {
    const isDemo = demo || user.email.toLowerCase() === env.DEMO_USER_EMAIL.toLowerCase();
    return jwt.sign(
      { id: user.id, email: user.email, name: user.name, demo: isDemo },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRY as any, jwtid: crypto.randomUUID() }
    );
  }
}

export const authService = new AuthService();
