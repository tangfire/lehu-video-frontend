import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/Layout/MainLayout.jsx';
import Home from './pages/Home/index.jsx';
import VideoDetail from './pages/VideoDetail/index.jsx';
import UserCenter from './pages/UserCenter/index.jsx';
import FollowPage from './pages/Follow/index.jsx';
import Settings from './pages/Settings/index.jsx';
import Upload from './pages/Upload/index.jsx';
import Login from './pages/Login/index.jsx';
import Register from './pages/Register/index.jsx';
import AuthRoute from './components/AuthRoute.jsx';
import './App.css';
import Collections from "./pages/Collection/Collections.jsx";

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<MainLayout />}>
                    <Route index element={<Home />} />
                    <Route path="video/:id" element={<VideoDetail />} />
                    <Route path="user/:userId" element={
                        <AuthRoute>
                            <UserCenter />
                        </AuthRoute>
                    } />
                    <Route path="user/:userId/follow" element={
                        <AuthRoute>
                            <FollowPage />
                        </AuthRoute>
                    } />
                    <Route path="collections" element={
                        <AuthRoute>
                            <Collections />
                        </AuthRoute>
                    } />
                    <Route path="settings" element={
                        <AuthRoute>
                            <Settings />
                        </AuthRoute>
                    } />
                    <Route path="upload" element={
                        <AuthRoute>
                            <Upload />
                        </AuthRoute>
                    } />
                </Route>

                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}

export default App;