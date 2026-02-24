# Client Purchase Flow

## What is this?

The client purchase flow is the process clients go through when buying one of your coaching packages. From viewing your offerings to completing payment, the entire experience is handled through Athli and Stripe.

## Why is it useful?

Understanding the client purchase flow helps you optimize your packages page and guide clients through the buying process. A smooth purchase experience reduces friction and increases conversions for your coaching business.

## Step-by-Step Guide

### Previewing Your Packages Page

1. Go to **Business > Packages**
2. Click **Preview Packages** to see the client-facing view
3. This shows exactly what clients see when they visit your packages page
4. Review the layout, descriptions, and pricing for accuracy

> [Screenshot 1: Preview Packages button on the Packages page]

### Sharing Your Packages Link

1. On the Packages page, copy the shareable link
2. Share this link with potential or existing clients
3. You can share it via email, social media, your website, or direct message
4. Clients do not need an Athli account to view the packages page

> [Screenshot 2: Shareable packages link with copy button]

### What the Client Sees

1. The client opens the link and sees your list of available packages
2. Each package displays the name, description, price, and billing type
3. The client selects the package they want to purchase
4. They are directed to a Stripe checkout page
5. The client enters their payment information securely through Stripe
6. After successful payment, the purchase is confirmed

> [Screenshot 3: Client-facing packages page showing available coaching packages]

### After Purchase

1. The client's purchase appears in your **Business > Activity** section
2. If a sequence is linked to the package, it runs automatically
3. The client receives access based on the package type
4. Recurring packages automatically bill at the set interval
5. You receive the payment through Stripe according to your payout schedule

> [Screenshot 4: Activity page showing a new client purchase]

## Things to Note

- Clients enter payment details directly on Stripe's secure checkout page
- Athli never sees or stores credit card information
- The purchase link works for anyone, even people without an Athli account
- Linked sequences automate onboarding steps after purchase
- Failed payments are handled by Stripe with automatic retry logic

## FAQs

### Can clients purchase multiple packages?

Yes. A client can purchase more than one package if you have multiple offerings available.

### What happens if a payment fails?

Stripe handles failed payments with automatic retries. You can view payment status in **Business > Activity** or in the Stripe Dashboard.

### Do clients need to create an account to purchase?

Clients go through Stripe checkout to pay. Account creation depends on your onboarding setup and the sequence linked to the package.

### Can I customize the packages page appearance?

The packages page uses a standard layout with your package details. Focus on writing clear names and descriptions to present your services professionally.

### How quickly do I receive the payment?

Payout timing depends on your Stripe account settings. By default, Stripe processes payouts on a rolling basis.
