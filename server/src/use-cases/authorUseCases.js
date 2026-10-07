import { NotFoundError, BadRequestError, ConflictError, ForbiddenError } from "../errors/CommonErrors.js";
import { ROLES } from "../config/roles.js";
import { generateTopAuthorsExcel, generateAuthorReportExcel } from '../services/excelService.js';
import { generateTopAuthorsWord, generateAuthorReportWord } from '../services/wordService.js'

export const getAuthorByIdUseCase = async (id, repository) => {
  if (!id) {
    throw new BadRequestError('ID автора обязателен');
  }

  const author = await repository.findById(id);

  if (!author) {
    throw new NotFoundError(`Автор с ID ${id} не найден`);
  }

  return author;
};

export const getAllAuthorsUseCase = async (repository) => {
  return await repository.getAll();
};


export const createAuthorUseCase = async (data, repository) => {
  if (!data.fullName) {
    throw new BadRequestError('ФИО автора обязательно для заполнения');
  }

  const existingAuthor = await repository.findByFullName(data.fullName);

  if (existingAuthor) {
    throw new ConflictError(`Автор с ФИО "${data.fullName}" уже существует`);
  }

  return await repository.create(data);
};


export const updateAuthorUseCase = async (id, data, repository) => {
  if (!id) {
    throw new BadRequestError('ID автора обязателен для обновления');
  }

  const author = await repository.findById(id);
  if (!author) {
    throw new NotFoundError(`Автор с ID ${id} не найден`);
  }

  return await repository.update(id, data);
};


export const deleteAuthorUseCase = async (id, repository) => {
  if (!id) {
    throw new BadRequestError('ID автора обязателен для удаления');
  }

  const author = await repository.findById(id);
  if (!author) {
    throw new NotFoundError(`Автор с ID ${id} не найден`);
  }

  return await repository.delete(id);
};


export const getTopAuthorsUseCase = async (repository, limit) => {
  const authors = await repository.getAuthorsCountStats(limit);

  if (!authors || authors.length === 0) {
    throw new NotFoundError('Данные для формирования статистики авторов отсутствуют');
  }

  return authors;
};

export const searchAuthorsUseCase = async (query, repository, currentUser) => {
  if (!query || query.length < 2) {
    return [];
  }

  const { roles, department_id, faculty_id } = currentUser || {};
  const role = roles?.name || null;
  let departmentIdFilter = null;
  let facultyIdFilter = null;

  if (role === ROLES.DEPARTMENT) {
    if (!department_id) {
      throw new BadRequestError('У сотрудника кафедры не указан ID');
    }
    departmentIdFilter = department_id;
  }

  else if (role === ROLES.DEANERY) {
    if (!faculty_id) {
      throw new BadRequestError('У сотрудника деканата не указан ID факультета');
    }
    facultyIdFilter = faculty_id;
  }

  return await repository.searchByName(query, 10, departmentIdFilter, facultyIdFilter);
};

export const findByAuthor = async (authorName, startYear, endYear, repository) => {
  if (!authorName || authorName.trim().length < 3) {
    throw new BadRequestError('Имя автора слишком короткое для поиска');
  }

  const parsedStartYear = startYear ? parseInt(startYear, 10) : null;
  const parsedEndYear = endYear ? parseInt(endYear, 10) : null;

  if (parsedStartYear && parsedEndYear && parsedStartYear > parsedEndYear) {
    throw new BadRequestError('Начальный год не может быть больше конечного года');
  }

  const materials = await repository.findByAuthor(authorName.trim(), parsedStartYear, parsedEndYear);
  const report = {};

  for (const item of materials) {
    const year = item.issued_year ? item.issued_year.toString() : "Год не указан";

    if (!report[year]) {
      report[year] = [];
    }
    const currentNumber = report[year].length + 1;

    const authorsString = item.material_authors
      ? item.material_authors.map(ma => ma.authors.name).join('; ')
      : '';

    report[year].push({
      number: currentNumber,
      title: item.title,
      authors: authorsString,
      publisher: item.publisher,
      uri: item.uri
    });
  }

  return report;
};

//---------------------------------
//---------EXPORT EXCEL------------
//---------------------------------

export const exportTopAuthorsToExcelUseCase = async (repository, currentUser, limit) => {
  if (!currentUser) {
    throw new ForbiddenError('Пользователь не авторизован');
  }

  const parsedLimit = limit ? parseInt(limit, 10) : 10;
  const topAuthors = await repository.getAuthorsCountStats(parsedLimit);
  const buffer = await generateTopAuthorsExcel(topAuthors);

  return buffer;
};

export const exportAuthorReportToExcelUseCase = async (authorName, startYear, endYear, repository, currentUser) => {
  if (!currentUser) {
    throw new Error('Пользователь не авторизован');
  }

  if (!authorName) {
    throw new BadRequestError('Имя автора обязательно для формирования отчета');
  }

  startYear = parseInt(startYear, 10) || 2010;
  const currentYear = new Date().getFullYear();
  endYear = parseInt(endYear, 10) || currentYear;

  if (startYear < 2010 || endYear > currentYear) {
    throw new BadRequestError(`Диапазон дат должен быть в пределах 2010-${currentYear} гг.`);
  }

  if (startYear > endYear) {
    throw new BadRequestError('Год начала не может быть больше года окончания');
  }

  const rawData = await findByAuthor(authorName, startYear, endYear, repository)

  if (!rawData || Object.keys(rawData.report || rawData).length === 0) {
    throw new NotFoundError(`Учебно-методические материалы для автора ${authorName} не найдены`);
  }

  const buffer = await generateAuthorReportExcel(rawData, authorName, startYear, endYear);

  return buffer;
};

//---------------------------------
//---------EXPORT WORD-------------
//---------------------------------

export const exportTopAuthorsToWordUseCase = async (repository, limit) => {

  const authors = await getTopAuthorsUseCase(repository, limit);

  const buffer = await generateTopAuthorsWord(authors, limit);

  return {
    buffer,
    filename: `Top_${limit || authors.length}_Authors_Word_Report.docx`
  };
};

export const exportAuthorReportToWordUseCase = async (params, repository) => {
    const { authorName, startYear, endYear } = params;

    const reportData = await findByAuthor(authorName, startYear, endYear, repository);

    const buffer = await generateAuthorReportWord(reportData, authorName, startYear, endYear);

    const safeName = authorName.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_');

    return {
        buffer,
        filename: `Author_${safeName}_Word_Report_${startYear}-${endYear}.docx`
    };
};