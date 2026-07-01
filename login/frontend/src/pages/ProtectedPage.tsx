import { useAuth } from '../store/useAuth';
import { Navigate } from 'react-router-dom';

const ProtectedPage = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div>
      <h2>欢迎，{user.displayName}</h2>
      <p>这是需要登录才能访问的核心功能页面。</p>
    </div>
  );
};

export default ProtectedPage;