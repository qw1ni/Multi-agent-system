import { axiosInstance } from "./axiosInstance";

const adminService = {
    downloadDatabaseBackup: async () => {
        const response = await axiosInstance.post('/admin/backup', {
            responseType: 'blob',
        });
        return response.data;
    },
    runLibraryParser: async (mode = 'full', sections = null) => {
        try {
            const response = await axiosInstance.post('/admin/run_parser', { mode, sections });
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    stopLibraryParser: async () => {
        const response = await axiosInstance.post('/admin/stop_parser');
        return response.data;
    },
    getParserStatus: async () => {
        const response = await axiosInstance.get('/admin/parser_status');
        return response.data;
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
    stopLibraryDownload: async () => {
        const response = await axiosInstance.post('/admin/download_stop');
        return response.data;
    },
    getConverterStatus: async () => {
        const response = await axiosInstance.get('/admin/converter/status');
        return response.data;
    },
    startConverter: async (sections = null, force = false) => {
        const response = await axiosInstance.post('/admin/converter/start', { sections, force });
        return response.data;
    },
    stopConverter: async () => {
        const response = await axiosInstance.post('/admin/converter/stop');
        return response.data;
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
