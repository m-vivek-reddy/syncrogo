import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Bike, CarFront, Check, CircleDollarSign, Clock,
  Globe2, MapPin, MessageCircle, Route, ShieldCheck,
  Star, Users
} from 'lucide-react';
import { HeroSection } from '../components/home/HeroSection';
import { RhythmSection } from '../components/home/RhythmSection';
import { apiClient } from '../api/client';

/* ── Data ──────────────────────────────────────────────────────── */
const routeCards = [
  {
    title: '4-Wheeler Carpool',
    route: 'Kondapur → HITEC City Towers',
    price: '₹60', priceLabel: 'sample / seat',
    icon: <CarFront size={15} />,
    image: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=500&q=80',
    badge: 'Verified',
    meta: [{ icon: <Users size={11} />, text: '2 seats remaining' }, { icon: <Clock size={11} />, text: 'Departs 08:30 AM' }],
  },
  {
    title: 'Express Bikepool',
    route: 'Miyapur Metro → Gachibowli DLF',
    price: '₹35', priceLabel: 'sample / pillion',
    icon: <Bike size={15} />,
    image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=500&q=80',
    badge: 'Helmet Ready',
    meta: [{ icon: <Check size={11} />, text: 'Quick hop-on' }, { icon: <Check size={11} />, text: 'Zero metro queue' }],
  },
];

const steps = [
  { number: '01', title: 'Passengers', text: 'Search a route, review driver details, then send a booking request.' },
  { number: '02', title: 'Drivers', text: 'Publish your route with coordinates, seats, timing, and preferences.' },
  { number: '03', title: 'Match and connect', text: 'Route matching brings compatible rides together. Messages keep the handoff clear.' },
  { number: '04', title: 'Complete and rate', text: 'After the journey, use ratings to help the community decide with confidence.' },
];

const communityCards = [
  { icon: <Users size={18} />,       title: 'Route Groups',      text: 'Join people traveling along the same routes.' },
  { icon: <Globe2 size={18} />,      title: 'Community Feed',    text: 'Share tips and ride experiences.' },
  { icon: <ShieldCheck size={18} />, title: 'Local Communities', text: 'Discover commuters nearby.' },
];

const benefits = [
  { icon: <CircleDollarSign size={19} />, tag: 'Shared costs', title: 'Affordable', quote: 'Share travel costs instead of traveling alone.', text: 'Share eligible travel costs with co-commuters instead of making every journey alone.' },
  { icon: <Route size={19} />, tag: 'Corridor smart', title: 'Route Matching', quote: 'Find rides that match your journey.', text: 'Our dynamic corridor matching aligns origin and destination nodes without out-of-the-way detours.' },
  { icon: <MapPin size={19} />, tag: 'Backend status', title: 'Route visibility', quote: 'See the route and ride details.', text: 'Review ride details and route information before you send a booking request.' },
  { icon: <MessageCircle size={19} />, tag: 'In one place', title: 'Communication', quote: 'Keep the journey conversation clear.', text: 'Coordinate with drivers and passengers through ride-related messages.' },
  { icon: <Star size={19} />, tag: 'Built on trust', title: 'Ratings & Trust', quote: 'Make informed decisions together.', text: 'Ratings and verified profiles help the community travel with confidence.' },
  { icon: <Users size={19} />, tag: 'Better together', title: 'Community', quote: 'Connect with people on your route.', text: 'Share updates, meet fellow commuters, and make daily journeys more connected.' },
];

/* ── Helpers ───────────────────────────────────────────────────── */
function FormatCard({
  title, subtitle, icon, image, points, bestFor,
}: {
  title: string; subtitle: string; icon: React.ReactNode; image: string; points: string[]; bestFor: string;
}) {
  return (
    <article className="sg-format-card">
      <img src={image} alt="" />
      <div className="body">
        <h3><span style={{ color: '#087ee9', display: 'flex', alignItems: 'center' }}>{icon}</span>{title}</h3>
        <p>{subtitle}</p>
        {points.map((p) => (
          <div key={p} className="sg-format-point">
            <Check size={11} style={{ color: '#08aa68' }} />
            {p}
          </div>
        ))}
        <div className="sg-format-footer">
          <p><b>Best for:</b> {bestFor}</p>
          <Link to="/find-ride" className="sg-format-link">
            Explore options <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </article>
  );
}

/* ── Page ──────────────────────────────────────────────────────── */
export const HomePage: React.FC = () => {
  const [stats, setStats] = useState<{ active_commuters: number; daily_routes: number; average_rating: number | null; completed_rides: number } | null>(null);

  useEffect(() => {
    apiClient.get('/api/v1/public/stats').then(({ data }) => setStats(data)).catch(() => setStats(null));
  }, []);

  return (
  <div className="sg-home">
    {/* ── Top Hero Section ── */}
    <HeroSection />

    {/* ── Popular Journeys ── */}
    <div className="sg-routes-bg">
      <div className="sg-section-wrap">
        <div className="sg-section-head">
          <div>
            <p className="sg-eyebrow">● &nbsp;SyncroGo Transit Network</p>
            <h2>Popular journeys happening now</h2>
          </div>
          <Link to="/find-ride">Explore all journeys <ArrowRight size={13} /></Link>
        </div>

        <div className="sg-route-grid">
          {routeCards.map((r) => (
            <article className="sg-route-card" key={r.title}>
              <img src={r.image} alt="" />
              <div className="sg-route-card-body">
                <div className="sg-route-title">
                  {r.icon}
                  <b>{r.title}</b>
                  <span className="sg-route-badge">{r.badge}</span>
                </div>
                <span className="sg-route-path">{r.route}</span>
                <div className="sg-route-meta">
                  {r.meta.map((m) => (
                    <span key={m.text} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {m.icon}{m.text}
                    </span>
                  ))}
                </div>
              </div>
              <div className="sg-route-card-price">
                <b>{r.price}</b>
                <small>{r.priceLabel}</small>
              </div>
            </article>
          ))}
        </div>
        <p className="sg-fare-note">
          Sample fares for these example routes. Your estimate depends on road distance and the current fare policy.{' '}
          <Link to="/offer-ride">Estimate your fare <ArrowRight size={12} /></Link>
        </p>
      </div>
    </div>

    {/* ── How It Works ── */}
    <RhythmSection />

    {/* ── Formats ── */}
    <div className="sg-formats">
      <div className="sg-section-head" style={{ marginBottom: 16 }}>
        <div>
          <p className="sg-eyebrow">Two Formats. One Mission.</p>
          <h2>Tailored for Every Indian City Commute</h2>
        </div>
        <p className="sg-note">
          Whether you desire air-conditioned comfort on the ring road<br />
          or a speedy bike ride through metro choke points.
        </p>
      </div>
      <div className="sg-format-grid">
        <FormatCard
          title="CARPOOL"
          subtitle="Share a car, split the journey."
          icon={<CarFront size={15} />}
          image="https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=450&q=80"
          points={['More comfortable', 'Share travel costs', 'Reduce traffic', 'Better utilization of empty seats']}
          bestFor="Tech parks, highway corridors & AC comfort"
        />
        <FormatCard
          title="BIKEPOOL"
          subtitle="Two wheels. One shared journey."
          icon={<Bike size={15} />}
          image="https://images.unsplash.com/photo-1558981285-6f0c94958bb6?auto=format&fit=crop&w=450&q=80"
          points={['Quick urban travel', 'Affordable commuting', 'Easy pickup', 'Efficient short-distance travel']}
          bestFor="Beating peak-hour jams & quick college rides"
        />
      </div>
    </div>

    {/* ── Community Strip ── */}
    <div style={{ background: '#f2f8fc', padding: '28px 0' }}>
      <div className="sg-community-strip">
        <div className="left">
          <p className="sg-eyebrow">Commute Connected</p>
          <h2>More Than a Ride.<br />We're a Community.</h2>
          <p>
            SyncroGo connects commuters beyond individual rides. Join route groups, share useful updates,
            meet fellow commuters, and make your daily journey more connected.
          </p>
          <Link to="/community" className="sg-button sg-button-primary" style={{ width: 'fit-content' }}>
            Explore Community <ArrowRight size={14} />
          </Link>
        </div>

        <div className="sg-community-cards">
          {communityCards.map(({ icon, title, text }) => (
            <div className="sg-community-card" key={title}>
              {icon}
              <b>{title}</b>
              <p>{text}</p>
            </div>
          ))}
        </div>

        <div className="sg-community-photo" />
      </div>
    </div>

    {/* ── Why SyncroGo ── */}
    <section className="sg-difference">
      <div className="sg-section-wrap">
        <div className="sg-difference-heading">
          <p className="sg-eyebrow">The SyncroGo Difference</p>
          <h2>Why SyncroGo</h2>
          <p>Built ground-up around the genuine daily transit reality of Indian office corridors and university campuses.</p>
        </div>
        <div className="sg-benefit-grid">
          {benefits.map(({ icon, tag, title, quote, text }) => (
            <article className="sg-benefit-card" key={title}>
              <div className="sg-benefit-top"><span>{icon}</span><small>{tag}</small></div>
              <h3>{title}</h3>
              <p className="quote">“{quote}”</p>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>

    {/* ── Community stats ── */}
    <section className="sg-stats" aria-label="SyncroGo community at a glance">
      <div><b>{stats ? stats.active_commuters.toLocaleString() : '—'}</b><span>Active commuters · 30 days</span></div>
      <div><b>{stats ? stats.daily_routes.toLocaleString() : '—'}</b><span>Available routes today</span></div>
      <div><b>{stats?.average_rating != null ? `${stats.average_rating}★` : '—'}</b><span>Average rider rating</span></div>
      <div><b>{stats ? stats.completed_rides.toLocaleString() : '—'}</b><span>Completed rides</span></div>
    </section>

  </div>
  );
};

export default HomePage;
