import { axiosInstance, aiAxios } from "./axiosInstance";

const materialService = {
    getMaterialsWithPag: async (params) => {
        try {
            const response = await axiosInstance.get('/materials/pag', { params });
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    searchMaterials: async (search) => {
        try {
            const response = await axiosInstance.post('/materials/search', { query: search });
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    getSimilarMaterials: async (materialId, limit = 5) => {
        try {
            const response = await axiosInstance.post('/materials/similarity', {material_id: materialId, limit});
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    getFullMaterialInfo: async (id) => {
        try {
            const response = await axiosInstance.get(`/materials/${id}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    getRecentMaterials: async () => {
        try {
            const response = await axiosInstance.get('/materials/recent');
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    getUniversityMaterialsStats: async () => {
        try {
            const response = await axiosInstance.get('/materials/common_stats');
            return response.data;
        } catch (error) {
            throw error
        }
    },
};

export default materialService;