# Creating Packages

## What is this?

Packages are the coaching products you sell to clients through Athli. Each package has a name, description, price, and billing type. You can create multiple packages to offer different tiers of coaching services.

## Why is it useful?

Packages let you professionally present your coaching services with clear pricing. Clients can browse your offerings and purchase directly, removing the back-and-forth of manual invoicing. You can also link sequences to packages for automated post-purchase workflows.

## Step-by-Step Guide

### Creating a New Package

1. Go to **Business > Packages**
2. Click **Create Package**
3. Fill in the following fields:
   - **Name** (e.g., "Premium Monthly Coaching")
   - **Description** of what is included in the package
   - **Price** and currency
   - **Billing type**: choose between one-time payment or recurring subscription
   - **Duration** for recurring packages (monthly, quarterly, annually, etc.)
4. Click **Save**

> [Screenshot: Create package form with name, description, price, and billing type fields]

### Setting Up Different Tiers

You can create multiple packages to offer different service levels:

- **Basic** - Limited check-ins, self-guided training
- **Premium** - Weekly check-ins, custom programming
- **VIP** - Daily support, fully personalized coaching

Each tier can have its own price, description, and linked automation.

> [Screenshot: Packages list showing multiple tiers with different prices]

### Linking a Sequence to a Package

1. Open an existing package or create a new one
2. In the package settings, look for the **Sequence** option
3. Select a sequence to link
4. When a client purchases this package, the linked sequence runs automatically

This is useful for onboarding new clients after purchase, sending welcome materials, or assigning initial workouts.

### Deactivating a Package

1. Go to **Business > Packages**
2. Find the package you want to deactivate
3. Toggle the package status to inactive
4. The package is no longer visible to clients but remains in your list for reactivation

## Things to Note

- You can deactivate packages without deleting them permanently
- Deactivated packages are hidden from the client-facing packages page
- Linking a sequence to a package automates post-purchase actions
- Recurring packages automatically bill clients at the set interval through Stripe
- You must have Stripe connected before creating packages

## FAQs

### Can I edit a package after creating it?

Yes. Go to **Business > Packages**, click on the package, and update any field. Changes apply to new purchases only.

### What happens when I deactivate a package?

Existing subscribers continue their current subscription. New clients cannot purchase the deactivated package.

### Can I offer free trials before charging?

Stripe supports trial periods on recurring subscriptions. Configure this in your package settings.

### Can I link multiple sequences to one package?

Each package supports one linked sequence. If you need multiple automations, combine the steps into a single sequence.
