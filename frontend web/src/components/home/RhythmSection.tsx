import React from 'react';
import { Users } from 'lucide-react';

const steps = [
  { number: '01', title: 'Passengers', text: 'Search a route, review driver details, then send a booking request.' },
  { number: '02', title: 'Drivers', text: 'Publish your route with coordinates, seats, timing, and preferences.' },
  { number: '03', title: 'Match and connect', text: 'Route matching brings compatible rides together. Messages keep the handoff clear.' },
  { number: '04', title: 'Complete and rate', text: 'After the journey, use ratings to help the community decide with confidence.' },
];

/**
 * The SyncroGo Rhythm — 4-step overview beside an animated route diagram
 * (car drives the corridor, passengers pop in, match card pulses).
 * Shared by the home page and the How-It-Works page.
 * Pass hideHeading when the page already shows its own header.
 */
export const RhythmSection: React.FC<{ hideHeading?: boolean }> = ({ hideHeading = false }) => (
  <section className="sg-how" id="how-it-works">
    {!hideHeading && (
    <div className="sg-rhythm-heading">
      <p className="sg-eyebrow">The SyncroGo Rhythm</p>
      <h2>A simpler way to share your commute.</h2>
      <p className="sg-how-subtitle">Set a route, find a compatible journey, and keep the conversation in one place.</p>
    </div>
    )}
    <div className="sg-rhythm-grid">
      <div className="sg-rhythm-steps">
        {steps.map(({ number, title, text }) => (
          <article className="sg-rhythm-step" key={number}>
            <span>{number}</span>
            <div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          </article>
        ))}
      </div>
      <div className="sg-route-preview" aria-label="Illustration of commuters sharing a route">
        <span className="sg-route-label start">START</span>
        <span className="sg-route-label destination">DESTINATION</span>
        <svg viewBox="0 0 600 330" aria-hidden="true">
          <path id="sgRhythmPath" d="M66 265C153 260 155 188 249 194s91-95 177-79 84-60 125-67" />
          <g className="sg-rhythm-car">
            <animateMotion dur="9s" repeatCount="indefinite" rotate="auto-reverse">
              <mpath href="#sgRhythmPath" />
            </animateMotion>
            <g transform="translate(-11,-8)">
              <path d="M6 5 L8.5 0 H14 L16 5 Z" fill="#087ee9" />
              <rect x="0" y="5" width="21" height="8" rx="4" fill="#087ee9" />
              <circle cx="5.5" cy="13" r="2.2" fill="#0b3564" />
              <circle cx="15.5" cy="13" r="2.2" fill="#0b3564" />
            </g>
          </g>
          <circle cx="66" cy="265" r="7" fill="#08aa68">
            <animate attributeName="r" values="7;9;7" dur="2.2s" repeatCount="indefinite" />
          </circle>
          <circle cx="517" cy="113" r="7" fill="#0b3564">
            <animate attributeName="r" values="7;9;7" dur="2.2s" begin="1.1s" repeatCount="indefinite" />
          </circle>
        </svg>
        <div className="sg-rider sg-rider-anim rider-one"><span>A</span><b>Passenger 1</b></div>
        <div className="sg-rider sg-rider-anim rider-two"><span>M</span><b>Passenger 2</b></div>
        <div className="sg-rider sg-rider-anim rider-three"><span>R</span><b>Passenger 3</b></div>
        <div className="sg-match-card sg-match-anim">
          <span><Users size={17} /></span>
          <div><b>1 nearby rider found</b><small>Compatible route match</small></div>
        </div>
      </div>
    </div>
  </section>
);

export default RhythmSection;
