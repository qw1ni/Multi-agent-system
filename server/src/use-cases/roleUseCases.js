import { NotFoundError, BadRequestError, ConflictError } from "../errors/CommonErrors.js";

export const getAllRolesUseCase = async (repository) => {
  const roles = await repository.getAll();
  
  if (!roles || roles.length === 0) {
    throw new NotFoundError('Список ролей пуст');
  }
  
  return roles;
};

export const getRoleByIdUseCase = async (id, repository) => {
  if (!id) {
    throw new BadRequestError('ID роли обязателен');
  }
  const role = await repository.findById(id);
  if (!role) throw new NotFoundError(`Роль с ID ${id} не найдена`);
  return role;
};

export const createRoleUseCase = async (data, repository) => {
  if (!data.name) throw new BadRequestError('Название роли обязательно');

  const existing = await repository.findByName(data.name);
  if (existing) throw new ConflictError(`Роль "${data.name}" уже существует`);

  return await repository.create(data);
};

export const updateRoleUseCase = async (id, data, repository) => {
  if (!id) {
    throw new BadRequestError('ID роли обязателен для обновления');
  }
  const role = await repository.findById(id);
  if (!role) throw new NotFoundError(`Роль с ID "${id}" не найдена`);
  
  if (data.name && data.name !== role.name) {
    const existingByName = await repository.findByName(data.name);
    if (existingByName) {
      throw new ConflictError(`Имя "${data.name}" уже занято другой ролью`);
    }
  }

  return await repository.update(id, data);
};

export const deleteRoleUseCase = async (id, roleRepository, userRepository) => {
  if (!id) {
    throw new BadRequestError('ID роли обязателен для удаления');
  }
  const role = await roleRepository.findById(id);
  if (!role) {
    throw new NotFoundError(`Роль с ID ${id} не найдена`);
  }
  const usersCount = await userRepository.countByRoleId(id);
  
  if (usersCount > 0) {
    throw new ConflictError(
      `Невозможно удалить роль "${role.name}": она назначена пользователям (${usersCount} чел.)`
    );
  }
  return await roleRepository.delete(id);
};