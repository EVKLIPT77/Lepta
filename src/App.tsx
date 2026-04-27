import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import FeedPage from './pages/FeedPage'
import PostPage from './pages/PostPage'
import AuthorPage from './pages/AuthorPage'
import AuthorsPage from './pages/AuthorsPage'
import CalendarPage from './pages/CalendarPage'
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'
import ProfilePage from './pages/ProfilePage'
import ProfileEditPage from './pages/ProfileEditPage'
import AuthorApplicationPage from './pages/AuthorApplicationPage'
import AdminApplicationsPage from './pages/AdminApplicationsPage'
import AdminApplicationDetailPage from './pages/AdminApplicationDetailPage'
import MyPostsPage from './pages/MyPostsPage'
import PostEditPage from './pages/PostEditPage'
import LeptaPage from './pages/LeptaPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/feed" element={<FeedPage />} />
        <Route path="/post/:id" element={<PostPage />} />
        <Route path="/authors" element={<AuthorsPage />} />
        <Route path="/author/:slug" element={<AuthorPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/lepta" element={<LeptaPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/edit" element={<ProfileEditPage />} />
        <Route path="/profile/author-application" element={<AuthorApplicationPage />} />
        <Route path="/profile/posts" element={<MyPostsPage />} />
        <Route path="/profile/posts/new" element={<PostEditPage />} />
        <Route path="/profile/posts/:id/edit" element={<PostEditPage />} />
        <Route path="/admin/applications" element={<AdminApplicationsPage />} />
        <Route path="/admin/applications/:id" element={<AdminApplicationDetailPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App