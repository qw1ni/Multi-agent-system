import {axiosInstance} from "./axiosInstance";

const facultyService = {
    getAllFaculties: async () => {
        try {
            const response = await axiosInstance.get('/faculties');
            return response.data;
        } catch (error) {
            throw error;
        }
    },
};

export default facultyService;