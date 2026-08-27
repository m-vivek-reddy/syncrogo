import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Load pages only when the user navigates to them. This keeps map, chart, and
// admin-only dependencies out of the first page download.
const Splash = lazy(() => import("./pages/Splash"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const VerifyOTP = lazy(() => import("./pages/VerifyOTP"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Home = lazy(() => import("./pages/Home"));
const FindRide = lazy(() => import("./pages/FindRide"));
const OfferRide = lazy(() => import("./pages/OfferRide"));
const Messages = lazy(() => import("./pages/Messages"));
const Message = lazy(() => import("./pages/Message"));
const Profile = lazy(() => import("./pages/Profile"));
const AccountDetails = lazy(() => import("./pages/AccountDetails"));
const PaymentMethods = lazy(() => import("./pages/PaymentMethods"));
const Documents = lazy(() => import("./pages/Documents"));
const Trips = lazy(() => import("./pages/Trips"));
const EmergencyContacts = lazy(() => import("./pages/EmergencyContacts"));
const Settings = lazy(() => import("./pages/Settings"));
const RidePreferences = lazy(() => import("./pages/RidePreferences"));
const Notifications = lazy(() => import("./pages/Notifications"));
const HelpSupport = lazy(() => import("./pages/HelpSupport"));
const Vehicles = lazy(() => import("./pages/Vehicles"));
const RideNavigationPage = lazy(() => import("./pages/RideNavigationPage"));

// Layouts
import AppLayout from "./layouts/AppLayout";
import AdminLayout from "./layouts/AdminLayout";

// Guards
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import PageTitleTracker from "./components/PageTitleTracker";

// Admin
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminDrivers = lazy(() => import("./pages/AdminDrivers"));
const AdminSOS = lazy(() => import("./pages/AdminSOS"));
const AdminDocuments = lazy(() => import("./pages/AdminDocuments"));
const AdminPayments = lazy(() => import("./pages/AdminPayments"));
const AdminReports = lazy(() => import("./pages/AdminReports"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));

function App() {
  return (
    <BrowserRouter>
      <PageTitleTracker />
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading page...</div>}>
        <Routes>

        {/* ==================================================
            PUBLIC ROUTES
        ================================================== */}

        <Route path="/" element={<Splash />} />

        <Route path="/login" element={<Login />} />

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        <Route path="/reset-password" element={<ResetPassword />} />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/verify-email"
          element={<VerifyEmail />}
        />

        <Route
          path="/verify-otp"
          element={<VerifyOTP />}
        />

        {/* ==================================================
            FULL SCREEN RIDE NAVIGATION

            Deliberately outside AppLayout.
        ================================================== */}

        <Route element={<ProtectedRoute />}>
          <Route
            path="/ride/:bookingId"
            element={<RideNavigationPage />}
          />
        </Route>

        {/* ==================================================
            USER PROTECTED ROUTES
        ================================================== */}

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>

            <Route
              path="/home"
              element={<Home />}
            />

            <Route
              path="/find-ride"
              element={<FindRide />}
            />

            <Route
              path="/offer-ride"
              element={<OfferRide />}
            />

            <Route
              path="/messages"
              element={<Messages />}
            />

            <Route
              path="/message"
              element={<Message />}
            />

            <Route
              path="/profile"
              element={<Profile />}
            />

            <Route
              path="/account"
              element={<AccountDetails />}
            />

            <Route
              path="/payments"
              element={<PaymentMethods />}
            />

            <Route path="/vehicles" element={<Vehicles />} />

            <Route
              path="/documents"
              element={<Documents />}
            />

            <Route
              path="/trips"
              element={<Trips />}
            />

            <Route
              path="/emergency"
              element={<EmergencyContacts />}
            />

            <Route
              path="/settings"
              element={<Settings />}
            />

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

        {/* ==================================================
            ADMIN ROUTES
        ================================================== */}

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

        {/* ==================================================
            FALLBACK (404 NOT FOUND)
        ================================================== */}

        <Route
          path="*"
          element={<NotFound />}
        />

        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
