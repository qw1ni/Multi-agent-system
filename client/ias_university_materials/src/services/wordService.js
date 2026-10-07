import { axiosInstance, aiAxios } from "./axiosInstance";

const excelService = {
    downloadTopAuthorsWord: async (limit = 10) => {
        try {
            const response = await axiosInstance.get('/authors/export_word/top_authors', {
                params: { limit },
                responseType: 'blob'
            });
            return response.data;
        } catch (error) {
            console.error("Ошибка при вызове эндпоинта для экспорта отчета ТОП авторов в Excel", error);
            throw error;
        }
    },
    downloadFacultyReportWord: async (startYear, endYear) => {
        try {
            console.log("Вызов")
            const response = await axiosInstance.get('/faculties/export_word/materials_by_year', {
                params: { startYear, endYear },
                responseType: 'blob'
            });
            return response.data;
        } catch (error) {
            console.error("Ошибка при вызове эндпоинта для экспорта отчета по факультетам в Word", error);
            throw error;
        }
    },
    downloadFacultyDepReportWord: async (startYear, endYear) => {
        try {
            const response = await axiosInstance.get('/faculties/export_word/materials_by_year_with_departmnets', {
                params: { startYear, endYear },
                responseType: 'blob'
            });
            return response.data;
        } catch (error) {
            console.error("Ошибка при вызове эндпоинта для экспорта отчета по факультетам в разрезе кафедр в Word", error);
            throw error;
        }
    },
    downloadAuthorMaterialsWord: async (authorName, startYear, endYear) => {
        console.log(authorName)
        try {
            const response = await axiosInstance.get('/authors/export_word/by_author', {
                params: { authorName, startYear, endYear },
                responseType: 'blob'
            });
            return response.data;
        } catch (error) {
            console.error("Ошибка при вызове эндпоинта для экспорта отчета по одному автора в Word", error);
            throw error;
        }
    },
    downloaDepartmentMaterialsWord: async (startYear, endYear, departmentName) => {
        try {
            const response = await axiosInstance.get('/materials/export_word/by_department', {
                params: { startYear, endYear, departmentName },
                responseType: 'blob'
            });
            return response.data;
        } catch (error) {
            console.error("Ошибка при вызове эндпоинта для экспорта отчета по одному автора в Word", error);
            throw error;
        }
    },
    downloaSpecialtyDepartmentsWithMaterialsWord: async (specCode, startYear, endYear) => {
        try {
            const response = await axiosInstance.get('/specialties/export_word/disciplines_with_materials', {
                params: { specCode, startYear, endYear },
                responseType: 'blob'
            });
            return response.data;
        } catch (error) {
            console.error("Ошибка при вызове эндпоинта для экспорта отчета по дисциплинам специальности в Word", error);
            throw error;
        }
    },
    downloaSpecialtyMaterialsWord: async (specCode, startYear, endYear) => {
        try {
            const response = await axiosInstance.get('/specialties/export_word/by_specialty', {
                params: { specCode, startYear, endYear },
                responseType: 'blob'
            });
            return response.data;
        } catch (error) {
            console.error("Ошибка при вызове эндпоинта для экспорта отчета по специальности в Word", error);
            throw error;
        }
    },
    downloaDepartmentDisciplinesWord: async (departmentName, startYear, endYear, targetYear, showReissueColumn) => {
        try {
            const response = await axiosInstance.get('/departments/export_word/disciplines', {
                params: { departmentName, startYear, endYear, targetYear, showReissueColumn },
                responseType: 'blob'
            });
            return response.data;
        } catch (error) {
            console.error("Ошибка при вызове эндпоинта для экспорта отчета по дисциплинам кафедры в Word", error);
            throw error;
        }
    },
};

export default excelService;