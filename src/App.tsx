import { HashRouter, Route, Routes } from 'react-router-dom'
import { I18nProvider } from './i18n'
import Layout from './components/Layout'
import Landing from './pages/Landing'

export default function App() {
  return (
    <I18nProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Landing />} />
            <Route path="*" element={<Landing />} />
          </Route>
        </Routes>
      </HashRouter>
    </I18nProvider>
  )
}
