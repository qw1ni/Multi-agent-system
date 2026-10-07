import { NotFoundError, BadRequestError, ConflictError, ForbiddenError } from "../errors/CommonErrors.js";
import { ROLES } from "../config/roles.js";
import { generateDepartmentMaterialsExcel } from '../services/excelService.js';
import { generateDepartmentMaterialsWord } from '../services/wordService.js';
import axios from 'axios';

export const getMaterialByIdUseCase = async (id, currentUser, repository) => {
  if (!id) {
    throw new BadRequestError('ID материала обязателен');
  }

  const material = await repository.findById(id);

  if (!material) {
    throw new NotFoundError(`Материал с ID ${id} не найден`);
  }

  if (!currentUser) {
    return material;
  }

  const userRole = currentUser.roles?.name;

  if (userRole === ROLES.DEPARTMENT) {
    if (Number(material.departmentId) !== Number(currentUser.department_id)) {
      throw new ForbiddenError('Доступ запрещен: этот материал принадлежит другой кафедре');
    }
  }

  if (userRole === ROLES.DEANERY) {
    if (Number(material.facultyId) !== Number(currentUser.faculty_id)) {
      throw new ForbiddenError('Доступ запрещен: этот материал принадлежит другому факультету');
    }
  }

  return material;
};

export const getMaterialsWithPag = async (params, currentUser, repository) => {
  const { page = 1, limit = 10, authorId, departmentId, facultyId, yearFrom, yearTo, materialIds } = params;

  const safePage = Math.max(1, parseInt(page));
  const safeLimit = Math.max(1, Math.min(100, parseInt(limit)));
  const offset = (safePage - 1) * safeLimit;

  let parsedIds = null;
  if (materialIds) {
    parsedIds = Array.isArray(materialIds)
      ? materialIds.map(Number)
      : materialIds.split(',').map(Number);
  }

  let finalDepartmentId = departmentId ? Number(departmentId) : null;
  let finalFacultyId = facultyId ? Number(facultyId) : null;

  if (currentUser) {
    const userRole = currentUser.roles?.name;

    if (userRole === ROLES.DEPARTMENT) {
      finalDepartmentId = Number(currentUser.department_id);
      finalFacultyId = null;
    }
    else if (userRole === ROLES.DEANERY) {
      finalFacultyId = Number(currentUser.faculty_id);
    }
  }

  const { items, total } = await repository.getMaterialsWithPag({
    authorId: authorId ? Number(authorId) : null,
    departmentId: finalDepartmentId,
    facultyId: finalFacultyId,
    yearFrom: yearFrom ? Number(yearFrom) : null,
    yearTo: yearTo ? Number(yearTo) : null,
    materialIds: parsedIds,
    limit: safeLimit,
    offset
  });

  return {
    items: items || [],
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit)
    }
  };
};


export const updateMaterialUseCase = async (id, data, repository) => {
  if (!id) {
    throw new BadRequestError('ID материала обязателен для обновления');
  }

  const currentMaterial = await repository.findById(id);
  if (!currentMaterial) {
    throw new NotFoundError(`Материал с ID ${id} не найден`);
  }

  if (data.url && data.url !== currentMaterial.url) {
    const existingByUrl = await repository.findByUrl(data.url);
    if (existingByUrl) {
      throw new ConflictError(`URL "${data.url}" уже используется другим материалом`);
    }
  }

  return await repository.update(id, data);
};

export const getUniversityMaterialStatsUseCase = async (repository) => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalMaterials, materialsThisYear, materialsThisMonth, leaderFacultyName] =
    await Promise.all([
      repository.getTotalCount(),
      repository.getCountSinceDate(startOfYear),
      repository.getCountSinceDate(startOfMonth),
      repository.getLeaderFacultyName(),
    ]);

  return {
    totalMaterials,
    materialsThisYear,
    materialsThisMonth,
    leaderFaculty: leaderFacultyName || 'Не определен',
  };
};

export const getRecentMaterialsUseCase = async (repository) => {
  const materials = await repository.getRecentMaterials(12);

  return materials.map(m => {
    const authorsList = m.material_authors && m.material_authors.length > 0
      ? m.material_authors
        .filter(ma => ma.authors)
        .map(ma => ma.authors.name)
        .join(', ')
      : 'Неизвестный автор';

    return {
      id: m.id,
      title: m.title,
      availableDate: m.available_date,
      author: authorsList,
      facultyName: m.departments?.faculties?.name || null
    };
  });
};

export const getDepartmentMaterialsUseCase = async (materialRepository, currentUser, filters = {}) => {
  if (!currentUser) {
    throw new ForbiddenError('Пользователь не авторизован');
  }
  const { roles, department_id } = currentUser;
  const role = roles?.name;

  if (role !== ROLES.DEPARTMENT) {
    throw new ForbiddenError('Доступ к этому отчету разрешен только сотрудникам кафедры');
  }

  if (!department_id) {
    throw new BadRequestError('У сотрудника кафедры не указан ID кафедры');
  }

  const { yearFrom, yearTo } = filters;

  const parsedYearFrom = yearFrom && !isNaN(yearFrom) ? parseInt(yearFrom, 10) : null;
  const parsedYearTo = yearTo && !isNaN(yearTo) ? parseInt(yearTo, 10) : null;

  if (parsedYearFrom && parsedYearTo && parsedYearFrom > parsedYearTo) {
    throw new BadRequestError('Год "С" не может быть больше года "По"');
  }

  const rawMaterials = await materialRepository.findAllMaterialsByDepartment(
    department_id,
    parsedYearFrom,
    parsedYearTo
  );


  const groupedByYear = rawMaterials.reduce((acc, material) => {
    const year = material.issued_year || 'Год не указан';

    if (!acc[year]) {
      acc[year] = [];
    }

    const currentYearCount = acc[year].length + 1;

    acc[year].push({
      number: currentYearCount,
      authors: material.material_authors.map(ma => ma.authors.name).join(', '),
      types: material.material_types.map(mt => mt.types.type_name).join(', '),
      citation: material.citation,
      file_link: material.file_link
    });

    return acc;
  }, {});

  const sortedGroupedByYear = {};
  Object.keys(groupedByYear)
    .sort((a, b) => b - a)
    .forEach(key => {
      sortedGroupedByYear[key] = groupedByYear[key];
    });

  return sortedGroupedByYear;
};

export const searchMaterialsUseCase = async (query, materialRepository, aiServerUrl) => {

  if (!query || query.trim().length < 2) {
    throw new BadRequestError('Слишком короткий поисковый запрос');
  }

  const trimmedQuery = query.trim();

  const exactMatches =
    await materialRepository.searchMaterialsByTitle(trimmedQuery, 30);

  if (exactMatches.length >= 10) {
    return {
      exact: exactMatches,
      semantic: []
    };
  }

  let semanticMatches = [];

  try {
    const aiResponse = await axios.post(`${aiServerUrl}/api/ai/search`, { query: trimmedQuery, limit: 30 });

    semanticMatches = aiResponse.data || [];
  } catch (error) {
    console.error("Ошибка AI сервера:", error.message);
  }
  const exactIds = new Set(exactMatches.map(m => m.id));

  const filteredSemantic = semanticMatches.filter(
    m => !exactIds.has(m.material_id)
  );

  return {
    exact: exactMatches,
    semantic: filteredSemantic
  };
};

//---------------------------------
//---------EXPORT EXCEL------------
//---------------------------------

export const exportDepartmentMaterialsToExcelUseCase = async (filters, materialRepository, currentUser, departmentName) => {
  if (!currentUser) {
    throw new Error('Пользователь не авторизован');
  }

  const data = await getDepartmentMaterialsUseCase(materialRepository, currentUser, filters);

  if (!data || Object.keys(data).length === 0) {
    throw new NotFoundError('Материалы для выбранной кафедры отсутствуют');
  }

  const buffer = await generateDepartmentMaterialsExcel(data, departmentName);

  return buffer;
};

//---------------------------------
//---------EXPORT WORD-------------
//---------------------------------

export const exportDepartmentMaterialsToWordUseCase = async (materialRepository, currentUser, filters, departmentName) => {

  const groupedData = await getDepartmentMaterialsUseCase(materialRepository, currentUser, filters);

  const buffer = await generateDepartmentMaterialsWord(groupedData, departmentName, filters.yearFrom, filters.yearTo);

  return {
    buffer,
    filename: `Department_Materials_Word_Report_${filters.yearFrom || "all"}-${filters.yearTo || "all"}.docx`
  };
};