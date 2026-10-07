import { axiosInstance } from "./axiosInstance";

const specialtyService = {
    getAllSpecialties: async () => {
        try {
            const response = await axiosInstance.get('/specialties/');
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    getSpecialtiesWithMaterials: async () => {
        try {
            const response = await axiosInstance.get('/specialties/with_materials');
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};

export default specialtyService;