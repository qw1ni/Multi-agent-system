import { NotFoundError, BadRequestError, ConflictError } from "../errors/CommonErrors.js";
import { generateDepartmentDisciplinesExcelReport } from '../services/excelService.js'
import { generateDepartmentDisciplinesWord } from '../services/wordService.js'
import { ROLES } from "../config/roles.js";

export const createDepartmentUseCase = async (data, departmentRepository, facultyRepository) => {
  if (!data.faculty_id) {
    throw new BadRequestError('Для создания кафедры необходимо указать ID факультета');
  }
  if (!data.name) {
    throw new BadRequestError('Название кафедры обязательно');
  }
  if (!data.url) {
    throw new BadRequestError('URL-адрес кафедры обязателен');
  }

  const faculty = await facultyRepository.findById(data.faculty_id);

  if (!faculty) {
    throw new NotFoundError(`Невозможно создать кафедру: факультет с ID ${data.facultyId} не существует`);
  }

  const existingDepartmentByName = await departmentRepository.findByName(data.name);

  if (existingDepartmentByName) {
    throw new ConflictError(`Кафедра с именем "${data.name}" уже существует`);
  }

  const existingDepartmentByUrl = await departmentRepository.findByUrl(data.url);

  if (existingDepartmentByUrl) {
    throw new ConflictError(`Кафедра с URL-адресом "${data.url}" уже существует`);
  }

  return await departmentRepository.create(data);
};

export const getDepartmentByIdUseCase = async (id, repository) => {
  if (!id) {
    throw new BadRequestError('ID кафедры обязателен');
  }

  const department = await repository.findById(id);

  if (!department) {
    throw new NotFoundError(`Кафедра с ID ${id} не найдена`);
  }

  return department;
};

export const getDepartmentByFacultyUseCase = async (facultyId, repository) => {
  if (!facultyId) {
    throw new BadRequestError('ID факультета обязателен');
  }

  const departments = await repository.findByFaculty(facultyId);

  if (!departments || departments.length === 0) {
    throw new NotFoundError('Кафедры для данного факультета не найдены');
  }

  return departments;
};

export const getAllDepartmentUseCase = async (repository) => {
  const departments = await repository.getAll();

  if (!departments || departments.length === 0) {
    throw new NotFoundError('Список кафедр пуст');
  }

  return departments;
};

export const updateDepartmentUseCase = async (id, data, repository) => {
  if (!id) {
    throw new BadRequestError('ID кафедры обязателен для обновления');
  }

  const currentDept = await repository.findById(id);
  if (!currentDept) {
    throw new NotFoundError(`Кафедра с ID ${id} не найдена`);
  }

  if (data.name && data.name !== currentDept.name) {
    const existingByName = await repository.findByName(data.name);
    if (existingByName) {
      throw new ConflictError(`Имя "${data.name}" уже занято другой кафедрой`);
    }
  }

  if (data.url && data.url !== currentDept.url) {
    const existingByUrl = await repository.findByUrl(data.url);
    if (existingByUrl) {
      throw new ConflictError(`URL "${data.url}" уже используется другой кафедрой`);
    }
  }

  return await repository.update(id, data);
};

export const deleteDepartmentUseCase = async (id, repository) => {
  if (!id) {
    throw new BadRequestError('ID кафедры обязателен для удаления');
  }

  const department = await repository.findById(id);

  if (!department) {
    throw new NotFoundError(`Кафедра с ID ${id} не найдена`);
  }

  return await repository.delete(id);
};

export const getDepartmentDisciplinesUseCase = async (departmentName, startYear, endYear, targetYear, repository) => {
  if (!departmentName) {
    throw new BadRequestError('Название кафедры обязательно для формирования отчета');
  }

  const parsedStartYear = startYear ? parseInt(startYear, 10) : null;
  const parsedEndYear = endYear ? parseInt(endYear, 10) : null;
  const parsedTargetYear = targetYear ? parseInt(targetYear, 10) : new Date().getFullYear();

  if (parsedStartYear && parsedEndYear && parsedStartYear > parsedEndYear) {
    throw new BadRequestError('Начальный год не может быть больше конечного года');
  }

  const departmentData = await repository.getDepartmentDisciplinesReportData(departmentName, parsedStartYear, parsedEndYear);

  if (!departmentData) {
    throw new NotFoundError(`Кафедра "${departmentName}" не найдена`);
  }

  const allMaterials = departmentData.materials.map(material => {
    const authorsString = material.material_authors
      ? material.material_authors.map(ma => ma.authors.name).join('; ')
      : 'Автор не указан';

    let needsReissue = false;
    let reissueReason = 'Актуальный';

    if (material.issued_year) {
      const age = parsedTargetYear - material.issued_year;
      if (age >= 5) {
        needsReissue = true;
        reissueReason = `Требуется переиздание (прошло ${age} лет)`;
      }
    } else {
      reissueReason = 'Нет данных о годе издания';
    }

    return {
      id: material.id,
      title: material.title,
      alternativeTitle: material.alternative_title || '',
      authors: authorsString,
      issuedYear: material.issued_year || 'Н/Д',
      pages: material.pages || null,
      uri: material.uri,
      fileLink: material.file_link,
      citation: material.citation,
      needsReissue: needsReissue,
      reissueStatus: reissueReason // Пойдет текстом в ячейку новой колонки
    };
  });

  const rawRows = departmentData.department_disciplines.map(dd => {
    const discipline = dd.disciplines;

    const matchingMaterials = allMaterials.filter(m =>
      m.title.toLowerCase().includes(discipline.name.toLowerCase())
    );

    return {
      disciplineId: discipline.id,
      disciplineName: discipline.name,
      yearStartBound: dd.year_start,
      materials: matchingMaterials
    };
  });

  return {
    departmentName: departmentName,
    rows: rawRows
  };
};

export const getDepartmentsMaterialsCountUseCase =
  async (user, repository, filters) => {

    if (!user) {
      throw new BadRequestError('Данные пользователя обязательны');
    }

    const { roles, faculty_id } = user;
    const role = roles.name;

    let { startYear, endYear, facultyId } = filters;

    const parsedStartYear = startYear ? parseInt(startYear, 10) : null;
    const parsedEndYear = endYear ? parseInt(endYear, 10) : null;
    const parsedFacultyId = facultyId ? parseInt(facultyId, 10) : null;

    if (parsedStartYear && isNaN(parsedStartYear)) {
      throw new BadRequestError('Некорректный startYear');
    }

    if (parsedEndYear && isNaN(parsedEndYear)) {
      throw new BadRequestError('Некорректный endYear');
    }

    if (
      parsedStartYear &&
      parsedEndYear &&
      parsedStartYear > parsedEndYear
    ) {
      throw new BadRequestError('startYear не может быть больше endYear');
    }

    let effectiveFacultyId = null;

    if (role === ROLES.DEANERY) {
      if (!faculty_id) {
        throw new BadRequestError('Не указан ID факультета');
      }
      effectiveFacultyId = faculty_id;
    } else {
      effectiveFacultyId = parsedFacultyId;
    }

    const counts = await repository.getDepartmentsMaterialsCounts(
      effectiveFacultyId,
      parsedStartYear,
      parsedEndYear
    );

    return counts || [];
  };


export const getDepartmentAuthorsActivityUseCase = async (user, repository, filters) => {

  if (!user) {
    throw new BadRequestError('Пользователь не определён');
  }

  const { departmentId, startYear, endYear } = filters;

  if (!departmentId) {
    throw new BadRequestError('ID кафедры обязателен');
  }

  const parsedDepartmentId = Number(departmentId);
  const parsedStartYear = startYear ? Number(startYear) : null;
  const parsedEndYear = endYear ? Number(endYear) : null;

  if (parsedStartYear && parsedEndYear && parsedStartYear > parsedEndYear) {
    throw new BadRequestError('Некорректный период');
  }

  if (user.roles.name === 'Сотрудник кафедры') {
    if (user.department_id !== parsedDepartmentId) {
      throw new ForbiddenError('Нет доступа к чужой кафедре');
    }
  }

  if (user.roles.name === 'Сотрудник деканата') {
    const department = await prisma.departments.findUnique({
      where: { id: parsedDepartmentId },
      select: { faculty_id: true }
    });

    if (!department || department.faculty_id !== user.faculty_id) {
      throw new ForbiddenError('Нет доступа к кафедре другого факультета');
    }
  }
  return await repository.getDepartmentAuthorsActivity(
    parsedDepartmentId,
    parsedStartYear,
    parsedEndYear
  );
};

//---------------------------------
//---------EXPORT EXCEL------------
//---------------------------------

export const exportDepartmentDisciplinesToExcel = async (params) => {
  const { departmentName, startYear, endYear, repository, targetYear, showReissueColumn } = params;

  const reportData = await getDepartmentDisciplinesUseCase(departmentName, startYear, endYear, targetYear, repository);

  const isReissue = showReissueColumn === true || showReissueColumn === 'true';

  const fileBuffer = await generateDepartmentDisciplinesExcelReport(reportData, startYear, endYear, targetYear, isReissue);

  return {
    buffer: fileBuffer,
    fileName: isReissue
      ? `Reissue_Needs_Excel_Report_${startYear}-${endYear}_target_${targetYear}.xlsx`
      : `Department_Disciplines_Excel_Report_${startYear}-${endYear}.xlsx`
  };
};

//---------------------------------
//---------EXPORT WORD-------------
//---------------------------------

export const exportDepartmentDisciplinesToWordUseCase = async (params, repository) => {
  const { departmentName, startYear, endYear, targetYear, showReissueColumn = false } = params;

  const reportData = await getDepartmentDisciplinesUseCase(departmentName, startYear, endYear, targetYear, repository);

  const buffer = await generateDepartmentDisciplinesWord(reportData, startYear, endYear, showReissueColumn === "true", targetYear);

  return {
    buffer,
    filename: `${showReissueColumn === "true" ? "Reissue_Word_Report" : "Department_Disciplines_Word_Report"}_${startYear}-${endYear}.docx`
  };
};