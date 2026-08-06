// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ListingDetailPage from './pages/ListingDetailPage';
import WalletPage from './pages/WalletPage';
import AdminPage from './pages/AdminPage';
import CreateListingPage from './pages/CreateListingPage';
import ProfilePage from './pages/ProfilePage';
import CartPage from './pages/CartPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Navbar />
        <Routes>
          <Route path="/"               element={<HomePage />} />
          <Route path="/login"          element={<LoginPage />} />
          <Route path="/register"       element={<RegisterPage />} />
          <Route path="/listings/:id"   element={<ListingDetailPage />} />
          <Route path="/create-listing" element={<CreateListingPage />} />
          <Route path="/wallet"         element={<WalletPage />} />
          <Route path="/admin"          element={<AdminPage />} />
          <Route path="/profile"        element={<ProfilePage />} />
          <Route path="/cart"           element={<CartPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
