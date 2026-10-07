import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ROLES } from './constants/roles.js';
import ProtectedRoute from './components/ProtectedRoute.js';
import Registration from './pages/Authorization/Registration.js';
import Login from './pages/Authorization/Login.js';
import MainPage from './pages/MainPage.js';
import CatalogPage from './pages/CatalogPage.js';
import MaterialDetailPage from './pages/MaterialDetailPage.js';
import ReportsPage from './pages/ReportsPage.js';
import AnalyticsPage from './pages/AnalyticsPage.js';
import AdminPage from './pages/AdminPage.js';
import ForbiddenPage from './pages/Errors/ForbiddenPage.js';
import NotFoundPage from './pages/Errors/NotFoundPage.js';

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/materials/:id" element={<MaterialDetailPage />} />
          <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]} />}>
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/registration" element={<Registration />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={Object.values(ROLES)} />}>
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
          </Route>
          <Route path="/403" element={<ForbiddenPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
