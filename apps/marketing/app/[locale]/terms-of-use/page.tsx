import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { Link } from '@/lib/i18n/navigation'
import { ArrowLeft } from 'lucide-react'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params
    setRequestLocale(locale)
    return {
        title: 'Terms of Use - Athli',
    }
}

export default async function TermsOfUsePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="w-full max-w-4xl py-16 px-6 md:py-24 bg-white dark:bg-black">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground mb-8 inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to home
        </Link>
        <h1 className="text-3xl font-semibold md:text-4xl text-black dark:text-zinc-50">
          Terms of Use
        </h1>
        <p className="text-muted-foreground text-sm mt-2">Last updated: February 3, 2026</p>

        {/* Table of Contents */}
        <nav className="mt-8 p-4 bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <h2 className="font-medium mb-3 text-black dark:text-zinc-50">Table of Contents</h2>
          <ol className="list-decimal list-inside space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
            <li><a href="#introduction" className="hover:text-primary">Introduction & Acceptance</a></li>
            <li><a href="#description" className="hover:text-primary">Description of Services</a></li>
            <li><a href="#accounts" className="hover:text-primary">Account Registration & Security</a></li>
            <li><a href="#user-responsibilities" className="hover:text-primary">User Responsibilities & Conduct</a></li>
            <li><a href="#intellectual-property" className="hover:text-primary">Content & Intellectual Property</a></li>
            <li><a href="#fees" className="hover:text-primary">Fees & Payment</a></li>
            <li><a href="#third-party" className="hover:text-primary">Third-Party Services</a></li>
            <li><a href="#privacy" className="hover:text-primary">Privacy & Data Protection</a></li>
            <li><a href="#disclaimers" className="hover:text-primary">Disclaimers</a></li>
            <li><a href="#liability" className="hover:text-primary">Limitation of Liability</a></li>
            <li><a href="#indemnification" className="hover:text-primary">Indemnification</a></li>
            <li><a href="#termination" className="hover:text-primary">Term & Termination</a></li>
            <li><a href="#disputes" className="hover:text-primary">Dispute Resolution</a></li>
            <li><a href="#modifications" className="hover:text-primary">Modifications to Terms</a></li>
            <li><a href="#general" className="hover:text-primary">General Provisions</a></li>
            <li><a href="#contact" className="hover:text-primary">Contact Information</a></li>
          </ol>
        </nav>

        {/* 1. Introduction & Acceptance */}
        <section id="introduction">
          <h2 className="text-2xl font-semibold mt-12 mb-4 text-black dark:text-zinc-50">1. Introduction & Acceptance</h2>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            Welcome to Athli. These Terms of Use (&quot;Terms&quot;) govern your access to and use of the Athli platform, including our web application, mobile application, and website (collectively, the &quot;Services&quot;).
          </p>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7 mt-4">
            By accessing or using our Services, you agree to be bound by these Terms. If you do not agree to these Terms, you may not access or use our Services.
          </p>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7 mt-4">
            These Terms constitute a legally binding agreement between you and Athli (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). The Services are intended for use by:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4 text-zinc-600 dark:text-zinc-400 mt-4">
            <li><strong>Coaches:</strong> Fitness professionals who use Athli to manage clients and deliver training programs</li>
            <li><strong>Clients:</strong> Individuals who receive coaching services through the platform</li>
          </ul>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7 mt-4">
            By creating an account or using our Services, you acknowledge that you have read, understood, and agree to be bound by these Terms, as well as our Privacy Policy.
          </p>
        </section>

        {/* 2. Description of Services */}
        <section id="description">
          <h2 className="text-2xl font-semibold mt-12 mb-4 text-black dark:text-zinc-50">2. Description of Services</h2>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            Athli is a fitness coaching platform that provides tools for coaches to manage their clients and deliver personalized training programs.
          </p>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Coach Features</h3>
          <ul className="list-disc list-inside space-y-2 ml-4 text-zinc-600 dark:text-zinc-400">
            <li>Client management and organization</li>
            <li>Custom workout program creation and assignment</li>
            <li>Exercise library with custom exercise support</li>
            <li>Progress tracking and analytics</li>
            <li>Client messaging and communication</li>
            <li>Check-in forms and questionnaires</li>
            <li>File sharing and document management</li>
          </ul>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Client Features</h3>
          <ul className="list-disc list-inside space-y-2 ml-4 text-zinc-600 dark:text-zinc-400">
            <li>Access to assigned workout programs</li>
            <li>Workout logging and tracking</li>
            <li>Progress photo uploads</li>
            <li>Habit tracking (sleep, water, steps, etc.)</li>
            <li>Body metric logging</li>
            <li>Direct messaging with coach</li>
            <li>Check-in submissions</li>
          </ul>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Service Availability</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            We strive to maintain high availability of our Services but do not guarantee uninterrupted access. We may modify, suspend, or discontinue any part of our Services at any time with reasonable notice.
          </p>

          <div className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 my-4">
            <p className="text-zinc-600 dark:text-zinc-400">
              <strong className="text-black dark:text-zinc-50">Important:</strong> Athli is a software platform that facilitates the coach-client relationship. Athli is not a healthcare provider, medical professional, or fitness certification body. All training advice and programs are provided by individual coaches, not by Athli.
            </p>
          </div>
        </section>

        {/* 3. Account Registration & Security */}
        <section id="accounts">
          <h2 className="text-2xl font-semibold mt-12 mb-4 text-black dark:text-zinc-50">3. Account Registration & Security</h2>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Eligibility</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            To use our Services, you must be at least 16 years of age. If you are between 16 and 18 years of age, you represent that you have your parent or guardian&apos;s consent to use the Services.
          </p>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Account Types</h3>
          <ul className="list-disc list-inside space-y-2 ml-4 text-zinc-600 dark:text-zinc-400">
            <li><strong>Coach accounts:</strong> For fitness professionals providing coaching services</li>
            <li><strong>Client accounts:</strong> For individuals receiving coaching services, typically invited by a coach</li>
          </ul>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Account Security</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            You are responsible for:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4 text-zinc-600 dark:text-zinc-400 mt-4">
            <li>Maintaining the confidentiality of your login credentials</li>
            <li>All activities that occur under your account</li>
            <li>Notifying us immediately of any unauthorized access</li>
            <li>Using a strong, unique password</li>
          </ul>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Coach-Client Relationships</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            Coach-client relationships are established within the platform when a coach invites a client or a client accepts a coach&apos;s invitation. Athli facilitates but does not supervise, control, or mediate these relationships.
          </p>
        </section>

        {/* 4. User Responsibilities & Conduct */}
        <section id="user-responsibilities">
          <h2 className="text-2xl font-semibold mt-12 mb-4 text-black dark:text-zinc-50">4. User Responsibilities & Conduct</h2>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">General Responsibilities</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            All users agree to:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4 text-zinc-600 dark:text-zinc-400 mt-4">
            <li>Provide accurate and complete information</li>
            <li>Keep account information up to date</li>
            <li>Use the Services only for lawful purposes</li>
            <li>Respect the rights of other users</li>
            <li>Comply with all applicable laws and regulations</li>
          </ul>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Coach-Specific Responsibilities</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            Coaches additionally agree to:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4 text-zinc-600 dark:text-zinc-400 mt-4">
            <li>Hold appropriate qualifications and certifications for providing fitness coaching</li>
            <li>Operate within their scope of practice and expertise</li>
            <li>Not provide medical advice, diagnosis, or treatment</li>
            <li>Refer clients to medical professionals when appropriate</li>
            <li>Maintain client confidentiality</li>
            <li>Provide safe and appropriate training recommendations</li>
          </ul>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Client-Specific Responsibilities</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            Clients additionally agree to:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4 text-zinc-600 dark:text-zinc-400 mt-4">
            <li>Disclose relevant health information to their coach</li>
            <li>Consult with a physician before beginning any exercise program</li>
            <li>Exercise within their physical capabilities</li>
            <li>Immediately inform their coach of any injuries or health concerns</li>
            <li>Take responsibility for their own safety during workouts</li>
          </ul>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Prohibited Conduct</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            You may not:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4 text-zinc-600 dark:text-zinc-400 mt-4">
            <li>Use the Services for any illegal purpose</li>
            <li>Impersonate another person or entity</li>
            <li>Upload malicious code, viruses, or harmful content</li>
            <li>Attempt to gain unauthorized access to our systems</li>
            <li>Interfere with or disrupt the Services</li>
            <li>Harvest or collect user information without consent</li>
            <li>Use automated systems to access the Services without permission</li>
            <li>Violate intellectual property rights</li>
            <li>Harass, abuse, or harm other users</li>
            <li>Share inappropriate, offensive, or illegal content</li>
            <li>Use the Services to spam or send unsolicited communications</li>
            <li>Circumvent any access controls or usage limits</li>
            <li>Resell or redistribute the Services without authorization</li>
          </ul>
        </section>

        {/* 5. Content & Intellectual Property */}
        <section id="intellectual-property">
          <h2 className="text-2xl font-semibold mt-12 mb-4 text-black dark:text-zinc-50">5. Content & Intellectual Property</h2>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Athli Intellectual Property</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            The Services, including all software, design, text, graphics, logos, and other content provided by Athli, are owned by or licensed to Athli and are protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or create derivative works from our intellectual property without our written permission.
          </p>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">User Content Ownership</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            You retain ownership of all content you create and upload to the Services (&quot;User Content&quot;), including workout programs, exercises, photos, messages, and other materials. Athli does not claim ownership of your User Content.
          </p>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">License Grant</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            By uploading User Content, you grant Athli a non-exclusive, worldwide, royalty-free license to use, store, display, and transmit your User Content solely for the purpose of providing the Services to you and your connected coaches or clients. This license ends when you delete your User Content or account.
          </p>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Content Representations</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            You represent and warrant that:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4 text-zinc-600 dark:text-zinc-400 mt-4">
            <li>You own or have the right to use all User Content you upload</li>
            <li>Your User Content does not infringe any third-party rights</li>
            <li>Your User Content does not violate any laws</li>
            <li>Your User Content is accurate and not misleading</li>
          </ul>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">DMCA Notice</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            If you believe content on our Services infringes your copyright, please contact us with: (1) identification of the copyrighted work, (2) identification of the infringing content, (3) your contact information, (4) a statement of good faith belief, and (5) a statement under penalty of perjury that the information is accurate. Send notices to legal@athli.io.
          </p>
        </section>

        {/* 6. Fees & Payment */}
        <section id="fees">
          <h2 className="text-2xl font-semibold mt-12 mb-4 text-black dark:text-zinc-50">6. Fees & Payment</h2>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Current Status</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            Athli&apos;s pricing and subscription plans are coming soon. Currently, access to the platform may be provided during our beta period.
          </p>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Future Payment Terms</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            When subscription plans are introduced:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4 text-zinc-600 dark:text-zinc-400 mt-4">
            <li>Fees will be billed in advance on a recurring basis</li>
            <li>All fees are non-refundable except as required by law</li>
            <li>We may change our fees with 30 days&apos; notice</li>
            <li>Failure to pay may result in account suspension</li>
          </ul>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Coach-Client Payment Arrangements</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            Any payment arrangements between coaches and their clients are separate from Athli&apos;s fees. Athli is not a party to these arrangements and does not process payments between coaches and clients.
          </p>
        </section>

        {/* 7. Third-Party Services */}
        <section id="third-party">
          <h2 className="text-2xl font-semibold mt-12 mb-4 text-black dark:text-zinc-50">7. Third-Party Services</h2>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            Our Services integrate with and rely on various third-party services:
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse mt-4">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="text-left py-2 px-4 font-medium text-black dark:text-zinc-50">Service</th>
                  <th className="text-left py-2 px-4 font-medium text-black dark:text-zinc-50">Purpose</th>
                </tr>
              </thead>
              <tbody className="text-zinc-600 dark:text-zinc-400">
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4">Google, Apple, Microsoft</td>
                  <td className="py-2 px-4">Authentication (sign-in options)</td>
                </tr>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4">MuscleWiki</td>
                  <td className="py-2 px-4">Exercise information and demonstrations</td>
                </tr>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4">Avatar Generation</td>
                  <td className="py-2 px-4">Default profile picture creation</td>
                </tr>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4">Intercom</td>
                  <td className="py-2 px-4">Customer support and help resources</td>
                </tr>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4">PostHog</td>
                  <td className="py-2 px-4">Product analytics (when enabled)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-zinc-600 dark:text-zinc-400 leading-7 mt-4">
            Your use of third-party services is subject to their respective terms and privacy policies. Athli is not responsible for the availability, accuracy, or practices of third-party services.
          </p>
        </section>

        {/* 8. Privacy & Data Protection */}
        <section id="privacy">
          <h2 className="text-2xl font-semibold mt-12 mb-4 text-black dark:text-zinc-50">8. Privacy & Data Protection</h2>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            Your privacy is important to us. Please review our <a href="/privacy-policy" className="text-primary hover:underline">Privacy Policy</a>, which explains how we collect, use, and protect your personal information.
          </p>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Coach Data Responsibilities</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            Coaches who access client data through the platform may be considered data controllers under applicable data protection laws and are responsible for:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4 text-zinc-600 dark:text-zinc-400 mt-4">
            <li>Using client data only for legitimate coaching purposes</li>
            <li>Maintaining confidentiality of client information</li>
            <li>Complying with applicable data protection laws</li>
            <li>Responding to client data requests where applicable</li>
          </ul>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Health Data</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            Health and fitness data is considered sensitive personal information. By using our Services and providing health-related information, you consent to the collection and processing of this data as described in our Privacy Policy.
          </p>
        </section>

        {/* 9. Disclaimers */}
        <section id="disclaimers">
          <h2 className="text-2xl font-semibold mt-12 mb-4 text-black dark:text-zinc-50">9. Disclaimers</h2>

          <div className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 my-4">
            <p className="uppercase font-medium text-sm text-black dark:text-zinc-50">
              THE SERVICES ARE PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, AND TITLE.
            </p>
          </div>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">No Medical Advice</h3>
          <div className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 my-4">
            <p className="uppercase font-medium text-sm text-black dark:text-zinc-50">
              ATHLI IS NOT A MEDICAL PROVIDER. THE SERVICES DO NOT PROVIDE MEDICAL ADVICE, DIAGNOSIS, OR TREATMENT. ALWAYS CONSULT A QUALIFIED HEALTHCARE PROVIDER BEFORE STARTING ANY EXERCISE PROGRAM, ESPECIALLY IF YOU HAVE ANY MEDICAL CONDITIONS OR CONCERNS. NEVER DISREGARD PROFESSIONAL MEDICAL ADVICE OR DELAY SEEKING IT BECAUSE OF SOMETHING YOU HAVE READ OR RECEIVED THROUGH OUR SERVICES.
            </p>
          </div>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Coach Independence</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            Coaches using our platform are independent professionals, not employees or agents of Athli. Athli does not:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4 text-zinc-600 dark:text-zinc-400 mt-4">
            <li>Verify coach credentials or qualifications</li>
            <li>Supervise or control coach services</li>
            <li>Endorse or guarantee coach services</li>
            <li>Take responsibility for coach advice or recommendations</li>
          </ul>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Exercise Risks</h3>
          <div className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 my-4">
            <p className="uppercase font-medium text-sm text-black dark:text-zinc-50">
              PHYSICAL EXERCISE INVOLVES INHERENT RISKS OF INJURY. BY USING OUR SERVICES TO PARTICIPATE IN FITNESS ACTIVITIES, YOU ACKNOWLEDGE AND ACCEPT THESE RISKS. YOU ARE SOLELY RESPONSIBLE FOR YOUR PHYSICAL CONDITION AND FOR EXERCISING WITHIN YOUR CAPABILITIES.
            </p>
          </div>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Third-Party Content</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            We do not warrant the accuracy, completeness, or usefulness of any third-party content, including exercise information, user-generated content, or content accessed through integrations.
          </p>
        </section>

        {/* 10. Limitation of Liability */}
        <section id="liability">
          <h2 className="text-2xl font-semibold mt-12 mb-4 text-black dark:text-zinc-50">10. Limitation of Liability</h2>

          <div className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 my-4">
            <p className="uppercase font-medium text-sm text-black dark:text-zinc-50">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, ATHLI AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 mt-4 uppercase text-sm text-black dark:text-zinc-50">
              <li>YOUR ACCESS TO OR USE OF OR INABILITY TO ACCESS OR USE THE SERVICES</li>
              <li>ANY CONDUCT OR CONTENT OF ANY THIRD PARTY ON THE SERVICES</li>
              <li>ANY CONTENT OBTAINED FROM THE SERVICES</li>
              <li>UNAUTHORIZED ACCESS, USE, OR ALTERATION OF YOUR TRANSMISSIONS OR CONTENT</li>
              <li>ANY INJURY, ILLNESS, OR DAMAGE ARISING FROM EXERCISE OR FITNESS ACTIVITIES</li>
              <li>ANY ADVICE OR SERVICES PROVIDED BY COACHES THROUGH THE PLATFORM</li>
            </ul>
          </div>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Liability Cap</h3>
          <div className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 my-4">
            <p className="uppercase font-medium text-sm text-black dark:text-zinc-50">
              IN NO EVENT SHALL ATHLI&apos;S TOTAL LIABILITY TO YOU FOR ALL CLAIMS EXCEED THE GREATER OF (A) ONE HUNDRED U.S. DOLLARS ($100) OR (B) THE AMOUNTS PAID BY YOU TO ATHLI IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
            </p>
          </div>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Jurisdictional Limits</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            Some jurisdictions do not allow the exclusion of certain warranties or limitations of liability. In such jurisdictions, our liability shall be limited to the maximum extent permitted by law.
          </p>
        </section>

        {/* 11. Indemnification */}
        <section id="indemnification">
          <h2 className="text-2xl font-semibold mt-12 mb-4 text-black dark:text-zinc-50">11. Indemnification</h2>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            You agree to defend, indemnify, and hold harmless Athli and its officers, directors, employees, contractors, agents, licensors, and suppliers from and against any claims, liabilities, damages, judgments, awards, losses, costs, expenses, or fees (including reasonable attorneys&apos; fees) arising out of or relating to:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4 text-zinc-600 dark:text-zinc-400 mt-4">
            <li>Your violation of these Terms</li>
            <li>Your User Content</li>
            <li>Your use of the Services</li>
            <li>Your violation of any third-party rights</li>
            <li>Any coaching services you provide (for coaches)</li>
            <li>Any fitness activities you undertake (for clients)</li>
          </ul>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Notification and Control</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            We will notify you of any claim subject to indemnification. We reserve the right to assume exclusive defense and control of any matter subject to indemnification, in which case you agree to cooperate with our defense.
          </p>
        </section>

        {/* 12. Term & Termination */}
        <section id="termination">
          <h2 className="text-2xl font-semibold mt-12 mb-4 text-black dark:text-zinc-50">12. Term & Termination</h2>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Term</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            These Terms remain in effect while you use our Services and until your account is terminated.
          </p>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Your Termination Rights</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            You may terminate your account at any time by:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4 text-zinc-600 dark:text-zinc-400 mt-4">
            <li>Using the account deletion feature in the app settings</li>
            <li>Contacting us at support@athli.io</li>
          </ul>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Our Termination Rights</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            We may suspend or terminate your account at any time, with or without cause, including if we believe you have:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4 text-zinc-600 dark:text-zinc-400 mt-4">
            <li>Violated these Terms</li>
            <li>Engaged in fraudulent or illegal activity</li>
            <li>Created risk or legal exposure for us</li>
            <li>Become inactive for an extended period</li>
          </ul>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Effect of Termination</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            Upon termination:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4 text-zinc-600 dark:text-zinc-400 mt-4">
            <li>Your right to access the Services will cease immediately</li>
            <li>We may delete your data according to our Privacy Policy</li>
            <li>Provisions that should survive termination will remain in effect</li>
            <li>You remain liable for any obligations incurred before termination</li>
          </ul>
        </section>

        {/* 13. Dispute Resolution */}
        <section id="disputes">
          <h2 className="text-2xl font-semibold mt-12 mb-4 text-black dark:text-zinc-50">13. Dispute Resolution</h2>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Informal Resolution</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            Before filing any formal dispute, you agree to try to resolve the dispute informally by contacting us at legal@athli.io. We will try to resolve the dispute within 60 days. If we cannot resolve the dispute informally, you may pursue formal resolution as described below.
          </p>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Governing Law</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            These Terms shall be governed by and construed in accordance with the laws of the jurisdiction where Athli is incorporated, without regard to its conflict of law provisions.
          </p>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Arbitration</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            Any dispute arising from these Terms or your use of the Services shall be resolved through binding arbitration, except where prohibited by law. Arbitration rules and procedures will be specified when subscription plans are introduced.
          </p>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Class Action Waiver</h3>
          <div className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 my-4">
            <p className="uppercase font-medium text-sm text-black dark:text-zinc-50">
              YOU AGREE THAT ANY DISPUTES WILL BE RESOLVED ON AN INDIVIDUAL BASIS AND NOT IN A CLASS, CONSOLIDATED, OR REPRESENTATIVE ACTION. YOU WAIVE ANY RIGHT TO PARTICIPATE IN A CLASS ACTION LAWSUIT OR CLASS-WIDE ARBITRATION.
            </p>
          </div>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Time Limitation</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            Any claim or cause of action arising from your use of the Services must be filed within one (1) year after the claim arose, or be permanently barred.
          </p>
        </section>

        {/* 14. Modifications to Terms */}
        <section id="modifications">
          <h2 className="text-2xl font-semibold mt-12 mb-4 text-black dark:text-zinc-50">14. Modifications to Terms</h2>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            We reserve the right to modify these Terms at any time. When we make changes:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4 text-zinc-600 dark:text-zinc-400 mt-4">
            <li>We will update the &quot;Last updated&quot; date at the top of this page</li>
            <li>For material changes, we will provide at least 30 days&apos; notice via email or in-app notification</li>
            <li>Your continued use of the Services after changes become effective constitutes acceptance of the new Terms</li>
            <li>If you do not agree to the modified Terms, you must stop using the Services</li>
          </ul>
        </section>

        {/* 15. General Provisions */}
        <section id="general">
          <h2 className="text-2xl font-semibold mt-12 mb-4 text-black dark:text-zinc-50">15. General Provisions</h2>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Entire Agreement</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            These Terms, together with our Privacy Policy, constitute the entire agreement between you and Athli regarding your use of the Services and supersede all prior agreements.
          </p>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Severability</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in full force and effect.
          </p>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Waiver</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            Our failure to enforce any right or provision of these Terms shall not be considered a waiver of that right or provision.
          </p>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Assignment</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            You may not assign or transfer these Terms or your rights under them without our prior written consent. We may assign our rights and obligations without restriction.
          </p>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">No Third-Party Beneficiaries</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            These Terms do not create any third-party beneficiary rights, except that our service providers may enforce applicable provisions.
          </p>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Independent Parties</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            Nothing in these Terms creates any agency, partnership, joint venture, or employment relationship between you and Athli.
          </p>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Force Majeure</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            Athli shall not be liable for any failure or delay in performance due to circumstances beyond our reasonable control, including natural disasters, war, terrorism, strikes, government actions, or internet failures.
          </p>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Notices</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            We may send you notices via email to the address associated with your account or through the Services. You are responsible for keeping your contact information current.
          </p>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Headings</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            Section headings are for convenience only and do not affect the interpretation of these Terms.
          </p>
        </section>

        {/* 16. Contact Information */}
        <section id="contact">
          <h2 className="text-2xl font-semibold mt-12 mb-4 text-black dark:text-zinc-50">16. Contact Information</h2>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            If you have questions about these Terms, please contact us:
          </p>

          <div className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 my-4">
            <p className="text-zinc-600 dark:text-zinc-400">
              <strong className="text-black dark:text-zinc-50">Legal Inquiries</strong><br />
              Email: legal@athli.io
            </p>
            <p className="text-zinc-600 dark:text-zinc-400 mt-4">
              <strong className="text-black dark:text-zinc-50">General Support</strong><br />
              Email: support@athli.io
            </p>
            <p className="text-zinc-600 dark:text-zinc-400 mt-4">
              <strong className="text-black dark:text-zinc-50">Report Abuse</strong><br />
              Email: abuse@athli.io
            </p>
          </div>
        </section>

        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground mt-12 inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to home
        </Link>
      </main>
    </div>
  );
}
