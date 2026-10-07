import { departmentRepository } from '../repositories/departmentRepository.js';
import { facultyRepository } from '../repositories/facultyRepository.js';
import * as DepartmentCases from '../use-cases/departmentUseCases.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const getDepartment = asyncHandler(async (req, res) => {
  const result = await DepartmentCases.getDepartmentByIdUseCase(req.params.id, departmentRepository);
  res.json(result);
});

export const getAllDepartments = asyncHandler(async (req, res) => {
  const departments = await DepartmentCases.getAllDepartmentUseCase(departmentRepository);
  res.json(departments);
});

export const getDepartmentsByFacultyId = asyncHandler(async (req, res) => {
  const departments = await DepartmentCases.getDepartmentByFacultyUseCase(req.params.id, departmentRepository);
  res.json(departments);
});

export const createDepartment = asyncHandler(async (req, res) => {
  const department = await DepartmentCases.createDepartmentUseCase(req.body, departmentRepository, facultyRepository);
  res.status(201).json(department);
});

export const updateDepartment = asyncHandler(async (req, res) => {
  const department = await DepartmentCases.updateDepartmentUseCase(req.params.id, req.body, departmentRepository);
  res.status(200).json(department);
});

export const deleteDepartment = asyncHandler(async (req, res) => {
  await DepartmentCases.deleteDepartmentUseCase(req.params.id, departmentRepository);
  res.status(204).send();
});

export const getDepartmentDisciplinesReport = asyncHandler(async (req, res) => {
  const { departmentName, startYear, endYear, targetYear } = req.query;

  const reportData = await DepartmentCases.getDepartmentDisciplinesUseCase(
    departmentName,
    startYear,
    endYear,
    targetYear,
    departmentRepository
  );

  res.status(200).json(reportData);
});

export const getDepartmentsMaterialsCount = asyncHandler(async (req, res) => {
  const { startYear, endYear, facultyId } = req.query;

  const activityData =
    await DepartmentCases.getDepartmentsMaterialsCountUseCase(
      req.user,
      departmentRepository,
      {
        startYear,
        endYear,
        facultyId
      }
    );

  res.status(200).json(activityData);
});

export const getDepartmentAuthorsActivity = asyncHandler(async (req, res) => {

  const { departmentId, startYear, endYear } = req.query;

  const data =
    await DepartmentCases.getDepartmentAuthorsActivityUseCase(
      req.user,
      departmentRepository,
      { departmentId, startYear, endYear }
    );
  res.status(200).json(data);
});

export const exportDepartmentDisciplinesToExcel = asyncHandler(async (req, res) => {
  const params = {
    departmentName: req.query.departmentName,
    startYear: req.query.startYear,
    endYear: req.query.endYear,
    targetYear: req.query.targetYear,
    showReissueColumn: req.query.showReissueColumn,
    repository: departmentRepository
  };

  const { buffer, fileName } = await DepartmentCases.exportDepartmentDisciplinesToExcel(params);

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`
  );

  return res.status(200).send(buffer);
});


export const exportDepartmentDisciplinesToWord = asyncHandler(async (req, res) => {

  const result = await DepartmentCases.exportDepartmentDisciplinesToWordUseCase(
    req.query,
    departmentRepository
  );

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