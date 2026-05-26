import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header.jsx';
import './Layout.css';

const MainLayout = () => {
    const location = useLocation();
    const hideHeader = ['/login', '/register'].includes(location.pathname);

    return (
        <div className="layout">
            {!hideHeader && <Header />}
            <main className={`main-content ${hideHeader ? 'no-header' : ''}`}>
                <div className="content-container">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default MainLayout;
