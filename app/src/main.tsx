import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import Root from './Root';

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';
const router = createBrowserRouter([{ path: '*', element: <Root /> }], { basename });
createRoot(document.getElementById('root')!).render(<RouterProvider router={router} />);
