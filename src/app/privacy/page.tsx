import React from 'react';
import type { Metadata } from 'next';
import { LegalShell, type LegalSection } from '@/components/marketing/legal-shell';
import { CONTACT, LEGAL_UPDATED, SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: `How ${SITE.name} collects, uses and protects your data.`,
  alternates: { canonical: `${SITE.url}/privacy` },
};

const SECTIONS: LegalSection[] = [
  {
    id: 'information-we-collect',
    title: 'Information we collect',
    body: (
      <>
        <p>
          We collect information you give us directly, and a limited amount generated
          automatically when you use the service.
        </p>
        <ul>
          <li>
            <strong>Account information</strong> — your name, email address and workspace
            details, provided when you sign up or update your profile.
          </li>
          <li>
            <strong>Workspace content</strong> — the clients, projects, invoices, files,
            messages and notes you create. This is your data; we store and process it on your
            behalf.
          </li>
          <li>
            <strong>Client-submitted content</strong> — briefs, feedback and files sent by your
            clients through the secure links you share with them.
          </li>
          <li>
            <strong>Technical data</strong> — IP address, browser type and timestamps, recorded
            in server and security logs.
          </li>
        </ul>
        <p>
          We do not collect or store full payment card numbers. Where payments are processed,
          they are handled by the payment provider, not by us.
        </p>
      </>
    ),
  },
  {
    id: 'how-we-use-information',
    title: 'How we use your information',
    body: (
      <>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Provide, operate and maintain the service and the features you enable.</li>
          <li>Generate and deliver invoices, receipts and other documents you create.</li>
          <li>
            Send technical notices, security alerts, and support and administrative messages.
          </li>
          <li>Respond to your questions and support requests.</li>
          <li>
            Detect, investigate and prevent abuse, fraud and activity that threatens the
            security of the service.
          </li>
          <li>
            Understand aggregate usage patterns so we can improve the product. This analysis is
            performed on aggregated data and is not used to profile individuals.
          </li>
        </ul>
        <p>
          <strong>We do not sell your personal information</strong>, and we do not use your
          workspace content to advertise to you or to anyone else.
        </p>
      </>
    ),
  },
  {
    id: 'legal-basis',
    title: 'Why we are allowed to process it',
    body: (
      <>
        <p>Where data protection law requires a legal basis, we rely on the following:</p>
        <ul>
          <li>
            <strong>Performance of a contract</strong> — processing needed to give you the
            service you signed up for.
          </li>
          <li>
            <strong>Legitimate interests</strong> — keeping the service secure, preventing
            abuse, and improving how it works.
          </li>
          <li>
            <strong>Legal obligation</strong> — retaining billing records where the law
            requires it.
          </li>
          <li>
            <strong>Consent</strong> — for optional features you explicitly turn on, such as
            browser push notifications. You can withdraw consent at any time.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'service-providers',
    title: 'Service providers we share data with',
    body: (
      <>
        <p>
          We use a small number of infrastructure providers to run the service. They process
          data only on our instructions and only as needed to perform their function:
        </p>
        <ul>
          <li>
            <strong>Clerk</strong> — user authentication and workspace membership.
          </li>
          <li>
            <strong>Supabase</strong> — the primary database where workspace data is stored.
          </li>
          <li>
            <strong>Vercel</strong> — application hosting and file storage.
          </li>
          <li>
            <strong>Resend</strong> — delivery of transactional email such as invoices and
            feedback requests.
          </li>
          <li>
            <strong>Ably</strong> — realtime delivery of messages and notifications.
          </li>
          <li>
            <strong>OneSignal</strong> — browser push notifications, where you have enabled
            them.
          </li>
          <li>
            <strong>Upstash</strong> — rate limiting and scheduled background jobs.
          </li>
        </ul>
        <p>
          We may also disclose information where we are legally required to do so, or where it
          is necessary to protect our rights or the safety of users. If the service is ever
          involved in a merger or acquisition, we will give notice before your information
          becomes subject to a different privacy policy.
        </p>
      </>
    ),
  },
  {
    id: 'data-security',
    title: 'Data security',
    body: (
      <>
        <p>
          Data is encrypted in transit using TLS and encrypted at rest by our database and
          storage providers. Access to production systems is restricted to those who need it.
        </p>
        <p>
          Each workspace is isolated: server-side queries are scoped to your workspace, and
          realtime channels are authorised per user, so members of your organisation can only
          reach the conversations and projects they have been granted access to.
        </p>
        <p>
          No method of transmission or storage is completely secure. While we work to protect
          your information, we cannot guarantee absolute security. If we become aware of a
          breach affecting your personal data, we will notify you without undue delay.
        </p>
      </>
    ),
  },
  {
    id: 'data-retention',
    title: 'How long we keep it',
    body: (
      <>
        <p>
          We keep your workspace data for as long as your account is active. If you close your
          account, we delete or anonymise your data within 90 days, except where we are
          required to retain records — billing and tax records, for example — for longer.
        </p>
        <p>
          Downgrading a plan does not delete anything. Content beyond your new plan&apos;s
          limits becomes read-only rather than being removed.
        </p>
        <p>Backups are retained on a rolling basis and expire automatically.</p>
      </>
    ),
  },
  {
    id: 'your-rights',
    title: 'Your rights',
    body: (
      <>
        <p>
          Depending on where you live, you may have the right to access, correct, export or
          delete your personal information, to object to or restrict certain processing, and to
          withdraw consent you previously gave.
        </p>
        <p>
          You can update most account information directly in your dashboard settings. For
          anything else — including a full export or deletion of your workspace — email{' '}
          <a href={`mailto:${CONTACT.support}`}>{CONTACT.support}</a> and we will respond within
          30 days.
        </p>
      </>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies and local storage',
    body: (
      <>
        <p>
          We use cookies and browser storage only for functional purposes: keeping you signed
          in, remembering your workspace and theme preference, and protecting forms against
          abuse. We do not use advertising or cross-site tracking cookies.
        </p>
        <p>
          Blocking these cookies in your browser will prevent you from staying signed in to the
          service.
        </p>
      </>
    ),
  },
  {
    id: 'children',
    title: "Children's privacy",
    body: (
      <p>
        The service is intended for business use and is not directed at children under 16. We do
        not knowingly collect personal information from children. If you believe a child has
        provided us information, contact us and we will delete it.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: (
      <p>
        We may update this policy as the service evolves. When we make material changes, we will
        revise the date at the top of this page and, where the change significantly affects your
        rights, notify you by email or in the dashboard before it takes effect.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact us',
    body: (
      <p>
        Questions about this policy or how your data is handled? Email{' '}
        <a href={`mailto:${CONTACT.support}`}>{CONTACT.support}</a> and we will get back to you
        during support hours ({CONTACT.hours}, {CONTACT.timezone}).
      </p>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalShell
      title="Privacy Policy"
      intro={`How ${SITE.name} collects, uses, shares and protects information — written to be read, not skimmed past.`}
      updated={LEGAL_UPDATED.privacy}
      sections={SECTIONS}
    />
  );
}
