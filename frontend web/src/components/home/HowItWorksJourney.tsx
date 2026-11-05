import React, { useEffect, useState } from 'react';

/* ── Mini ride journey: SyncroGo's signature animation ──────────
   A 16s looping scene: driver starts → nearby riders appear →
   smart matching → accept → pickup 1/2/3 → destination.
   All visual timings are 16s CSS keyframes so they stay in sync. */

const CYCLE = 16000;

const SCENES: { n: string; title: string; text: string }[] = [
  { n: '1', title: 'Set your route', text: 'A driver starts a journey from Kondapur → Gachibowli.' },
  { n: '2', title: 'Find nearby riders', text: 'SyncroGo spots people traveling along your route.' },
  { n: '3', title: 'Smart matching', text: 'Route connections are matched instantly. 3 riders matched.' },
  { n: '4', title: 'Accept the ride', text: 'Passenger 1 requests a seat at ₹65 / seat.' },
  { n: '5', title: 'Pickup 1', text: 'Passenger 1 joins at the Kondapur junction.' },
  { n: '6', title: 'Pickup 2', text: 'Passenger 2 joins near the metro corridor.' },
  { n: '7', title: 'Pickup 3', text: 'All 3 passengers onboard.' },
  { n: '★', title: 'Go together.', text: 'One route. Multiple journeys. Less traffic.' },
];

const SCENE_STARTS = [0, 2000, 5000, 7000, 9000, 11000, 13000, 15000];

const Person = ({ x, y, cls }: { x: number; y: number; cls: string }) => (
  <g transform={`translate(${x},${y})`} className={`hj-pop ${cls}`}>
    <circle r="17" fill="#fff" stroke="#0b3564" strokeWidth="2.5" />
    <circle cy="-4.5" r="5" fill="#0b3564" />
    <path d="M -8 9 A 8 8 0 0 1 8 9" fill="#0b3564" />
  </g>
);

const Check = ({ x, y, cls }: { x: number; y: number; cls: string }) => (
  <g transform={`translate(${x},${y})`} className={`hj-check ${cls}`}>
    <circle r="10" fill="#08aa68" />
    <path d="M -4 0.5 L -1 3.5 L 4.5 -2.5" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </g>
);

export const HowItWorksJourney: React.FC = () => {
  const [scene, setScene] = useState(0);
  const [accepted, setAccepted] = useState(false);

  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (reduced) { setScene(SCENES.length - 1); return; }

    let timeouts: ReturnType<typeof setTimeout>[] = [];
    const runCycle = () => {
      timeouts = SCENE_STARTS.map((t, i) =>
        setTimeout(() => setScene(i), t)
      );
    };
    runCycle();
    const loop = setInterval(runCycle, CYCLE);
    return () => { timeouts.forEach(clearTimeout); clearInterval(loop); };
  }, [reduced]);

  // "Accept Ride → ✓ Ride Accepted" beat inside scene 4
  useEffect(() => {
    if (scene !== 3) { setAccepted(false); return; }
    const t = setTimeout(() => setAccepted(true), 1100);
    return () => clearTimeout(t);
  }, [scene]);

  return (
    <div className={`hj-wrap ${reduced ? 'hj-static' : ''}`} aria-label="How a SyncroGo shared ride happens">
      <div className="hj-canvas">
        <svg viewBox="0 0 900 320">
          {/* main route: base (gray, draws in) + green trail (follows the car) */}
          <path id="hjRoutePath" className="hj-route-base hj-draw-base" d="M 40 160 H 860" pathLength={100} />
          <path className="hj-route-trail" d="M 40 160 H 860" pathLength={100} />

          {/* branches: gray (appear with riders) + green (matching) */}
          <path className="hj-branch" d="M 220 160 V 82" pathLength={100} />
          <path className="hj-branch" d="M 480 160 V 238" pathLength={100} />
          <path className="hj-branch" d="M 690 160 V 82" pathLength={100} />
          <path className="hj-match" d="M 220 160 V 82" pathLength={100} />
          <path className="hj-match" d="M 480 160 V 238" pathLength={100} />
          <path className="hj-match" d="M 690 160 V 82" pathLength={100} />

          {/* START & destination */}
          <circle cx="40" cy="160" r="7" fill="#0b3564" />
          <text x="40" y="190" className="hj-label" textAnchor="middle">START</text>
          <text x="860" y="120" className="hj-label" textAnchor="middle">🏁</text>
          <text x="860" y="190" className="hj-label" textAnchor="middle">GACHIBOWLI</text>

          {/* riders */}
          <Person x={220} y={70} cls="hj-pop-1" />
          <Person x={480} y={250} cls="hj-pop-2" />
          <Person x={690} y={70} cls="hj-pop-3" />

          {/* pickup confirmations */}
          <Check x={220} y={160} cls="hj-chk-1" />
          <Check x={480} y={160} cls="hj-chk-2" />
          <Check x={690} y={160} cls="hj-chk-3" />

          {/* the car — keyPoints/keyTimes drive it to each pickup in sync */}
          <g className="hj-car">
            <animateMotion
              dur="16s"
              repeatCount="indefinite"
              calcMode="linear"
              keyPoints="0;0.05;0.05;0.21;0.53;0.76;1"
              keyTimes="0;0.125;0.5625;0.6875;0.8125;0.9375;1"
            >
              <mpath href="#hjRoutePath" />
            </animateMotion>
            <g transform="translate(-17,-13)">
              <path d="M8 7 L12 0 H20 L24 7 Z" fill="#087ee9" />
              <rect x="0" y="7" width="31" height="11" rx="5" fill="#087ee9" />
              <circle cx="8" cy="18" r="3.2" fill="#0b3564" />
              <circle cx="23" cy="18" r="3.2" fill="#0b3564" />
            </g>
          </g>
        </svg>

        {/* matching badge (scene 3) */}
        <div className={`hj-badge ${scene === 2 ? 'show' : ''}`}>
          <span className="hj-badge-dot" /> 3 riders matched
        </div>

        {/* accept card (scene 4) */}
        <div className={`hj-accept ${scene === 3 ? 'show' : ''}`}>
          <div className="hj-accept-route">Kondapur <span>→</span> Gachibowli</div>
          <div className="hj-accept-price">₹65 <small>/ seat</small></div>
          <div className={`hj-accept-btn ${accepted ? 'done' : ''}`}>
            {accepted ? '✓ Ride Accepted' : 'Accept Ride →'}
          </div>
        </div>
      </div>

      {/* caption */}
      <div className="hj-caption" key={scene}>
        <span className="hj-num">{SCENES[scene].n}</span>
        <h3>{SCENES[scene].title}</h3>
        <p>{SCENES[scene].text}</p>
      </div>
    </div>
  );
};

export default HowItWorksJourney;
