import React from 'react';
import type { LegalDoc } from '../legal/legalContent';
import { ENTITY } from '../legal/legalContent';

export const LegalPage: React.FC<{ doc: LegalDoc }> = ({ doc }) => (
  <main className="min-h-screen bg-slate-50 px-4 py-10 sm:py-14">
    <article className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-10">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-green-700">{doc.eyebrow}</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold text-navy-800">{doc.title}</h1>
      <p className="mt-2 text-xs font-semibold text-slate-400">Effective {doc.effectiveDate} · Last updated {doc.lastUpdated}</p>
      <p className="mt-5 text-sm leading-7 text-slate-600">{doc.intro}</p>
      {doc.sections.map((section) => (
        <section key={section.heading} className="mt-8">
          <h2 className="font-display text-lg font-bold text-navy-800">{section.heading}</h2>
          {section.body && <p className="mt-2 text-sm leading-7 text-slate-600">{section.body}</p>}
          {section.bullets && <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">{section.bullets.map((item) => <li key={item}>{item}</li>)}</ul>}
          {section.numbered && <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-600">{section.numbered.map((item) => <li key={item}>{item}</li>)}</ol>}
          {section.sub?.map((sub) => (
            <div key={sub.heading} className="mt-4 border-l-2 border-slate-100 pl-4">
              <h3 className="text-sm font-bold text-slate-700">{sub.heading}</h3>
              {sub.body && <p className="mt-1 text-sm leading-6 text-slate-600">{sub.body}</p>}
              {sub.bullets && <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600">{sub.bullets.map((item) => <li key={item}>{item}</li>)}</ul>}
              {sub.body_after && <p className="mt-2 text-sm leading-6 text-slate-600">{sub.body_after}</p>}
            </div>
          ))}
          {section.body_after && <p className="mt-2 text-sm leading-7 text-slate-600">{section.body_after}</p>}
        </section>
      ))}
      {doc.footerNote && <p className="mt-8 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">{doc.footerNote}</p>}
      <p className="mt-6 border-t border-slate-100 pt-4 text-sm text-slate-500">
        Questions? <a className="font-semibold text-green-700 hover:underline" href={`mailto:${doc.id === 'privacy' ? ENTITY.privacyEmail : ENTITY.grievanceEmail}`}>{doc.id === 'privacy' ? ENTITY.privacyEmail : ENTITY.grievanceEmail}</a>
      </p>
    </article>
  </main>
);

export const ContactPage: React.FC = () => (
  <main className="min-h-[60vh] bg-slate-50 px-4 py-10 sm:py-14">
    <section className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-10">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-green-700">Contact & Grievance</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold text-navy-800">How can we help?</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">For support, privacy questions, or a grievance, email the appropriate SyncroGo team.</p>
      <div className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200 px-4">
        {[["Support", ENTITY.supportEmail], ["Privacy", ENTITY.privacyEmail], ["Grievance", ENTITY.grievanceEmail]].map(([label, email]) => (
          <div key={label} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm font-semibold text-slate-700">{label}</span>
            <a className="text-sm font-semibold text-green-700 hover:underline" href={`mailto:${email}`}>{email}</a>
          </div>
        ))}
      </div>
    </section>
  </main>
);
