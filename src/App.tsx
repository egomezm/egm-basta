import { HashRouter, Route, Routes } from 'react-router-dom'
import { I18nProvider } from './i18n'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Create from './pages/Create'
import Join from './pages/Join'
import Rules from './pages/Rules'
import Session from './pages/Session'

export default function App() {
  return (
    <I18nProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/new" element={<Create />} />
            <Route path="/join" element={<Join />} />
            <Route path="/join/:code" element={<Join />} />
            <Route path="/s/:code" element={<Session />} />
            <Route path="/rules" element={<Rules />} />
            <Route path="*" element={<Landing />} />
          </Route>
        </Routes>
      </HashRouter>
    </I18nProvider>
  )
}
