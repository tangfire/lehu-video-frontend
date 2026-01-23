import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/Layout/MainLayout.jsx';

import Login from './pages/Login/index.jsx';
import Register from './pages/Register/index.jsx';
import UserCenter from './pages/UserCenter/index.jsx';
import VideoDetail from './pages/VideoDetail/index.jsx';
import Home from './pages/Home/index.jsx';
import './App.css'
import AuthRoute from "./components/AuthRoute.jsx";
import Settings from "./pages/Settings/index.jsx";

function App() {
    return (
        <Router>
            <Routes>
                {/* 需要布局的页面 */}
                <Route path="/" element={<MainLayout />}>
                    <Route index element={<Home />} />
                    <Route path="video/:id" element={<VideoDetail />} />
                    <Route path="user/:userId" element={
                        <AuthRoute>
                            <UserCenter />
                        </AuthRoute>
                    } />
                </Route>

                <Route path="/settings" element={
                    <AuthRoute>
                        <Settings />
                    </AuthRoute>
                } />

                {/* 独立页面（无布局） */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* 404页面 */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}

export default App;
