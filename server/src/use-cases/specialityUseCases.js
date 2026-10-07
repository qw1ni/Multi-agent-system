import { NotFoundError, BadRequestError, ConflictError, ForbiddenError } from "../errors/CommonErrors.js";
import { Speciality } from "../entities/Speciality.js";
import { ROLES } from "../config/roles.js";
import { generateSpecialtyDisciplinesWithMaterialsReport, generateSpecialtyMaterialsExcelReport } from "../services/excelService.js";
import { generateSpecialtyMaterialsWord, generateSpecialtyDisciplinesWithMaterialsWord } from '../services/wordService.js'

export const getAllSpecialitiesUseCase = async (repository) => {
  const specialties = await repository.getAll();

  if (!specialties || specialties.length === 0) {
    throw new NotFoundError('Список специальностей пуст');
  }

  return specialties.map(spec => new Speciality(spec));
};

export const getSpecialtiesWithMaterials = async (repository) => {
  const specialties = await repository.findWithMaterials();

  if (!specialties || specialties.length === 0) {
    throw new NotFoundError('Список специальностей пуст');
  }

  return specialties.map(spec => new Speciality(spec));
}

export const getSpecialityByCodeUseCase = async (code, repository) => {
  if (!code) {
    throw new BadRequestError('Код специальности обязателен');
  }
  const spec = await repository.findByCode(code);
  if (!spec) {
    throw new NotFoundError(`Специальность с кодом ${code} не найдена`);
  }
  return spec;
};

export const createSpecialityUseCase = async (data, repository) => {
  if (!data.code || !data.name) throw new BadRequestError('Код и название специальности обязательны');

  const existing = await repository.findByCode(data.code);
  if (existing) throw new ConflictError(`Специальность с кодом "${data.code}" уже существует`);

  return await repository.create(data);
};

export const updateSpecialityUseCase = async (code, data, repository) => {
  if (!code) {
    throw new BadRequestError('Код специальности обязателен для обновления');
  }
  const spec = await repository.findByCode(code);
  if (!spec) throw new NotFoundError(`Специальность с кодом "${code}" не найдена`);

  return await repository.update(code, data);
};

export const deleteSpecialityUseCase = async (code, repository) => {
  if (!code) {
    throw new BadRequestError('Код специальности обязателен для удаления');
  }

  const spec = await repository.findByCode(code);

  if (!spec) {
    throw new NotFoundError(`Специальность с кодом ${id} не найдена`);
  }

  return await repository.delete(id);
};

export const getSpecialityReportByYearUseCase = async (params, repository) => {
  const currentYear = new Date().getFullYear();
  const startYear = parseInt(params.startYear) || 2020;
  const endYear = parseInt(params.endYear) || currentYear;

  if (startYear > endYear) {
    throw new BadRequestError('Год начала не может быть позже года окончания');
  }

  if (startYear < 2010 || endYear > currentYear) {
    throw new BadRequestError(`Допустимый диапазон отчетов: 2010 - ${currentYear} гг.`);
  }

  const rawData = await repository.getSpecialityReportByYear(startYear, endYear);

  if (!rawData || rawData.length === 0) {
    throw new NotFoundError('Данные по специальностям за указанный период не найдены');
  }

  const totals = {
    speciality_title: 'Итого',
    total: 0
  };

  for (let y = startYear; y <= endYear; y++) {
    totals[y] = 0;
  }

  const reportData = rawData.map(row => {
    for (let year = startYear; year <= endYear; year++) {
      const count = Number(row[year] || 0);
      totals[year] += count;
    }
    totals.total += Number(row.total || 0);
    return row;
  });

  return [...reportData, totals];
};

export const getReportBySpecialty = async (specCode, repository) => {
  if (!specCode) {
    throw new BadRequestError('Код специальности обязателен для формирования отчета');
  }

  const rawData = await repository.getSpecialtyReportData(specCode);

  if (!rawData) {
    throw new NotFoundError(`Специальность с кодом ${specCode} не найдена`);
  }

  const disciplinesReport = rawData.discipline_specialties.map((ds) => {
    const discipline = ds.disciplines;
    const materialsList = [];

    if (discipline.department_disciplines) {
      for (const dd of discipline.department_disciplines) {
        if (dd.departments && dd.departments.materials) {
          for (const mat of dd.departments.materials) {
            const authorsString = mat.material_authors
              ? mat.material_authors.map(ma => ma.authors.name).join('; ')
              : '';

            materialsList.push({
              id: mat.id,
              title: mat.title,
              authors: authorsString,
              abstract_text: mat.abstract_text || '',
              uri: mat.uri,
              file_link: mat.file_link,
              issued_year: mat.issued_year,
              publisher: mat.publisher
            });
          }
        }
      }
    }

    return {
      discipline_name: discipline.name,
      materials: materialsList
    };
  });

  return {
    spec_code: rawData.spec_code,
    spec_name: rawData.spec_name,
    disciplines: disciplinesReport
  };
};

export const GetSpecialtyMaterialsUseCase = async (specCode, startYear, endYear, repository) => {

  if (!specCode) {
    throw new BadRequestError('Код специальности обязателен для формирования отчета');
  }

  // Переносим трансформацию типов в UseCase (как в предыдущем шаге)
  const parsedStartYear = startYear ? parseInt(startYear, 10) : null;
  const parsedEndYear = endYear ? parseInt(endYear, 10) : null;

  if (parsedStartYear && parsedEndYear && parsedStartYear > parsedEndYear) {
    throw new BadRequestError('Начальный год не может быть больше конечного года');
  }

  // Передаем валидные инты/null в репозиторий
  const rawData = await repository.getMaterialsBySpecialty(specCode, parsedStartYear, parsedEndYear);

  if (!rawData) {
    throw new NotFoundError(`Специальность с кодом ${specCode} не найдена`);
  }

  const materialsList = rawData.materials.map(material => {
    const authorsString = material.material_authors
      ? material.material_authors.map(ma => ma.authors.name).join('; ')
      : '';

    return {
      id: material.id,
      title: material.title,
      alternativeTitle: material.alternative_title || '',
      citation: material.citation || '',
      authors: authorsString || 'Автор не указан',
      publisher: material.publisher || '',
      issuedYear: material.issued_year || 'Н/Д',
      pages: material.pages || null,
      uri: material.uri,
      fileLink: material.file_link
    };
  });

  materialsList.sort((a, b) => {
    if (a.issuedYear === 'Н/Д') return 1;
    if (b.issuedYear === 'Н/Д') return -1;
    return b.issuedYear - a.issuedYear;
  });

  return {
    specCode: rawData.spec_code,
    specName: rawData.spec_name,
    totalMaterials: materialsList.length,
    materials: materialsList
  };
};

export const generateSpecialityDisciplinesWithMaterialsReport =
  async (params, currentUser, repository, departmentRepository) => {

    const { specCode, startYear, endYear } = params;

    const parsedStartYear = startYear ? parseInt(startYear, 10) : null;
    const parsedEndYear = endYear ? parseInt(endYear, 10) : null;

    const specialty = await repository.findByCode(specCode);
    if (!specialty) {
      throw new NotFoundError(`Специальность с кодом ${specCode} не найдена`);
    }

    let departmentId = null;
    let facultyDepartmentsIds = null;

    if (currentUser.roles?.name === ROLES.DEPARTMENT) {
      departmentId = currentUser.department_id;
    } else if (currentUser.roles?.name === ROLES.DEANERY) {
      facultyDepartmentsIds =
        await departmentRepository.getDepartmentIdsByFaculty(currentUser.faculty_id);
    }

    const materialsData = await repository.getMaterialsBySpecialty(
      specCode,
      parsedStartYear,
      parsedEndYear
    );

    const materials = materialsData.materials;

    const disciplines = await repository.getSpecialityDisciplines(
      specCode,
      departmentId,
      facultyDepartmentsIds
    );

    const reportRows = disciplines.map(disc => {

      const disciplineNameLower = disc.name.toLowerCase().trim();

      const matchedMaterials = materials
        .filter(m =>
          (m.title || '').toLowerCase().includes(disciplineNameLower)
        )
        .map(m => {
          const authorsString = m.material_authors
            ? m.material_authors.map(ma => ma.authors.name).join(', ')
            : '';

          return {
            materialId: m.id,
            title: m.title,
            alternativeTitle: m.alternative_title || '',
            authors: authorsString || 'Автор не указан',
            issuedYear: m.issued_year || 'Н/Д',
            uri: m.uri,
            fileLink: m.file_link
          };
        })
        .sort((a, b) => a.title.localeCompare(b.title, 'ru'));

      return {
        disciplineId: disc.id,
        disciplineName: disc.name,
        materials: matchedMaterials
      };
    });

    const totalMaterials = materials.length;

    return {
      specCode: specialty.code,
      specName: specialty.name,
      disciplinesCount: reportRows.length,
      totalMaterials,
      rows: reportRows
    };
  };

export const exportSpecialityDisciplinesWithMaterialsReportToExcel = async (params, currentUser, repository, departmentRepository) => {
  const reportData = await generateSpecialityDisciplinesWithMaterialsReport(
    params,
    currentUser,
    repository,
    departmentRepository
  );

  const buffer = await generateSpecialtyDisciplinesWithMaterialsReport(reportData, params.startYear, params.endYear);

  return {
    buffer,
    filename: `Report_${reportData.specCode}_${new Date().toISOString().split('T')[0]}.xlsx`
  };
};

export const exportSpecialtyMaterialsToExcelUseCase = async (specCode, startYear, endYear, repository) => {
  const reportData = await GetSpecialtyMaterialsUseCase(specCode, startYear, endYear, repository);
  const buffer = await generateSpecialtyMaterialsExcelReport(reportData, startYear, endYear);
  const safeSpecCode = specCode.replace(/[^a-zA-Z0-9А-Яа-я]/g, '_');
  const filename = `Specialty_${safeSpecCode}_Excel_Report${new Date().toISOString().split('T')[0]}.xlsx`;
  return {
    buffer,
    filename
  };
};

export const exportSpecialtyMaterialsToWordUseCase = async (params, repository) => {

  const { specCode, startYear, endYear } = params;

  const reportData = await GetSpecialtyMaterialsUseCase(specCode, startYear, endYear, repository);

  const buffer = await generateSpecialtyMaterialsWord(reportData, startYear, endYear);

  const safeSpecCode = specCode.replace(/[^a-zA-Z0-9А-Яа-я]/g, '_');

  return {
    buffer,
    filename: `Specialty_${safeSpecCode}_Word_Report_${startYear}-${endYear}.docx`
  };
};

export const exportSpecialtyDisciplinesToWordUseCase = async (params, currentUser, repository, departmentRepository) => {
  const { specCode, startYear, endYear } = params;

  const reportData = await generateSpecialityDisciplinesWithMaterialsReport(params, currentUser, repository, departmentRepository);

  const buffer = await generateSpecialtyDisciplinesWithMaterialsWord(reportData, startYear, endYear);

  const safeSpecCode = specCode.replace(/[^a-zA-Z0-9А-Яа-я]/g, '_')

  return {
    buffer,
    filename: `Specialty_Disciplines_${safeSpecCode}_Word_Report_${startYear}-${endYear}.docx`
  };
};