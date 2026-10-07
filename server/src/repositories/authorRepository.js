import prisma from './prisma/prisma-client.js';
import { Author } from '../entities/Author.js';

export const authorRepository = {
  async getAll() {
    const rawAuthors = await prisma.authors.findMany();
    return rawAuthors.map(m => new Author(m));
  },

  async findById(id) {
    const raw = await prisma.authors.findUnique({ where: { id: Number(id) } });
    return raw ? new Author(raw) : null;
  },

  async findByFullName(fullName) {
    const raw = await prisma.authors.findUnique({
      where: { name: fullName }
    });
    return raw ? new Author(raw) : null;
  },

  async create(data) {
    const raw = await prisma.authors.create({
      data: {
        name: data.name
      }
    });
    return new Author(raw);
  },

  async update(id, data) {
    const raw = await prisma.authors.update({
      where: { id: Number(id) },
      data: { name: data.name }
    });
    return new Author(raw);
  },

  async delete(id) {
    await prisma.authors.delete({
      where: { id: Number(id) }
    });
    return true;
  },

  async getAuthorsCountStats(limit = 25) {
    const stats = await prisma.material_authors.groupBy({
      by: ['author_id'],
      _count: {
        material_id: true,
      },
      orderBy: {
        _count: {
          material_id: 'desc',
        },
      },
      take: limit,
    });

    // Получить имена для авторов
    const statsWithNames = await Promise.all(
      stats.map(async (item) => {
        const author = await prisma.authors.findUnique({
          where: { id: item.author_id },
          select: { name: true }
        });

        return {
          name: author.name,
          count: item._count.material_id
        };
      })
    );

    return statsWithNames;
  },

  async searchByName(query, limit = 10, departmentId = null, facultyId = null) {
    const whereCondition = {
      name: {
        contains: query,
        mode: 'insensitive',
      },
    };

    if (departmentId) {
      whereCondition.material_authors = {
        some: {
          materials: {
            department_id: parseInt(departmentId, 10),
          }
        }
      };
    }
    else if (facultyId) {
      whereCondition.material_authors = {
        some: {
          materials: {
            departments: {
              faculty_id: parseInt(facultyId, 10)
            }
          }
        }
      };
    }

    const rawAuthors = await prisma.authors.findMany({
      where: whereCondition,
      take: limit,
      orderBy: { name: 'asc' }
    });

    return rawAuthors.map(m => new Author(m));
  },

  async findByAuthor(authorName, startYear = null, endYear = null) {
    const whereClause = {
      material_authors: {
        some: {
          authors: {
            name: {
              contains: authorName,
              mode: 'insensitive',
            },
          },
        },
      },
    };

    if (startYear || endYear) {
      whereClause.issued_year = {};
      if (startYear) whereClause.issued_year.gte = startYear;
      if (endYear) whereClause.issued_year.lte = endYear;
    }

    return await prisma.materials.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        publisher: true,
        issued_year: true,
        uri: true,
        material_authors: {
          select: {
            authors: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: [
        { issued_year: 'desc' },
        { title: 'asc' },
      ],
    });
  },
};