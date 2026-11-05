import React, { useState, useEffect } from 'react';
import { X, Car, Bike, AlertTriangle, HelpCircle, Calendar, MessageSquare, ShieldAlert, ShieldCheck, PlusCircle } from 'lucide-react';
import type { CommunityGroup, PostType, VehicleType, RouteDetail } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (postData: any) => void;
  groups?: CommunityGroup[];
  initialPostType?: PostType;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  groups = [],
  initialPostType = 'general',
}) => {
  const { currentUser, openAuth } = useAuth();
  const [postType, setPostType] = useState<PostType>(initialPostType);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [groupName, setGroupName] = useState('');
  const [submitError, setSubmitError] = useState('');

  // Specific ride fields
  const [fromLoc, setFromLoc] = useState('');
  const [toLoc, setToLoc] = useState('');
  const [rideDate, setRideDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [rideTime, setRideTime] = useState('09:00');
  const [vehicleType, setVehicleType] = useState<VehicleType>('car');
  const [seats, setSeats] = useState(2);
  const [price, setPrice] = useState(50);
  const [preferences, setPreferences] = useState('Non-smoking • Polite commuters');

  useEffect(() => {
    if (isOpen && initialPostType) {
      setPostType(initialPostType);
      setSubmitError('');
    }
  }, [isOpen, initialPostType]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    let routeInfo: RouteDetail | undefined = undefined;
    if (postType === 'ride_offer' || postType === 'ride_request') {
      routeInfo = {
        from: fromLoc || 'Pickup Location',
        to: toLoc || 'Destination Point',
        date: rideDate,
        time: rideTime,
        vehicle_type: vehicleType,
        seats,
        price,
        preferences,
      };
    }

    setSubmitError('');
    try {
      await onSubmit({
        title,
        content,
        groupName,
        postType,
        routeInfo,
        isVerified: currentUser?.is_verified ?? false,
        verificationStatus: (postType === 'ride_offer' && !currentUser?.is_verified) ? 'pending' : 'approved',
      });
    } catch {
      setSubmitError('Your post could not be published. Please try again.');
      return;
    }

    // Reset
    setTitle('');
    setContent('');
    onClose();
  };

  const postTypes = [
    { type: 'general', label: 'General Post', icon: MessageSquare },
    { type: 'ride_offer', label: 'Ride Offer', icon: Car },
    { type: 'ride_request', label: 'Ride Request', icon: Bike },
    { type: 'traffic', label: 'Traffic Update', icon: AlertTriangle },
    { type: 'safety', label: 'Safety Alert', icon: ShieldAlert },
    { type: 'question', label: 'Question', icon: HelpCircle },
    { type: 'event', label: 'Event', icon: Calendar },
  ];

  const isRideType = postType === 'ride_offer' || postType === 'ride_request';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className={`relative w-full ${isRideType ? 'max-w-xl' : 'max-w-lg'} max-h-[90vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden transition-all duration-200 animate-slide-up`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Strip */}
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-green-500 to-blue-500" />

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-green-600">SyncroGo Community Hub</span>
            <h3 className="text-xl font-black text-navy-800 font-display">Create Community Post</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5">
          {/* Post Type Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Select Category</label>
            <div className="flex flex-wrap gap-1.5">
              {postTypes.map((pt) => {
                const Icon = pt.icon;
                const active = postType === pt.type;
                return (
                  <button
                    key={pt.type}
                    type="button"
                    onClick={() => setPostType(pt.type as PostType)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                      active
                        ? 'bg-green-600 text-white shadow-sm ring-2 ring-green-600/20'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{pt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Driver Verification Notice for Ride Offers */}
          {postType === 'ride_offer' && (
            <div>
              {currentUser?.is_verified ? (
                <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-green-50 border border-green-200 text-green-800 text-xs font-semibold">
                  <ShieldCheck className="w-4.5 h-4.5 text-green-600 shrink-0" />
                  <span>Verified Driver Account — Your ride offer will display the verified driver badge in the community feed.</span>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-bold text-amber-900">
                      <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                      Driver Verification Required
                    </span>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-200/80 text-amber-900">
                      Pending Review
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    SyncroGo safety policy requires driver verification (DL / RC document approval) to offer rides. Ride offers posted by unverified accounts will display a <strong>"Pending Verification"</strong> status until verified by backend moderation.
                  </p>
                  {!currentUser ? (
                    <button
                      type="button"
                      onClick={() => openAuth('login', '/community')}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition-colors"
                    >
                      Log in to Verify Account
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] text-amber-900 font-semibold">Status: Unverified driver profile (will submit for review)</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Target Group */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Post to Group (Optional)</label>
            <select
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
            >
              <option value="">Select a community group</option>
              {groups.map((group) => <option key={group.id} value={group.name}>{group.name}</option>)}
            </select>
          </div>

          {/* Conditional Ride Specific Inputs */}
          {isRideType && (
            <div className="p-4 rounded-2xl bg-green-50/60 border border-green-200 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-green-900 uppercase tracking-wider">
                  {postType === 'ride_offer' ? 'Ride Offer Route Details' : 'Ride Request Route Details'}
                </span>
                <div className="flex gap-1 bg-white p-1 rounded-xl border border-green-200">
                  <button
                    type="button"
                    onClick={() => setVehicleType('car')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg ${vehicleType === 'car' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
                  >
                    Car
                  </button>
                  <button
                    type="button"
                    onClick={() => setVehicleType('bike')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg ${vehicleType === 'bike' ? 'bg-green-600 text-white' : 'text-slate-600'}`}
                  >
                    Bike
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Starting Point</label>
                  <input
                    type="text"
                    required
                    value={fromLoc}
                    onChange={(e) => setFromLoc(e.target.value)}
                    placeholder="e.g. Kondapur Signal"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Destination</label>
                  <input
                    type="text"
                    required
                    value={toLoc}
                    onChange={(e) => setToLoc(e.target.value)}
                    placeholder="e.g. HITEC City Cyber Towers"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Time</label>
                  <input
                    type="time"
                    value={rideTime}
                    onChange={(e) => setRideTime(e.target.value)}
                    className="w-full px-2 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Seats</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={seats}
                    onChange={(e) => setSeats(Number(e.target.value))}
                    className="w-full px-2 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Share (₹)</label>
                  <input
                    type="number"
                    min={10}
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full px-2 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-navy-800"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Headline / Title (Optional)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Morning commute heads up / Looking for co-riders"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Post Content / Details</label>
            <textarea
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your update, transit question, or route request..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 leading-relaxed"
            />
          </div>

          {/* Community Notice */}
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
            <strong>Community Notice:</strong> Keep discussions polite and focused on shared commuting. Never share sensitive OTPs or private banking data publicly.
          </div>

          {/* Submit Buttons */}
          {submitError && <p role="alert" className="text-xs font-semibold text-red-600">{submitError}</p>}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 hover:shadow-lg"
              style={{ background: 'linear-gradient(100deg,#087ee9,#08aa68)', boxShadow: '0 4px 14px rgba(7,126,233,0.28)' }}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Publish to Community</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
