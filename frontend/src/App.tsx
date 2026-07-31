import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Splash from './pages/Splash';
import AppLayout from './layouts/AppLayout';
import Home from './pages/Home';
import FindRide from './pages/FindRide';
import OfferRide from './pages/OfferRide';
import Messages from './pages/Messages';
import Profile from './pages/Profile';
import AccountDetails from './pages/AccountDetails';
import PaymentMethods from './pages/PaymentMethods';
import Documents from './pages/Documents';
import Trips from './pages/Trips';    
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import VerifyOTP from './pages/VerifyOTP'; 
// 🗑️ Removed the duplicate lowercase 'message' import!
import Message from './pages/Message';
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
    <Routes>

    {/* Public Routes */}
    <Route path="/" element={<Splash />} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/verify-email" element={<VerifyEmail />} />
    <Route path="/verify-otp" element={<VerifyOTP />} />

    {/* Protected Routes */}
    <Route element={<ProtectedRoute />}>
      <Route element={<AppLayout />}>
        <Route path="/home" element={<Home />} />
        <Route path="/find-ride" element={<FindRide />} />
        <Route path="/offer-ride" element={<OfferRide />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/message" element={<Message />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/account" element={<AccountDetails />} />
        <Route path="/payments" element={<PaymentMethods />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/trips" element={<Trips />} />
      </Route>
    </Route>

  </Routes>
</BrowserRouter>
  );
}

export default App;