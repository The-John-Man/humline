import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import Root from './Root';
const router = createBrowserRouter([{ path: '*', element: <Root /> }]);
createRoot(document.getElementById('root')!).render(<RouterProvider router={router} />);
