import { facultyRepository } from '../repositories/facultyRepository.js';
import * as FacultyCases from '../use-cases/facultyUseCases.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const getFaculty = asyncHandler(async (req, res) => {
  const faculty = await FacultyCases.getFacultyByIdUseCase(req.params.id, facultyRepository);
  res.json(faculty);
});

export const getAllFaculties = asyncHandler(async (req, res) => {
  const faculties = await FacultyCases.getAllFacultyUseCase(facultyRepository);
  res.json(faculties);
});

export const createFaculty = asyncHandler(async (req, res) => {
  const faculty = await FacultyCases.createFacultyUseCase(req.body, facultyRepository);
  res.status(201).json(faculty);
});

export const updateFaculty = asyncHandler(async (req, res) => {
  const faculty = await FacultyCases.updateFacultyUseCase(req.params.id, req.body, facultyRepository);
  res.status(200).json(faculty);
});

export const deleteFaculty = asyncHandler(async (req, res) => {
  await FacultyCases.deleteFacultyUseCase(req.params.id, facultyRepository);
  res.status(204).send();
});

export const getReportMaterialsOnYear = asyncHandler(async (req, res) => {
  const { startYear, endYear } = req.query;
  const report = await FacultyCases.getFacultyReportOnYearUseCase(
    { startYear, endYear },
    facultyRepository
  );
  res.json(report);
});

export const getReportMaterialsOnYearWithDepartments = asyncHandler(async (req, res) => {
  const { startYear, endYear } = req.query;
  const report = await FacultyCases.getFacultyReportOnYearWithDepartmentsUseCase(
    { startYear, endYear },
    facultyRepository
  );
  res.json(report);
});

export const getDepartmentMaterialsReport = asyncHandler(async (req, res) => {
  const { facultyName, startYear, endYear } = req.query;
  const report = await FacultyCases.getDepartmentMaterialsByFacultyUseCase(
    { facultyName, startYear, endYear },
    facultyRepository
  );
  res.json(report);
});

//---------------------------------
//---------EXPORT EXCEL-------------
//---------------------------------

export const exportFacultyReportToExcel = asyncHandler(async (req, res) => {
  const { startYear, endYear } = req.query;

  const excelBuffer = await FacultyCases.exportFacultyReportToExcelUseCase(
    facultyRepository,
    req.user,
    startYear,
    endYear
  );

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=faculty_report_${startYear || 2010}-${endYear || 2026}.xlsx`
  );

  res.end(excelBuffer);
});

export const exportFacultyDepReportToExcel = asyncHandler(async (req, res) => {
  const params = {
    startYear: req.query.startYear,
    endYear: req.query.endYear
  };

  const excelBuffer = await FacultyCases.exportFacultyDepReportToExcelUseCase(
    params,
    facultyRepository,
    req.user
  );

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=faculty_departments_report_${params.startYear || 2010}-${params.endYear || 2026}.xlsx`
  );

  res.end(excelBuffer);
});

//---------------------------------
//---------EXPORT WORD-------------
//---------------------------------

export const exportFacultyReportToWord = asyncHandler(async (req, res) => {

  const result = await FacultyCases.exportFacultyReportToWordUseCase(
    req.query,
    facultyRepository,
    req.user
  );

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );

  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${result.filename}"`
  );

  res.send(result.buffer);
});

export const exportFacultyDepReportToWord = asyncHandler(async (req, res) => {

  const result = await FacultyCases.exportFacultyDepReportToWordUseCase(
    req.query,
    facultyRepository,
    req.user
  );

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );

  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${result.filename}"`
  );

  res.send(result.buffer);
});