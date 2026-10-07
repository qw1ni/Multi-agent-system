import { NotFoundError, BadRequestError, ConflictError, ForbiddenError } from "../errors/CommonErrors.js";
import { generateFacultyReportExcel, generateFacultyDepReportExcel } from '../services/excelService.js';
import { generateFacultyReportWord, generateFacultyWithDepartmentsWord } from "../services/wordService.js";

export const createFacultyUseCase = async (data, repository) => {
  if (!data.name || !data.url) throw new BadRequestError('Для создания факультета необходимо указать имя и URL');

  const existingFacultyByName = await repository.findByName(data.name);

  if (existingFacultyByName) {
    throw new ConflictError(`Факультет с именем "${data.name}" уже существует`);
  }

  const existingFacultyByUrl = await repository.findByName(data.url);

  if (existingFacultyByUrl) {
    throw new ConflictError(`Факультет с URL-адресом "${data.url}" уже существует`);
  }

  return await repository.create(data);
};

export const getFacultyByIdUseCase = async (id, repository) => {
  if (!id) {
    throw new BadRequestError('ID факультета обязателен');
  }

  const faculty = await repository.findById(id);

  if (!faculty) throw new NotFoundError(`Факультет с ID ${id} не найден`);

  return faculty;
};

export const getAllFacultyUseCase = async (repository) => {
  const faculties = await repository.getAll();
  if (!faculties || faculties.length === 0) throw new NotFoundError('Список факультетов пуст');
  return faculties;
};

export const updateFacultyUseCase = async (id, data, repository) => {
  if (!id) {
    throw new BadRequestError('ID факультета обязателен для обновления');
  }

  const currentFaculty = await repository.findById(id);
  if (!currentFaculty) {
    throw new NotFoundError(`Факультет с ID ${id} не найден`);
  }

  if (data.name && data.name !== currentFaculty.name) {
    const existingByName = await repository.findByName(data.name);
    if (existingByName) {
      throw new ConflictError(`Имя "${data.name}" уже занято другим факультетом`);
    }
  }

  if (data.url && data.url !== currentFaculty.url) {
    const existingByUrl = await repository.findByUrl(data.url);
    if (existingByUrl) {
      throw new ConflictError(`URL "${data.url}" уже используется другим факультетом`);
    }
  }

  return await repository.update(id, data);
};

export const deleteFacultyUseCase = async (id, repository) => {
  if (!id) {
    throw new BadRequestError('ID факультета обязателен для удаления');
  }

  const faculty = await repository.findById(id);

  if (!faculty) {
    throw new NotFoundError(`Факультет с ID ${id} не найден`);
  }

  return await repository.delete(id);
};

export const getFacultyReportOnYearUseCase = async (params, repository) => {
  const currentYear = new Date().getFullYear();
  const startYear = parseInt(params.startYear) || 2020;
  const endYear = parseInt(params.endYear) || currentYear;

  if (startYear < 2010 || endYear > currentYear) {
    throw new BadRequestError(`Диапазон дат должен быть в пределах 2010-${currentYear} гг.`);
  }

  if (startYear > endYear) {
    throw new BadRequestError('Год начала не может быть больше года окончания');
  }

  const reportData = await repository.getMaterialsReportOnYear(startYear, endYear);

  if (!reportData || reportData.length === 0) {
    throw new NotFoundError('Данные для отчета по факультетам за указанный период не найдены');
  }

  const totals = reportData.reduce((acc, row) => {
    Object.keys(row).forEach(key => {
      if (key !== 'faculty_name') {
        acc[key] = (acc[key] || 0) + Number(row[key]);
      }
    });
    return acc;
  }, { faculty_name: 'Итого' });

  return [...reportData, totals];
};

export const getFacultyReportOnYearWithDepartmentsUseCase = async (params, repository) => {
  const currentYear = new Date().getFullYear();
  const startYear = parseInt(params.startYear) || 2020;
  const endYear = parseInt(params.endYear) || currentYear;

  if (startYear > endYear) {
    throw new BadRequestError('Год начала не может быть больше года окончания');
  }

  const rawData = await repository.getMaterialsReportOnYearWithDepartments(startYear, endYear);

  if (!rawData || rawData.length === 0) {
    throw new NotFoundError('Данные для отчета по факультетам в разрезе кафедр не найдены');
  }

  const grouped = rawData.reduce((acc, row) => {
    const facultyName = row.faculty_name;

    if (!acc[facultyName]) {
      acc[facultyName] = {
        name: facultyName,
        departments: [],
        totals: { total: 0 }
      };
      for (let y = startYear; y <= endYear; y++) acc[facultyName].totals[y] = 0;
    }

    acc[facultyName].departments.push(row);

    for (let year = startYear; year <= endYear; year++) {
      acc[facultyName].totals[year] += Number(row[year] || 0);
    }
    acc[facultyName].totals.total += Number(row.total || 0);

    return acc;
  }, {});

  //return Object.values(grouped);
  return Object.values(grouped)
    .sort((a, b) => b.totals.total - a.totals.total);
};

export const getDepartmentMaterialsByFacultyUseCase = async (params, repository) => {
  const currentYear = new Date().getFullYear();
  const { facultyName } = params;
  const startYear = parseInt(params.startYear, 10) || 2020;
  const endYear = parseInt(params.endYear, 10) || currentYear;

  if (!facultyName) {
    throw new BadRequestError('Название факультета обязательно для формирования отчета');
  }

  if (startYear < 2010 || endYear > currentYear) {
    throw new BadRequestError(`Диапазон дат должен быть в пределах 2010-${currentYear} гг.`);
  }

  if (startYear > endYear) {
    throw new BadRequestError('Год начала не может быть больше года окончания');
  }

  const rawData = await repository.getDepartmentMaterialsByFaculty(facultyName, startYear, endYear);

  if (!rawData || rawData.length === 0) {
    throw new NotFoundError(`Данные по кафедрам для факультета "${facultyName}" за указанный период не найдены`);
  }

  // Приведение BigInt полей от БД к обычным Number для корректного JSON.stringify на фронтенде
  return rawData.map(row => {
    const formattedRow = { ...row };
    Object.keys(formattedRow).forEach(key => {
      if (key !== 'department_name' && key !== 'faculty_name' && key !== 'department_id') {
        formattedRow[key] = Number(formattedRow[key] || 0);
      }
    });
    return formattedRow;
  });
};

//---------------------------------
//---------EXPORT EXCEL------------
//---------------------------------

export const exportFacultyReportToExcelUseCase = async (repository, currentUser, startYear, endYear) => {
  const currentYear = new Date().getFullYear();
  if (!currentUser) {
    throw new ForbiddenError('Пользователь не авторизован');
  }

  const defStartYear = startYear ? parseInt(startYear, 10) : 2010;
  const defEndYear = endYear ? parseInt(endYear, 10) : 2026;

  if (defStartYear < 2010 || defEndYear > currentYear) {
    throw new BadRequestError(`Диапазон дат должен быть в пределах 2010-${currentYear} гг.`);
  }

  if (defStartYear > defEndYear) {
    throw new BadRequestError('Год начала не может быть больше года окончания');
  }

  const facultyData = await repository.getMaterialsReportOnYear(defStartYear, defEndYear);

  const buffer = await generateFacultyReportExcel(facultyData, defStartYear, defEndYear);

  return buffer;
};

export const exportFacultyDepReportToExcelUseCase = async (params, repository, currentUser) => {
  if (!currentUser) {
    throw new ForbiddenError('Пользователь не авторизован');
  }

  const startYear = parseInt(params.startYear, 10) || 2010;
  const currentYear = new Date().getFullYear();
  const endYear = parseInt(params.endYear, 10) || currentYear;

  if (startYear < 2010 || endYear > currentYear) {
    throw new BadRequestError(`Диапазон дат должен быть в пределах 2010-${currentYear} гг.`);
  }

  if (startYear > endYear) {
    throw new BadRequestError('Год начала не может быть больше года окончания');
  }

  const structuredData = await getFacultyReportOnYearWithDepartmentsUseCase(params, repository);

  return await generateFacultyDepReportExcel(structuredData, startYear, endYear);
};


//---------------------------------
//---------EXPORT WORD-------------
//---------------------------------

export const exportFacultyReportToWordUseCase = async (params, repository, currentUser) => {

  if (!currentUser) {
    throw new ForbiddenError('Пользователь не авторизован');
  }

  const reportData = await getFacultyReportOnYearUseCase(params, repository);

  const buffer = await generateFacultyReportWord(
    reportData,
    params.startYear,
    params.endYear
  );

  return {
    buffer,
    filename: `Faculty_Word_Report_${params.startYear}-${params.endYear}.docx`
  };
};

export const exportFacultyDepReportToWordUseCase = async (params, repository) => {

  const reportData = await getFacultyReportOnYearWithDepartmentsUseCase(params, repository);

  const buffer = await generateFacultyWithDepartmentsWord(
    reportData,
    params.startYear,
    params.endYear
  );

  return {
    buffer,
    filename: `Faculty_Departments_Word_Report_${params.startYear}-${params.endYear}.docx`
  };
};

