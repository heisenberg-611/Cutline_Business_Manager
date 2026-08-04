import React from 'react';
import type { Metadata } from 'next';
import { LegalShell, type LegalSection } from '@/components/marketing/legal-shell';
import { CONTACT, LEGAL_UPDATED, SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: `The terms that govern your use of ${SITE.name}.`,
  alternates: { canonical: `${SITE.url}/terms` },
};

const SECTIONS: LegalSection[] = [
  {
    id: 'acceptance',
    title: 'Acceptance of these terms',
    body: (
      <p>
        By creating an account or using {SITE.name} (&quot;the Service&quot;), you agree to these
        Terms of Service. If you are agreeing on behalf of a company or organisation, you
        confirm you have the authority to bind it. If you do not agree to these terms, do not
        use the Service.
      </p>
    ),
  },
  {
    id: 'the-service',
    title: 'What the Service provides',
    body: (
      <>
        <p>
          {SITE.name} provides project management, client management, invoicing, feedback
          collection and team collaboration tools for creative professionals and studios.
        </p>
        <p>
          We continue to develop the Service, and features may be added, changed or removed. We
          will give reasonable notice before removing or materially degrading a feature you
          actively rely on.
        </p>
      </>
    ),
  },
  {
    id: 'accounts',
    title: 'Your account',
    body: (
      <>
        <p>
          You must provide accurate and current information when you create an account, and keep
          it up to date. You are responsible for all activity that occurs under your account.
        </p>
        <p>
          You are responsible for safeguarding your login credentials. Tell us promptly at{' '}
          <a href={`mailto:${CONTACT.support}`}>{CONTACT.support}</a> if you believe your account
          has been accessed without your authorisation.
        </p>
        <p>
          Workspace administrators can invite members and control their access. If you invite
          someone to your workspace, you are responsible for what they do within it.
        </p>
      </>
    ),
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable use',
    body: (
      <>
        <p>You agree not to use the Service to:</p>
        <ul>
          <li>Break the law or infringe anyone&apos;s intellectual property rights.</li>
          <li>Upload malware, or content that is unlawful, abusive or deliberately harmful.</li>
          <li>
            Attempt to access another workspace&apos;s data, probe or bypass our security
            controls, or interfere with the operation of the Service.
          </li>
          <li>
            Resell or redistribute the Service, or use automated means to extract data at a
            scale that degrades it for others.
          </li>
          <li>Send unsolicited bulk email through the Service.</li>
        </ul>
        <p>
          We may suspend accounts that breach this section, with notice where circumstances
          reasonably allow it.
        </p>
      </>
    ),
  },
  {
    id: 'your-content',
    title: 'Your content',
    body: (
      <>
        <p>
          You retain all rights to the content you and your clients put into the Service. We
          claim no ownership over it.
        </p>
        <p>
          You grant us a limited licence to host, store, transmit, display and back up your
          content strictly as needed to operate the Service for you. This licence ends when you
          delete the content or close your account.
        </p>
        <p>
          You are responsible for having the right to upload the content you put in, including
          material supplied by your clients.
        </p>
      </>
    ),
  },
  {
    id: 'plans-and-payment',
    title: 'Plans, billing and trials',
    body: (
      <>
        <p>
          The Service offers a free plan and paid subscription plans. Paid plans are billed in
          advance on a recurring basis at the price shown at the time of purchase, in
          Bangladeshi Taka (৳).
        </p>
        <p>
          Free trials are available once per account. When a trial ends, the account returns to
          the free plan unless a paid plan is active.
        </p>
        <p>
          You can cancel at any time from your dashboard. Cancellation stops future billing and
          takes effect at the end of the current billing period; access continues until then.
          Payments already made are non-refundable except where required by law or where we
          have failed to provide the Service.
        </p>
        <p>
          We may change prices. Existing subscribers will be given at least 30 days&apos; notice
          before a price change applies to them.
        </p>
      </>
    ),
  },
  {
    id: 'downgrade-and-termination',
    title: 'Downgrade, suspension and termination',
    body: (
      <>
        <p>
          If you downgrade, content beyond your new plan&apos;s limits becomes read-only rather
          than being deleted, and paid-only features are locked until you upgrade again.
        </p>
        <p>
          You may close your account at any time. We may suspend or terminate an account that
          materially breaches these terms, or where required by law. Except in cases of serious
          abuse, we will give you notice and a chance to put things right first.
        </p>
        <p>
          After termination you may request an export of your data for 30 days. See the{' '}
          <a href="/privacy">Privacy Policy</a> for how long data is retained.
        </p>
      </>
    ),
  },
  {
    id: 'availability',
    title: 'Availability and support',
    body: (
      <>
        <p>
          We work to keep the Service available and reliable, but it is provided without a
          guaranteed uptime commitment unless separately agreed in writing.
        </p>
        <p>
          Support is available by email at{' '}
          <a href={`mailto:${CONTACT.support}`}>{CONTACT.support}</a> during {CONTACT.hours} (
          {CONTACT.timezone}). We may need to perform maintenance that temporarily interrupts
          the Service, and will schedule it to minimise disruption where we can.
        </p>
      </>
    ),
  },
  {
    id: 'our-ip',
    title: 'Our intellectual property',
    body: (
      <p>
        The Service itself — its software, design, branding and documentation — remains our
        property. These terms grant you a right to use the Service, not any ownership of it. You
        may not copy, reverse-engineer or create derivative works from the Service except to the
        extent that restriction is unenforceable under applicable law.
      </p>
    ),
  },
  {
    id: 'disclaimer',
    title: 'Disclaimer of warranties',
    body: (
      <p>
        The Service is provided &quot;as is&quot; and &quot;as available&quot;, without
        warranties of any kind, whether express or implied, including implied warranties of
        merchantability, fitness for a particular purpose and non-infringement. We do not warrant
        that the Service will be uninterrupted, error-free, or that it will meet your specific
        requirements. Nothing in these terms excludes a warranty that cannot be excluded by law.
      </p>
    ),
  },
  {
    id: 'liability',
    title: 'Limitation of liability',
    body: (
      <>
        <p>
          To the maximum extent permitted by law, {SITE.name} and its directors, employees,
          partners, agents and suppliers will not be liable for any indirect, incidental,
          special, consequential or punitive damages, including loss of profits, revenue, data,
          goodwill or other intangible losses, arising from your use of or inability to use the
          Service.
        </p>
        <p>
          Our total aggregate liability arising out of or relating to these terms will not
          exceed the greater of the amount you paid us in the twelve months before the event
          giving rise to the claim, or ৳5,000.
        </p>
        <p>
          These limits do not apply to liability for death or personal injury caused by
          negligence, for fraud, or to any other liability that cannot be limited by law. You
          remain responsible for keeping your own copies of business-critical records.
        </p>
      </>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to these terms',
    body: (
      <p>
        We may revise these terms as the Service develops. When we make material changes we will
        update the date at the top of this page and notify you by email or in the dashboard
        before the changes take effect. Continuing to use the Service after that point means you
        accept the revised terms.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact',
    body: (
      <p>
        Questions about these terms? Email{' '}
        <a href={`mailto:${CONTACT.support}`}>{CONTACT.support}</a>.
      </p>
    ),
  },
];

export default function TermsOfServicePage() {
  return (
    <LegalShell
      title="Terms of Service"
      intro={`The agreement between you and ${SITE.name} covering accounts, billing, your content and what each of us is responsible for.`}
      updated={LEGAL_UPDATED.terms}
      sections={SECTIONS}
    />
  );
}
