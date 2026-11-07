import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, RequireRole } from './auth/AuthProvider';
import { LoginPage } from './auth/LoginPage';
import { CartProvider } from './cart/CartProvider';
import { CustomerLayout } from './layouts/CustomerLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { KitchenLayout } from './layouts/KitchenLayout';
import { Home } from './pages/customer/Home';
import { Menu } from './pages/customer/Menu';
import { ProductDetail } from './pages/customer/ProductDetail';
import { Cart } from './pages/customer/Cart';
import { Checkout } from './pages/customer/Checkout';
import { OrderStatusPage, OrderIndex } from './pages/customer/OrderStatus';
import { Dashboard } from './pages/admin/Dashboard';
import { POS } from './pages/admin/POS';
import { Orders } from './pages/admin/Orders';
import { Products } from './pages/admin/Products';
import { Tables } from './pages/admin/Tables';
import { Inventory } from './pages/admin/Inventory';
import { Reports } from './pages/admin/Reports';
import { Settings } from './pages/admin/Settings';
import { Placeholder } from './pages/admin/Placeholder';
import { Board } from './pages/kitchen/Board';
import { NotFound } from './pages/NotFound';

export function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || undefined}>
      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route element={<CustomerLayout />}>
              <Route index element={<Home />} />
              <Route path="menu" element={<Menu />} />
              <Route path="product/:id" element={<ProductDetail />} />
              <Route path="cart" element={<Cart />} />
              <Route path="checkout" element={<Checkout />} />
              <Route path="order" element={<OrderIndex />} />
              <Route path="order/:id" element={<OrderStatusPage />} />
            </Route>

            <Route path="login" element={<LoginPage />} />

            <Route path="admin" element={<RequireRole roles={['owner', 'staff']}><AdminLayout /></RequireRole>}>
              <Route index element={<Dashboard />} />
              <Route path="pos" element={<POS />} />
              <Route path="orders" element={<Orders />} />
              <Route path="products" element={<Products />} />
              <Route path="tables" element={<Tables />} />
              <Route path="inventory" element={<RequireRole roles={['owner']}><Inventory /></RequireRole>} />
              <Route path="promotions" element={<RequireRole roles={['owner']}><Placeholder title="โปรโมชัน" phase="V2 (หลัง V1)" /></RequireRole>} />
              <Route path="reports" element={<RequireRole roles={['owner']}><Reports /></RequireRole>} />
              <Route path="settings" element={<RequireRole roles={['owner']}><Settings /></RequireRole>} />
            </Route>

            <Route path="kitchen" element={<RequireRole roles={['owner', 'staff', 'kitchen']}><KitchenLayout /></RequireRole>}>
              <Route index element={<Board />} />
            </Route>

            <Route path="home" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
