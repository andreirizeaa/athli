import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params
    setRequestLocale(locale)
    return {
        title: 'Privacy Policy - Athli',
    }
}

export default async function PrivacyPolicyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="w-full max-w-4xl py-16 px-6 md:py-24 bg-white dark:bg-black">
        <h1 className="text-3xl font-semibold md:text-4xl text-black dark:text-zinc-50">
          Privacy Policy
        </h1>
        <p className="text-muted-foreground text-sm mt-2">Last updated: February 3, 2026</p>

        {/* Table of Contents */}
        <nav className="mt-8 p-4 bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <h2 className="font-medium mb-3 text-black dark:text-zinc-50">Table of Contents</h2>
          <ol className="list-decimal list-inside space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
            <li><a href="#introduction" className="hover:text-primary">Introduction & Scope</a></li>
            <li><a href="#information-we-collect" className="hover:text-primary">Information We Collect</a></li>
            <li><a href="#how-we-collect" className="hover:text-primary">How We Collect Information</a></li>
            <li><a href="#how-we-use" className="hover:text-primary">How We Use Information</a></li>
            <li><a href="#legal-bases" className="hover:text-primary">Legal Bases for Processing (GDPR)</a></li>
            <li><a href="#data-sharing" className="hover:text-primary">Data Sharing</a></li>
            <li><a href="#data-storage" className="hover:text-primary">Data Storage & Security</a></li>
            <li><a href="#data-retention" className="hover:text-primary">Data Retention</a></li>
            <li><a href="#gdpr-rights" className="hover:text-primary">Your Rights (GDPR)</a></li>
            <li><a href="#ccpa-rights" className="hover:text-primary">Your Rights (CCPA)</a></li>
            <li><a href="#international-transfers" className="hover:text-primary">International Transfers</a></li>
            <li><a href="#children" className="hover:text-primary">Children&apos;s Privacy</a></li>
            <li><a href="#cookies" className="hover:text-primary">Cookies & Tracking</a></li>
            <li><a href="#third-party-links" className="hover:text-primary">Third-Party Links</a></li>
            <li><a href="#changes" className="hover:text-primary">Changes to This Policy</a></li>
            <li><a href="#contact" className="hover:text-primary">Contact Information</a></li>
          </ol>
        </nav>

        {/* 1. Introduction & Scope */}
        <section id="introduction">
          <h2 className="text-2xl font-semibold mt-12 mb-4 text-black dark:text-zinc-50">1. Introduction & Scope</h2>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            Welcome to Athli (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). Athli is a fitness coaching platform that connects coaches with their clients, enabling personalized training programs, progress tracking, and communication.
          </p>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7 mt-4">
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our services, including:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4 text-zinc-600 dark:text-zinc-400 mt-4">
            <li>The Athli web application (for coaches)</li>
            <li>The Athli mobile application (for clients)</li>
            <li>The Athli website and landing pages</li>
          </ul>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7 mt-4">
            By using our services, you agree to the collection and use of information in accordance with this policy. If you do not agree with the terms of this Privacy Policy, please do not access or use our services.
          </p>
        </section>

        {/* 2. Information We Collect */}
        <section id="information-we-collect">
          <h2 className="text-2xl font-semibold mt-12 mb-4 text-black dark:text-zinc-50">2. Information We Collect</h2>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            We collect different types of information depending on how you use our services and whether you are a coach or client.
          </p>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Account & Authentication Information</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse mt-4">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="text-left py-2 px-4 font-medium text-black dark:text-zinc-50">Data Type</th>
                  <th className="text-left py-2 px-4 font-medium text-black dark:text-zinc-50">Description</th>
                </tr>
              </thead>
              <tbody className="text-zinc-600 dark:text-zinc-400">
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4">Email address</td>
                  <td className="py-2 px-4">Used for account identification and communication</td>
                </tr>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4">Full name</td>
                  <td className="py-2 px-4">First and last name for profile display</td>
                </tr>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4">Password</td>
                  <td className="py-2 px-4">Securely hashed, never stored in plain text</td>
                </tr>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4">Profile picture</td>
                  <td className="py-2 px-4">Optional profile image or generated avatar</td>
                </tr>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4">Sign-in method</td>
                  <td className="py-2 px-4">Email/password, Google, Apple, or Microsoft</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Demographic Information</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse mt-4">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="text-left py-2 px-4 font-medium text-black dark:text-zinc-50">Data Type</th>
                  <th className="text-left py-2 px-4 font-medium text-black dark:text-zinc-50">Description</th>
                </tr>
              </thead>
              <tbody className="text-zinc-600 dark:text-zinc-400">
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4">Date of birth</td>
                  <td className="py-2 px-4">Used for age verification and fitness planning</td>
                </tr>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4">Gender</td>
                  <td className="py-2 px-4">Optional, used for personalized recommendations</td>
                </tr>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4">Height</td>
                  <td className="py-2 px-4">Used for fitness calculations and progress tracking</td>
                </tr>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4">Phone number</td>
                  <td className="py-2 px-4">Optional, for coach-client communication</td>
                </tr>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4">Country</td>
                  <td className="py-2 px-4">For localization and unit preferences</td>
                </tr>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4">Unit preferences</td>
                  <td className="py-2 px-4">Metric or imperial measurement system</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Health & Fitness Data (Sensitive)</h3>
          <div className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 my-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              <strong className="text-black dark:text-zinc-50">Important:</strong> Health and fitness data is considered sensitive personal information. We obtain your explicit consent before collecting this data and process it only with your permission.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse mt-4">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="text-left py-2 px-4 font-medium text-black dark:text-zinc-50">Data Type</th>
                  <th className="text-left py-2 px-4 font-medium text-black dark:text-zinc-50">Description</th>
                </tr>
              </thead>
              <tbody className="text-zinc-600 dark:text-zinc-400">
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4">Body metrics</td>
                  <td className="py-2 px-4">Weight, body fat percentage, muscle mass, and other measurements</td>
                </tr>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4">Fitness goals</td>
                  <td className="py-2 px-4">Your training objectives and targets</td>
                </tr>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4">Habits tracking</td>
                  <td className="py-2 px-4">Sleep, water intake, steps, and other daily habits</td>
                </tr>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4">Injuries & limitations</td>
                  <td className="py-2 px-4">Current or past injuries affecting training</td>
                </tr>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4">Workout history</td>
                  <td className="py-2 px-4">Exercise logs, sets, reps, weights, and performance data</td>
                </tr>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4">Progress photos</td>
                  <td className="py-2 px-4">Images uploaded to track physical progress</td>
                </tr>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4">Check-in responses</td>
                  <td className="py-2 px-4">Answers to periodic questionnaires about progress and wellbeing</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Communication Data</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse mt-4">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="text-left py-2 px-4 font-medium text-black dark:text-zinc-50">Data Type</th>
                  <th className="text-left py-2 px-4 font-medium text-black dark:text-zinc-50">Description</th>
                </tr>
              </thead>
              <tbody className="text-zinc-600 dark:text-zinc-400">
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4">Messages</td>
                  <td className="py-2 px-4">Text communications between coaches and clients</td>
                </tr>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4">Attachments</td>
                  <td className="py-2 px-4">Files shared in conversations</td>
                </tr>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4">Read receipts</td>
                  <td className="py-2 px-4">Message delivery and read status</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Coach Business Information</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse mt-4">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="text-left py-2 px-4 font-medium text-black dark:text-zinc-50">Data Type</th>
                  <th className="text-left py-2 px-4 font-medium text-black dark:text-zinc-50">Description</th>
                </tr>
              </thead>
              <tbody className="text-zinc-600 dark:text-zinc-400">
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4">Company name</td>
                  <td className="py-2 px-4">Business or brand name</td>
                </tr>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4">Website URL</td>
                  <td className="py-2 px-4">Coach&apos;s professional website</td>
                </tr>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4">LinkedIn profile</td>
                  <td className="py-2 px-4">Professional networking profile</td>
                </tr>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4">Company logo</td>
                  <td className="py-2 px-4">Brand imagery for customization</td>
                </tr>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4">Specialties</td>
                  <td className="py-2 px-4">Areas of coaching expertise</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Technical Information</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse mt-4">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="text-left py-2 px-4 font-medium text-black dark:text-zinc-50">Data Type</th>
                  <th className="text-left py-2 px-4 font-medium text-black dark:text-zinc-50">Description</th>
                </tr>
              </thead>
              <tbody className="text-zinc-600 dark:text-zinc-400">
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4">Device information</td>
                  <td className="py-2 px-4">Device type, operating system, browser type</td>
                </tr>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4">IP address</td>
                  <td className="py-2 px-4">For security and fraud prevention</td>
                </tr>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4">Timestamps</td>
                  <td className="py-2 px-4">Login times, activity logs</td>
                </tr>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4">Crash reports</td>
                  <td className="py-2 px-4">Error logs to improve app stability</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 3. How We Collect Information */}
        <section id="how-we-collect">
          <h2 className="text-2xl font-semibold mt-12 mb-4 text-black dark:text-zinc-50">3. How We Collect Information</h2>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Direct Input</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            Most information is provided directly by you when you:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4 text-zinc-600 dark:text-zinc-400 mt-4">
            <li>Create an account and complete your profile</li>
            <li>Log workouts and track progress</li>
            <li>Upload photos and files</li>
            <li>Send messages to your coach or clients</li>
            <li>Complete check-in questionnaires</li>
            <li>Update your settings and preferences</li>
          </ul>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Automatic Collection</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            We automatically collect certain technical information when you use our services:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4 text-zinc-600 dark:text-zinc-400 mt-4">
            <li>Device and browser information</li>
            <li>IP address and general location</li>
            <li>Usage patterns and feature interactions</li>
            <li>Performance and error data</li>
          </ul>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Third-Party Services</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            If you choose to sign in using a third-party provider, we receive limited information from that provider:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4 text-zinc-600 dark:text-zinc-400 mt-4">
            <li><strong>Google:</strong> Email address, name, and profile picture</li>
            <li><strong>Apple:</strong> Email address (or private relay email) and name</li>
            <li><strong>Microsoft:</strong> Email address, name, and profile picture</li>
          </ul>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7 mt-4">
            We do not receive your password from these providers, and they do not have access to your Athli data.
          </p>
        </section>

        {/* 4. How We Use Information */}
        <section id="how-we-use">
          <h2 className="text-2xl font-semibold mt-12 mb-4 text-black dark:text-zinc-50">4. How We Use Information</h2>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Core Services</h3>
          <ul className="list-disc list-inside space-y-2 ml-4 text-zinc-600 dark:text-zinc-400">
            <li>Create and manage your account</li>
            <li>Connect coaches with clients</li>
            <li>Deliver workout programs and track progress</li>
            <li>Enable messaging and file sharing</li>
            <li>Process check-ins and feedback</li>
          </ul>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Personalization</h3>
          <ul className="list-disc list-inside space-y-2 ml-4 text-zinc-600 dark:text-zinc-400">
            <li>Customize your experience based on preferences</li>
            <li>Display relevant exercises and recommendations</li>
            <li>Remember your settings across sessions</li>
          </ul>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Communication</h3>
          <ul className="list-disc list-inside space-y-2 ml-4 text-zinc-600 dark:text-zinc-400">
            <li>Send important account notifications</li>
            <li>Deliver push notifications for workouts and messages</li>
            <li>Respond to support requests</li>
          </ul>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Security & Improvement</h3>
          <ul className="list-disc list-inside space-y-2 ml-4 text-zinc-600 dark:text-zinc-400">
            <li>Protect against fraud and unauthorized access</li>
            <li>Monitor for suspicious activity</li>
            <li>Fix bugs and improve app performance</li>
            <li>Analyze usage to develop new features</li>
          </ul>
        </section>

        {/* 5. Legal Bases (GDPR) */}
        <section id="legal-bases">
          <h2 className="text-2xl font-semibold mt-12 mb-4 text-black dark:text-zinc-50">5. Legal Bases for Processing (GDPR)</h2>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            For users in the European Economic Area (EEA), United Kingdom, and Switzerland, we process your data based on the following legal grounds:
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse mt-4">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="text-left py-2 px-4 font-medium text-black dark:text-zinc-50">Legal Basis</th>
                  <th className="text-left py-2 px-4 font-medium text-black dark:text-zinc-50">Examples</th>
                </tr>
              </thead>
              <tbody className="text-zinc-600 dark:text-zinc-400">
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4 font-medium">Contractual Necessity</td>
                  <td className="py-2 px-4">Creating your account, delivering the coaching service, processing workouts</td>
                </tr>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4 font-medium">Legitimate Interests</td>
                  <td className="py-2 px-4">Improving our services, preventing fraud, ensuring security</td>
                </tr>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4 font-medium">Consent</td>
                  <td className="py-2 px-4">Marketing communications, optional analytics</td>
                </tr>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4 font-medium">Legal Obligation</td>
                  <td className="py-2 px-4">Complying with legal requirements, responding to lawful requests</td>
                </tr>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4 font-medium">Explicit Consent (Health Data)</td>
                  <td className="py-2 px-4">Processing body metrics, fitness data, progress photos, health-related information</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 6. Data Sharing */}
        <section id="data-sharing">
          <h2 className="text-2xl font-semibold mt-12 mb-4 text-black dark:text-zinc-50">6. Data Sharing</h2>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Coach-Client Access</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            The core function of Athli involves sharing data between coaches and their clients:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4 text-zinc-600 dark:text-zinc-400 mt-4">
            <li><strong>Coaches can access:</strong> Client profile information, workout logs, progress data, check-in responses, messages, and progress photos</li>
            <li><strong>Clients can access:</strong> Coach profile and business information, assigned workouts, and messages</li>
          </ul>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7 mt-4">
            This sharing is necessary to provide the coaching service and is covered by your agreement when establishing a coach-client relationship.
          </p>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Third-Party Service Providers</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            We work with trusted third parties who process data on our behalf:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse mt-4">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="text-left py-2 px-4 font-medium text-black dark:text-zinc-50">Provider</th>
                  <th className="text-left py-2 px-4 font-medium text-black dark:text-zinc-50">Purpose</th>
                </tr>
              </thead>
              <tbody className="text-zinc-600 dark:text-zinc-400">
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4">Supabase</td>
                  <td className="py-2 px-4">Database hosting, authentication, file storage</td>
                </tr>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4">Google</td>
                  <td className="py-2 px-4">OAuth authentication (optional)</td>
                </tr>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4">Apple</td>
                  <td className="py-2 px-4">OAuth authentication (optional)</td>
                </tr>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4">Microsoft</td>
                  <td className="py-2 px-4">OAuth authentication (optional)</td>
                </tr>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4">Intercom</td>
                  <td className="py-2 px-4">Customer support and help desk</td>
                </tr>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4">PostHog</td>
                  <td className="py-2 px-4">Product analytics (when enabled)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">We Do Not Sell Your Data</h3>
          <div className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 my-4">
            <p className="text-zinc-600 dark:text-zinc-400">
              <strong className="text-black dark:text-zinc-50">We do not sell, rent, or trade your personal information to third parties for their marketing purposes.</strong> Your data is used solely to provide and improve our services.
            </p>
          </div>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Legal Disclosures</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            We may disclose your information when required by law, such as:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4 text-zinc-600 dark:text-zinc-400 mt-4">
            <li>Responding to valid legal requests or court orders</li>
            <li>Protecting our rights, property, or safety</li>
            <li>Preventing fraud or illegal activities</li>
            <li>Complying with regulatory requirements</li>
          </ul>
        </section>

        {/* 7. Data Storage & Security */}
        <section id="data-storage">
          <h2 className="text-2xl font-semibold mt-12 mb-4 text-black dark:text-zinc-50">7. Data Storage & Security</h2>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Infrastructure</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            Your data is stored on Supabase infrastructure, which runs on Amazon Web Services (AWS). Supabase provides enterprise-grade security including:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4 text-zinc-600 dark:text-zinc-400 mt-4">
            <li>Encryption at rest and in transit (TLS 1.2+)</li>
            <li>Regular security audits and compliance certifications</li>
            <li>Automated backups and disaster recovery</li>
            <li>Row-level security policies</li>
          </ul>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">File Storage</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            Files and images are stored in secure storage buckets:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4 text-zinc-600 dark:text-zinc-400 mt-4">
            <li>Profile pictures</li>
            <li>Coach company logos and files</li>
            <li>Client progress photos</li>
            <li>Message attachments</li>
            <li>Exercise demonstration videos</li>
          </ul>

          <h3 className="text-lg font-medium mt-6 mb-2 text-black dark:text-zinc-50">Access Controls</h3>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            We implement strict access controls:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4 text-zinc-600 dark:text-zinc-400 mt-4">
            <li>Row-level security ensures users can only access their own data</li>
            <li>Coach-client relationships are explicitly established before data sharing</li>
            <li>Administrative access is limited and logged</li>
            <li>Two-factor authentication is available for additional security</li>
          </ul>
        </section>

        {/* 8. Data Retention */}
        <section id="data-retention">
          <h2 className="text-2xl font-semibold mt-12 mb-4 text-black dark:text-zinc-50">8. Data Retention</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse mt-4">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="text-left py-2 px-4 font-medium text-black dark:text-zinc-50">Scenario</th>
                  <th className="text-left py-2 px-4 font-medium text-black dark:text-zinc-50">Retention Period</th>
                </tr>
              </thead>
              <tbody className="text-zinc-600 dark:text-zinc-400">
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4">Active accounts</td>
                  <td className="py-2 px-4">Data retained while account is active</td>
                </tr>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4">Inactive accounts</td>
                  <td className="py-2 px-4">24 months before potential deletion notice</td>
                </tr>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4">Post-deletion</td>
                  <td className="py-2 px-4">30-90 days in backups before permanent deletion</td>
                </tr>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4">Legal requirements</td>
                  <td className="py-2 px-4">As required by applicable law</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-zinc-600 dark:text-zinc-400 leading-7 mt-4">
            When you delete your account, we will delete your personal data within 30 days. Some data may persist in encrypted backups for up to 90 days before being permanently removed. We may retain anonymized, aggregated data for analytical purposes.
          </p>
        </section>

        {/* 9. Your Rights (GDPR) */}
        <section id="gdpr-rights">
          <h2 className="text-2xl font-semibold mt-12 mb-4 text-black dark:text-zinc-50">9. Your Rights (GDPR)</h2>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            If you are located in the European Economic Area (EEA), United Kingdom, or Switzerland, you have the following rights under the General Data Protection Regulation (GDPR):
          </p>

          <ul className="list-disc list-inside space-y-3 ml-4 text-zinc-600 dark:text-zinc-400 mt-4">
            <li><strong>Right of Access:</strong> Request a copy of the personal data we hold about you</li>
            <li><strong>Right to Rectification:</strong> Request correction of inaccurate or incomplete data</li>
            <li><strong>Right to Erasure:</strong> Request deletion of your personal data (&quot;right to be forgotten&quot;)</li>
            <li><strong>Right to Restrict Processing:</strong> Request that we limit how we use your data</li>
            <li><strong>Right to Data Portability:</strong> Receive your data in a structured, machine-readable format</li>
            <li><strong>Right to Object:</strong> Object to processing based on legitimate interests or direct marketing</li>
            <li><strong>Rights Related to Automated Decision-Making:</strong> Not be subject to decisions based solely on automated processing</li>
            <li><strong>Right to Withdraw Consent:</strong> Withdraw consent at any time where processing is based on consent</li>
            <li><strong>Right to Lodge a Complaint:</strong> File a complaint with your local data protection authority</li>
          </ul>

          <p className="text-zinc-600 dark:text-zinc-400 leading-7 mt-4">
            To exercise these rights, please contact us using the information in the Contact section below. We will respond to your request within 30 days.
          </p>
        </section>

        {/* 10. Your Rights (CCPA) */}
        <section id="ccpa-rights">
          <h2 className="text-2xl font-semibold mt-12 mb-4 text-black dark:text-zinc-50">10. Your Rights (CCPA)</h2>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            If you are a California resident, you have the following rights under the California Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA):
          </p>

          <ul className="list-disc list-inside space-y-3 ml-4 text-zinc-600 dark:text-zinc-400 mt-4">
            <li><strong>Right to Know:</strong> Request information about what personal data we collect, use, and disclose</li>
            <li><strong>Right to Delete:</strong> Request deletion of your personal data</li>
            <li><strong>Right to Correct:</strong> Request correction of inaccurate personal data</li>
            <li><strong>Right to Opt-Out of Sale:</strong> We do not sell your personal information</li>
            <li><strong>Right to Limit Use of Sensitive Personal Information:</strong> Request limitations on how we use sensitive data</li>
            <li><strong>Right to Non-Discrimination:</strong> Not be discriminated against for exercising your privacy rights</li>
          </ul>

          <p className="text-zinc-600 dark:text-zinc-400 leading-7 mt-4">
            To exercise these rights, please contact us using the information in the Contact section below. We will verify your identity before processing your request.
          </p>
        </section>

        {/* 11. International Transfers */}
        <section id="international-transfers">
          <h2 className="text-2xl font-semibold mt-12 mb-4 text-black dark:text-zinc-50">11. International Transfers</h2>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            Your data may be transferred to and processed in countries other than your own. When we transfer data internationally, we ensure appropriate safeguards are in place:
          </p>

          <ul className="list-disc list-inside space-y-2 ml-4 text-zinc-600 dark:text-zinc-400 mt-4">
            <li><strong>Standard Contractual Clauses (SCCs):</strong> We use EU-approved contractual terms with service providers</li>
            <li><strong>Adequacy Decisions:</strong> We transfer to countries recognized as providing adequate data protection</li>
            <li><strong>Data Processing Agreements:</strong> All service providers are bound by strict data protection obligations</li>
          </ul>

          <p className="text-zinc-600 dark:text-zinc-400 leading-7 mt-4">
            Our primary data infrastructure is hosted by Supabase, with data centers located in regions that comply with applicable data protection regulations.
          </p>
        </section>

        {/* 12. Children's Privacy */}
        <section id="children">
          <h2 className="text-2xl font-semibold mt-12 mb-4 text-black dark:text-zinc-50">12. Children&apos;s Privacy</h2>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            Athli is not intended for use by individuals under the age of 16. We do not knowingly collect personal information from children under 16 years of age.
          </p>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7 mt-4">
            For users between 16 and 18 years of age, we recommend parental or guardian consent before using our services, particularly for the collection of health and fitness data.
          </p>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7 mt-4">
            If we become aware that we have collected personal information from a child under 16, we will take steps to delete that information promptly. If you believe we have inadvertently collected such information, please contact us immediately.
          </p>
        </section>

        {/* 13. Cookies & Tracking */}
        <section id="cookies">
          <h2 className="text-2xl font-semibold mt-12 mb-4 text-black dark:text-zinc-50">13. Cookies & Tracking</h2>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            We use cookies and similar technologies to provide and improve our services:
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse mt-4">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="text-left py-2 px-4 font-medium text-black dark:text-zinc-50">Type</th>
                  <th className="text-left py-2 px-4 font-medium text-black dark:text-zinc-50">Purpose</th>
                  <th className="text-left py-2 px-4 font-medium text-black dark:text-zinc-50">Duration</th>
                </tr>
              </thead>
              <tbody className="text-zinc-600 dark:text-zinc-400">
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4 font-medium">Essential</td>
                  <td className="py-2 px-4">Authentication, security, basic functionality</td>
                  <td className="py-2 px-4">Session / Persistent</td>
                </tr>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4 font-medium">Functional</td>
                  <td className="py-2 px-4">Remember preferences, settings, language</td>
                  <td className="py-2 px-4">Persistent</td>
                </tr>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 px-4 font-medium">Analytics</td>
                  <td className="py-2 px-4">Usage patterns, feature adoption (via PostHog when enabled)</td>
                  <td className="py-2 px-4">Persistent</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-zinc-600 dark:text-zinc-400 leading-7 mt-4">
            <strong className="text-black dark:text-zinc-50">We do not use advertising or third-party tracking cookies.</strong> Analytics cookies are only active when you have enabled this feature.
          </p>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7 mt-4">
            You can manage cookie preferences through your browser settings. Note that disabling essential cookies may affect the functionality of our services.
          </p>
        </section>

        {/* 14. Third-Party Links */}
        <section id="third-party-links">
          <h2 className="text-2xl font-semibold mt-12 mb-4 text-black dark:text-zinc-50">14. Third-Party Links</h2>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            Our services may contain links to third-party websites and integrations:
          </p>

          <ul className="list-disc list-inside space-y-2 ml-4 text-zinc-600 dark:text-zinc-400 mt-4">
            <li><strong>MuscleWiki:</strong> External links to exercise information and demonstrations</li>
            <li><strong>Intercom:</strong> Help documentation and customer support chat</li>
            <li><strong>External websites:</strong> Links provided by coaches or in content</li>
          </ul>

          <p className="text-zinc-600 dark:text-zinc-400 leading-7 mt-4">
            These third-party services have their own privacy policies and practices. We are not responsible for the privacy practices of external websites and encourage you to review their policies before providing any personal information.
          </p>
        </section>

        {/* 15. Changes to This Policy */}
        <section id="changes">
          <h2 className="text-2xl font-semibold mt-12 mb-4 text-black dark:text-zinc-50">15. Changes to This Policy</h2>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. When we make material changes:
          </p>

          <ul className="list-disc list-inside space-y-2 ml-4 text-zinc-600 dark:text-zinc-400 mt-4">
            <li>We will update the &quot;Last updated&quot; date at the top of this page</li>
            <li>We will notify you via email or in-app notification for significant changes</li>
            <li>We may provide additional notice for changes affecting sensitive data</li>
          </ul>

          <p className="text-zinc-600 dark:text-zinc-400 leading-7 mt-4">
            We encourage you to review this Privacy Policy periodically. Your continued use of our services after changes become effective constitutes your acceptance of the updated policy.
          </p>
        </section>

        {/* 16. Contact Information */}
        <section id="contact">
          <h2 className="text-2xl font-semibold mt-12 mb-4 text-black dark:text-zinc-50">16. Contact Information</h2>
          <p className="text-zinc-600 dark:text-zinc-400 leading-7">
            If you have questions about this Privacy Policy or wish to exercise your privacy rights, please contact us:
          </p>

          <div className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 my-4">
            <p className="text-zinc-600 dark:text-zinc-400">
              <strong className="text-black dark:text-zinc-50">Privacy Inquiries</strong><br />
              Email: privacy@athli.io
            </p>
            <p className="text-zinc-600 dark:text-zinc-400 mt-4">
              <strong className="text-black dark:text-zinc-50">General Support</strong><br />
              Email: support@athli.io
            </p>
          </div>

          <p className="text-zinc-600 dark:text-zinc-400 leading-7 mt-4">
            We aim to respond to all privacy-related inquiries within 30 days. For complex requests, we may need additional time and will keep you informed of our progress.
          </p>
        </section>
      </main>
    </div>
  );
}
