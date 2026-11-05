import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users,
  Search,
  PlusCircle,
  Flame,
  MapPin,
  Sparkles,
  MessageSquare,
  Car,
  Bike,
  AlertTriangle,
} from 'lucide-react';
import { communityService } from '../api/communityService';
import { CommunityPostCard } from '../components/community/CommunityPostCard';
import { CommunityProfileCard } from '../components/community/CommunityProfileCard';
import { CreatePostModal } from '../components/community/CreatePostModal';
import { EditProfileModal } from '../components/community/EditProfileModal';
import type { CommunityPost, CommunityGroup, CommunityBadge, PostType } from '../types';
import { useAuth } from '../context/AuthContext';

export const CommunityPage: React.FC = () => {
  const { currentUser, updateCurrentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'for_you';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [badges, setBadges] = useState<CommunityBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const searchQueryRef = useRef(searchQuery);
  searchQueryRef.current = searchQuery;
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalPostType, setCreateModalPostType] = useState<PostType>('general');
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [groupError, setGroupError] = useState('');

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  const handleTabChange = (tabKey: string) => {
    setActiveTab(tabKey);
    setSearchParams({ tab: tabKey });
  };

  const handleOpenCreateModal = (type: PostType = 'general') => {
    setCreateModalPostType(type);
    setIsCreateModalOpen(true);
  };

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const fetchedPosts = await communityService.getPosts(activeTab, searchQueryRef.current);
      setPosts(fetchedPosts);
      setGroups(await communityService.getGroups());
      setBadges(communityService.getBadges());
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const refreshPosts = (event: StorageEvent) => {
      if (event.key === 'syncrogo_community_posts_v1') void loadData(false);
    };
    window.addEventListener('storage', refreshPosts);
    const refreshTimer = window.setInterval(() => { void loadData(false); }, 15000);
    return () => {
      window.removeEventListener('storage', refreshPosts);
      window.clearInterval(refreshTimer);
    };
  }, [loadData]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleLikePost = (postId: string) => {
    const updated = communityService.toggleLikePost(postId);
    setPosts(updated);
  };

  const handleSavePost = (postId: string) => {
    const updated = communityService.toggleSavePost(postId);
    setPosts(updated);
  };

  const handleAddComment = (postId: string, text: string) => {
    const updated = communityService.addComment(postId, text);
    setPosts(updated);
  };

  const handleCreatePost = async (postData: any) => {
    await communityService.createPost(postData);
    loadData();
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setGroupError('');
    try {
      await communityService.createGroup(newGroupName, newGroupDescription);
      setNewGroupName('');
      setNewGroupDescription('');
      setShowCreateGroup(false);
      setGroups(await communityService.getGroups());
    } catch (error: any) {
      setGroupError(error.response?.data?.detail || 'Could not create the group. Please try again.');
    }
  };

  const handleToggleGroup = async (group: CommunityGroup) => {
    setGroupError('');
    try {
      await communityService.toggleGroupMembership(group.id, Boolean(group.isJoined));
      setGroups(await communityService.getGroups());
    } catch {
      setGroupError('Could not update group membership. Please try again.');
    }
  };

  const categoryActions = [
    { label: 'General Post', type: 'general' as PostType, icon: MessageSquare, color: 'text-blue-600 bg-blue-50 border-blue-100 hover:bg-blue-100' },
    { label: 'Offer Ride', type: 'ride_offer' as PostType, icon: Car, color: 'text-green-700 bg-green-50 border-green-100 hover:bg-green-100' },
    { label: 'Request Ride', type: 'ride_request' as PostType, icon: Bike, color: 'text-green-700 bg-green-50 border-green-100 hover:bg-green-100' },
    { label: 'Traffic Update', type: 'traffic' as PostType, icon: AlertTriangle, color: 'text-amber-700 bg-amber-50 border-amber-100 hover:bg-amber-100' },
  ];

  return (
    <div className="sg-community-page bg-slate-50 min-h-screen py-6">
      <div className="sg-community-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Dedicated Community Hero */}
        <div className="community-hero relative rounded-3xl bg-gradient-to-r from-navy-950 via-slate-900 to-brand-950 p-8 sm:p-12 text-white border border-slate-800 shadow-xl mb-6 overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 text-xs font-bold uppercase tracking-wider mb-4 border border-brand-500/30">
              <Users className="w-3.5 h-3.5" />
              <span>Shared mobility community</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-display tracking-tight leading-tight">
              More Than a Ride. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-blue-200 to-green-400">
                We're a Community.
              </span>
            </h1>

            <p className="mt-3 text-slate-300 text-sm sm:text-base leading-relaxed">
              Connect with people who travel your way. Share route updates, organize weekday carpools, and discover co-travelers from your community.
            </p>
          </div>
        </div>

        {/* Top Controls */}
        <div className="community-controls bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/90 shadow-soft mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search community posts, routes, or tips..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
            />
          </form>

          {/* Action Button */}
          <button
            onClick={() => handleOpenCreateModal('general')}
            className="w-full md:w-auto px-6 py-3 rounded-2xl text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 hover:shadow-lg"
            style={{ background: 'linear-gradient(100deg,#087ee9,#08aa68)', boxShadow: '0 4px 14px rgba(7,126,233,0.28)' }}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Post</span>
          </button>
        </div>

        {/* Backend status banner */}
        <div className="mb-6 px-4 py-2.5 rounded-2xl bg-blue-50/70 border border-blue-200/60 text-xs text-blue-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <span>Community posts are shared through the SyncroGo backend.</span>
          </div>
          <span className="text-[11px] font-semibold text-blue-700">Privacy first</span>
        </div>

        {/* Main Grid: Feed + Sidebar */}
        <div className="sg-community-layout grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

          <aside className="sg-community-left lg:col-span-2 space-y-5">
            <div className="sg-community-nav rounded-2xl border border-slate-200 bg-white p-3 shadow-soft">
              <div className="sg-community-mark"><img src="/community-mark.png" alt="Community" /></div>
              <h2 className="px-2 pb-3 text-sm font-extrabold text-navy-950">Community</h2>
              {[
                ['Home', 'for_you'], ['Nearby', 'nearby'], ['My Groups', 'my_groups'], ['Trending', 'trending'],
              ].map(([label, tab]) => <button key={tab} onClick={() => handleTabChange(tab)} className={`w-full rounded-lg px-2.5 py-2 text-left text-xs font-semibold ${activeTab === tab ? 'active' : ''}`}>{label}</button>)}
              <div className="my-3 border-t border-slate-100" />
              <h3 className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Create Post</h3>
              {[
                { label: 'General Post', type: 'general' },
                { label: 'Offer a Ride', type: 'ride_offer' },
                { label: 'Request a Ride', type: 'ride_request' },
                { label: 'Traffic Update', type: 'traffic' },
                { label: 'Safety Alert', type: 'safety' },
                { label: 'Question', type: 'question' },
                { label: 'Event', type: 'event' },
              ].map(({ label, type }) => (
                <button
                  key={label}
                  onClick={() => handleOpenCreateModal(type as PostType)}
                  className="w-full rounded-lg px-2.5 py-1.5 text-left text-[11px] text-slate-600 hover:bg-slate-50 font-medium"
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="sg-community-groups rounded-2xl border border-slate-200 bg-white p-3 shadow-soft">
              <div className="flex items-center justify-between px-2 pb-3">
                <h3 className="text-xs font-extrabold text-navy-950">Community Groups</h3>
                {currentUser?.role?.toLowerCase() === 'admin' && <button type="button" onClick={() => setShowCreateGroup((show) => !show)} className="text-[9px] font-bold text-green-700">{showCreateGroup ? 'Cancel' : '+ Create'}</button>}
              </div>
              {showCreateGroup && currentUser?.role?.toLowerCase() === 'admin' && (
                <form onSubmit={handleCreateGroup} className="mb-2 space-y-2">
                  <input required minLength={2} maxLength={120} value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Group name" className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[10px]" />
                  <input maxLength={1000} value={newGroupDescription} onChange={(e) => setNewGroupDescription(e.target.value)} placeholder="Description (optional)" className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[10px]" />
                  <button type="submit" className="w-full rounded-lg bg-green-600 px-2 py-1.5 text-[10px] font-bold text-white">Create group</button>
                </form>
              )}
              {groupError && <p role="alert" className="px-1 pb-2 text-[10px] text-red-600">{groupError}</p>}
              {groups.length === 0 && <p className="px-1 py-2 text-[10px] text-slate-400">No community groups yet.</p>}
              {groups.map((group) => <div key={group.id} className="flex items-center gap-2 rounded-lg px-1 py-2">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-green-100 text-green-800"><Users className="h-3.5 w-3.5" /></span>
                <span className="min-w-0 flex-1"><b className="block truncate text-[10px] text-slate-800">{group.name}</b><small className="text-[9px] text-slate-400">{group.memberCount.toLocaleString()} members</small></span>
                <button type="button" onClick={() => void handleToggleGroup(group)} className="text-[9px] font-bold text-green-700">{group.isJoined ? 'Joined' : 'Join'}</button>
              </div>)}
              <img className="sg-community-travel" src="/community-travel.png.avif" alt="People sharing journeys" />
            </div>
          </aside>

          {/* Main Feed Column (7 cols) */}
          <div className="sg-community-feed lg:col-span-7 space-y-5">

            {/* Inline Center Create-Post Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-card space-y-3">
              <div className="flex items-center gap-3">
                {currentUser?.profile_photo ? (
                  <img src={currentUser.profile_photo} alt={currentUser.name || 'You'} className="w-10 h-10 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <button
                  onClick={() => handleOpenCreateModal('general')}
                  className="flex-1 text-left px-4 py-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-xs sm:text-sm text-slate-400 font-medium transition-colors"
                >
                  Share an update, offer a ride, or ask the community...
                </button>
              </div>

              {/* Quick action buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
                {categoryActions.map(({ label, type, icon: Icon, color }) => (
                  <button
                    key={type}
                    onClick={() => handleOpenCreateModal(type)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${color}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-white p-1.5 rounded-2xl shadow-sm gap-1 overflow-x-auto">
              {[
                { id: 'for_you', label: 'For You', icon: Sparkles },
                { id: 'nearby', label: 'Nearby Routes', icon: MapPin },
                { id: 'my_groups', label: 'My Groups', icon: Users },
                { id: 'trending', label: 'Trending', icon: Flame },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${active
                        ? 'bg-green-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-navy-950 hover:bg-slate-50'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Posts List */}
            {loading ? (
              <div className="py-20 text-center bg-white rounded-3xl border border-slate-200">
                <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-600">Loading community discussions...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
                <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h4 className="text-base font-bold text-navy-950 mb-1">{searchQuery ? 'No posts match your search' : 'No community posts yet'}</h4>
                <p className="text-xs text-slate-500 mb-4">Create a post to start the conversation. New posts from the community will appear here.</p>
                <button
                  onClick={() => handleOpenCreateModal('general')}
                  className="px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-bold"
                >
                  Create Post
                </button>
              </div>
            ) : (
              posts.map((post) => (
                <CommunityPostCard
                  key={post.id}
                  post={post}
                  onLike={handleLikePost}
                  onSave={handleSavePost}
                  onAddComment={handleAddComment}
                />
              ))
            )}
          </div>

          {/* Right Sidebar Column (3 cols) */}
          <aside className="sg-community-side lg:col-span-3 space-y-5">
            <CommunityProfileCard
              user={currentUser}
              badges={badges}
              onOpenEdit={() => setIsEditProfileOpen(true)}
              onOpenReport={() => setShowReportDialog(true)}
            />
          </aside>

        </div>

      </div>

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreatePost}
        groups={groups}
        initialPostType={createModalPostType}
      />

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        user={currentUser}
        onClose={() => setIsEditProfileOpen(false)}
        onSaved={(user) => updateCurrentUser(user)}
      />

      {/* Report Problem Dialog */}
      {showReportDialog && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-navy-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto border border-slate-200 shadow-2xl animate-slide-up">
            <h3 className="text-lg font-bold text-navy-950 font-display mb-2">Report a Problem</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Help us maintain a safe community. Our moderation team reviews every report within 1 hour.
            </p>
            {reportSuccess ? (
              <div className="p-4 rounded-xl bg-green-50 text-green-800 text-xs font-semibold mb-4">
                Thank you. Your report has been dispatched to SyncroGo Community Safety.
              </div>
            ) : (
              <div className="space-y-3 mb-4">
                <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <option>Suspicious or deceptive behavior</option>
                  <option>Unsafe driving or behavior</option>
                  <option>Harassment or offensive language</option>
                  <option>Spam or commercial advertisement</option>
                  <option>Other issue</option>
                </select>
                <textarea
                  rows={3}
                  placeholder="Additional details..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowReportDialog(false); setReportSuccess(false); }}
                className="flex-1 sm:flex-none px-4 py-3 sm:py-2 text-xs font-bold text-slate-600 rounded-xl sm:rounded-none border border-slate-200 sm:border-0 sm:bg-transparent"
              >
                Close
              </button>
              {!reportSuccess && (
                <button
                  onClick={() => setReportSuccess(true)}
                  className="flex-1 sm:flex-none px-4 py-3 sm:py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl sm:rounded-none text-xs font-bold"
                >
                  Submit Report
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CommunityPage;
