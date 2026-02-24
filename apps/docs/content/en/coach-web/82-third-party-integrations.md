# Third-Party Integrations and Data Processing

## What is this?

Athli uses several third-party services to provide a secure, reliable, and feature-rich coaching platform. This article explains where your data flows, what each service does, and how your information is protected.

## Why is it useful?

Understanding how your data is handled builds trust and helps you make informed decisions. Whether you are concerned about payment security, data storage, or analytics, this overview covers the key integrations and their roles.

## Step-by-Step Guide

### Infrastructure Services

**AWS (Amazon Web Services)**

- Provides cloud hosting and data storage for the Athli platform
- Your coaching data, client profiles, workouts, and files are stored on AWS servers
- AWS offers enterprise-grade security, encryption, and redundancy

**Google Cloud Platform**

- Provides additional cloud services used by the platform
- Supports specific platform features and processing tasks

### Payment Processing

**Stripe**

- Handles all payment processing for coaching packages
- When clients purchase a package, they enter payment details on Stripe's secure checkout page
- Athli does not store, see, or have access to credit card information
- Stripe is PCI-DSS compliant, meeting the highest standard for payment data security
- Manage payouts, refunds, and disputes directly through your Stripe Dashboard

### Analytics

**PostHog**

- Provides product analytics to help improve the Athli platform
- Tracks usage patterns to understand how coaches use features
- Data is used to identify areas for improvement and prioritize new features
- Analytics focus on platform usage, not individual coaching content

### Data Security Overview

All data transmitted between your browser and Athli is encrypted using **HTTPS**. Here is a summary of the security measures in place:

| Area | Protection |
|---|---|
| Data in transit | HTTPS encryption on all connections |
| Payment data | Handled by Stripe (PCI-DSS compliant) |
| Data storage | Secured on AWS and Google Cloud infrastructure |
| Credit card info | Never stored by Athli |
| User data | Not sold to third parties |

### Your Privacy

- User data is not sold to third parties
- Analytics data is used to improve the platform, not for advertising
- Coaching content and client data remain private to your account
- For complete details, refer to the main Athli privacy policy

## Things to Note

- Athli relies on third-party services for infrastructure, payments, and analytics
- All third-party providers are selected for their security standards and reliability
- Stripe handles all sensitive payment data; Athli never processes or stores card details
- Data is stored securely in cloud infrastructure with encryption at rest and in transit
- PostHog analytics track platform usage patterns, not individual client coaching data

## FAQs

### Does Athli sell my data?

No. User data is not sold to third parties. Data is used only to operate and improve the platform.

### Where is my data stored?

Your data is stored on AWS and Google Cloud Platform infrastructure. Both providers offer enterprise-grade security and encryption.

### Is my clients' payment information safe?

Yes. Stripe handles all payment data and is PCI-DSS compliant. Athli never sees or stores credit card numbers.

### What does PostHog track?

PostHog tracks how coaches use platform features, such as which pages are visited and which tools are used. It does not access your coaching content or client data.

### Where can I read the full privacy policy?

The complete privacy policy is available on the Athli website. It covers all data handling practices, retention policies, and your rights.
