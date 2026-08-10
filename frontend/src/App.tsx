import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Splash from './pages/Splash';
import AppLayout from './layouts/AppLayout';
import RidePreferences from "./pages/RidePreferences";
import Notifications from "./pages/Notifications";
import HelpSupport from "./pages/HelpSupport";
import Home from './pages/Home';
import FindRide from './pages/FindRide';
import OfferRide from './pages/OfferRide';
import Messages from './pages/Messages';
import Message from './pages/Message';
import Profile from './pages/Profile';
import AccountDetails from './pages/AccountDetails';
import PaymentMethods from './pages/PaymentMethods';
import Documents from './pages/Documents';
import Trips from './pages/Trips';
import EmergencyContacts from './pages/EmergencyContacts';
import Settings from './pages/Settings';

import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import VerifyOTP from './pages/VerifyOTP';


import ProtectedRoute from "./components/ProtectedRoute";


import AdminDashboard from "./pages/AdminDashboard";
import AdminRoute from "./components/AdminRoute";
import AdminUsers from "./pages/AdminUsers";
import AdminDrivers from "./pages/AdminDrivers";
import AdminSOS from "./pages/AdminSOS";
import AdminDocuments from "./pages/AdminDocuments";
import AdminLayout from "./layouts/AdminLayout";
import AdminPayments from "./pages/AdminPayments";
import AdminReports from "./pages/AdminReports";
import AdminSettings from "./pages/AdminSettings";


function App() {

  return (

    <BrowserRouter>

 <Routes>

  {/* Public */}
  <Route path="/" element={<Splash />} />
  <Route path="/login" element={<Login />} />
  <Route path="/register" element={<Register />} />
  <Route path="/verify-email" element={<VerifyEmail />} />
  <Route path="/verify-otp" element={<VerifyOTP />} />


  {/* User Protected */}
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

      <Route path="/emergency" element={<EmergencyContacts />} />

      <Route path="/settings" element={<Settings />} />
<Route
  path="/preferences"
  element={<RidePreferences />}
/>

<Route
  path="/notifications"
  element={<Notifications />}
/>

<Route
  path="/support"
  element={<HelpSupport />}
/>
    </Route>

  </Route>



  {/* Admin Protected */}
  <Route element={<ProtectedRoute />}>

    <Route element={<AdminRoute />}>

      <Route element={<AdminLayout />}>

        <Route
          path="/admin"
          element={<AdminDashboard />}
        />

        <Route
          path="/admin/users"
          element={<AdminUsers />}
        />

        <Route
          path="/admin/drivers"
          element={<AdminDrivers />}
        />

        <Route
          path="/admin/documents"
          element={<AdminDocuments />}
        />

        <Route
          path="/admin/sos"
          element={<AdminSOS />}
        />

        <Route
  path="/admin/payments"
  element={<AdminPayments />}
/>

        <Route
          path="/admin/reports"
          element={<AdminReports />}
        />

        <Route
          path="/admin/settings"
          element={<AdminSettings />}
        />

      </Route>

    </Route>

  </Route>


</Routes>

    </BrowserRouter>

  );
}

export default App;