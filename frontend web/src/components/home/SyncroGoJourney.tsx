import React, { useEffect, useState } from 'react';
import { Car, Check, Star, User } from 'lucide-react';
import './SyncroGoJourney.css';

const steps = [
  {
    number: '01',
    title: 'Passengers',
    description: 'Search a route, review driver details, then send a booking request.',
  },
  {
    number: '02',
    title: 'Drivers',
    description: 'Publish your route with coordinates, seats, timing, and preferences.',
  },
  {
    number: '03',
    title: 'Match and connect',
    description: 'Route matching brings compatible rides together. Messages keep the handoff clear.',
  },
  {
    number: '04',
    title: 'Complete and rate',
    description: 'After the journey, use the ratings workflow to help the community decide better.',
  },
];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function Passenger({
  number, className, visible, pickedUp,
}: {
  number: number; className: string; visible: boolean; pickedUp: boolean;
}) {
  return (
    <div className={`passenger-marker ${className} ${visible ? 'visible' : ''} ${pickedUp ? 'picked' : ''}`}>
      <div className="passenger-avatar">
        <User size={22} strokeWidth={2.2} />
        {pickedUp && (
          <small><Check size={11} strokeWidth={3} /></small>
        )}
      </div>
      <strong>Passenger {number}</strong>
      {!pickedUp && <i />}
    </div>
  );
}

export default function SyncroGoJourney() {
  const [activeStep, setActiveStep] = useState(0);
  const [passengers, setPassengers] = useState([false, false, false]);
  const [accepted, setAccepted] = useState(false);
  const [pickedUp, setPickedUp] = useState([false, false, false]);
  const [completed, setCompleted] = useState(false);

  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (reduced) {
      setActiveStep(3);
      setPassengers([true, true, true]);
      setAccepted(true);
      setPickedUp([true, true, true]);
      setCompleted(true);
      return;
    }

    let cancelled = false;

    const runAnimation = async () => {
      setActiveStep(0);
      setPassengers([false, false, false]);
      setAccepted(false);
      setPickedUp([false, false, false]);
      setCompleted(false);

      await wait(1200);
      if (cancelled) return;
      setActiveStep(1); // Driver publishes

      await wait(1300);
      if (cancelled) return;
      setActiveStep(2); // Nearby passengers appear

      for (let i = 0; i < 3; i++) {
        await wait(650);
        if (cancelled) return;
        setPassengers((prev) => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
      }

      await wait(900);
      if (cancelled) return;
      setAccepted(true);

      await wait(1400);
      if (cancelled) return;

      for (let i = 0; i < 3; i++) {
        await wait(1500);
        if (cancelled) return;
        setPickedUp((prev) => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
      }

      await wait(1200);
      if (cancelled) return;
      setActiveStep(3);
      setCompleted(true);

      await wait(3500);
      if (!cancelled) runAnimation();
    };

    runAnimation();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  return (
    <section className="syncrogo-how">
      <div className="syncrogo-heading">
        <span className="syncrogo-eyebrow">
          <span className="eyebrow-dot" />
          THE SYNCROGO RHYTHM
        </span>
        <h2>A simpler way to share your commute.</h2>
        <p>Set a route, find a compatible journey, and keep the conversation in one place.</p>
      </div>

      <div className="journey-layout">
        {/* LEFT STEPS */}
        <div className="journey-steps">
          {steps.map((step, index) => (
            <div key={step.number} className={`journey-step ${activeStep === index ? 'active' : ''}`}>
              <div className="step-number">{step.number}</div>
              <div className="step-content">
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ANIMATION */}
        <div className="journey-animation">
          <div className="map-glow" />
          <div className="map-label start-label">START</div>
          <div className="map-label destination-label">DESTINATION</div>

          <div className="route-container">
            <div className="route-base" />
            <div className="route-progress" />

            <Passenger number={1} className="passenger-one" visible={passengers[0]} pickedUp={pickedUp[0]} />
            <Passenger number={2} className="passenger-two" visible={passengers[1]} pickedUp={pickedUp[1]} />
            <Passenger number={3} className="passenger-three" visible={passengers[2]} pickedUp={pickedUp[2]} />

            <div className="route-point start-point"><span /></div>
            <div className={`pickup-point point-one ${pickedUp[0] ? 'done' : ''}`}><span>1</span></div>
            <div className={`pickup-point point-two ${pickedUp[1] ? 'done' : ''}`}><span>2</span></div>
            <div className={`pickup-point point-three ${pickedUp[2] ? 'done' : ''}`}><span>3</span></div>
            <div className={`destination-point ${completed ? 'completed' : ''}`}><span><Check size={18} strokeWidth={3} /></span></div>

            <div className={`animated-car ${completed ? 'car-complete' : ''}`}>
              <div className="car-icon"><Car size={26} strokeWidth={2.1} /></div>
              <div className="car-shadow" />
            </div>
          </div>

          {/* Match notification */}
          {passengers.filter(Boolean).length > 0 && !accepted && (
            <div className="match-card">
              <div className="match-icon"><Check size={18} strokeWidth={3} /></div>
              <div>
                <strong>
                  {passengers.filter(Boolean).length} nearby rider{passengers.filter(Boolean).length > 1 ? 's' : ''} found
                </strong>
                <span>Compatible route match</span>
              </div>
            </div>
          )}

          {/* Accept card */}
          {passengers.every(Boolean) && !accepted && (
            <div className="ride-request-card">
              <div className="request-header">
                <span>RIDE MATCH</span>
                <strong>₹65 / seat</strong>
              </div>
              <h4>Kondapur → Gachibowli</h4>
              <p>3 compatible passengers found</p>
              <button type="button">
                Accept Ride
                <span>→</span>
              </button>
            </div>
          )}

          {/* Accepted */}
          {accepted && !completed && (
            <div className="accepted-card">
              <span className="accepted-check"><Check size={18} strokeWidth={3} /></span>
              <div>
                <strong>Ride accepted</strong>
                <span>Pickup points confirmed</span>
              </div>
            </div>
          )}

          {/* Complete */}
          {completed && (
            <div className="complete-card">
              <div className="stars">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} size={17} className="star-filled" />
                ))}
              </div>
              <strong>Journey complete</strong>
              <span>3 passengers • 1 shared journey</span>
              <small>Rate your journey</small>
            </div>
          )}

          {/* Pickup labels */}
          <div className={`pickup-label label-one ${pickedUp[0] ? 'show' : ''}`}>
            <strong>Point 1</strong>
            <span>Passenger picked up ✓</span>
          </div>
          <div className={`pickup-label label-two ${pickedUp[1] ? 'show' : ''}`}>
            <strong>Point 2</strong>
            <span>Passenger picked up ✓</span>
          </div>
          <div className={`pickup-label label-three ${pickedUp[2] ? 'show' : ''}`}>
            <strong>Point 3</strong>
            <span>Passenger picked up ✓</span>
          </div>
        </div>
      </div>

      {/* CTA — intentional: the How-It-Works section shows the product in action, no repeated Find/Offer buttons */}
    </section>
  );
}
