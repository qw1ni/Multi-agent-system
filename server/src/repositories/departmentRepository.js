import prisma from './prisma/prisma-client.js';
import { Department } from '../entities/Department.js';

export const departmentRepository = {
  async getAll() {
    const data = await prisma.departments.findMany();
    return data.map(d => new Department(d));
  },
  async findByFaculty(facultyId) {
    const data = await prisma.departments.findMany({ where: { faculty_id: Number(facultyId) } });
    return data.map(d => new Department(d));
  },
  async getDepartmentIdsByFaculty(facultyId) {
    const departments = await prisma.departments.findMany({
      where: { faculty_id: facultyId },
      select: { id: true }
    });
    return departments.map(d => d.id);
  },
  async findById(id) {
    const data = await prisma.departments.findUnique({ where: { id: Number(id) } });
    return data ? new Department(data) : null;
  },
  async findByName(name) {
    const raw = await prisma.departments.findUnique({
      where: { name: name }
    });
    return raw ? new Department(raw) : null
  },
  async findByUrl(url) {
    const raw = await prisma.departments.findUnique({
      where: { url: url }
    });
    return raw ? new Department(raw) : null
  },
  async create(data) {
    const raw = await prisma.departments.create({
      data: { name: data.name, url: data.url, faculty_id: Number(data.facultyId) }
    });
    return new Department(raw);
  },
  async update(id, data) {
    const raw = await prisma.departments.update({ where: { id: Number(id) }, data });
    return new Department(raw);
  },
  async delete(id) {
    return await prisma.departments.delete({ where: { id: Number(id) } });
  },
  async getDepartmentDisciplinesReportData(departmentName, startYear, endYear) {
    return await prisma.departments.findUnique({
      where: { name: departmentName },
      include: {
        department_disciplines: {
          include: {
            disciplines: true
          },
          orderBy: {
            disciplines: {
              name: 'asc'
            }
          }
        },
        materials: {
          where: {
            issued_year: {
              ...(startYear && { gte: startYear }),
              ...(endYear && { lte: endYear }),
            }
          },
          include: {
            material_authors: {
              include: {
                authors: true
              }
            }
          }
        }
      }
    });
  },
  async getDepartmentsMaterialsCounts(facultyId = null, startYear, endYear) {

    const departments = await prisma.departments.findMany({
      where: {
        ...(facultyId && { faculty_id: Number(facultyId) })
      },
      select: {
        id: true,
        name: true,
        materials: {
          where: {
            ...(startYear && endYear && {
              issued_year: {
                gte: startYear,
                lte: endYear
              }
            })
          },
          select: {
            id: true
          }
        }
      }
    });

    return departments
      .map(dept => ({
        departmentId: dept.id,
        department_name: dept.name,
        materialsCount: dept.materials.length
      }))
      .sort((a, b) => b.materialsCount - a.materialsCount);
  },
  async getDepartmentAuthorsActivity(departmentId, startYear, endYear) {

    const whereCondition = {
      department_id: Number(departmentId),
      ...(startYear && endYear && {
        issued_year: {
          gte: Number(startYear),
          lte: Number(endYear)
        }
      })
    };

    const result = await prisma.material_authors.groupBy({
      by: ['author_id'],
      where: {
        materials: whereCondition
      },
      _count: {
        material_id: true
      }
    });


    if (!result.length) return [];

    const authorIds = result.map(r => r.author_id);

    const authors = await prisma.authors.findMany({
      where: {
        id: { in: authorIds }
      },
      select: {
        id: true,
        name: true
      }
    });

    return result.map(r => {
      const author = authors.find(a => a.id === r.author_id);

      return {
        author_id: r.author_id,
        author_name: author?.name || 'Неизвестный автор',
        materials_count: r._count.material_id
      };
    })
      .sort((a, b) => b.materials_count - a.materials_count);
  }

};

