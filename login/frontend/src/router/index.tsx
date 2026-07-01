import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from '../components/Layout';
import PublicHome from '../pages/PublicHome';
import Login from '../pages/Login';
import Register from '../pages/Register';
import ProtectedPage from '../pages/ProtectedPage';

const AppRouter = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<PublicHome />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="protected" element={<ProtectedPage />} />
      </Route>
    </Routes>
  </BrowserRouter>
);

export default AppRouter;