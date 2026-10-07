import { NotFoundError, BadRequestError, ConflictError } from "../errors/CommonErrors.js";

export const getAllTypesUseCase = async (repository) => {
  const types = await repository.getAll();
  
  if (!types || types.length === 0) {
    throw new NotFoundError('Список типов пуст');
  }
  
  return types;
};

export const getTypeByIdUseCase = async (id, repository) => {
  if (!id) {
    throw new BadRequestError('ID типа обязателен');
  }
  const type = await repository.findById(id);
  if (!type){
    throw new NotFoundError(`Тип с ID ${id} не найден`);
  }
  return type;
};

export const createTypeUseCase = async (data, repository) => {
  if (!data.name) throw new BadRequestError('Название типа обязательно');
  
  const existing = await repository.findByName(data.name);
  if (existing) throw new ConflictError(`Тип "${data.name}" уже существует`);

  return await repository.create(data);
};

export const updateTypeUseCase = async (id, data, repository) => {
  if (!id) {
    throw new BadRequestError('ID типа обязателен для обновления');
  }
  const type = await repository.findById(id);
  if (!type){
    throw new NotFoundError(`Тип с ID ${id} не найден`);
  }
  if (data.name && data.name !== type.name) {
    const existingByName = await repository.findByName(data.name);
    if (existingByName) {
      throw new ConflictError(`Имя "${data.name}" уже записано в БД`);
    }
  }
  return await repository.update(id, data);
};

export const deleteTypeUseCase = async (id, repository) => {
  if (!id) {
    throw new BadRequestError('ID типа обязателен для удаления');
  }
  const type = await repository.findById(id);
  if (!type) {
    throw new NotFoundError(`Тип с ID ${id} не найден`);
  }
  return await repository.delete(id);
};