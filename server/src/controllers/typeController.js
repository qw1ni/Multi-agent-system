import { typeRepository } from '../repositories/typeRepository.js';
import * as TypeCases from '../use-cases/typeUseCases.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const getAllTypes = asyncHandler (async(req, res) => {
  const types = await TypeCases.getAllTypesUseCase(typeRepository);
  res.json(types);
});

export const getTypeById = asyncHandler (async(req, res) => {
  const type = await TypeCases.getTypeByIdUseCase(req.params.id, typeRepository);
  res.json(type);
});

export const createType = asyncHandler (async(req, res) => {
  const newType = await TypeCases.createTypeUseCase(req.body, typeRepository);
  res.status(201).json(newType);
});

export const updateType = asyncHandler (async(req, res) => {
  const updated = await TypeCases.updateTypeUseCase(req.params.id, req.body, typeRepository);
  res.json(updated);
});

export const deleteType = asyncHandler (async(req, res) => {
  await TypeCases.deleteTypeUseCase(req.params.id, typeRepository);
  res.status(204).send();
});