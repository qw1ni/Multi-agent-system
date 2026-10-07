import { userRepository } from '../repositories/userRepository.js';
import * as UserUseCases from '../use-cases/userUseCases.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const getUserById = asyncHandler(async (req, res) => {
  const user = await UserUseCases.getUserByIdUseCase(req.params.id, userRepository);
  res.json(user);
});

export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await UserUseCases.getAllUserUseCase(userRepository);
  res.json(users);
});

export const createUser = asyncHandler(async (req, res, next) => {
  const { fullName, email, login, roleId, facultyId, departmentId } = req.body;
  const result = await UserUseCases.createUserUseCase(
    { fullName, email, login, roleId, facultyId, departmentId },
    userRepository
  );
  res.status(201).json({
    message: "Пользователь успешно создан",
    user: {
      id: result.user.user_id,
      fullName: result.user.full_name,
      login: result.user.login,
      email: result.user.email,
      roleId: result.user.roles.name
    },
    temporaryPassword: result.temporaryPassword // Показываем админу на фронтенде
  });
});

export const updateUser = asyncHandler(async (req, res) => {
  const updated = await UserUseCases.updateUserUseCase(req.params.id, req.body, userRepository);
  res.json(updated);
});

export const deleteUser = asyncHandler(async (req, res) => {
  await UserUseCases.deleteUserUseCase(req.params.id, userRepository);
  res.status(204).send();
});

export const getUsersWithPagAndSearch = asyncHandler(async (req, res) => {
  const { search, page, limit } = req.query;

  const result = await UserUseCases.getUsersWithPagAndSearchUseCase(
    { search, page, limit },
    userRepository
  );

  res.status(200).json(result);
});