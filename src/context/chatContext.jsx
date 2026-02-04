// context/chatContext.jsx
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ChatContext = createContext();

export const useChat = () => {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useChat must be used within ChatProvider');
    }
    return context;
};

export const ChatProvider = ({ children }) => {
    const [conversationsCache, setConversationsCache] = useState(new Map());
    const [usersCache, setUsersCache] = useState(new Map());
    const [groupsCache, setGroupsCache] = useState(new Map());
    const [lastFetchTimes, setLastFetchTimes] = useState(new Map());

    // 缓存会话
    const cacheConversation = useCallback((conversation) => {
        if (!conversation?.id) return;
        const cacheKey = `conv_${conversation.id}`;
        setConversationsCache(prev => {
            const newCache = new Map(prev);
            newCache.set(cacheKey, {
                ...conversation,
                cachedAt: Date.now()
            });
            return newCache;
        });
        setLastFetchTimes(prev => {
            const newTimes = new Map(prev);
            newTimes.set(cacheKey, Date.now());
            return newTimes;
        });
    }, []);

    // 缓存用户
    const cacheUser = useCallback((user) => {
        if (!user?.id) return;
        const cacheKey = `user_${user.id}`;
        setUsersCache(prev => {
            const newCache = new Map(prev);
            newCache.set(cacheKey, {
                ...user,
                cachedAt: Date.now()
            });
            return newCache;
        });
        setLastFetchTimes(prev => {
            const newTimes = new Map(prev);
            newTimes.set(cacheKey, Date.now());
            return newTimes;
        });
    }, []);

    // 缓存群组
    const cacheGroup = useCallback((group) => {
        if (!group?.id) return;
        const cacheKey = `group_${group.id}`;
        setGroupsCache(prev => {
            const newCache = new Map(prev);
            newCache.set(cacheKey, {
                ...group,
                cachedAt: Date.now()
            });
            return newCache;
        });
        setLastFetchTimes(prev => {
            const newTimes = new Map(prev);
            newTimes.set(cacheKey, Date.now());
            return newTimes;
        });
    }, []);

    // 获取缓存的会话
    const getCachedConversation = useCallback((conversationId) => {
        const cacheKey = `conv_${conversationId}`;
        const cached = conversationsCache.get(cacheKey);
        if (!cached) return null;

        // 检查是否过期（5分钟）
        if (Date.now() - cached.cachedAt > 5 * 60 * 1000) {
            return null;
        }
        return cached;
    }, [conversationsCache]);

    // 获取缓存的用户
    const getCachedUser = useCallback((userId) => {
        const cacheKey = `user_${userId}`;
        const cached = usersCache.get(cacheKey);
        if (!cached) return null;

        // 检查是否过期（5分钟）
        if (Date.now() - cached.cachedAt > 5 * 60 * 1000) {
            return null;
        }
        return cached;
    }, [usersCache]);

    // 获取缓存的群组
    const getCachedGroup = useCallback((groupId) => {
        const cacheKey = `group_${groupId}`;
        const cached = groupsCache.get(cacheKey);
        if (!cached) return null;

        // 检查是否过期（5分钟）
        if (Date.now() - cached.cachedAt > 5 * 60 * 1000) {
            return null;
        }
        return cached;
    }, [groupsCache]);

    // 检查是否需要重新获取
    const shouldRefetch = useCallback((key, timeout = 30000) => {
        const lastFetch = lastFetchTimes.get(key);
        if (!lastFetch) return true;
        return Date.now() - lastFetch > timeout;
    }, [lastFetchTimes]);

    // 批量缓存用户
    const batchCacheUsers = useCallback((users) => {
        if (!Array.isArray(users)) return;

        setUsersCache(prev => {
            const newCache = new Map(prev);
            users.forEach(user => {
                if (user?.id) {
                    const cacheKey = `user_${user.id}`;
                    newCache.set(cacheKey, {
                        ...user,
                        cachedAt: Date.now()
                    });
                }
            });
            return newCache;
        });
    }, []);

    // 清除指定缓存
    const clearCache = useCallback((key) => {
        if (key) {
            setConversationsCache(prev => {
                const newCache = new Map(prev);
                newCache.delete(key);
                return newCache;
            });
            setUsersCache(prev => {
                const newCache = new Map(prev);
                newCache.delete(key);
                return newCache;
            });
            setGroupsCache(prev => {
                const newCache = new Map(prev);
                newCache.delete(key);
                return newCache;
            });
            setLastFetchTimes(prev => {
                const newTimes = new Map(prev);
                newTimes.delete(key);
                return newTimes;
            });
        } else {
            // 清除所有缓存
            setConversationsCache(new Map());
            setUsersCache(new Map());
            setGroupsCache(new Map());
            setLastFetchTimes(new Map());
        }
    }, []);

    // 清理过期缓存（定期运行）
    useEffect(() => {
        const cleanupInterval = setInterval(() => {
            const now = Date.now();
            const expiryTime = 10 * 60 * 1000; // 10分钟

            setConversationsCache(prev => {
                const newCache = new Map();
                for (const [key, value] of prev) {
                    if (now - value.cachedAt < expiryTime) {
                        newCache.set(key, value);
                    }
                }
                return newCache;
            });

            setUsersCache(prev => {
                const newCache = new Map();
                for (const [key, value] of prev) {
                    if (now - value.cachedAt < expiryTime) {
                        newCache.set(key, value);
                    }
                }
                return newCache;
            });

            setGroupsCache(prev => {
                const newCache = new Map();
                for (const [key, value] of prev) {
                    if (now - value.cachedAt < expiryTime) {
                        newCache.set(key, value);
                    }
                }
                return newCache;
            });
        }, 5 * 60 * 1000); // 每5分钟清理一次

        return () => clearInterval(cleanupInterval);
    }, []);

    return (
        <ChatContext.Provider value={{
            conversationsCache,
            usersCache,
            groupsCache,
            cacheConversation,
            cacheUser,
            cacheGroup,
            getCachedConversation,
            getCachedUser,
            getCachedGroup,
            shouldRefetch,
            batchCacheUsers,
            clearCache
        }}>
            {children}
        </ChatContext.Provider>
    );
};