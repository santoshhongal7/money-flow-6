import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { router } from './router';
import { useAuthInit } from './hooks/useAuth';

function AuthInitializer() {
  useAuthInit();
  return null;
}

export default function App() {
  return (
    <>
      <AuthInitializer />
      <RouterProvider router={router} />
      <Toaster position="top-center" richColors closeButton />
    </>
  );
}
