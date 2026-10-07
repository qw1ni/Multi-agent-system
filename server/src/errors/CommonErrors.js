import { AppError } from './AppError.js';

// Ошибка 400: Неверный запрос
export class BadRequestError extends AppError {
  constructor(message = 'Bad Request') {
    super(message, 400);
  }
}

// Ошибка 404: Ресурс не найден
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

// Ошибка 401: Не авторизован
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

// Ошибка 403: Доступ запрещен
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

// Ошибка 409: Конфликт
export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 409);
  }
}