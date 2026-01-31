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
            return; // 不要立刻断开
        }

        // 使用正确的 URL 格式
        const wsBase = import.meta.env.VITE_WS_URL || `ws://${window.location.host}`;
        const url = `${wsBase}?token=${encodeURIComponent(token)}`;

        console.log('连接 WebSocket:', url);

        // 使用正确的连接方式
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            console.log('WebSocket连接成功');
            this.reconnectAttempts = 0;
            this.emit('connection_established');

            this.startHeartbeat();
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleIncomingMessage(data);
            } catch (error) {
                console.error('解析消息失败:', error);
            }
        };

        this.ws.onclose = (event) => {
            console.log('WebSocket断开连接:', event.code, event.reason);
            this.stopHeartbeat();

            // 如果是被后端主动踢掉的（带有特定原因），不要自动重连
            if (event.reason === 'replaced by new connection' || event.code === 1000) {
                console.warn('连接被新会话替换或手动关闭，停止自动重连');
                return;
            }

            // 只有非正常关闭才进行带退避算法的重连
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                // 随着次数增加重连间隔: 1s, 2s, 4s...
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
        };
    }

    // 心跳机制
    startHeartbeat() {
        // 清除已有的心跳
        this.stopHeartbeat();

        // 每30秒发送一次ping
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
            return true;
        } catch (error) {
            console.error('发送消息失败:', error);
            return false;
        }
    }

    sendMessage(data) {
        // 核心修改：如果 data 里已经带了 client_msg_id (来自 ChatRoom)，就直接使用它
        // 这样才能保证前端 React 里的消息 ID 和发给后端的 ID 是一致的
        const client_msg_id = data.client_msg_id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const message = {
            action: 'send_message',
            data: data,
            client_msg_id: client_msg_id,
            timestamp: Date.now()
        };
        console.log('WS 发送原始数据:', message);
        return this.send(message);
    }

    // 处理接收到的消息
    handleIncomingMessage(data) {
        const { action, ...rest } = data;
        switch (action) {
            case 'receive_message':
                this.emit('new_message', rest);
                break;
            case 'message_sent':  // 添加这个case
                this.emit('message_sent', rest);
                break;
            case 'message_delivered':
                this.emit('message_delivered', rest);
                break;
            case 'message_read':
                this.emit('message_read', rest);
                break;
            case 'message_recalled':
                this.emit('message_recalled', rest);
                break;
            case 'user_typing':
                this.emit('user_typing', rest);
                break;
            case 'pong':
                // 心跳响应，不做处理
                console.log('收到心跳响应');
                break;
            case 'auth_success':
                this.emit('auth_success', rest);
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