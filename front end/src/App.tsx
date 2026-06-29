import { BrowserRouter } from 'react-router-dom';
import AppRouter from './router';

/** 应用入口组件，负责挂载前端路由。 */
export default function App() {
    return (
        <BrowserRouter>
            <AppRouter />
        </BrowserRouter>
    );
}
