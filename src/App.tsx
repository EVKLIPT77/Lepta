import { BrowserRouter, Routes, Route } from 'react-router-dom'
import FeedPage from './pages/FeedPage'
import PostPage from './pages/PostPage'
import AuthorPage from './pages/AuthorPage'
import AuthorsPage from './pages/AuthorsPages'
import CalendarPage from './pages/CalendarPage'
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'
import ProfilePage from './pages/ProfilePage'
import ProfileEditPage from './pages/ProfileEditPage'
import AuthorApplicationPage from './pages/AuthorApplicationPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<FeedPage />} />
        <Route path="/post/:id" element={<PostPage />} />
        <Route path="/authors" element={<AuthorsPage />} />
        <Route path="/author/:slug" element={<AuthorPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/edit" element={<ProfileEditPage />} />
        <Route path="/profile/author-application" element={<AuthorApplicationPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App