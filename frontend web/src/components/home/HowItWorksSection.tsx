import React from 'react';
import { MapPin, Route, MessageSquare, Compass } from 'lucide-react';

export const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      number: '01',
      title: 'Set your route',
      description: 'Enter pickup and destination.',
      details: 'Tell us where you are starting and where you need to be. Pinpoint key metro hubs, tech parks, or landmarks.',
      icon: MapPin,
      color: 'from-teal-500 to-emerald-600',
    },
    {
      number: '02',
      title: 'Find your match',
      description: 'Discover rides traveling along your route.',
      details: 'Search the routes returned by SyncroGo and compare the journey details before you request a seat.',
      icon: Route,
      color: 'from-brand-600 to-teal-600',
    },
    {
      number: '03',
      title: 'Connect',
      description: 'Communicate with the driver or passenger.',
      details: 'Confirm seat preferences, coordinate pickup landmarks, and verify credentials through secure chat and contact rules.',
      icon: MessageSquare,
      color: 'from-amber-500 to-orange-500',
    },
    {
      number: '04',
      title: 'Go together',
      description: 'Meet at the pickup point and travel together.',
      details: 'Meet at the agreed pickup point, complete the journey, and use the available booking and rating flows.',
      icon: Compass,
      color: 'from-emerald-600 to-teal-700',
    },
  ];

  return (
    <section className="py-20 bg-slate-50/70 border-b border-slate-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-block px-3 py-1 rounded-full bg-brand-100 text-brand-800 text-xs font-bold uppercase tracking-wider mb-3">
            Simple 4-Step Process
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-950 font-display tracking-tight">
            How SyncroGo Works
          </h2>
          <p className="mt-3 text-slate-600 text-base">
            Commuting made effortless. Experience transparent route sharing built for daily office-goers and students.
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 relative">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="relative bg-white rounded-3xl p-7 border border-slate-200/80 shadow-soft hover:shadow-premium hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-3xl font-black font-display text-slate-300">
                      {step.number}
                    </span>
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${step.color} text-white flex items-center justify-center shadow-md`}>
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-navy-950 font-display mb-2">
                    {step.title}
                  </h3>

                  <p className="text-brand-700 font-semibold text-sm mb-3">
                    {step.description}
                  </p>

                  <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
                    {step.details}
                  </p>
                </div>

                {index < 3 && (
                  <div className="hidden lg:block absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center text-xs font-bold">
                    →
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
