import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './index.css';
import { Layout } from './components/layout/Layout';
import HomePage from './pages/HomePage';
import FindRidePage from './pages/FindRidePage';
import CommunityPage from './pages/CommunityPage';
import OfferRidePage from './pages/OfferRidePage';
import DriverDocumentsPage from './pages/DriverDocumentsPage';
import ProductPage from './pages/ProductPages';
import { ConsentSettingsPage } from './pages/ConsentSettingsPage';
import { ContactPage, LegalPage } from './pages/LegalPage';
import { COOKIE_POLICY, PRIVACY, TERMS } from './legal/legalContent';
import { AuthProvider } from './context/AuthContext';
import { CommunityAuthGuard } from './components/community/CommunityAuthGuard';

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <Layout>
        <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/find-ride" element={<FindRidePage />} />
        <Route path="/offer-ride" element={<OfferRidePage />} />
        <Route path="/driver-documents" element={<CommunityAuthGuard><DriverDocumentsPage /></CommunityAuthGuard>} />
        <Route path="/community" element={<CommunityAuthGuard><CommunityPage /></CommunityAuthGuard>} />
        <Route path="/how-it-works" element={<ProductPage kind="how" />} />
        <Route path="/safety" element={<ProductPage kind="safety" />} />
        <Route path="/about" element={<ProductPage kind="about" />} />
        <Route path="/help" element={<ProductPage kind="help" />} />
        <Route path="/terms" element={<LegalPage doc={TERMS} />} />
        <Route path="/privacy" element={<LegalPage doc={PRIVACY} />} />
        <Route path="/cookies" element={<LegalPage doc={COOKIE_POLICY} />} />
        <Route path="/consent" element={<ConsentSettingsPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="*" element={<HomePage />} />
        </Routes>
      </Layout>
    </AuthProvider>
  </BrowserRouter>
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
