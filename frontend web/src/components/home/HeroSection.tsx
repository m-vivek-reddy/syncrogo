import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Car, Bike, ShieldCheck, MapPin, Users, Globe2, Search } from 'lucide-react';
import useUserCity from '../../hooks/useUserCity';

export const HeroSection: React.FC = () => {
  const { city, image } = useUserCity();

  return (
    <section className="sg-home">
      <div className="sg-hero">

        {/* ── Left: Copy ── */}
        <div className="sg-hero-copy">
          <p className="sg-eyebrow">Next-gen Indian Shared Transit<br />Carpool &amp; Bikepool</p>

          <h1>
            Your Ride. Your Route.<br />
            Your <em>Community.</em>
          </h1>

          <p className="sg-lede">
            Share rides with people heading your way. Save money, reduce traffic, and make every
            journey more connected with SyncroGo.
          </p>

          <div className="sg-actions">
            <Link to="/find-ride" className="sg-button sg-button-primary">
              <Search size={16} />
              Find a Ride
            </Link>
            <Link to="/offer-ride" className="sg-button sg-button-outline">
              <Car size={16} />
              Offer a Ride
            </Link>
          </div>

          {/* Trust grid */}
          <div className="sg-trust">
            <div className="sg-trust-item">
              <div className="sg-trust-icon green"><ShieldCheck size={14} /></div>
              <div>
                <div className="sg-trust-label">Safe &amp; Reliable</div>
                <div className="sg-trust-sub">Verified profiles</div>
              </div>
            </div>
            <div className="sg-trust-item">
              <div className="sg-trust-icon"><MapPin size={14} /></div>
              <div>
                <div className="sg-trust-label">Smart Match</div>
                <div className="sg-trust-sub">Route-based</div>
              </div>
            </div>
            <div className="sg-trust-item">
              <div className="sg-trust-icon amber"><Users size={14} /></div>
              <div>
                <div className="sg-trust-label">Community</div>
                <div className="sg-trust-sub">Shared rides</div>
              </div>
            </div>
            <div className="sg-trust-item">
              <div className="sg-trust-icon green"><Globe2 size={14} /></div>
              <div>
                <div className="sg-trust-label">Greener Future</div>
                <div className="sg-trust-sub">Less traffic</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Hero image pane (dynamic per detected city) ── */}
        <div className="sg-hero-image">
          <div
            className="sg-hero-photo"
            style={{
              backgroundImage: `url('${image}')`,
              backgroundPosition: 'center',
            }}
          />
          <div className="sg-together">
            Better<br /><strong>Together</strong>
          </div>
          <div className="sg-hub">
            <MapPin size={16} />
            <b>{city} Hub</b>
            <ArrowRight size={14} />
          </div>
        </div>

      </div>
    </section>
  );
};
