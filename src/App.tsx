import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastContainer } from '@/components/common/Toast';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';

// Auth Pages
import LoginPage from '@/pages/auth/LoginPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';

// Main Pages
import DashboardPage from '@/pages/dashboard/DashboardPage';
import CapitalPage from '@/pages/capital/CapitalPage';
import FundPage from '@/pages/fund/FundPage';
import ProductsPage from '@/pages/products/ProductsPage';
import CategoriesPage from '@/pages/categories/CategoriesPage';
import InventoryPage from '@/pages/inventory/InventoryPage';
import OrdersPage from '@/pages/orders/OrdersPage';
import RevenuePage from '@/pages/revenue/RevenuePage';
import ExpensesPage from '@/pages/expenses/ExpensesPage';
import MembersPage from '@/pages/members/MembersPage';
import ReportsPage from '@/pages/reports/ReportsPage';
import ActivityPage from '@/pages/activity/ActivityPage';
import SettingsPage from '@/pages/settings/SettingsPage';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <ToastContainer />
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

            {/* Protected App Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="capital" element={<CapitalPage />} />
              <Route path="fund" element={<FundPage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="revenue" element={<RevenuePage />} />
              <Route path="expenses" element={<ExpensesPage />} />
              <Route
                path="members"
                element={
                  <ProtectedRoute requiredRole={['admin']}>
                    <MembersPage />
                  </ProtectedRoute>
                }
              />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="activity" element={<ActivityPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
