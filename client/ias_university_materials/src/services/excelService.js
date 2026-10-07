import { axiosInstance, aiAxios } from "./axiosInstance";

const excelService = {
    downloadTopAuthorsExcel: async (limit = 10) => {
        try {
            const response = await axiosInstance.get('/authors/export_excel/top_authors', {
                params: { limit },
                responseType: 'blob'
            });
            return response.data;
        } catch (error) {
            console.error("Ошибка при вызове эндпоинта для экспорта отчета ТОП авторов в Excel", error);
            throw error;
        }
    },
    downloadFacultyReportExcel: async (startYear, endYear) => {
        try {
            const response = await axiosInstance.get('/faculties/export_excel/materials_by_year', {
                params: { startYear, endYear },
                responseType: 'blob'
            });
            return response.data;
        } catch (error) {
            console.error("Ошибка при вызове эндпоинта для экспорта отчета по факультетам в Excel", error);
            throw error;
        }
    },
    downloadFacultyDepReportExcel: async (startYear, endYear) => {
        try {
            const response = await axiosInstance.get('/faculties/export_excel/materials_by_year_with_departmnets', {
                params: { startYear, endYear },
                responseType: 'blob'
            });
            return response.data;
        } catch (error) {
            console.error("Ошибка при вызове эндпоинта для экспорта отчета по факультетам в разрезе кафедр в Excel", error);
            throw error;
        }
    },
    downloadAuthorMaterialsExcel: async (authorName, startYear, endYear) => {
        try {
            const response = await axiosInstance.get('/authors/export_excel/by_author', {
                params: { authorName, startYear, endYear },
                responseType: 'blob'
            });
            return response.data;
        } catch (error) {
            console.error("Ошибка при вызове эндпоинта для экспорта отчета по одному автора в Excel", error);
            throw error;
        }
    },
    downloaDepartmentMaterialsExcel: async (startYear, endYear, departmentName) => {
        try {
            const response = await axiosInstance.get('/materials/export_excel/by_department', {
                params: { startYear, endYear, departmentName },
                responseType: 'blob'
            });
            return response.data;
        } catch (error) {
            console.error("Ошибка при вызове эндпоинта для экспорта отчета по одному автора в Excel", error);
            throw error;
        }
    },
    downloaSpecialtyDepartmentsWithMaterialsExcel: async (specCode, startYear, endYear) => {
        try {
            const response = await axiosInstance.get('/specialties/export_excel/disciplines_with_materials', {
                params: { specCode, startYear, endYear },
                responseType: 'blob'
            });
            return response.data;
        } catch (error) {
            console.error("Ошибка при вызове эндпоинта для экспорта отчета по дисциплинам специальности в Excel", error);
            throw error;
        }
    },
    downloaSpecialtyMaterialsExcel: async (specCode, startYear, endYear) => {
        try {
            const response = await axiosInstance.get('/specialties/export_excel/by_specialty', {
                params: { specCode, startYear, endYear },
                responseType: 'blob'
            });
            return response.data;
        } catch (error) {
            console.error("Ошибка при вызове эндпоинта для экспорта отчета по специальности в Excel", error);
            throw error;
        }
    },
    downloaDepartmentDisciplinesExcel: async (departmentName, startYear, endYear, targetYear, showReissueColumn) => {
        try {
            const response = await axiosInstance.get('/departments/export_excel/disciplines', {
                params: { departmentName, startYear, endYear, targetYear, showReissueColumn },
                responseType: 'blob'
            });
            return response.data;
        } catch (error) {
            console.error("Ошибка при вызове эндпоинта для экспорта отчета по дисциплинам кафедры в Excel", error);
            throw error;
        }
    },
};

export default excelService;