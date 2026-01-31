import request from '../utils/request';

export const messageApi = {
    // 发送消息
    sendMessage: (data) => {
        return request.post('/message', data);
    },

    // 获取消息列表
    listMessages: (conversationId, lastMsgId = 0, limit = 20) => {
        return request.post('/messages/list', {
            conversation_id: conversationId,
            last_msg_id: lastMsgId,
            limit
        });
    },

    // 撤回消息
    recallMessage: (messageId) => {
        return request.delete(`/message/${messageId}`);
    },

    // 标记消息已读
    markMessagesRead: (conversationId, lastMsgId) => {
        return request.post('/messages/read', {
            conversation_id: conversationId,
            last_msg_id: lastMsgId
        });
    },

    // 获取会话列表
    listConversations: (pageStats) => {
        // 从原来的 GET 请求改为 POST 请求
        return request.post('/conversations', pageStats);
    },

    // 删除会话
    deleteConversation: (conversationId) => {
        return request.delete(`/conversation/${conversationId}`);
    },

    // 获取会话详情
    getConversation: (targetId, convType) => {
        return request.post('/conversation/detail', {
            target_id: targetId,
            conv_type: convType
        });
    },

    // 获取未读消息数
    getUnreadCount: (targetId, convType) => {
        return request.get('/messages/unread-count', {
            params: {
                target_id: targetId,
                conv_type: convType
            }
        });
    },

    // 创建会话
    createConversation: (targetId, convType, initialMessage = '') => {
        return request.post('/conversation', {
            target_id: targetId,
            conv_type: convType,
            initial_message: initialMessage
        });
    },

    // 清空聊天记录
    clearMessages: (conversationId) => {
        return request.delete('/messages', {
            params: {
                conversation_id: conversationId
            }
        });
    },

    // 更新消息状态
    updateMessageStatus: (messageId, status) => {
        return request.post('/message/status', {
            message_id: messageId,
            status
        });
    }
};