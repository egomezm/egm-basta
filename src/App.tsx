import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import { ItemsProvider } from './features/items/ItemsContext'
import ItemsPage from './pages/ItemsPage'
import AboutPage from './pages/AboutPage'
import styles from './App.module.css'

export default function App() {
  return (
    <HashRouter>
      <ItemsProvider>
        <nav className={styles.nav}>
          <NavLink to="/">Items</NavLink>
          <NavLink to="/about">About</NavLink>
        </nav>
        <main className={styles.main}>
          <Routes>
            <Route path="/" element={<ItemsPage />} />
            <Route path="/about" element={<AboutPage />} />
          </Routes>
        </main>
      </ItemsProvider>
    </HashRouter>
  )
}
