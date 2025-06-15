
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe'; // Your Stripe utility
import { updateUserProfile } from '@/lib/mock-data'; // Or your actual Firestore update function

// Ensure this is set in your .env.local and App Hosting environment variables
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  if (!webhookSecret) {
    console.error('Stripe webhook secret is not configured.');
    return NextResponse.json({ error: 'Webhook secret not configured.' }, { status: 500 });
  }

  const payload = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No stripe-signature header found.' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Error verifying webhook signature: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      console.log('Checkout session completed:', session.id);

      const firebaseUID = session.metadata?.firebaseUID;
      const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;

      if (!firebaseUID) {
        console.error('Firebase UID not found in session metadata for session:', session.id);
        return NextResponse.json({ received: true, error: 'Firebase UID missing in metadata' });
      }
      
      if (!stripeCustomerId) {
        console.error('Stripe Customer ID not found in session for session:', session.id);
        return NextResponse.json({ received: true, error: 'Stripe Customer ID missing' });
      }

      try {
        await updateUserProfile(firebaseUID, {
          subscriptionStatus: 'premium',
          stripeCustomerId: stripeCustomerId,
        });
        console.log(`Successfully updated user ${firebaseUID} to premium. Stripe Customer ID: ${stripeCustomerId}`);
      } catch (dbError: any) {
        console.error(`Database error updating user ${firebaseUID}:`, dbError);
        return NextResponse.json({ received: true, error: 'Database update failed after payment.' });
      }
      break;

    // Example: Handling subscription cancellations (you would add this if needed)
    // case 'customer.subscription.deleted':
    //   const subscriptionDeleted = event.data.object as Stripe.Subscription;
    //   const customerIdForDeletedSub = typeof subscriptionDeleted.customer === 'string' ? subscriptionDeleted.customer : subscriptionDeleted.customer?.id;
    //   if (customerIdForDeletedSub) {
    //     // You'd need a way to find your Firebase user by Stripe Customer ID
    //     // const userToDowngrade = await findUserByStripeCustomerId(customerIdForDeletedSub);
    //     // if (userToDowngrade) {
    //     //   await updateUserProfile(userToDowngrade.id, { subscriptionStatus: 'free' });
    //     //   console.log(`User associated with Stripe Customer ID ${customerIdForDeletedSub} downgraded to free.`);
    //     // } else {
    //     //   console.warn(`Could not find user for Stripe Customer ID ${customerIdForDeletedSub} to downgrade.`);
    //     // }
    //   }
    //   console.log('Subscription deleted:', subscriptionDeleted.id);
    //   break;
      
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
