// websocket.js
class WebSocketManager {
    constructor() {
        this.ws = null;
        this.listeners = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.heartbeatInterval = null;
        this.lastHeartbeatTime = null;
        this.connectionCheckInterval = null;
        this.currentToken = null; // 保存当前token用于重连
    }

    connect(token) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.warn('已有 WebSocket 连接，跳过');
            return;
        }

        this.currentToken = token;
        const wsBase = import.meta.env.VITE_WS_URL || `ws://${window.location.host}`;
        const url = `${wsBase}?token=${encodeURIComponent(token)}`;
        console.log('连接 WebSocket:', url);

        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            console.log('WebSocket连接成功');
            this.reconnectAttempts = 0;
            this.emit('connection_established');
            this.emit('connection_status', 'connected');

            this.send({ action: 'auth', timestamp: Date.now() });

            this.startHeartbeat();
            this.startConnectionCheck();
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('收到WebSocket消息:', data);
                this.handleIncomingMessage(data);
            } catch (error) {
                console.error('解析消息失败:', error);
            }
        };

        this.ws.onclose = (event) => {
            console.log('WebSocket断开连接:', event.code, event.reason);
            this.stopHeartbeat();
            this.stopConnectionCheck();

            this.emit('connection_status', 'disconnected');

            // 正常关闭（1000）或被新连接替换，不重连
            if (event.code === 1000 || event.reason === 'replaced by new connection') {
                console.warn('连接正常关闭或被新会话替换，停止自动重连');
                return;
            }

            // 认证失败（token无效）—— 停止重连，建议跳转登录
            if (event.code === 1008 ||
                (event.reason && (event.reason.includes('auth') || event.reason.includes('token')))) {
                console.error('认证失败，停止重连，请重新登录');
                // 可以在这里触发全局登出（如清除token、跳转登录页）
                // 但为避免循环，仅打印错误
                return;
            }

            // 非正常关闭，尝试重连
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                const backoffDelay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
                console.log(`尝试重连 (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})，延迟 ${backoffDelay}ms`);
                setTimeout(() => {
                    this.reconnectAttempts++;
                    if (this.currentToken) {
                        this.connect(this.currentToken);
                    }
                }, backoffDelay);
            } else {
                console.error('达到最大重连次数，停止重连');
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket连接错误:', error);
            this.emit('connection_error', error);
            this.emit('connection_status', 'error');
        };
    }

    startHeartbeat() {
        this.stopHeartbeat();
        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected()) {
                this.send({ action: 'ping', timestamp: Date.now() });
                this.lastHeartbeatTime = Date.now();
            }
        }, 30000);
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    startConnectionCheck() {
        this.stopConnectionCheck();
        this.connectionCheckInterval = setInterval(() => {
            if (this.isConnected()) {
                if (this.lastHeartbeatTime && Date.now() - this.lastHeartbeatTime > 60000) {
                    console.warn('心跳超时，重新连接...');
                    this.reconnect();
                }
            }
        }, 10000);
    }

    stopConnectionCheck() {
        if (this.connectionCheckInterval) {
            clearInterval(this.connectionCheckInterval);
            this.connectionCheckInterval = null;
        }
    }

    reconnect() {
        if (this.currentToken) {
            this.disconnect();
            setTimeout(() => this.connect(this.currentToken), 1000);
        }
    }

    send(data) {
        if (!this.isConnected()) {
            console.error('WebSocket未连接');
            return false;
        }
        try {
            const message = typeof data === 'string' ? data : JSON.stringify(data);
            this.ws.send(message);
            console.log('发送WebSocket消息:', data);
            return true;
        } catch (error) {
            console.error('发送消息失败:', error);
            return false;
        }
    }

    sendMessage(data) {
        return this.send({
            action: 'send_message',
            data: {
                ...data,
                receiver_id: String(data.receiver_id),
                client_msg_id: data.client_msg_id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            },
            timestamp: Date.now()
        });
    }

    sendReadReceipt(conversationId, messageId) {
        return this.send({
            action: 'read_message',
            data: {
                conversation_id: String(conversationId),
                message_id: String(messageId)
            },
            timestamp: Date.now()
        });
    }

    recallMessage(messageId) {
        return this.send({
            action: 'recall_message',
            data: { message_id: String(messageId) },
            timestamp: Date.now()
        });
    }

    sendTypingStatus(receiverId, convType, isTyping, text = '') {
        return this.send({
            action: 'typing',
            data: {
                receiver_id: String(receiverId),
                conv_type: convType,
                is_typing: isTyping,
                text
            },
            timestamp: Date.now()
        });
    }

    handleIncomingMessage(data) {
        const { action, ...rest } = data;
        switch (action) {
            case 'new_message':
            case 'receive_message':
                this.emit('new_message', {
                    ...rest.data,
                    action,
                    id: String(rest.data?.id || rest.data?.message_id),
                    sender_id: String(rest.data?.sender_id),
                    receiver_id: String(rest.data?.receiver_id),
                    conversation_id: String(rest.data?.conversation_id)
                });
                break;
            case 'message_sent':
                this.emit('message_sent', {
                    ...rest.data,
                    action,
                    message_id: String(rest.data?.message_id),
                    client_msg_id: String(rest.data?.client_msg_id)
                });
                break;
            case 'message_delivered':
                this.emit('message_delivered', {
                    ...rest.data,
                    action,
                    message_id: String(rest.data?.message_id),
                    receiver_id: String(rest.data?.receiver_id)
                });
                break;
            case 'message_read':
                this.emit('message_read', {
                    ...rest.data,
                    action,
                    message_id: String(rest.data?.message_id),
                    reader_id: String(rest.data?.reader_id)
                });
                break;
            case 'message_recalled':
                this.emit('message_recalled', {
                    ...rest.data,
                    action,
                    message_id: String(rest.data?.message_id),
                    recalled_by: String(rest.data?.recalled_by)
                });
                break;
            case 'not_friend': {
                const notFriendData = rest.data || rest;
                const clientMsgId = notFriendData.client_msg_id ||
                    notFriendData.message_id ||
                    (notFriendData.data && notFriendData.data.client_msg_id);
                this.emit('not_friend', {
                    ...notFriendData,
                    action,
                    client_msg_id: clientMsgId ? String(clientMsgId) : null,
                    sender_id: notFriendData.sender_id ? String(notFriendData.sender_id) : null,
                    receiver_id: notFriendData.receiver_id ? String(notFriendData.receiver_id) : null,
                    error: notFriendData.error || notFriendData.message || '双方不是好友关系'
                });
                break;
            }
            case 'user_typing':
                this.emit('user_typing', {
                    ...rest.data,
                    action,
                    sender_id: String(rest.data?.sender_id),
                    receiver_id: String(rest.data?.receiver_id)
                });
                break;
            case 'pong':
                console.log('收到心跳响应');
                this.lastHeartbeatTime = Date.now();
                break;
            case 'auth_success':
                this.emit('auth_success', rest);
                break;
            case 'connection_status':
                this.emit('connection_status', rest.status || rest.data);
                break;
            case 'notification':
                this.emit('notification', rest.data || rest);
                break;
            default:
                console.log('收到未知类型的消息:', action, rest);
                this.emit(action, rest);
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.onopen = null;
            this.ws.onclose = null;
            this.ws.onerror = null;
            this.ws.onmessage = null;
            this.ws.close();
            this.ws = null;
        }
        this.stopHeartbeat();
        this.stopConnectionCheck();
        this.emit('connection_status', 'disconnected');
    }

    isConnected() {
        return this.ws && this.ws.readyState === WebSocket.OPEN;
    }

    getConnectionStatus() {
        if (!this.ws) return 'disconnected';
        switch (this.ws.readyState) {
            case WebSocket.CONNECTING: return 'connecting';
            case WebSocket.OPEN: return 'connected';
            default: return 'disconnected';
        }
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
    }

    emit(event, data) {
        console.log(`🔥 WebSocket emit: ${event}`, data);
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in ${event} listener:`, error);
                }
            });
        }
    }
}

export const websocketManager = new WebSocketManager();