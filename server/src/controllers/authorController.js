import { authorRepository } from '../repositories/authorRepository.js';
import * as AuthorCases from '../use-cases/authorUseCases.js';
import { asyncHandler } from '../middleware/asyncHandler.js';


export const getAuthorById = asyncHandler(async (req, res) => {
  const author = await AuthorCases.getAuthorByIdUseCase(req.params.id, authorRepository);
  res.json(author);
});

export const getAllAuthors = asyncHandler(async (req, res) => {
  const authors = await AuthorCases.getAllAuthorsUseCase(authorRepository);
  res.json(authors);
});

export const createAuthor = asyncHandler(async (req, res) => {
  const author = await AuthorCases.createAuthorUseCase(req.body, authorRepository);
  res.status(201).json(author);
});

export const updateAuthor = asyncHandler(async (req, res) => {
  const author = await AuthorCases.updateAuthorUseCase(req.params.id, req.body, authorRepository);
  res.status(200).json(author);
});

export const deleteAuthor = asyncHandler(async (req, res) => {
  await AuthorCases.deleteAuthorUseCase(req.params.id, authorRepository);
  res.status(204).send();
});

export const getTopAuthors = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 25;
  const stats = await AuthorCases.getTopAuthorsUseCase(authorRepository, limit);
  res.json(stats);
});

export const searchAuthors = asyncHandler(async (req, res) => {
  const query = req.query.q || '';
  const authors = await AuthorCases.searchAuthorsUseCase(
    query,
    authorRepository,
    req.user
  );

  res.json(authors);
});

export const findByAuthor = asyncHandler(async (req, res) => {
  const { authorName, startYear, endYear } = req.query;
  const authorInfo = await AuthorCases.findByAuthor(authorName, startYear, endYear, authorRepository);
  res.json(authorInfo);
});

//---------------------------------
//---------EXPORT EXCEL------------
//---------------------------------


export const exportTopAuthorsReportToExcel = asyncHandler(async (req, res) => {
  const { authorLimit } = req.query;

  const excelBuffer = await AuthorCases.exportTopAuthorsToExcelUseCase(
    authorRepository,
    req.user,
    authorLimit
  );

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=top_authors_report.xlsx`
  );

  res.end(excelBuffer);
});

export const exportAuthorReportToExcel = asyncHandler(async (req, res) => {
  const { authorName, startYear, endYear } = req.query;

  const excelBuffer = await AuthorCases.exportAuthorReportToExcelUseCase(
    authorName,
    startYear,
    endYear,
    authorRepository,
    req.user
  );

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );

  const sanitizedAuthorName = (authorName || 'author').replace(/["'\s]/g, '_');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="report_${encodeURIComponent(sanitizedAuthorName)}.xlsx"`
  );

  res.end(excelBuffer);
});

//---------------------------------
//---------EXPORT WORD-------------
//---------------------------------

export const exportTopAuthorsReportToWord = asyncHandler(async (req, res) => {

  const limit = parseInt(req.query.limit) || 10;

  const result = await AuthorCases.exportTopAuthorsToWordUseCase(
    authorRepository,
    limit
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

export const exportAuthorReportToWord = asyncHandler(async (req, res) => {

  const { authorName, startYear, endYear } = req.query;

  const result = await AuthorCases.exportAuthorReportToWordUseCase(
    { authorName, startYear, endYear },
    authorRepository
  );

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename*=UTF-8''${encodeURIComponent(result.filename)}`
  );

  res.send(result.buffer);
});