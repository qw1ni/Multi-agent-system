import prisma from './prisma/prisma-client.js';
import { Material } from '../entities/Material.js';
import { getMaterialsWithPag } from '../use-cases/materialUseCases.js';

export const materialRepository = {
    async getAll() {
        const data = await prisma.departments.findMany();
        return data.map(d => new Department(d));
    },
    async findById(id) {
        const data = await prisma.materials.findUnique({
            where: { id: Number(id) },
            include: {
                departments: {
                    include: { faculties: true }
                },
                // Подгружаем авторов через промежуточную таблицу
                material_authors: {
                    include: { authors: true }
                },
                // Подгружаем ключевые слова
                material_keywords: {
                    include: { keywords: true }
                },
                // Подгружаем типы (например, Учебное пособие, Статья)
                material_types: {
                    include: { types: true }
                },
                // Подгружаем специальности
                material_specialties: {
                    include: { specialties: true }
                },
                // Подгружаем коды УДК
                material_udccodes: {
                    include: { udc_codes: true }
                },
            }
        });

        if (!data) return null;

        return new Material({
            ...data,
            departmentName: data.departments?.name,
            facultyName: data.departments?.faculties?.name,
            authors: data.material_authors?.map(ma => ma.authors) || [],
            keywords: data.material_keywords?.map(mk => mk.keywords) || [],
            types: data.material_types?.map(mt => mt.types) || [],
            specialities: data.material_specialties?.map(ms => ms.specialties) || [],
            material_udcCodes: data.material_udccodes?.map(mu => mu.udc_codes) || []
        });
    },
    async findByTitle(name) {
        const raw = await prisma.materials.findUnique({
            where: { title: name }
        });
        return raw ? new Material(raw) : null
    },
    async getMaterialsWithPag({ authorId, departmentId, facultyId, yearFrom, yearTo, materialIds, limit = 10, offset = 0 }) {
        const where = {};

        if (materialIds && Array.isArray(materialIds) && materialIds.length > 0) {
            where.id = { in: materialIds };
        }

        if (authorId) where.material_authors = { some: { author_id: authorId } };
        if (departmentId) where.department_id = departmentId;
        if (facultyId) where.departments = { faculty_id: facultyId };

        if (yearFrom || yearTo) {
            where.issued_year = {
                gte: yearFrom || undefined,
                lte: yearTo || undefined
            };
        }

        const [data, count] = await Promise.all([
            prisma.materials.findMany({
                where,
                take: limit,
                skip: offset,
                include: {
                    departments: { include: { faculties: true } },
                    material_authors: { include: { authors: true } }
                }
            }),
            prisma.materials.count({ where })
        ]);

        return {
            items: data.map(item => {
                const authorsList = item.material_authors.map(ma => ({
                    id: ma.authors.id,
                    name: ma.authors.name
                }));

                return new Material({
                    ...item,
                    authors: authorsList,
                    departmentName: item.departments?.name || '',
                    facultyName: item.departments?.faculties?.name || ''
                });
            }),
            total: count
        };
    },

    async findByUrl(url) {
        const raw = await prisma.materials.findUnique({
            where: { url: url }
        });
        return raw ? new Material(raw) : null
    },
    async update(id, data) {
        const raw = await prisma.materials.update({ where: { id: Number(id) }, data });
        return new Material(raw);
    },
    //   async delete(id) {
    //     return await prisma.departments.delete({ where: { id: Number(id) } });
    //   }
    async getTotalCount() {
        return await prisma.materials.count();
    },

    async getCountSinceDate(date) {
        return await prisma.materials.count({
            where: {
                available_date: {
                    gte: date,
                },
            },
        });
    },

    async getLeaderFacultyName() {
        const result = await prisma.$queryRaw`
        SELECT f.name 
        FROM materials m
        JOIN departments d ON m.department_id = d.id
        JOIN faculties f ON d.faculty_id = f.id
        GROUP BY f.id, f.name
        ORDER BY COUNT(m.id) DESC
        LIMIT 1
    `;

        // Если база пустая, возвращаем null
        return result.length > 0 ? result[0].name : null;
    }, // Переместить в факультеты

    getRecentMaterials: async (limit = 10) => {
        return await prisma.materials.findMany({
            take: limit,
            orderBy: {
                available_date: 'desc',
            },
            include: {
                material_authors: {
                    include: {
                        authors: {
                            select: {
                                name: true
                            }
                        }
                    }
                },
                departments: {
                    include: {
                        faculties: {
                            select: {
                                name: true
                            }
                        }
                    }
                }
            },
        });
    },

    async findAllMaterialsByDepartment(departmentId, yearFrom = null, yearTo = null) {
        const whereCondition = {
            department_id: parseInt(departmentId, 10)
        };

        if (yearFrom !== null || yearTo !== null) {
            whereCondition.issued_year = {};

            if (yearFrom !== null) {
                whereCondition.issued_year.gte = yearFrom;
            }
            if (yearTo !== null) {
                whereCondition.issued_year.lte = yearTo;
            }
        }

        return await prisma.materials.findMany({
            where: whereCondition,
            select: {
                id: true,
                citation: true,
                issued_year: true,
                file_link: true,
                material_authors: {
                    select: {
                        authors: {
                            select: { name: true }
                        }
                    }
                },
                material_types: {
                    select: {
                        types: {
                            select: { type_name: true }
                        }
                    }
                }
            },
            orderBy: {
                issued_year: 'desc'
            }
        });
    },

    async searchMaterialsByTitle(query, limit = 30) {
        return await prisma.materials.findMany({
            where: {
                OR: [
                    {
                        title: {
                            contains: query,
                            mode: 'insensitive'
                        }
                    },
                    {
                        alternative_title: {
                            contains: query,
                            mode: 'insensitive'
                        }
                    }
                ]
            },
            take: limit
        });
    }
};

