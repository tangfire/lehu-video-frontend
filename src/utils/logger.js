const isDebugEnabled = () => import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEBUG_LOGS === 'true';

export const logger = {
    debug: (...args) => {
        if (isDebugEnabled()) {
            console.debug(...args);
        }
    },
    info: (...args) => {
        if (isDebugEnabled()) {
            console.info(...args);
        }
    },
    warn: (...args) => {
        if (isDebugEnabled()) {
            console.warn(...args);
        }
    },
    error: (...args) => {
        if (isDebugEnabled()) {
            console.error(...args);
        }
    }
};
