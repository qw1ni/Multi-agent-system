import { specialtyRepository } from '../repositories/specialtyRepository.js';
import { departmentRepository } from '../repositories/departmentRepository.js';
import * as SpecCases from '../use-cases/specialityUseCases.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const getAllSpecialities = asyncHandler(async (req, res) => {
  const data = await SpecCases.getAllSpecialitiesUseCase(specialtyRepository);
  res.json(data);
});

export const getWithMaterials = asyncHandler(async (req, res) => {
  const data = await SpecCases.getSpecialtiesWithMaterials(specialtyRepository);
  res.json(data);
})

export const getSpecialityByCode = asyncHandler(async (req, res) => {
  const spec = await SpecCases.getSpecialityByCodeUseCase(req.params.code, specialtyRepository);
  res.json(spec);
});

export const createSpeciality = asyncHandler(async (req, res) => {
  const newSpec = await SpecCases.createSpecialityUseCase(req.body, specialtyRepository);
  res.status(201).json(newSpec);
});

export const updateSpeciality = asyncHandler(async (req, res) => {
  const updated = await SpecCases.updateSpecialityUseCase(req.params.code, req.body, specialtyRepository);
  res.json(updated);
});

export const deleteSpeciality = asyncHandler(async (req, res) => {
  await SpecCases.deleteSpecialityUseCase(req.params.code, specialtyRepository);
  res.status(204).send();
});

export const getSpecialityReportByYear = asyncHandler(async (req, res) => {
  const { startYear, endYear } = req.query;
  const result = await SpecCases.getSpecialityReportByYearUseCase(
    { startYear, endYear },
    specialtyRepository
  );
  res.json(result);
});

export const getSpecialtyReport = asyncHandler(async (req, res) => {
  const { spec_code, startYear, endYear } = req.query;
  const report = await SpecCases.GetSpecialtyMaterialsUseCase(spec_code, startYear, endYear, specialtyRepository);
  res.json(report);
});

export const getSpecialtyDisciplinesWithMaterialsReport = asyncHandler(async (req, res) => {
  const { specCode, startYear, endYear } = req.query;

  const reportData = await SpecCases.generateSpecialityDisciplinesWithMaterialsReport({
    specCode,
    startYear,
    endYear,
  }, req.user, specialtyRepository, departmentRepository);

  return res.status(200).json(reportData);
});

//---------------------------------
//---------EXPORT EXCEL------------
//---------------------------------

export const exportSpecialtyDepartmentWithMaterialsReportToExcel = asyncHandler(async (req, res) => {
  const params = {
    specCode: req.query.specCode,
    startYear: req.query.startYear,
    endYear: req.query.endYear
  };

  const currentUser = req.user;

  const { buffer, filename } = await SpecCases.exportSpecialityDisciplinesWithMaterialsReportToExcel(
    params,
    currentUser,
    specialtyRepository,
    departmentRepository
  );

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(filename)}"`
  );

  return res.status(200).send(buffer);
});

export const exportSpecialtyMaterialsReportToExcel = asyncHandler(async (req, res) => {
  const { specCode, startYear, endYear } = req.query;

  const { buffer, filename } = await SpecCases.exportSpecialtyMaterialsToExcelUseCase(
    specCode,
    startYear,
    endYear,
    specialtyRepository
  );

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(filename)}"`
  );

  return res.status(200).send(buffer);
});

//---------------------------------
//---------EXPORT WORD-------------
//---------------------------------

export const exportSpecialtyMaterialsReportToWord = asyncHandler(async (req, res) => {

  const result = await SpecCases.exportSpecialtyMaterialsToWordUseCase(req.query, specialtyRepository);

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );

  res.setHeader(
    "Content-Disposition",
    `attachment; filename*=UTF-8''${encodeURIComponent(result.filename)}`
  );

  res.send(result.buffer);
});

export const exportSpecialtyDepartmentWithMaterialsReportToWord = asyncHandler(async (req, res) => {

  const result = await SpecCases.exportSpecialtyDisciplinesToWordUseCase(req.query, req.user, specialtyRepository, departmentRepository);

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );

  res.setHeader(
    "Content-Disposition",
    `attachment; filename*=UTF-8''${encodeURIComponent(result.filename)}`
  );

  res.send(result.buffer);
});

