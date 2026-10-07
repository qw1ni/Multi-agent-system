import prisma from './prisma/prisma-client.js';
import { User } from '../entities/User.js';

export const userRepository = {
  async findById(id) {
    const raw = await prisma.users.findUnique({ where: { user_id: Number(id) } });
    return raw ? new User(raw) : null;
  },

  async getAll() {
    const list = await prisma.users.findMany({
      include: {
        faculties: true,
        departments: true,
        roles: true,
      }
    });
    return list.map(u => new User(u));
  },

  async findByLogin(login) {
    return await prisma.users.findUnique({ where: { login } });
  },

  async findByEmail(email) {
    return await prisma.users.findUnique({ where: { email } });
  },

  async create(data) {
    return await prisma.users.create({
      data: {
        full_name: data.fullName,
        email: data.email,
        login: data.login,
        password: data.password,
        role_id: data.roleId,
        faculty_id: data.facultyId,
        department_id: data.departmentId
      },
      include: {
        roles: true
      }
    });
  },

  async countByRoleId(roleId) {
    const raw = await prisma.users.count({
      where: {
        role_id: Number(roleId)
      }
    });
    return raw ? new User(raw) : null;
  },

  async update(id, userData) {
    const raw = await prisma.users.update({
      where: { user_id: Number(id) },
      data: userData
    });
    return new User(raw);
  },

  async delete(id) {
    await prisma.users.delete({ where: { user_id: Number(id) } });
    return true;
  },

  async findByIdentifier(identifier) {
    return await prisma.users.findFirst({
      where: {
        OR: [
          { login: identifier },
          { email: identifier }
        ]
      },
      include: {
        roles: true,
        departments: true,
        faculties: true
      }
    });
  },
  async findManyAndCount({ search, skip, take }) {
    const whereCondition = {};

    if (search && search.trim() !== '') {
      const searchLower = search.trim();

      whereCondition.OR = [
        { full_name: { contains: searchLower, mode: 'insensitive' } },
        { login: { contains: searchLower, mode: 'insensitive' } },
        { email: { contains: searchLower, mode: 'insensitive' } },
      ];
    }

    const [rawUsers, totalCount] = await prisma.$transaction([
      prisma.users.findMany({
        where: whereCondition,
        skip: skip,
        take: take,
        orderBy: { user_id: 'desc' }, // Сначала новые пользователи
      }),
      prisma.users.count({
        where: whereCondition,
      }),
    ]);
    const users = rawUsers.map(raw => new User(raw));

    return { users, totalCount };
  },
};