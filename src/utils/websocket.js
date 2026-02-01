class WebSocketManager {
    constructor() {
        this.ws = null;
        this.listeners = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectInterval = null;
        this.heartbeatInterval = null;
    }

    connect(token) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.warn('已有 WebSocket 连接，等待断开或复用...');
            return;
        }

        // 使用正确的 URL 格式
        const wsBase = import.meta.env.VITE_WS_URL || `ws://${window.location.host}`;
        const url = `${wsBase}?token=${encodeURIComponent(token)}`;

        console.log('连接 WebSocket:', url);

        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            console.log('WebSocket连接成功');
            this.reconnectAttempts = 0;
            this.emit('connection_established');
            this.emit('connection_status', 'connected');

            this.startHeartbeat();
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

            // 触发连接状态更新
            this.emit('connection_status', 'disconnected');

            // 如果是被后端主动踢掉的（带有特定原因），不要自动重连
            if (event.reason === 'replaced by new connection' || event.code === 1000) {
                console.warn('连接被新会话替换或手动关闭，停止自动重连');
                return;
            }

            // 只有非正常关闭才进行带退避算法的重连
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                const backoffDelay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
                setTimeout(() => {
                    this.reconnectAttempts++;
                    this.connect(token);
                }, backoffDelay);
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket连接错误:', error);
            this.emit('connection_error', error);
            this.emit('connection_status', 'error');
        };
    }

    // 心跳机制
    startHeartbeat() {
        this.stopHeartbeat();

        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected()) {
                this.send({
                    action: 'ping',
                    timestamp: Date.now()
                });
            }
        }, 30000);
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    // 发送消息通用方法
    send(data) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
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

    // 发送消息
    sendMessage(data) {
        const message = {
            action: 'send_message',
            data: {
                ...data,
                // 确保所有ID都是字符串
                receiver_id: String(data.receiver_id),
                client_msg_id: data.client_msg_id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            },
            timestamp: Date.now()
        };
        console.log('发送消息:', message);
        return this.send(message);
    }

    // 发送已读回执
    sendReadReceipt(conversationId, messageId) {
        const message = {
            action: 'mark_read',
            data: {
                conversation_id: String(conversationId),
                message_id: String(messageId)
            },
            timestamp: Date.now()
        };
        return this.send(message);
    }

    // 撤回消息
    recallMessage(messageId) {
        const message = {
            action: 'recall_message',
            data: {
                message_id: String(messageId)
            },
            timestamp: Date.now()
        };
        return this.send(message);
    }

    // 发送输入状态
    sendTypingStatus(receiverId, convType, isTyping, text = '') {
        const message = {
            action: 'typing',
            data: {
                receiver_id: String(receiverId),
                conv_type: convType,
                is_typing: isTyping,
                text: text
            },
            timestamp: Date.now()
        };
        return this.send(message);
    }

    // 处理接收到的消息
    handleIncomingMessage(data) {
        const { action, ...rest } = data;
        console.log('处理WebSocket消息:', action, rest);

        switch (action) {
            case 'new_message':
                this.emit('new_message', {
                    ...rest.data,
                    // 确保ID是字符串
                    id: String(rest.data.id),
                    sender_id: String(rest.data.sender_id),
                    receiver_id: String(rest.data.receiver_id),
                    conversation_id: String(rest.data.conversation_id)
                });
                break;
            case 'message_sent':
                this.emit('message_sent', {
                    ...rest.data,
                    // 确保ID是字符串
                    message_id: String(rest.data.message_id),
                    client_msg_id: String(rest.data.client_msg_id)
                });
                break;
            case 'message_delivered':
                this.emit('message_delivered', {
                    ...rest.data,
                    // 确保ID是字符串
                    message_id: String(rest.data.message_id),
                    receiver_id: String(rest.data.receiver_id)
                });
                break;
            case 'message_read':
                this.emit('message_read', {
                    ...rest.data,
                    // 确保ID是字符串
                    message_id: String(rest.data.message_id),
                    reader_id: String(rest.data.reader_id)
                });
                break;
            case 'message_recalled':
                this.emit('message_recalled', {
                    ...rest.data,
                    // 确保ID是字符串
                    message_id: String(rest.data.message_id),
                    recalled_by: String(rest.data.recalled_by)
                });
                break;
            case 'user_typing':
                this.emit('user_typing', {
                    ...rest.data,
                    // 确保ID是字符串
                    sender_id: String(rest.data.sender_id),
                    receiver_id: String(rest.data.receiver_id)
                });
                break;
            case 'pong':
                console.log('收到心跳响应');
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
            this.ws.close();
            this.ws = null;
        }
        this.listeners.clear();
        this.stopHeartbeat();
        this.emit('connection_status', 'disconnected');
    }

    isConnected() {
        return this.ws && this.ws.readyState === WebSocket.OPEN;
    }

    getConnectionStatus() {
        if (!this.ws) return 'disconnected';

        switch (this.ws.readyState) {
            case WebSocket.CONNECTING:
                return 'connecting';
            case WebSocket.OPEN:
                return 'connected';
            case WebSocket.CLOSING:
            case WebSocket.CLOSED:
            default:
                return 'disconnected';
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