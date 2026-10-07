import prisma from './prisma/prisma-client.js';
import { Role } from '../entities/Role.js';

export const roleRepository = {
  async getAll() {
    const list = await prisma.roles.findMany();
    return list.map(r => new Role(r));
  },

  async findById(id) {
    const data = await prisma.roles.findUnique({
      where: { id: Number(id) }
    });
    return data ? new Role(data) : null;
  },

  async findByName(name) {
    const data = await prisma.roles.findFirst({
      where: { name: name }
    });
    return data ? new Role(data) : null;
  },

  async create(data) {
    const raw = await prisma.roles.create({
      data: { name: data.name }
    });
    return new Role(raw);
  },

  async update(id, data) {
    const raw = await prisma.roles.update({
      where: { id: Number(id) },
      data: { name: data.name }
    });
    return new Role(raw);
  },

  async delete(id) {
    await prisma.roles.delete({
      where: { id: Number(id) }
    });
    return true;
  }
};