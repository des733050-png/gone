import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '@/style/global.css'
import router from '@/routes/AppRoutes'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { CartProvider } from '@/context/CartContext'
import { ThemeProvider } from '@/context/ThemeContext'


createRoot(document.getElementById('root')).render(
  <ThemeProvider>
    <CartProvider>
      <RouterProvider router={router} />
    </CartProvider>
  </ThemeProvider>
);
