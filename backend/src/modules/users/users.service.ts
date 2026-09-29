import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { uploadBuffer } from '../../lib/cloudinary';
import { ApiError } from '../../utils/ApiError';
import { publicUserSelect } from '../auth/auth.service';

export const usersService = {
  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { ...publicUserSelect, _count: { select: { orders: true, wishlist: true, referrals: true } } },
    });
    if (!user) throw ApiError.notFound('User not found');
    return user;
  },

  updateMe(userId: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({ where: { id: userId }, data, select: publicUserSelect });
  },

  async updateAvatar(userId: string, file: Express.Multer.File) {
    const uploaded = await uploadBuffer(file.buffer, 'avatars', file.mimetype);
    return prisma.user.update({ where: { id: userId }, data: { avatarUrl: uploaded.secure_url }, select: publicUserSelect });
  },

  listAddresses(userId: string) {
    return prisma.address.findMany({ where: { userId }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] });
  },

  async createAddress(userId: string, data: Omit<Prisma.AddressUncheckedCreateInput, 'userId'>) {
    const count = await prisma.address.count({ where: { userId } });
    if (count >= 20) throw ApiError.badRequest('You can save up to 20 addresses');
    const isDefault = data.isDefault || count === 0;
    return prisma.$transaction(async (tx) => {
      if (isDefault) await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
      return tx.address.create({ data: { ...data, userId, isDefault } });
    });
  },

  async updateAddress(userId: string, id: string, data: Prisma.AddressUpdateInput) {
    await this.assertOwner(userId, id);
    return prisma.$transaction(async (tx) => {
      if (data.isDefault) await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
      return tx.address.update({ where: { id }, data });
    });
  },

  async deleteAddress(userId: string, id: string) {
    const address = await this.assertOwner(userId, id);
    await prisma.address.delete({ where: { id } });
    // Promote another address to default if we removed the default one.
    if (address.isDefault) {
      const next = await prisma.address.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
      if (next) await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  },

  async assertOwner(userId: string, id: string) {
    const address = await prisma.address.findUnique({ where: { id } });
    if (!address || address.userId !== userId) throw ApiError.notFound('Address not found');
    return address;
  },
};
