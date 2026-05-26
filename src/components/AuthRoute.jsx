import { Navigate, useLocation } from 'react-router-dom';
import { isLoggedIn } from '../api/user';

const AuthRoute = ({ children }) => {
    const location = useLocation();

    if (!isLoggedIn()) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
};

export default AuthRoute;
