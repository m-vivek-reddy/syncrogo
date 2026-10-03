/**
 * SyncroGo legal content pack — single source of truth for the web app.
 *
 * The same content ships in the mobile app (mobile/src/legal/legalContent.ts).
 * When a lawyer changes the text, update BOTH files in the same commit and
 * bump EFFECTIVE_DATES so the backend can re-prompt for consent.
 *
 * ⚠️ PLACEHOLDERS: every field wrapped in ⟪⟫ MUST be replaced with the real
 * legal entity details before launch. Do not publish invented company details.
 */

export const EFFECTIVE_DATE = "12 September 2026";
export const LAST_UPDATED = "12 September 2026";
export const POLICY_VERSION = "2026-09-12";

export const ENTITY = {
  name: "SyncroGo Technologies",
  address: "Hyderabad, Telangana, India",
  website: "https://hj4cqztk-5173.inc1.devtunnels.ms",
  supportEmail: "vivekreddy2223@gmail.com",
  privacyEmail: "vivekreddy2223@gmail.com",
  grievanceEmail: "vivekreddy2223@gmail.com",
  grievanceOfficer: "Vivek Reddy, Grievance Officer",
};

export type LegalSection = {
  heading: string;
  body?: string;
  bullets?: string[];
  numbered?: string[];
  /** Text after bullets/numbered, if any. */
  body_after?: string;
  sub?: { heading: string; body?: string; bullets?: string[]; body_after?: string }[];
};

export type LegalDoc = {
  id: string;
  eyebrow: string;
  title: string;
  effectiveDate: string;
  lastUpdated: string;
  intro: string;
  sections: LegalSection[];
  footerNote?: string;
};

// ---------------------------------------------------------------------------
// TERMS & CONDITIONS
// ---------------------------------------------------------------------------

export const TERMS: LegalDoc = {
  id: "terms",
  eyebrow: "Terms and Conditions",
  title: "Use SyncroGo responsibly and safely.",
  effectiveDate: EFFECTIVE_DATE,
  lastUpdated: LAST_UPDATED,
  intro:
    "These Terms & Conditions (\"Terms\") govern your access to and use of the SyncroGo website, mobile application, software, platform and related services (\"SyncroGo\", \"Platform\", \"Service\", \"we\", \"us\" or \"our\"). By creating an account, accessing the Platform, booking a ride, offering a ride, or otherwise using SyncroGo, you agree to these Terms and our Privacy Policy and Cookie Policy. If you do not agree with these Terms, do not create an account or use SyncroGo.",
  sections: [
    {
      heading: "1. About SyncroGo",
      body: "SyncroGo is a technology platform intended to facilitate shared transportation by connecting users who offer rides (\"Drivers\") with users seeking rides (\"Passengers\").",
      bullets: [
        "Carpooling",
        "Bikepooling",
        "Ride discovery and matching",
        "Ride booking",
        "Pickup and drop-off coordination",
        "In-app communication",
        "Digital payments",
        "Cash payment arrangements",
        "Driver and vehicle verification",
        "Ratings and reviews",
        "Safety and SOS features",
        "Related platform services",
      ],
      body_after:
        "Unless expressly stated otherwise, SyncroGo is a technology platform and does not itself operate every vehicle, employ every Driver, or guarantee that a particular ride will be available. Drivers remain responsible for their vehicles, driving, licences, insurance, permits, compliance with applicable transport laws, and conduct.",
    },
    {
      heading: "2. Eligibility",
      numbered: [
        "Be at least 18 years old to create and use a SyncroGo account unless SyncroGo expressly provides a legally compliant alternative",
        "Provide accurate and current information",
        "Maintain the security of your account credentials",
        "Have the legal capacity to enter into these Terms",
        "Comply with all applicable laws and regulations",
        "Use SyncroGo only for lawful purposes",
      ],
      body_after:
        "You must not create an account using another person's identity or information. SyncroGo may request information or documents necessary to verify identity, driving eligibility, vehicle information, or other information relevant to the Service.",
    },
    {
      heading: "3. Account Registration",
      body: "You may be required to provide information such as:",
      bullets: [
        "Name",
        "Mobile number",
        "Email address",
        "Profile information",
        "Profile photograph",
        "Location information",
        "Emergency contact information",
        "Driver information",
        "Driving licence information",
        "Vehicle registration information",
        "Other verification information",
        "Payment-related information where applicable",
      ],
      body_after:
        "You are responsible for ensuring that the information you provide is accurate. You must immediately notify SyncroGo if you believe your account has been compromised or used without authorisation. You are responsible for activity carried out through your account unless the activity occurred due to circumstances for which you are not legally responsible.",
    },
    {
      heading: "4. Driver Eligibility and Verification",
      body: "A user who wishes to offer rides may be required to complete Driver Verification. Verification may include review of:",
      bullets: [
        "Identity information",
        "Driving licence",
        "Vehicle Registration Certificate (RC)",
        "Vehicle information",
        "Other legally or operationally required documents",
      ],
      body_after:
        "A \"Driver Verified\" status means only that SyncroGo has completed the applicable verification process based on the information and documents available to it. Verification does not constitute a guarantee of driving ability, vehicle condition, insurance coverage or future conduct; it is not a government certification, and it does not guarantee that an accident, misconduct, fraud or other incident cannot occur. Drivers must keep all required licences, registrations, permits, insurance and other legally required documents valid throughout their participation in SyncroGo.",
    },
    {
      heading: "5. Offering a Ride",
      body: "Drivers must provide accurate information about:",
      bullets: [
        "Starting location",
        "Destination",
        "Date and time",
        "Available seats",
        "Vehicle type",
        "Vehicle information",
        "Ride route or relevant route information",
        "Applicable fare or contribution amount",
        "Other information requested by SyncroGo",
      ],
      body_after:
        "Drivers must not offer rides they cannot legally provide, misrepresent their vehicle, exceed the available passenger capacity, drive while intoxicated or impaired, drive recklessly, discriminate unlawfully against users, collect amounts not disclosed through the Platform, manipulate ride, booking or payment information, or use SyncroGo for unlawful commercial transportation where the required permissions or authorisations are not held.",
    },
    {
      heading: "6. Finding and Matching Rides",
      body: "SyncroGo may use information such as pickup location, destination, route, date, time, available seats, vehicle type, user preferences and other relevant information to identify potentially suitable rides. A match does not guarantee that the ride will occur. Ride availability may change because of cancellation, route changes, traffic, vehicle issues, user actions, technical problems, safety concerns, or other circumstances.",
    },
    {
      heading: "7. Booking a Ride",
      body: "A Passenger may request or confirm a seat through the Platform. A booking becomes confirmed only when SyncroGo's system indicates that the booking has been successfully accepted or confirmed. The Passenger must provide accurate booking information, arrive at the agreed pickup point on time, follow reasonable instructions from the Driver relating to the ride, respect the vehicle and other passengers, and pay the applicable amount through the selected payment method. A Passenger must not transfer a booking to another person unless SyncroGo expressly permits it.",
    },
    {
      heading: "8. Ride Fare and Platform Charges",
      body: "The amount payable for a ride will be displayed through the Platform before confirmation where applicable. The amount may include the ride contribution/fare, applicable platform fee, taxes or government charges where applicable, and other clearly disclosed charges.",
      sub: [
        {
          heading: "Digital payment",
          body: "Where a digital payment method is selected, SyncroGo may charge the amount displayed during booking. The current SyncroGo platform fee may be ₹5 per applicable digital ride, subject to the amount displayed before booking and any future pricing changes communicated by SyncroGo.",
        },
        {
          heading: "Cash payment",
          body: "Where SyncroGo offers cash payment: the Passenger must pay the displayed ride amount directly to the Driver at the applicable stage of the ride; the Driver must accurately record/confirm the cash payment through SyncroGo when required; a ₹10 cash-ride platform fee may be recorded against the Driver for each applicable completed cash ride; and outstanding cash-ride platform fees may restrict the Driver from receiving a subsequent ride assignment until settled, where the Platform indicates that such restriction applies.",
        },
      ],
      body_after:
        "The applicable fee shown at the time of the transaction will govern that transaction. SyncroGo may change its fees prospectively by providing appropriate notice.",
    },
    {
      heading: "9. Payment Processing",
      body: "Digital payments may be processed through third-party payment service providers. SyncroGo may receive payment status, transaction identifiers, refunds, failures and other information necessary to operate the payment functionality. SyncroGo does not need to store complete card credentials when payment processing is handled by an authorised payment provider. Payment disputes may also be subject to the terms and procedures of the relevant payment provider.",
    },
    {
      heading: "10. Cash Payment Rules",
      numbered: [
        "The amount payable must be based on the booking information recorded by SyncroGo",
        "The Passenger must pay the applicable amount directly to the assigned Driver",
        "The Driver must not falsely confirm receipt of cash",
        "The Passenger must not falsely claim that payment was made",
        "Users must not manipulate booking amounts or payment status",
        "A cash payment confirmation must not be used to bypass SyncroGo's payment or eligibility controls",
      ],
      body_after:
        "Fraudulent cash confirmations may result in suspension, account termination, recovery of amounts, and/or reporting to appropriate authorities where required.",
    },
    {
      heading: "11. Cancellations",
      body: "Cancellation rules may depend on who cancels, when the cancellation occurs, whether the ride has started, whether payment has been made, whether a refund is applicable, and the cancellation policy displayed at the time of booking. SyncroGo may restrict accounts that repeatedly make cancellations, no-shows, fraudulent bookings, or otherwise abuse the cancellation system.",
    },
    {
      heading: "12. Ride Changes and Delays",
      body: "Drivers should notify affected Passengers of material changes whenever reasonably possible. SyncroGo is not responsible for delays caused by traffic, weather, road closures, vehicle breakdown, government restrictions, emergencies, third-party actions, network or device failures, or other circumstances outside SyncroGo's reasonable control.",
    },
    {
      heading: "13. Passenger Responsibilities",
      body: "Passengers must behave respectfully, follow applicable safety requirements, wear a seat belt where available and required, use helmets where legally required for applicable two-wheeler travel, avoid damaging the vehicle, avoid carrying prohibited or dangerous items, avoid distracting the Driver, avoid abusive, threatening or harassing behaviour, follow applicable laws, and provide accurate information to SyncroGo. Passengers must not ask or pressure Drivers to violate traffic or transport laws.",
    },
    {
      heading: "14. Driver Responsibilities",
      body: "Drivers must hold the required driving licence, maintain legally required vehicle registration, insurance and permits, operate a roadworthy vehicle, follow traffic laws, not drive under the influence of alcohol, drugs or other impairing substances, not use a phone in a manner prohibited by law while driving, follow lawful safety requirements, treat Passengers respectfully, not intentionally deviate from the agreed route for improper purposes, and immediately stop or cancel a ride where continuing would create a serious safety risk.",
    },
    {
      heading: "15. Prohibited Conduct",
      body: "Users must not use SyncroGo to:",
      bullets: [
        "Commit or facilitate a crime",
        "Threaten, stalk, harass or intimidate another person",
        "Impersonate another person",
        "Upload false documents",
        "Use another person's account",
        "Manipulate bookings",
        "Manipulate fares or payment status",
        "Circumvent platform fees",
        "Attempt unauthorised access",
        "Introduce malware or malicious code",
        "Scrape or collect user information without authorisation",
        "Sell, transfer or commercially exploit accounts",
        "Upload unlawful or infringing content",
        "Carry illegal or dangerous goods",
        "Arrange unlawful transportation",
        "Discriminate unlawfully",
        "Abuse the SOS function",
        "Submit fraudulent reports",
        "Submit knowingly false ratings or complaints",
        "Attempt to interfere with the Platform's security or operation",
      ],
    },
    {
      heading: "16. Safety and SOS",
      body: "SyncroGo may provide safety functionality including an SOS button, emergency alerts, location sharing, ride information, emergency contacts, or other safety features. Safety features depend on device permissions, internet connectivity, GPS/location availability, mobile network availability, third-party services, and correct user configuration.",
      body_after:
        "SOS functionality is not a replacement for emergency services. In India, users requiring urgent police, fire, medical or other emergency assistance should contact the national emergency service at 112 where appropriate. SyncroGo does not guarantee that an SOS alert will result in emergency assistance or a particular response time. Users should provide accurate emergency-contact information where the feature requires it.",
    },
    {
      heading: "17. Location Services",
      body: "SyncroGo may use location information to find nearby rides, match routes, determine pickup and drop-off points, display ride progress, support navigation, provide safety functionality, detect ride-related events, and improve the operation of the Service. Users can control certain device-level location permissions through their device settings. Disabling location access may prevent some SyncroGo functionality from working. Further details are provided in the SyncroGo Privacy Policy.",
    },
    {
      heading: "18. Ratings, Reviews and Reports",
      body: "Users may be permitted to submit ratings, reviews, safety reports, complaints and other feedback. Users must submit truthful and relevant information. SyncroGo may review, moderate, remove, restrict or investigate content that violates these Terms or applicable law. SyncroGo may use ratings and reports for safety, fraud prevention, quality control and account-management purposes.",
    },
    {
      heading: "19. User Content",
      body: "You retain rights you have in content you submit to SyncroGo. By submitting content, you grant SyncroGo a non-exclusive, worldwide, royalty-free licence to host, store, reproduce, display, process and use that content as reasonably necessary to operate SyncroGo, provide requested services, maintain safety, investigate complaints, prevent fraud and abuse, improve the Platform, and comply with legal obligations. SyncroGo does not acquire ownership of your original personal content merely because you upload it.",
    },
    {
      heading: "20. Driver Documents",
      body: "Driver verification documents may be processed for identity verification, driver eligibility, vehicle verification, fraud prevention, safety, regulatory compliance, and platform operations. Access to verification information may be restricted according to operational and security requirements. SyncroGo will not publicly display complete identity or vehicle documents merely because a user becomes a verified Driver.",
    },
    {
      heading: "21. Third-Party Services",
      body: "SyncroGo may integrate third-party services including cloud hosting, maps and routing, authentication, email/SMS/OTP providers, payment providers, analytics, error monitoring, security services, and other infrastructure providers. Third-party services may have their own terms and privacy practices.",
    },
    {
      heading: "22. Intellectual Property",
      body: "SyncroGo and its associated name, logo, branding, website, application, software, designs, text, graphics, user interfaces, documentation and other original materials are protected by applicable intellectual-property laws. Except as expressly permitted, users may not copy, modify, distribute, reverse engineer, sell, license or commercially exploit SyncroGo's intellectual property.",
    },
    {
      heading: "23. Availability of the Platform",
      body: "SyncroGo may occasionally be unavailable because of maintenance, updates, security incidents, infrastructure failures, third-party service failures, network problems, force majeure events, or other operational reasons. SyncroGo does not guarantee uninterrupted or error-free operation.",
    },
    {
      heading: "24. No Guarantee of Ride Availability",
      body: "SyncroGo does not guarantee that a suitable ride will be available, that a Driver will accept a booking, that a Passenger will appear, that a ride will operate at the scheduled time, that a route will be followed exactly, that traffic conditions will remain unchanged, or that a particular user will be suitable for another user.",
    },
    {
      heading: "25. Safety and Platform Limitations",
      body: "SyncroGo uses reasonable platform-level measures intended to support safer shared transportation. However, no verification, rating, location service, automated matching system or SOS feature can eliminate all risks associated with travel with another person. Users should exercise reasonable judgment and follow applicable safety practices.",
    },
    {
      heading: "26. Limitation of Liability",
      body: "To the maximum extent permitted by applicable law, SyncroGo will not be responsible for indirect, incidental, special, consequential or punitive losses arising from use of the Platform. To the maximum extent permitted by applicable law, SyncroGo's liability for a particular claim will be limited to the amount actually paid by the affected user to SyncroGo for the relevant Platform service during the applicable period, except where such limitation is prohibited by law. Nothing in these Terms excludes or limits liability that cannot legally be excluded or limited.",
    },
    {
      heading: "27. Indemnity",
      body: "To the extent permitted by law, you agree to indemnify and hold harmless SyncroGo, its operators, employees, contractors and service providers against claims, losses, liabilities, damages and expenses arising from your violation of these Terms, your unlawful conduct, your misuse of the Platform, your fraud or misrepresentation, your violation of another person's rights, or your violation of applicable law. This clause does not require you to indemnify SyncroGo for SyncroGo's own liability where such indemnification would be unlawful.",
    },
    {
      heading: "28. Account Suspension and Termination",
      body: "SyncroGo may suspend, restrict or terminate an account where it reasonably believes that the user violated these Terms, engaged in fraud, created a safety risk, submitted false verification information, manipulated payments, abused another user, misused SOS or reporting functions, attempted unauthorised access, or created a significant legal, security or operational risk. Where appropriate, SyncroGo may provide notice and an opportunity to resolve the issue. Certain information may be retained after account termination where required or permitted by law or reasonably necessary for security, fraud prevention, dispute resolution or legal compliance.",
    },
    {
      heading: "29. Privacy",
      body: "Your use of SyncroGo is also governed by the SyncroGo Privacy Policy, which explains what information SyncroGo collects, why it is processed, how location information is used, how verification and payment information is handled, how information may be shared, retention, security, your rights, and how to withdraw consent or submit a grievance.",
    },
    {
      heading: "30. Cookies",
      body: "SyncroGo uses cookies and similar technologies as described in the SyncroGo Cookie Policy. Strictly necessary cookies may be required for core functionality. Optional analytics, preference or marketing technologies will be handled according to the applicable consent mechanism and your selected preferences.",
    },
    {
      heading: "31. Changes to These Terms",
      body: "SyncroGo may update these Terms from time to time. Material changes may be communicated through the Platform, email, notification or another appropriate method. Your continued use of SyncroGo after the effective date of updated Terms constitutes acceptance where legally permissible. Where a new affirmative consent is legally required, SyncroGo will obtain it.",
    },
    {
      heading: "32. Governing Law",
      body: "These Terms are governed by the laws of India. Subject to applicable consumer-protection and other mandatory laws, disputes will be subject to the courts having appropriate jurisdiction over the SyncroGo operating entity and/or the applicable transaction. Nothing in these Terms removes rights or remedies that cannot legally be excluded.",
    },
    {
      heading: "33. Grievance and Contact",
      body: "For questions, complaints, privacy requests, account issues or legal notices:",
      bullets: [
        `SyncroGo`,
        `Legal Entity: ${ENTITY.name}`,
        `Registered/Principal Office: ${ENTITY.address}`,
        `Support Email: ${ENTITY.supportEmail}`,
        `Privacy Email: ${ENTITY.privacyEmail}`,
        `Grievance Email: ${ENTITY.grievanceEmail}`,
      ],
      body_after:
        "SyncroGo will process grievances in accordance with applicable law and its applicable grievance procedures.",
    },
    {
      heading: "34. Entire Agreement",
      body: "These Terms, together with the Privacy Policy, Cookie Policy and any transaction-specific rules displayed through SyncroGo, constitute the agreement governing your use of the Platform, except where additional terms expressly apply. If any provision is held invalid or unenforceable, the remaining provisions will continue to the extent permitted by law.",
    },
  ],
  footerNote:
    "By using SyncroGo, you acknowledge that you have read and understood these Terms and agree to be bound by them.",
};

// ---------------------------------------------------------------------------
// PRIVACY POLICY
// ---------------------------------------------------------------------------

export const PRIVACY: LegalDoc = {
  id: "privacy",
  eyebrow: "Privacy Policy",
  title: "Your commute data should stay protected.",
  effectiveDate: EFFECTIVE_DATE,
  lastUpdated: LAST_UPDATED,
  intro:
    "This Privacy Policy explains how SyncroGo collects, uses, stores, shares and protects personal data when you use the SyncroGo website, mobile application and related services. For purposes of applicable Indian data-protection law, SyncroGo may act as the entity responsible for determining the purposes and means of processing personal data (\"Data Fiduciary\"), while certain service providers may process data on SyncroGo's behalf.",
  sections: [
    {
      heading: "1. Who We Are",
      bullets: [
        `SyncroGo`,
        `Legal Entity: ${ENTITY.name}`,
        `Address: ${ENTITY.address}`,
        `Website: ${ENTITY.website}`,
        `Privacy Contact: ${ENTITY.privacyEmail}`,
        `Grievance Contact: ${ENTITY.grievanceEmail}`,
      ],
      body_after:
        "If the legal entity operating SyncroGo changes, this Privacy Policy may be updated accordingly.",
    },
    {
      heading: "2. Scope",
      body: "This Privacy Policy applies to personal data collected through SyncroGo websites, mobile applications, ride searches, ride bookings, ride offers, driver verification, payments, customer support, safety/SOS features, ratings and reports, and other SyncroGo services that link to this Policy. It does not automatically apply to independent third-party services that have their own privacy policies.",
    },
    {
      heading: "3. Personal Data We May Collect",
      body: "Depending on how you use SyncroGo, we may collect the following categories.",
      sub: [
        {
          heading: "A. Account information",
          bullets: [
            "Name",
            "Email address",
            "Mobile number",
            "Password/authentication information",
            "Profile photograph",
            "Account identifiers",
            "Login and account activity",
          ],
        },
        {
          heading: "B. Ride information",
          bullets: [
            "Pickup location",
            "Drop-off location",
            "Destination",
            "Route information",
            "Ride date and time",
            "Booking information",
            "Seat information",
            "Fare information",
            "Ride status",
            "Cancellation information",
            "Ride history",
          ],
        },
        {
          heading: "C. Location information",
          body: "Where you enable the relevant permissions or use location-dependent features, we may process:",
          bullets: [
            "Approximate location",
            "Precise device location",
            "Pickup location",
            "Drop-off location",
            "Route information",
            "Ride-progress location",
            "Location associated with an SOS event",
          ],
          body_after:
            "Location collection may depend on device permissions and operating-system settings.",
        },
        {
          heading: "D. Driver verification information",
          body: "Drivers may be required to provide:",
          bullets: [
            "Identity information",
            "Driving licence information",
            "Vehicle Registration Certificate information",
            "Vehicle details",
            "Verification photographs/documents",
            "Other information necessary for eligibility or safety verification",
          ],
        },
        {
          heading: "E. Payment information",
          body: "Depending on the payment method, we may process:",
          bullets: [
            "Payment status",
            "Transaction identifier",
            "Payment method",
            "Amount",
            "Refund information",
            "Payment timestamps",
            "Cash-payment confirmation",
            "Platform-fee information",
          ],
          body_after:
            "Where payment is handled by a third-party payment provider, the provider may separately process payment credentials according to its own privacy terms. SyncroGo does not intend to store complete card credentials where those credentials are handled directly by the payment provider.",
        },
        {
          heading: "F. Safety information",
          bullets: [
            "Emergency contact details",
            "SOS event information",
            "Ride information associated with an SOS event",
            "Location associated with the safety event",
            "User-submitted safety reports",
          ],
        },
        {
          heading: "G. Communications",
          bullets: [
            "Support requests",
            "Complaints",
            "Reports",
            "Feedback",
            "Communications with SyncroGo",
          ],
        },
        {
          heading: "H. Technical information",
          bullets: [
            "IP address",
            "Device information",
            "Operating system",
            "Browser/app version",
            "Device identifiers",
            "Crash information",
            "Log information",
            "Security events",
            "Approximate network information",
          ],
        },
        {
          heading: "I. Cookies and similar technologies",
          body: "We may collect information through cookies, local storage, SDKs and similar technologies. See the SyncroGo Cookie Policy for details.",
        },
      ],
    },
    {
      heading: "4. Why We Process Personal Data",
      sub: [
        {
          heading: "4.1 Account creation and authentication",
          body: "To create accounts, verify users, authenticate logins, send OTPs, recover accounts and protect accounts.",
        },
        {
          heading: "4.2 Ride matching",
          body: "To find suitable rides, match routes, display nearby rides, calculate or compare route information, and coordinate pickups and destinations.",
        },
        {
          heading: "4.3 Ride operation",
          body: "To create bookings, confirm rides, display ride status, coordinate Drivers and Passengers, record cancellations, maintain ride history and support dispute resolution.",
        },
        {
          heading: "4.4 Driver verification",
          body: "To verify driver identity, driving eligibility and vehicle information, prevent fraud, support platform safety, and meet legal or operational requirements.",
        },
        {
          heading: "4.5 Payments",
          body: "To process digital payments, record payment status, process refunds where applicable, record cash payments, calculate applicable platform fees, detect payment fraud and resolve payment disputes.",
        },
        {
          heading: "4.6 Safety",
          body: "To provide SOS functionality, share relevant ride/location information when a safety feature is activated, investigate safety reports, prevent abuse and respond to safety incidents.",
        },
        {
          heading: "4.7 Communications",
          body: "To send booking notifications, OTPs, service messages, respond to support requests, and communicate important account or safety information.",
        },
        {
          heading: "4.8 Security and fraud prevention",
          body: "To detect suspicious activity, prevent account takeover, detect payment manipulation, detect fake accounts, investigate abuse, and protect SyncroGo users and infrastructure.",
        },
        {
          heading: "4.9 Service improvement",
          body: "Where permitted and appropriately consented, we may use information to understand Platform usage, identify technical problems, improve matching, performance and user experience, and develop new features.",
        },
        {
          heading: "4.10 Legal compliance",
          body: "We may process or retain information where required or authorised by applicable law, lawful government requests, court orders, dispute resolution requirements, fraud prevention, security obligations or other lawful purposes.",
        },
      ],
    },
    {
      heading: "5. Consent",
      body: "Where consent is the legal basis for processing, SyncroGo will request consent using a clear affirmative action. Consent will be specific, informed, unambiguous, limited to the relevant purpose, and limited to the personal data necessary for that purpose.",
      body_after:
        "Where processing is necessary for providing a service, SyncroGo may also rely on another lawful basis available under applicable law rather than seeking unnecessary consent.",
    },
    {
      heading: "6. Withdrawal of Consent",
      body: "Where processing is based on consent, you may withdraw consent through the applicable SyncroGo privacy/consent controls or by contacting us. Withdrawal will be handled with an ease comparable to giving consent where required by law. Withdrawal may affect the availability of features that require the relevant data. Withdrawal does not invalidate processing that was lawfully carried out before withdrawal.",
    },
    {
      heading: "7. Location Privacy",
      body: "Location data is particularly important to SyncroGo because ride matching and safety functionality depend on location. SyncroGo may use location to find rides near you, match your route, determine pickup/drop-off, display ride progress, support navigation, provide safety functionality, and associate an SOS alert with a ride.",
      body_after:
        "We will not use precise location for unrelated purposes merely because you enabled location for ride functionality. You can generally control device location permissions through your device settings.",
    },
    {
      heading: "8. Sharing Personal Data",
      sub: [
        {
          heading: "A. Other SyncroGo users",
          body: "For example, information necessary to facilitate a confirmed ride may be shown to the Driver or Passenger. The information shared should be limited to what is reasonably necessary for the ride.",
        },
        {
          heading: "B. Service providers",
          body: "We may use third parties for cloud hosting, database infrastructure, maps/routing, payment processing, email, SMS/OTP, authentication, analytics, error monitoring, security and customer support. These providers may process personal data on SyncroGo's behalf.",
        },
        {
          heading: "C. Authorities and legal processes",
          body: "We may disclose information where required or authorised by applicable law, lawful orders, investigations, court processes or emergency circumstances.",
        },
        {
          heading: "D. Business transactions",
          body: "If SyncroGo undergoes a merger, acquisition, restructuring, financing, sale of assets or similar transaction, personal data may be transferred as part of that transaction subject to applicable law.",
        },
      ],
    },
    {
      heading: "9. What We Do Not Do",
      bullets: [
        "SyncroGo does not sell your personal data merely because you use the Platform",
        "We do not intentionally expose complete Driver verification documents publicly",
        "We do not intentionally disclose precise location to unrelated users when that information is not required for the applicable feature",
      ],
    },
    {
      heading: "10. Data Retention",
      body: "We retain personal data only for as long as reasonably necessary for the purposes described in this Policy, or for periods required or permitted by applicable law.",
      bullets: [
        "Account status",
        "Ride history",
        "Payment requirements",
        "Safety investigations",
        "Fraud prevention",
        "Legal obligations",
        "Dispute resolution",
        "Security requirements",
      ],
      body_after:
        "Certain information may need to be retained after account deletion where required by law or reasonably necessary for legitimate security, fraud-prevention or dispute-resolution purposes. Applicable intermediary obligations may also require certain records to be retained for specified periods where those obligations apply to SyncroGo.",
    },
    {
      heading: "11. Account Deletion",
      body: "You may request deletion of your SyncroGo account through the available account controls or by contacting SyncroGo. Deletion may result in account deactivation, removal or anonymisation of certain information, loss of access to account features, and loss of access to certain historical information. SyncroGo may retain information where legally required or otherwise permitted for security, fraud prevention, disputes, legal claims or compliance.",
    },
    {
      heading: "12. Data Security",
      body: "SyncroGo uses reasonable technical and organisational measures intended to protect personal data against unauthorised access, loss, misuse, alteration, disclosure and destruction.",
      bullets: [
        "Authentication controls",
        "Access restrictions",
        "Encryption where appropriate",
        "Logging",
        "Secure infrastructure",
        "Monitoring",
        "Backup and recovery controls",
        "Security reviews",
      ],
      body_after: "No online system can guarantee absolute security.",
    },
    {
      heading: "13. Data Breaches",
      body: "If a personal-data breach occurs, SyncroGo will respond according to applicable legal requirements, including any required notifications to affected persons or authorities.",
    },
    {
      heading: "14. Children's Data",
      body: "SyncroGo is intended for users who meet the applicable age and legal requirements for using the Service. SyncroGo does not intentionally seek to collect children's personal data for independent account creation where such collection is prohibited by applicable law. If you believe a child has provided personal data in violation of applicable requirements, contact us.",
    },
    {
      heading: "15. User Rights",
      body: "Subject to applicable law and its conditions, users may have rights relating to access to personal data, correction/update, erasure/deletion, withdrawal of consent, grievance redressal, and other rights provided by applicable data-protection law.",
      bullets: [
        `Privacy: ${ENTITY.privacyEmail}`,
        `Grievance: ${ENTITY.grievanceEmail}`,
      ],
      body_after: "We may need to verify your identity before processing a request.",
    },
    {
      heading: "16. Grievance Redressal",
      bullets: [
        `Grievance Officer: ${ENTITY.grievanceOfficer}`,
        `Email: ${ENTITY.grievanceEmail}`,
        `Address: ${ENTITY.address}`,
      ],
      body:
        "Please include: your name; registered email/mobile; description of the issue; relevant booking/account reference, if applicable; and requested resolution. We will handle grievances according to applicable law and our internal grievance process.",
    },
    {
      heading: "17. International Processing",
      body: "Some SyncroGo service providers may process information from locations outside India. Where personal data is transferred or processed outside India, SyncroGo will comply with applicable legal requirements concerning such processing or transfer.",
    },
    {
      heading: "18. Third-Party Links and Services",
      body: "SyncroGo may contain links or integrations to third-party services. SyncroGo is not responsible for the privacy practices of independent third parties. Users should review the applicable third-party privacy policies.",
    },
    {
      heading: "19. Changes to This Privacy Policy",
      body: "We may update this Privacy Policy to reflect changes to SyncroGo, new features, changes in law, security improvements, and changes to data processing. Material changes may be communicated through the Platform or another appropriate method. Where legally required, SyncroGo will obtain fresh consent.",
    },
    {
      heading: "20. Contact",
      bullets: [
        `Legal Entity: ${ENTITY.name}`,
        `Address: ${ENTITY.address}`,
        `Website: ${ENTITY.website}`,
        `Privacy Email: ${ENTITY.privacyEmail}`,
        `Grievance Email: ${ENTITY.grievanceEmail}`,
        `Support Email: ${ENTITY.supportEmail}`,
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// COOKIE POLICY
// ---------------------------------------------------------------------------

export const COOKIE_POLICY: LegalDoc = {
  id: "cookies",
  eyebrow: "Cookie Policy",
  title: "Cookies keep SyncroGo working — you choose the rest.",
  effectiveDate: EFFECTIVE_DATE,
  lastUpdated: LAST_UPDATED,
  intro:
    "This Cookie Policy explains how SyncroGo uses cookies and similar technologies on its website and, where applicable, within its applications.",
  sections: [
    {
      heading: "1. What Are Cookies?",
      body: "Cookies are small data files stored on your device when you visit a website. SyncroGo may also use similar technologies such as:",
      bullets: [
        "Local storage",
        "Session storage",
        "Software development kits (SDKs)",
        "Pixels",
        "Device identifiers",
        "Log technologies",
        "Similar technologies",
      ],
    },
    {
      heading: "2. Why SyncroGo Uses Cookies",
      bullets: [
        "Security",
        "Authentication",
        "Maintaining login sessions",
        "Remembering preferences",
        "Website functionality",
        "Performance monitoring",
        "Analytics",
        "Fraud prevention",
        "Improving the user experience",
      ],
    },
    {
      heading: "3. Cookie Categories",
      sub: [
        {
          heading: "3.1 Strictly necessary cookies",
          body: "These cookies are necessary for core functionality. They may support login, authentication, session management, security, fraud prevention, consent preferences, and basic website functionality. These cookies cannot normally be disabled through the cookie-preference tool because the Platform may not function correctly without them.",
        },
        {
          heading: "3.2 Preference cookies",
          body: "These cookies remember choices such as language, interface preferences, display settings, and other selected preferences. They will be used according to your selected preferences where consent is required.",
        },
        {
          heading: "3.3 Analytics cookies",
          body: "Analytics technologies may help SyncroGo understand which pages are used, how users navigate the website, performance problems, feature usage, and general traffic patterns. Analytics cookies remain disabled until you provide the applicable consent.",
        },
        {
          heading: "3.4 Marketing cookies",
          body: "If SyncroGo uses marketing or advertising technologies, these may be used to measure advertising campaigns, understand marketing performance, deliver or measure relevant advertising, and limit repeated advertisements. Marketing cookies remain disabled unless you provide the applicable consent. If SyncroGo does not use marketing cookies, this category is removed from the live Cookie Settings interface.",
        },
      ],
    },
    {
      heading: "4. Cookie Preference Controls",
      body: "You can accept all optional cookies, reject optional cookies, select individual categories, change preferences later, and withdraw consent — all from the cookie settings panel linked in the footer and the consent banner. Changing cookie preferences does not necessarily delete cookies already stored on your device; browser/device controls may also be required to remove existing cookies.",
    },
    {
      heading: "5. Third-Party Cookies",
      body: "Some SyncroGo features may use third-party services such as analytics providers, maps providers, payment providers, security providers, authentication providers, and customer-support providers. Third-party providers may use their own cookies or technologies according to their respective policies. SyncroGo will disclose relevant third-party technologies in its cookie-management mechanism where appropriate.",
    },
    {
      heading: "6. Browser Controls",
      body: "Most browsers allow you to block cookies, delete cookies, block third-party cookies, and receive cookie notifications. Blocking necessary cookies may prevent parts of SyncroGo from functioning.",
    },
    {
      heading: "7. Changes to This Cookie Policy",
      body: "SyncroGo may update this Cookie Policy when cookie technologies change, new features are introduced, third-party services change, or legal requirements change. The latest version will be published on the SyncroGo website.",
    },
  ],
};

// ---------------------------------------------------------------------------
// CONSENT WORDING — the exact strings shown at each consent point
// ---------------------------------------------------------------------------

/**
 * Every entry here MUST match what is rendered in the UI, because the backend
 * records the purpose key alongside the policy version. Changing wording is a
 * policy-version event, not a cosmetic one.
 */
export const CONSENT_COPY = {
  registration_required:
    "I agree to the SyncroGo Terms & Conditions and acknowledge the Privacy Policy.",
  registration_optional_data:
    "I consent to SyncroGo processing my personal data for the specific purposes described in the Privacy Policy.",
  cookies_banner_title: "We use cookies",
  cookies_banner_body:
    "SyncroGo uses strictly necessary cookies to keep the website secure and functional. With your permission, we may also use preference and analytics cookies to improve your experience and understand how the Platform is used.",
  cookies_banner_body_marketing:
    " If we use marketing cookies, we will request separate consent for them.",
  location_prompt:
    "SyncroGo uses your location to find nearby rides, match your route, set pickup and drop-off locations, support ride navigation, and provide applicable safety features. You can manage location permissions through your device settings.",
  background_location_prompt:
    "For features that require location while a ride is active, SyncroGo may use your location in the background to support ride progress and safety functionality.",
  sos_notice:
    "When you activate SyncroGo's SOS or applicable safety feature, SyncroGo may share relevant information such as your ride details and current/available location with the people or services specified by that feature. SOS functionality depends on your device, network connectivity and permissions. For urgent emergencies in India, contact 112 or the appropriate emergency service.",
  driver_verification:
    "To offer rides as a Driver, SyncroGo may need to process your identity, driving licence, vehicle registration and related verification information. This information is used for driver/vehicle verification, safety, fraud prevention, platform operations and applicable legal compliance as described in the Privacy Policy.",
  driver_verification_ack:
    "I confirm that the information and documents I provide are accurate and belong to me or the vehicle I am authorised to operate.",
  cash_payment_ack:
    "I understand that cash payment must be made directly to the Driver and that I must not falsely report payment status.",
};

/** Purposes shown in the consent preference panel, with plain-language labels. */
export const CONSENT_PURPOSES = [
  {
    key: "cookies",
    label: "Preference & analytics cookies",
    description:
      "Remember your settings and help us understand general Platform usage. Strictly necessary cookies are always active.",
    required: false,
  },
  {
    key: "marketing_email",
    label: "Marketing emails",
    description:
      "Occasional product news, offers and community updates. Ride confirmations and OTPs are never affected by this switch.",
    required: false,
  },
  {
    key: "location",
    label: "Location sharing",
    description:
      "Find nearby rides, match your route, coordinate pickup and support ride navigation and safety features.",
    required: false,
  },
  {
    key: "documents",
    label: "Document processing",
    description:
      "Review your identity, licence and vehicle documents to verify you as a driver and prevent fraud. Required to offer rides.",
    required: false,
  },
  {
    key: "sms",
    label: "SMS / phone messages",
    description:
      "Send OTPs and urgent ride or safety alerts to your mobile number.",
    required: false,
  },
  {
    key: "terms",
    label: "Terms & Conditions",
    description: "Required to hold a SyncroGo account.",
    required: true,
  },
  {
    key: "privacy",
    label: "Privacy Policy",
    description: "Required to hold a SyncroGo account.",
    required: true,
  },
] as const;

export type ConsentPurposeKey =
  | "terms"
  | "privacy"
  | "cookies"
  | "marketing_email"
  | "location"
  | "documents"
  | "sms";