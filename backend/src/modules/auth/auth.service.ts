import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { BadRequestError, UnauthorizedError, NotFoundError } from '../../utils/errors.js';
import { generateRandomToken } from '../../utils/crypto.js';

// Demo fallback data when PostgreSQL is not running locally
const DEMO_ADMIN = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'NexGate Administrator',
  email: 'admin@nexgate.dev',
  password: 'Password123!',
  orgId: '00000000-0000-0000-0000-000000000002',
  orgName: 'NexGate Engineering',
  orgSlug: 'nexgate-demo',
};

export class AuthService {
  async register(data: { name: string; email: string; password: string; organizationName?: string }) {
    try {
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
            role: 'OWNER',
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
        },
        token,
      };
    } catch (err: any) {
      if (err.message?.includes("Can't reach database server")) {
        throw new BadRequestError(
          'PostgreSQL is not running on localhost:5432. Please start Docker (docker-compose up -d) or use the demo login: admin@nexgate.dev / Password123!'
        );
      }
      throw err;
    }
  }

  async login(data: { email: string; password: string }) {
    try {
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
      // If PostgreSQL is unreachable, provide seamless demo login for admin@nexgate.dev
      if (err.message?.includes("Can't reach database server") || err.code === 'P1001') {
        if (data.email.toLowerCase() === DEMO_ADMIN.email && data.password === DEMO_ADMIN.password) {
          const token = this.generateToken({
            id: DEMO_ADMIN.id,
            email: DEMO_ADMIN.email,
            name: DEMO_ADMIN.name,
          });

          return {
            user: {
              id: DEMO_ADMIN.id,
              email: DEMO_ADMIN.email,
              name: DEMO_ADMIN.name,
            },
            organizations: [
              {
                id: DEMO_ADMIN.orgId,
                name: DEMO_ADMIN.orgName,
                slug: DEMO_ADMIN.orgSlug,
                role: 'OWNER',
              },
            ],
            token,
          };
        }

        throw new BadRequestError(
          'PostgreSQL is not running on localhost:5432. To sign in without Docker, use demo account: admin@nexgate.dev / Password123!'
        );
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
      if (err.message?.includes("Can't reach database server") || err.code === 'P1001') {
        if (userId === DEMO_ADMIN.id) {
          return {
            id: DEMO_ADMIN.id,
            email: DEMO_ADMIN.email,
            name: DEMO_ADMIN.name,
            createdAt: new Date(),
            memberships: [
              {
                role: 'OWNER',
                status: 'ACTIVE',
                organization: {
                  id: DEMO_ADMIN.orgId,
                  name: DEMO_ADMIN.orgName,
                  slug: DEMO_ADMIN.orgSlug,
                },
              },
            ],
          };
        }
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
      if (!data.currentPassword) {
        throw new BadRequestError('Current password is required to set a new password.');
      }
      const valid = await bcrypt.compare(data.currentPassword, user.passwordHash);
      if (!valid) {
        throw new BadRequestError('Current password does not match.');
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
      devResetToken: process.env.NODE_ENV !== 'production' ? token : undefined,
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

  private generateToken(user: { id: string; email: string; name: string }) {
    return jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRY as any }
    );
  }
}

export const authService = new AuthService();
