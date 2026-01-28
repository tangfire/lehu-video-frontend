import { Navigate, useLocation } from 'react-router-dom';
import { isLoggedIn } from '../api/user';

const AuthRoute = ({ children }) => {
    const location = useLocation();

    console.log('AuthRoute检查登录状态:', {
        path: location.pathname,
        isLoggedIn: isLoggedIn()
    });

    if (!isLoggedIn()) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
};

export default AuthRoute;