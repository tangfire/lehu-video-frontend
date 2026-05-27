import request from '../utils/request';

export const campusAdminApi = {
    summary: () => request.get('/campus/admin/summary'),
    listPosts: (params) => request.get('/campus/admin/posts', { params }),
    createPost: (data) => request.post('/campus/admin/posts', data),
    updatePost: (id, data) => request.put(`/campus/admin/posts/${id}`, data),
    deletePost: (id) => request.delete(`/campus/admin/posts/${id}`),
    listComments: (params) => request.get('/campus/admin/comments', { params }),
    deleteComment: (id) => request.delete(`/campus/admin/comments/${id}`),
    listReports: (params) => request.get('/campus/admin/reports', { params }),
    reviewReport: (id, data) => request.post(`/campus/admin/reports/${id}/review`, data),
    listUsers: (params) => request.get('/campus/admin/users', { params }),
    updateUserRole: (id, role) => request.put(`/campus/admin/users/${id}/role`, { role }),
    listCategories: () => request.get('/campus/forum/categories'),
};
