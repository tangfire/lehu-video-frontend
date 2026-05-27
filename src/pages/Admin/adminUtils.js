export const statusText = (status) => {
    const map = {
        0: '待审核',
        1: '可见',
        2: '已拒绝',
        3: '已删除',
    };
    return map[Number(status)] || '未知';
};

export const roleText = (role) => {
    const map = {
        admin: '管理员',
        operator: '运营',
        user: '普通用户',
    };
    return map[role || 'user'] || '普通用户';
};

export const postTypeText = (type) => {
    const map = {
        note: '笔记',
        lost: '失物',
        question: '问答',
        guide: '攻略',
        club: '社团',
    };
    return map[type || 'note'] || '笔记';
};

export const mediaTypeText = (type) => {
    const map = {
        text: '文字',
        image: '图文',
        video: '视频',
    };
    return map[type || 'text'] || '文字';
};

export const toArrayFromLines = (value) => value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
