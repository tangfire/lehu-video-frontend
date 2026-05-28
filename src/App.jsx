// App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ChatProvider } from './context/chatContext';
import { WebSocketProvider } from './components/WebSocket/WebSocketProvider';
import MainLayout from './components/Layout/MainLayout';
import Home from './pages/Home';
import VideoDetail from './pages/VideoDetail';
import UserCenter from './pages/UserCenter';
import FollowPage from './pages/Follow';          // 确保这是默认导出
import Settings from './pages/Settings';
import Upload from './pages/Upload';
import Login from './pages/Login';
import Register from './pages/Register';
import ChatList from './pages/Chat/ChatList';
import ChatRoom from './pages/Chat/ChatRoom';
import Friends from './pages/Friends/FriendList';
import FriendRequests from './pages/Friends/FriendRequests';
import Groups from './pages/Groups/GroupList';
import GroupDetail from './pages/Groups/GroupDetail';
import Collections from './pages/Collection/Collections';
import AuthRoute from './components/AuthRoute';    // 确保 AuthRoute 正确导出
import './App.css';
import SearchPage from "./pages/Search/index.jsx";
import AdminLogin from './pages/Admin/AdminLogin.jsx';
import AdminLayout from './pages/Admin/AdminLayout.jsx';
import AdminDashboard from './pages/Admin/AdminDashboard.jsx';
import AdminPosts from './pages/Admin/AdminPosts.jsx';
import AdminCompose from './pages/Admin/AdminCompose.jsx';
import AdminUsers from './pages/Admin/AdminUsers.jsx';
import AdminSecurity from './pages/Admin/AdminSecurity.jsx';
import AdminPermissions from './pages/Admin/AdminPermissions.jsx';
import AdminNotifications from './pages/Admin/AdminNotifications.jsx';
import AdminModeration from './pages/Admin/AdminModeration.jsx';
import AdminAssistant from './pages/Admin/AdminAssistant.jsx';

function AppProviders({ children }) {
    const location = useLocation();
    const isAdminRoute = location.pathname.startsWith('/admin');

    if (isAdminRoute) {
        return <ChatProvider>{children}</ChatProvider>;
    }

    return (
        <ChatProvider>
            <WebSocketProvider>{children}</WebSocketProvider>
        </ChatProvider>
    );
}

function AdminLegacyRedirect({ to, tab }) {
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    params.set('tab', tab);
    return <Navigate to={`${to}?${params.toString()}`} replace />;
}

function App() {
    return (
        <Router>
            <AppProviders>
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
                            <Route path="chat" element={
                                <AuthRoute>
                                    <ChatList />
                                </AuthRoute>
                            } />
                            <Route path="chat/:type/:targetId" element={
                                <AuthRoute>
                                    <ChatRoom />
                                </AuthRoute>
                            } />
                            <Route path="friends" element={
                                <AuthRoute>
                                    <Friends />
                                </AuthRoute>
                            } />
                            <Route path="friend-requests" element={
                                <AuthRoute>
                                    <FriendRequests />
                                </AuthRoute>
                            } />
                            <Route path="groups" element={
                                <AuthRoute>
                                    <Groups />
                                </AuthRoute>
                            } />
                            <Route path="group/:groupId" element={
                                <AuthRoute>
                                    <GroupDetail />
                                </AuthRoute>
                            } />
                            <Route path="search" element={
                                <AuthRoute>
                                    <SearchPage />
                                </AuthRoute>
                            } />
                        </Route>
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/admin/login" element={<AdminLogin />} />
                        <Route path="/admin" element={<AdminLayout />}>
                            <Route index element={<AdminDashboard />} />
                            <Route path="posts" element={<AdminPosts />} />
                            <Route path="compose" element={<AdminCompose />} />
                            <Route path="moderation" element={<AdminModeration />} />
                            <Route path="assistant" element={<AdminAssistant />} />
                            <Route path="notifications" element={<AdminNotifications />} />
                            <Route path="ai-replies" element={<AdminLegacyRedirect to="/admin/assistant" tab="status" />} />
                            <Route path="knowledge" element={<AdminLegacyRedirect to="/admin/assistant" tab="knowledge" />} />
                            <Route path="comments" element={<AdminLegacyRedirect to="/admin/moderation" tab="comments" />} />
                            <Route path="reports" element={<AdminLegacyRedirect to="/admin/moderation" tab="reports" />} />
                            <Route path="feedback" element={<AdminLegacyRedirect to="/admin/moderation" tab="feedback" />} />
                            <Route path="security" element={<AdminSecurity />} />
                            <Route path="users" element={<AdminUsers />} />
                            <Route path="permissions" element={<AdminPermissions />} />
                        </Route>
                        <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </AppProviders>
        </Router>
    );
}

export default App;
