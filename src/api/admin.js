import request from '../utils/request';

export const campusAdminApi = {
    summary: () => request.get('/campus/admin/summary'),
    reconcileStats: () => request.post('/campus/admin/stats/reconcile'),
    listPosts: (params) => request.get('/campus/admin/posts', { params }),
    createPost: (data) => request.post('/campus/admin/posts', data),
    updatePost: (id, data) => request.put(`/campus/admin/posts/${id}`, data),
    deletePost: (id) => request.delete(`/campus/admin/posts/${id}`),
    batchPosts: (data) => request.post('/campus/admin/posts/batch', data),
    uploadImage: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return request.post('/campus/upload/image', formData);
    },
    listComments: (params) => request.get('/campus/admin/comments', { params }),
    deleteComment: (id) => request.delete(`/campus/admin/comments/${id}`),
    listReports: (params) => request.get('/campus/admin/reports', { params }),
    reviewReport: (id, data) => request.post(`/campus/admin/reports/${id}/review`, data),
    listFeedback: (params) => request.get('/campus/admin/feedback', { params }),
    reviewFeedback: (id, data) => request.post(`/campus/admin/feedback/${id}/review`, data),
    security: () => request.get('/campus/admin/security'),
    blockIP: (data) => request.post('/campus/admin/security/ip-blocks', data),
    unblockIP: (ip) => request.delete(`/campus/admin/security/ip-blocks/${encodeURIComponent(ip)}`),
    listUsers: (params) => request.get('/campus/admin/users', { params }),
    updateUserRole: (id, role) => request.put(`/campus/admin/users/${id}/role`, { role }),
    listCategories: () => request.get('/campus/forum/categories'),
};
