import { NotFoundError, BadRequestError, ConflictError } from "../errors/CommonErrors.js";
import crypto from 'crypto';
import bcrypt from 'bcrypt';

export const getUserByIdUseCase = async (id, repository) => {
  if (!id) {
    throw new BadRequestError('ID пользователя обязателен');
  }
  const user = await repository.findById(id);
  if (!user) {
    throw new NotFoundError(`Пользователь с ID ${id} не найден`);
  }
  return user;
};

export const getAllUserUseCase = async (repository) => {
  const users = await repository.getAll();

  if (!users || users.length === 0) {
    throw new NotFoundError('Список пользователей пуст');
  }

  return users;
}

export const createUserUseCase = async (userData, userRepository) => {
  const { fullName, email, login, roleId, facultyId, departmentId } = userData;

  const candidateByLogin = await userRepository.findByLogin(login);
  if (candidateByLogin) {
    throw new ConflictError("Пользователь с таким логином уже существует");
  }

  if (email) {
    const candidateByEmail = await userRepository.findByEmail(email);
    if (candidateByEmail) {
      throw new ConflictError("Пользователь с такой почтой уже существует");
    }
  }

  const temporaryPassword = crypto.randomBytes(6).toString('hex');
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(temporaryPassword, saltRounds);

  const newUser = await userRepository.create({
    fullName,
    email,
    login,
    password: hashedPassword,
    roleId: Number(roleId),
    facultyId: facultyId ? Number(facultyId) : null,
    departmentId: departmentId ? Number(departmentId) : null
  });

  return {
    user: newUser,
    temporaryPassword
  };
};

export const updateUserUseCase = async (id, data, repository) => {
  if (!id) {
    throw new BadRequestError('ID пользователя обязателен для обновления');
  }

  const currentUser = await repository.findById(id);
  if (!currentUser) {
    throw new NotFoundError(`Пользователь с ID ${id} не найден`);
  }

  if (data.login && data.login !== currentUser.login) {
    const existingByLogin = await repository.findByLogin(data.login);
    if (existingByLogin) {
      throw new ConflictError(`Логин "${data.login}" уже занят другим пользователем`);
    }
  }

  if (data.email && data.email !== currentUser.email) {
    const existingByEmail = await repository.findByEmail(data.email);
    if (existingByEmail) {
      throw new ConflictError(`Адрес электронной почты "${data.email}" уже занят`);
    }
  }

  return await repository.update(id, data);
};

export const deleteUserUseCase = async (id, repository) => {
  if (!id) {
    throw new BadRequestError('ID пользователя обязателен для удаления');
  }
  const user = await repository.findById(id);
  if (!user) {
    throw new NotFoundError(`Пользователь с ID ${id} не найден`);
  }
  return await repository.delete(id);
};

export const getUsersWithPagAndSearchUseCase = async (queryParameters, repository) => {
  const { search = '', page = 1, limit = 10 } = queryParameters;
  const parsedPage = Math.max(1, parseInt(page, 10));
  const parsedLimit = Math.max(1, parseInt(limit, 10));
  const skip = (parsedPage - 1) * parsedLimit;
  const take = parsedLimit;

  const { users, totalCount } = await repository.findManyAndCount({
    search: search.toString(),
    skip,
    take,
  });

  const totalPages = Math.ceil(totalCount / parsedLimit);

  return {
    data: users,
    pagination: {
      totalItems: totalCount,
      totalPages: totalPages,
      currentPage: parsedPage,
      itemsPerPage: parsedLimit,
    },
  };
};