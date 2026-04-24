import { BrowserRouter, Routes, Route } from 'react-router-dom'
import FeedPage from './pages/FeedPage'
import PostPage from './pages/PostPage'
import AuthorPage from './pages/AuthorPage'
import AuthorsPage from './pages/AuthorsPages'
import CalendarPage from './pages/CalendarPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<FeedPage />} />
        <Route path="/post/:id" element={<PostPage />} />
        <Route path="/authors" element={<AuthorsPage />} />
        <Route path="/author/:slug" element={<AuthorPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App