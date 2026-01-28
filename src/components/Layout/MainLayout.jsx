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
            {!hideHeader && (
                <footer className="footer">
                    <div className="footer-content">
                        <div className="footer-section">
                            <h3 className="footer-logo">ShortVideo</h3>
                            <p className="footer-description">
                                发现精彩短视频，分享你的生活瞬间
                            </p>
                        </div>

                        <div className="footer-links">
                            <div className="link-group">
                                <h4>产品</h4>
                                <a href="#">功能</a>
                                <a href="#">更新日志</a>
                                <a href="#">定价</a>
                            </div>

                            <div className="link-group">
                                <h4>支持</h4>
                                <a href="#">帮助中心</a>
                                <a href="#">社区</a>
                                <a href="#">联系我们</a>
                            </div>

                            <div className="link-group">
                                <h4>法律</h4>
                                <a href="#">隐私政策</a>
                                <a href="#">服务条款</a>
                                <a href="#">Cookie政策</a>
                            </div>

                            <div className="link-group">
                                <h4>关注我们</h4>
                                <div className="social-links">
                                    <a href="#" className="social-link">Twitter</a>
                                    <a href="#" className="social-link">Instagram</a>
                                    <a href="#" className="social-link">Facebook</a>
                                </div>
                            </div>
                        </div>

                        <div className="footer-bottom">
                            <p className="copyright">
                                © {new Date().getFullYear()} ShortVideo. All rights reserved.
                            </p>
                            <div className="footer-meta">
                                <a href="#">使用条款</a>
                                <a href="#">隐私政策</a>
                                <a href="#">网站地图</a>
                            </div>
                        </div>
                    </div>
                </footer>
            )}
        </div>
    );
};

export default MainLayout;