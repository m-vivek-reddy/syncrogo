import { Mail, Phone, ShieldAlert, ChevronDown, HelpCircle } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import ProfileBackButton from "../components/profile/ProfileBackButton";

const supportEmail = "support@syncrogo.com";
const supportPhone = "+1-800-555-0199";

const FAQS = [
  {
    q: "How do I offer a ride?",
    a: "Switch to Driver mode from the top right toggle or click 'Offer a Ride' on your home screen. Fill in departure, destination, date/time, seat count, and fare per seat, then publish your ride.",
  },
  {
    q: "How does payment work?",
    a: "Passengers can pay securely online via Razorpay (UPI, Credit/Debit Cards, NetBanking) or cash once the ride is completed. Drivers receive their earnings upon completion.",
  },
  {
    q: "What is OTP verification for rides?",
    a: "When a driver picks up a passenger, the passenger shares their unique 6-digit ride start OTP with the driver. Once entered, the live trip is officially verified and begins.",
  },
  {
    q: "How does the SOS emergency system work?",
    a: "In case of danger or emergency, pressing the SOS button sends your live coordinates to your emergency contacts and our 24/7 safety response team.",
  },
];

export default function HelpSupport() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="mx-auto max-w-xl pb-16">
        <ProfileBackButton />

        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Help & Support</h1>
          <p className="mt-1 text-slate-500 text-sm">We are here to help you 24/7 with rides, accounts, and safety.</p>
        </div>

        {/* Contact Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Email Support */}
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <Mail size={20} />
              </div>
              <h2 className="text-base font-bold text-slate-800">Email Support</h2>
              <p className="mt-1 text-xs text-slate-500">Replies usually within 2 hours.</p>
            </div>
            <a
              href={`mailto:${supportEmail}`}
              className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
            >
              <Mail size={14} />
              {supportEmail}
            </a>
          </div>

          {/* Phone Support */}
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <Phone size={20} />
              </div>
              <h2 className="text-base font-bold text-slate-800">Phone Support</h2>
              <p className="mt-1 text-xs text-slate-500">Toll-free customer helpline.</p>
            </div>
            <a
              href={`tel:${supportPhone}`}
              className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
            >
              <Phone size={14} />
              {supportPhone}
            </a>
          </div>
        </div>

        {/* Emergency Assistance Notice */}
        <div className="rounded-2xl bg-red-50 border border-red-100 p-5 mb-6 flex items-start gap-3.5">
          <div className="p-2 rounded-xl bg-red-100 text-red-600 mt-0.5">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h3 className="font-bold text-red-900 text-sm">Emergency During a Ride?</h3>
            <p className="mt-1 text-xs text-red-700 leading-relaxed">
              If you feel unsafe or in danger, use the Emergency SOS button immediately or notify local emergency services (112/911).
            </p>
            <Link
              to="/emergency"
              className="mt-2 inline-block text-xs font-bold text-red-800 hover:underline"
            >
              Manage Emergency Contacts →
            </Link>
          </div>
        </div>

        {/* FAQ Accordion */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle size={20} className="text-slate-700" />
            <h2 className="text-base font-bold text-slate-800">Frequently Asked Questions</h2>
          </div>

          <div className="divide-y divide-slate-100">
            {FAQS.map((faq, idx) => (
              <div key={idx} className="py-3">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between text-left font-semibold text-sm text-slate-800 hover:text-indigo-600 transition-colors gap-2"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    size={16}
                    className={`transform transition-transform text-slate-400 ${openFaq === idx ? "rotate-180" : ""}`}
                  />
                </button>
                {openFaq === idx && (
                  <p className="mt-2 text-xs text-slate-500 leading-relaxed pl-1">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Copyright Year Footer */}
        <div className="text-center mt-8 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} SyncroGo Technologies Inc. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
