import { axiosInstance } from './axiosInstance';

const ragService = {
  stats: async () => {
    const response = await axiosInstance.get('/materials/rag/stats');
    return response.data;
  },
  documents: async () => {
    const response = await axiosInstance.get('/materials/rag/documents');
    return response.data;
  },
  query: async (payload) => {
    const response = await axiosInstance.post('/materials/rag/query', payload);
    return response.data;
  },
};

export default ragService;
