import { udcRepository } from '../repositories/udcRepository.js';
import * as UdcCases from '../use-cases/udcUseCases.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const getAllUdc = asyncHandler(async (req, res) => {
  const data = await UdcCases.getAllUdcUseCase(udcRepository);
  res.json(data);
});

export const getUdcByCode = asyncHandler(async (req, res) => {
  const udc = await UdcCases.getUdcByCodeUseCase(req.params.code, udcRepository);
  res.json(udc);
});

export const createUdc = asyncHandler(async (req, res) => {
  const newUdc = await UdcCases.createUdcUseCase(req.body, udcRepository);
  res.status(201).json(newUdc);
});

export const updateUdc = asyncHandler(async (req, res) => {
  const updated = await UdcCases.updateUdcUseCase(req.params.code, req.body, udcRepository);
  res.json(updated);

});

export const deleteUdc = asyncHandler(async (req, res) => {
  await UdcCases.deleteUdcUseCase(req.params.code, udcRepository);
  res.status(204).send();
});