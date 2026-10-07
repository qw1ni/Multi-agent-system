import { keywordRepository } from '../repositories/keywordRepository.js';
import * as KeywordCases from '../use-cases/keywordUseCases.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const getAllKeywords = asyncHandler (async(req, res) => {
  const keywords = await KeywordCases.getAllKeywordsUseCase(keywordRepository);
  res.json(keywords);
});

export const getKeywordById = asyncHandler (async(req, res) => {
  const keyword = await KeywordCases.getKeywordByIdUseCase(req.params.id, keywordRepository);
  res.json(keyword);
});

export const createKeyword = asyncHandler (async(req, res) => {
  const newKeyword = await KeywordCases.createKeywordUseCase(req.body, keywordRepository);
  res.status(201).json(newKeyword);
});

export const updateKeyword = asyncHandler (async(req, res) => {
  const updated = await KeywordCases.updateKeywordUseCase(req.params.id, req.body, keywordRepository);
  res.json(updated);
});

export const deleteKeyword = asyncHandler (async(req, res) => {
  await KeywordCases.deleteKeywordUseCase(req.params.id, keywordRepository);
  res.status(204).send();
});