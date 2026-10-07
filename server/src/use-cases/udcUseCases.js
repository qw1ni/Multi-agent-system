import { NotFoundError, BadRequestError, ConflictError } from "../errors/CommonErrors.js";

export const getAllUdcUseCase = async (repository) => {
  const udcCodes = await repository.getAll();
  if (!udcCodes || udcCodes.length === 0) {
    throw new NotFoundError('Список кодов УДК пуст');
  }
  return types;
};

export const getUdcByCodeUseCase = async (code, repository) => {
   if (!code) {
    throw new BadRequestError('Код УДК обязателен');
  }
  const udc = await repository.findByCode(code);
  if (!udc) {
    throw new NotFoundError(`Код УДК ${code} не найден`);
  }
  return udc;
};

export const createUdcUseCase = async (data, repository) => {
  if (!data.code) throw new Error('Код УДК обязателен');

  const existing = await repository.findByCode(data.code);
  if (existing) throw new ConflictError(`Код УДК "${data.code}" уже существует`);

  // title уникальный или нет?
  // const existingUdcByName = await repository.findByName(data.name);

  // if (existingUdcByName){
  //   throw new ConflictError(`Код УДК с названием "${data.name}" уже существует`);
  // }

  return await repository.create(data);
};

export const updateUdcUseCase = async (code, data, repository) => {
  if (!code) {
    throw new BadRequestError('Код УДК обязателен для обновления');
  }
  const udc = await repository.findByCode(code);
  if (!udc) throw new Error(`Код УДК "${code}" не найден для обновления`);
  
  // if (data.name && data.name !== udc.title) {
  //   const existingByName = await repository.findByName(data.name);
  //   if (existingByName) {
  //     throw new ConflictError(`Название "${data.name}" уже занято`);
  //   }
  // }

  return await repository.update(code, data);
};

export const deleteUdcUseCase = async (code, repository) => {
  if (!code) {
    throw new BadRequestError('Код УДК обязателен для удаления');
  }

  const udc = await repository.findByCode(code);
  
  if (!udc) {
    throw new NotFoundError(`Код УДК ${code} не найден`);
  }
  return await repository.delete(code);
};