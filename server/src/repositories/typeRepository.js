import prisma from './prisma/prisma-client.js';
import { Type } from '../entities/Type.js';

export const typeRepository = {
  async getAll() {
    const types = await prisma.types.findMany();
    return types.map(t => new Type(t));
  },

  async findById(id) {
    const data = await prisma.types.findUnique({
      where: { id: Number(id) }
    });
    return data ? new Type(data) : null;
  },

  async findByName(name) {
    const data = await prisma.types.findUnique({
      where: { type_name: name }
    });
    return data ? new Type(data) : null;
  },

  async create(data) {
    const raw = await prisma.types.create({
      data: { type_name: data.name }
    });
    return new Type(raw);
  },

  async update(id, data) {
    const raw = await prisma.types.update({
      where: { id: Number(id) },
      data: { type_name: data.name }
    });
    return new Type(raw);
  },

  async delete(id) {
    await prisma.types.delete({
      where: { id: Number(id) }
    });
    return true;
  }
};