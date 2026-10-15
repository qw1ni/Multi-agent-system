import { axiosInstance } from './axiosInstance';

const agentService = {
    chat: async (message) => {
        const response = await axiosInstance.post('/admin/agent/chat', { message });
        return response.data;
    },
};

export default agentService;
