import { axiosInstance } from './axiosInstance';

const authService = {
    login: async (identifier, password) => {
        try {
            const response = await axiosInstance.post('/auth/login', {
                identifier,
                password
            });
            return response.data;
        } catch (error) {
            if (error.response && error.response.data) {
                throw new Error(error.response.data.message || 'Ошибка авторизации');
            }

            throw new Error('Не удалось связаться с сервером');
        }
    },
    logout: async () => {
        try {
            const response = await axiosInstance.post('/auth/logout');
            return response.data;
        } catch (error) {
            throw new Error(error.response.data.message || 'Не удалось связаться с сервером');
        }
    }
}

export default authService;