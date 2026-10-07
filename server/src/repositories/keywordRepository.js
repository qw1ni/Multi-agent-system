import prisma from './prisma/prisma-client.js';
import { Keyword } from '../entities/Keyword.js';

export const keywordRepository = {
  async getAll() {
    const list = await prisma.keywords.findMany();
    return list.map(k => new Keyword(k));
  },

  async findById(id) {
    const data = await prisma.keywords.findUnique({
      where: { id: Number(id) }
    });
    return data ? new Keyword(data) : null;
  },

  async findByWord(word) {
    const data = await prisma.keywords.findUnique({
      where: { word: word }
    });
    return data ? new Keyword(data) : null;
  },

  async create(data) {
    const raw = await prisma.keywords.create({
      data: { 
        word: data.word }
    });
    return new Keyword(raw);
  },

  async update(id, data) {
    const raw = await prisma.keywords.update({
      where: { id: Number(id) },
      data: { word: data.word }
    });
    return new Keyword(raw);
  },

  async delete(id) {
    await prisma.keywords.delete({
      where: { id: Number(id) }
    });
    return true;
  }
};