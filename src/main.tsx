import { lazy, StrictMode, Suspense, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import './index.css'
import Compare from './pages/Compare'
import Gallery from './pages/Gallery'
import Info from './pages/Info'
import Insights from './pages/Insights'
import PlotDetail from './pages/PlotDetail'
import Plots from './pages/Plots'
import TopPicks from './pages/TopPicks'

// pdf.js is large, so the viewer loads only when a document is opened
const DocViewer = lazy(() => import('./pages/DocViewer'))

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Plots />} />
          <Route path="plot/:id" element={<PlotDetail />} />
          <Route path="top" element={<TopPicks />} />
          <Route path="compare" element={<Compare />} />
          <Route path="insights" element={<Insights />} />
          <Route path="gallery" element={<Gallery />} />
          <Route path="info" element={<Info />} />
          <Route path="doc/:slug" element={<Suspense fallback={null}><DocViewer /></Suspense>} />
          <Route path="*" element={<Plots />} />
        </Route>
      </Routes>
    </HashRouter>
  </StrictMode>,
)
