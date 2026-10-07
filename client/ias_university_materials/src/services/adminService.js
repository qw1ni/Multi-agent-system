import { axiosInstance } from "./axiosInstance";

const adminService = {
    downloadDatabaseBackup: async () => {
        const response = await axiosInstance.post('/admin/backup', {
            responseType: 'blob',
        });
        return response.data;
    },
    runLibraryParser: async () => {
        try {
            const response = await axiosInstance.post('/admin/run_parser');
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    getDownloadSections: async () => {
        const response = await axiosInstance.get('/admin/download_sections');
        return response.data;
    },
    downloadLibraryFiles: async (sections = null) => {
        try {
            const response = await axiosInstance.post('/admin/download_files', {
                sections,
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    importDisciplines: async () => {
        try {
            const response = await axiosInstance.post('/admin/import_disciplines');
            return response.data;
        } catch (error) {
            throw error;
        }
    },
};

export default adminService;
