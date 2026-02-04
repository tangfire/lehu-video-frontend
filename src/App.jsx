// App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ChatProvider } from './context/chatContext';
import { WebSocketProvider } from './components/WebSocket/WebSocketProvider';
import MainLayout from './components/Layout/MainLayout';
import Home from './pages/Home';
import VideoDetail from './pages/VideoDetail';
import UserCenter from './pages/UserCenter';
import FollowPage from './pages/Follow';
import Settings from './pages/Settings';
import Upload from './pages/Upload';
import Login from './pages/Login';
import Register from './pages/Register';
import ChatList from './pages/Chat/ChatList.jsx';
import ChatRoom from './pages/Chat/ChatRoom';
import Friends from './pages/Friends/FriendList';
import FriendRequests from './pages/Friends/FriendRequests';
import Groups from './pages/Groups/GroupList';
import GroupDetail from './pages/Groups/GroupDetail.jsx';
import Collections from './pages/Collection/Collections';
import AuthRoute from './components/AuthRoute';
import './App.css';
import SearchPage from "./pages/Search/index.jsx";

function App() {
    return (
        <Router>
            <ChatProvider>
                <WebSocketProvider>
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

                        {/* 独立页面（无布局） */}
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />

                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </WebSocketProvider>
            </ChatProvider>
        </Router>
    );
}

export default App;