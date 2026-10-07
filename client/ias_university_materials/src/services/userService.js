import { axiosInstance } from "./axiosInstance";

const userService = {
    getAllUsers: async (search = '', page = 1, limit = 10) => {
        try {
            const response = await axiosInstance.get('/users/search', {
                params: { search, page, limit }
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    getAllRoles: async () => {
        try {
            const response = await axiosInstance.get('/roles');
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    createUser: async (userData) => {
        try {
            const response = await axiosInstance.post('/users', userData);
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    updateUser: async (id, userData) => {
        try {
            const response = await axiosInstance.patch(`/users/${id}`, userData);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

};

export default userService;