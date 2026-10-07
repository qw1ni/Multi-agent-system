import {axiosInstance} from "./axiosInstance";

const departmentService = {
    getAllDepartmentsByFacultyId: async (id) => {
        try {
            const response = await axiosInstance.get(`/departments/byFacultyId/${id}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    getAllDepartments: async (id) => {
        try {
            const response = await axiosInstance.get(`/departments`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },
};

export default departmentService;