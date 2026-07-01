// frontend/src/App.tsx
import { AuthProvider } from './store/AuthContext';
import AppRouter from './router';

const App = () => (
  <AuthProvider>
    <AppRouter />
  </AuthProvider>
);
export default App;