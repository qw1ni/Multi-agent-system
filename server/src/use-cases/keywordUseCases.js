import { NotFoundError, BadRequestError, ConflictError } from "../errors/CommonErrors.js";

export const getAllKeywordsUseCase = async (repository) => {
  const keywords = await repository.getAll();
  if (!keywords || keywords.length === 0) {
    throw new NotFoundError('Список ключевых слов пуст');
  }
  return await repository.getAll();
};

export const getKeywordByIdUseCase = async (id, repository) => {
  if (!id) {
    throw new BadRequestError('ID ключевого слова обязателен');
  }
  const keyword = await repository.findById(id);
  if (!keyword) throw new NotFoundError(`Ключевое слово с ID "${id}" не найдено`);
  return keyword;
};

export const createKeywordUseCase = async (data, repository) => {
  if (!data.word) throw new BadRequestError('Слово не может быть пустым');

  const existing = await repository.findByWord(data.word);
  if (existing) throw new ConflictError(`Ключевое слово "${data.word}" уже существует`);

  return await repository.create(data);
};

export const updateKeywordUseCase = async (id, data, repository) => {
  if (!id) {
    throw new BadRequestError('ID ключевого слова обязателен для обновления');
  }
  const keyword = await repository.findById(id);
  if (!keyword) throw new Error(`Ключевое слово с ID "${id}" не найдено`);
  
  if (data.word && data.word !== keyword.word) {
    const existing = await repository.findByWord(data.word);
    if (existing) {
      throw new ConflictError(`Ключевое слово "${data.word}" уже существует`);
    }
  }

  return await repository.update(id, data);
};

export const deleteKeywordUseCase = async (id, repository) => {
  if (!id) {
    throw new BadRequestError('ID ключевого слова обязателен для удаления');
  }

  const keyword = await repository.findById(id);
  
  if (!keyword) {
    throw new NotFoundError(`Ключевое слово с ID ${id} не найдено`);
  }
  
  return await repository.delete(id);
};