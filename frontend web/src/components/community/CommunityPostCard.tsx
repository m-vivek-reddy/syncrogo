import React, { useState } from 'react';
import {
  Heart,
  MessageSquare,
  Share2,
  Bookmark,
  Flag,
  ShieldCheck,
  MapPin,
  Clock,
  Car,
  Bike,
  ArrowRight,
  Check,
  Send,
} from 'lucide-react';
import type { CommunityPost } from '../../types';

interface CommunityPostCardProps {
  post: CommunityPost;
  onLike: (id: string) => void;
  onSave: (id: string) => void;
  onAddComment: (postId: string, text: string) => void;
  onJoinRide?: (routeInfo: any) => void;
}

export const CommunityPostCard: React.FC<CommunityPostCardProps> = ({
  post,
  onLike,
  onSave,
  onAddComment,
  onJoinRide,
}) => {
  const [showComments, setShowComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [copiedShare, setCopiedShare] = useState(false);
  const [hasReported, setHasReported] = useState(false);

  const handleShare = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    onAddComment(post.id, newCommentText.trim());
    setNewCommentText('');
    setShowComments(true);
  };

  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - new Date(post.createdAt).getTime()) / 60000));
  const timeLabel = Number.isNaN(elapsedMinutes) ? post.createdAt
    : elapsedMinutes < 1 ? 'Just now'
    : elapsedMinutes < 60 ? `${elapsedMinutes} mins ago`
    : elapsedMinutes < 1440 ? `${Math.floor(elapsedMinutes / 60)} hours ago`
    : `${Math.floor(elapsedMinutes / 1440)} days ago`;

  const getPostTypeBadge = (type: string) => {
    switch (type) {
      case 'traffic':
        return <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase">Traffic Alert</span>;
      case 'ride_offer':
        return post.isVerified ? (
          <span className="px-2 py-0.5 rounded-md bg-green-100 text-green-800 text-[10px] font-extrabold uppercase flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-green-600" /> Verified Ride Offer
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-extrabold uppercase">
            Ride Offer (Pending Review)
          </span>
        );
      case 'ride_request':
        return <span className="px-2 py-0.5 rounded-md bg-green-100 text-green-800 text-[10px] font-extrabold uppercase">Ride Request</span>;
      case 'safety':
        return <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-800 text-[10px] font-extrabold uppercase">Safety Notice</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold uppercase">Community</span>;
    }
  };

  return (
    <article className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-soft hover:shadow-md transition-all duration-200">

      {/* Author & Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center text-slate-700 font-bold">
            {post.authorAvatar ? (
              <img src={post.authorAvatar} alt={post.authorName} className="w-full h-full object-cover" />
            ) : (
              post.authorName.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-extrabold text-navy-950 font-display">{post.authorName}</h4>
              {post.isVerified && (
                <span title="Verified Member">
                  <ShieldCheck className="w-4 h-4 text-brand-600 fill-brand-50" />
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
              <span className="font-semibold text-brand-700">{post.groupName}</span>
              <span>•</span>
              <span>{timeLabel}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {getPostTypeBadge(post.postType)}
          <button
            onClick={() => setHasReported(true)}
            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-50 transition-colors"
            title={hasReported ? 'Reported' : 'Report Post'}
          >
            <Flag className={`w-3.5 h-3.5 ${hasReported ? 'text-red-500 fill-current' : ''}`} />
          </button>
        </div>
      </div>

      {/* Title & Body */}
      {post.title && (
        <h3 className="text-base font-bold text-navy-950 mb-2 font-display leading-snug">
          {post.title}
        </h3>
      )}

      <p className="text-slate-700 text-sm leading-relaxed mb-4 whitespace-pre-line">
        {post.content}
      </p>

      {/* Route Info Box if applicable */}
      {post.routeInfo && (
        <div className="mb-5 p-4 rounded-2xl bg-brand-50/60 border border-brand-200/80 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-brand-900 font-bold">
              {post.routeInfo.vehicle_type === 'bike' ? (
                <><Bike className="w-4 h-4 text-green-600" /><span>Bikepool Route</span></>
              ) : (
                <><Car className="w-4 h-4 text-brand-600" /><span>Carpool Route</span></>
              )}
            </div>
            {post.routeInfo.price && (
              <div className="text-sm font-black text-brand-800">
                ₹{post.routeInfo.price} <span className="text-[10px] font-normal text-slate-500">/ share</span>
              </div>
            )}
          </div>

          <div className="space-y-1.5 text-xs text-slate-800 font-medium">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-brand-600 shrink-0" />
              <span><strong>From:</strong> {post.routeInfo.from}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-green-600 shrink-0" />
              <span><strong>To:</strong> {post.routeInfo.to}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-brand-200/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-600 text-[11px]">
              <Clock className="w-3.5 h-3.5" />
              <span>{post.routeInfo.time || 'Regular Shift'}</span>
              <span>•</span>
              <span>{post.routeInfo.seats || 2} seats</span>
            </div>

            <button
              onClick={() => onJoinRide && onJoinRide(post.routeInfo)}
              className="px-3.5 py-1.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-colors flex items-center gap-1.5"
            >
              <span>Join Ride</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Interaction Bar */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onLike(post.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors ${post.hasLiked
                ? 'text-red-500 bg-red-50 font-bold'
                : 'hover:bg-slate-100 text-slate-600'
              }`}
          >
            <Heart className={`w-4 h-4 ${post.hasLiked ? 'fill-current' : ''}`} />
            <span>{post.likes}</span>
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            <span>{post.commentsCount}</span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
          >
            {copiedShare ? <Check className="w-4 h-4 text-green-600" /> : <Share2 className="w-4 h-4" />}
            <span>{copiedShare ? 'Copied' : 'Share'}</span>
          </button>
        </div>

        <button
          onClick={() => onSave(post.id)}
          className={`p-1.5 rounded-lg transition-colors ${post.hasSaved
              ? 'text-brand-600 bg-brand-50'
              : 'hover:bg-slate-100 text-slate-400'
            }`}
          title="Save post"
        >
          <Bookmark className={`w-4 h-4 ${post.hasSaved ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Threaded Comments Section */}
      {showComments && (
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-3 animate-in fade-in">
          {post.comments && post.comments.length > 0 ? (
            <div className="space-y-2.5">
              {post.comments.map((comment) => (
                <div key={comment.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 font-bold text-navy-950">
                      <span>{comment.authorName}</span>
                      {comment.isVerified && <ShieldCheck className="w-3 h-3 text-brand-600" />}
                    </div>
                    <span className="text-[10px] text-slate-400">{comment.createdAt}</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed">{comment.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic py-1">No comments yet. Start the conversation!</p>
          )}

          {/* Add Comment Input */}
          <form onSubmit={handleCommentSubmit} className="flex gap-2 pt-1">
            <input
              type="text"
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Add a helpful reply or tip..."
              className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
            <button
              type="submit"
              className="px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

    </article>
  );
};
