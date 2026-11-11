import { prisma } from '../../config/database.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../utils/errors.js';
import { Role } from '@prisma/client';

export class OrgService {
  async listUserOrgs(userId: string) {
    const memberships = await prisma.organizationMember.findMany({
      where: { userId, status: 'ACTIVE' },
      include: {
        organization: {
          include: {
            _count: {
              select: {
                apis: true,
                applications: true,
                members: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return memberships.map((m) => ({
      ...m.organization,
      userRole: m.role,
    }));
  }

  async createOrg(userId: string, data: { name: string; slug?: string }) {
    const slug =
      data.slug ||
      data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') + `-${Date.now().toString(36)}`;

    const existing = await prisma.organization.findUnique({ where: { slug } });
    if (existing) {
      throw new BadRequestError('An organization with this slug already exists.');
    }

    const org = await prisma.$transaction(async (tx) => {
      const createdOrg = await tx.organization.create({
        data: {
          name: data.name,
          slug,
        },
      });

      await tx.organizationMember.create({
        data: {
          userId,
          organizationId: createdOrg.id,
          role: 'OWNER',
          status: 'ACTIVE',
        },
      });

      return createdOrg;
    });

    return org;
  }

  async getOrgById(orgId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        _count: {
          select: {
            apis: true,
            applications: true,
            members: true,
          },
        },
      },
    });

    if (!org) throw new NotFoundError('Organization not found.');
    return org;
  }

  async updateOrg(orgId: string, data: { name?: string }) {
    return prisma.organization.update({
      where: { id: orgId },
      data,
    });
  }

  async listMembers(orgId: string) {
    return prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async inviteMember(orgId: string, data: { email: string; role: Role }) {
    // Check if user exists already
    const user = await prisma.user.findUnique({ where: { email: data.email } });

    if (user) {
      const existingMember = await prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: user.id,
            organizationId: orgId,
          },
        },
      });

      if (existingMember) {
        throw new BadRequestError('User is already a member of this organization.');
      }

      return prisma.organizationMember.create({
        data: {
          userId: user.id,
          organizationId: orgId,
          role: data.role,
          status: 'ACTIVE',
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });
    }

    throw new BadRequestError('User with that email does not have an account yet. Ask them to register first.');
  }

  async updateMemberRole(orgId: string, memberId: string, role: Role) {
    const member = await prisma.organizationMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.organizationId !== orgId) {
      throw new NotFoundError('Member not found in this organization.');
    }

    if (member.role === 'OWNER' && role !== 'OWNER') {
      const ownerCount = await prisma.organizationMember.count({
        where: { organizationId: orgId, role: 'OWNER' },
      });
      if (ownerCount <= 1) {
        throw new BadRequestError('Cannot change the role of the sole organization owner.');
      }
    }

    return prisma.organizationMember.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async removeMember(orgId: string, memberId: string) {
    const member = await prisma.organizationMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.organizationId !== orgId) {
      throw new NotFoundError('Member not found.');
    }

    if (member.role === 'OWNER') {
      const ownerCount = await prisma.organizationMember.count({
        where: { organizationId: orgId, role: 'OWNER' },
      });
      if (ownerCount <= 1) {
        throw new BadRequestError('Cannot remove the sole organization owner.');
      }
    }

    await prisma.organizationMember.delete({ where: { id: memberId } });
    return { message: 'Member removed successfully.' };
  }
}

export const orgService = new OrgService();
