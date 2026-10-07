import {axiosInstance} from "./axiosInstance";

const authorService = {
    searchAuthors: async (query) => {
        try {
            const response = await axiosInstance.get('authors/search/', {
                params: { q: query },
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    },
}

export default authorService;