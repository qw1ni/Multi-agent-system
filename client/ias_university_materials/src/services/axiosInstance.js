import axios from 'axios';

export const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      const serverMessage = error.response.data?.message;
      const status = error.response.status;
      const customError = new Error(`${status}: ${serverMessage}`);
      customError.status = status;
      customError.data = error.response.data;

      return Promise.reject(customError);
    }

    if (error.request) {
      return Promise.reject(new Error('Не удалось связаться с сервером. Проверьте интернет-соединение'));
    }

    return Promise.reject(new Error(`Ошибка конфигурации запроса: ${error.message}`));
  }
);