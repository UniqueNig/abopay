import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Deposit from "./pages/Deposit";
import Transfer from "./pages/Transfer";
import Bills from "./pages/Bills";
import Recharge from "./pages/Recharge";
import Savings from "./pages/Savings";
import Settings from "./pages/Settings";
import Kyc from "./pages/Kyc";
import SetPin from "./pages/SetPin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminUserDetail from "./pages/admin/AdminUserDetail";
import AdminTransactions from "./pages/admin/AdminTransactions";
import AdminAdmins from "./pages/admin/AdminAdmins";
import AdminLoginLogs from "./pages/admin/AdminLoginLogs";
import AdminVtuTransactions from "./pages/admin/AdminVtuTransactions";
import AdminAccountDeletions from "./pages/admin/AdminAccountDeletions";
import AdminDisputes from "./pages/admin/AdminDisputes";
import AdminKyc from "./pages/admin/AdminKyc";
import AdminPinRequests from "./pages/admin/AdminPinRequests";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
          <Route path="/deposit" element={<ProtectedRoute><Deposit /></ProtectedRoute>} />
          <Route path="/transfer" element={<ProtectedRoute><Transfer /></ProtectedRoute>} />
          <Route path="/bills" element={<ProtectedRoute><Bills /></ProtectedRoute>} />
          <Route path="/recharge" element={<ProtectedRoute><Recharge /></ProtectedRoute>} />
          <Route path="/savings" element={<ProtectedRoute><Savings /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/kyc" element={<ProtectedRoute><Kyc /></ProtectedRoute>} />
          <Route path="/set-pin" element={<ProtectedRoute><SetPin /></ProtectedRoute>} />

          {/* Admin routes — require the `admin` custom claim on the Firebase ID token */}
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
          <Route path="/admin/users/:uid" element={<AdminRoute><AdminUserDetail /></AdminRoute>} />
          <Route path="/admin/transactions" element={<AdminRoute><AdminTransactions /></AdminRoute>} />
          <Route path="/admin/admins" element={<AdminRoute><AdminAdmins /></AdminRoute>} />
          <Route path="/admin/login-logs" element={<AdminRoute><AdminLoginLogs /></AdminRoute>} />
          <Route path="/admin/vtu-transactions" element={<AdminRoute><AdminVtuTransactions /></AdminRoute>} />
          <Route path="/admin/account-deletions" element={<AdminRoute><AdminAccountDeletions /></AdminRoute>} />
          <Route path="/admin/disputes" element={<AdminRoute><AdminDisputes /></AdminRoute>} />
          <Route path="/admin/kyc" element={<AdminRoute><AdminKyc /></AdminRoute>} />
          <Route path="/admin/pin-requests" element={<AdminRoute><AdminPinRequests /></AdminRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
