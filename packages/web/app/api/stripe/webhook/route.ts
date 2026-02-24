import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/db'

/**
 * POST /api/stripe/webhook
 * Handles incoming Stripe webhook events.
 *
 * Handled events:
 * - checkout.session.completed  → activate the pending user + create Subscription record
 * - customer.subscription.updated → sync subscription status
 * - customer.subscription.deleted → mark user as cancelled
 * - invoice.payment_succeeded   → extend subscription period
 * - invoice.payment_failed      → flag payment failure on subscription
 *
 * Required environment variables:
 * - STRIPE_SECRET_KEY
 * - STRIPE_WEBHOOK_SECRET  (from Stripe Dashboard → Webhooks, or `stripe listen --print-secret`)
 *
 * Local testing:
 *   stripe listen --forward-to localhost:3000/api/stripe/webhook
 */
export async function POST(request: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('Stripe environment variables not configured')
    return NextResponse.json(
      { error: 'Webhook handler not configured' },
      { status: 503 }
    )
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.client_reference_id

        if (!userId) {
          console.error('checkout.session.completed: missing client_reference_id')
          break
        }

        // Retrieve the subscription to get period dates
        let periodStart: Date | null = null
        let periodEnd: Date | null = null
        let stripeSubscriptionId: string | null = null

        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string)
          console.log('Retrieved subscription for checkout session:', sub.id, 'status:', sub.status)
          stripeSubscriptionId = sub.id
          // In Stripe API 2024-09-30+ (acacia), current_period_start/end moved to items
          const item: Stripe.SubscriptionItem | undefined = sub.items.data[0]
          console.log('Subscription item:', item?.id, 'current_period_start:', item?.current_period_start, 'current_period_end:', item?.current_period_end)
          if (item?.current_period_start) periodStart = new Date(item.current_period_start * 1000)
          if (item?.current_period_end) periodEnd = new Date(item.current_period_end * 1000)
        }

        // Activate the user
        await prisma.user.update({
          where: { id: userId },
          data: {
            tier: 'premium',
            subscriptionStatus: 'active',
            subscriptionExpiresAt: periodEnd,
            aiKeyMode: 'builtin', // premium users default to built-in AI
          },
        })

        // Create (or upsert) a Subscription record
        if (stripeSubscriptionId) {
          await prisma.subscription.create({
            data: {
              userId,
              stripeSubscriptionId,
              plan: 'premium',
              status: 'active',
              currentPeriodStart: periodStart,
              currentPeriodEnd: periodEnd,
            },
          })
        }

        console.log(`Activated user ${userId} via checkout session ${session.id}`)
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        // In Stripe API 2024-09-30+ (acacia), current_period_start/end moved to items
        const item: Stripe.SubscriptionItem | undefined = sub.items.data[0]
        const periodStart = item?.current_period_start ? new Date(item.current_period_start * 1000) : undefined
        const periodEnd = item?.current_period_end ? new Date(item.current_period_end * 1000) : undefined
        const status = sub.status === 'active' ? 'active' : sub.status

        // Update the Subscription record
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: {
            status,
            ...(periodStart ? { currentPeriodStart: periodStart } : {}),
            ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}),
          },
        })

        // Sync user's subscription fields
        const existing = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: sub.id },
          select: { userId: true },
        })
        if (existing) {
          await prisma.user.update({
            where: { id: existing.userId },
            data: {
              subscriptionStatus: status,
              subscriptionExpiresAt: periodEnd,
            },
          })
        }

        console.log(`Updated subscription ${sub.id} → status=${status}`)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription

        const existing = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: sub.id },
          select: { userId: true },
        })

        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: { status: 'cancelled' },
        })

        if (existing) {
          await prisma.user.update({
            where: { id: existing.userId },
            data: {
              tier: 'cancelled',
              subscriptionStatus: 'cancelled',
            },
          })
          console.log(`Cancelled subscription for user ${existing.userId}`)
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        // In Stripe API 2024-09-30+ (acacia), subscription moved to parent.subscription_details.subscription
        const invoiceSubRef = invoice.parent?.subscription_details?.subscription
        const invoiceSubId = typeof invoiceSubRef === 'string' ? invoiceSubRef : invoiceSubRef?.id
        if (invoiceSubId) {
          const sub = await stripe.subscriptions.retrieve(invoiceSubId)
          // In Stripe API 2024-09-30+ (acacia), current_period_start/end moved to items
          const item: Stripe.SubscriptionItem | undefined = sub.items.data[0]
          const periodStart = item?.current_period_start ? new Date(item.current_period_start * 1000) : undefined
          const periodEnd = item?.current_period_end ? new Date(item.current_period_end * 1000) : undefined

          await prisma.subscription.updateMany({
            where: { stripeSubscriptionId: sub.id },
            data: {
              status: 'active',
              ...(periodStart ? { currentPeriodStart: periodStart } : {}),
              ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}),
            },
          })

          const existing = await prisma.subscription.findFirst({
            where: { stripeSubscriptionId: sub.id },
            select: { userId: true },
          })
          if (existing) {
            await prisma.user.update({
              where: { id: existing.userId },
              data: {
                subscriptionStatus: 'active',
                subscriptionExpiresAt: periodEnd,
              },
            })
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoiceFailed = event.data.object as Stripe.Invoice
        // In Stripe API 2024-09-30+ (acacia), subscription moved to parent.subscription_details.subscription
        const failedSubRef = invoiceFailed.parent?.subscription_details?.subscription
        const failedSubId = typeof failedSubRef === 'string' ? failedSubRef : failedSubRef?.id
        if (failedSubId) {
          await prisma.subscription.updateMany({
            where: { stripeSubscriptionId: failedSubId },
            data: { status: 'past_due' },
          })

          const existing = await prisma.subscription.findFirst({
            where: { stripeSubscriptionId: failedSubId },
            select: { userId: true },
          })
          if (existing) {
            await prisma.user.update({
              where: { id: existing.userId },
              data: { subscriptionStatus: 'past_due' },
            })
            console.warn(`Payment failed for user ${existing.userId}`)
          }
        }
        break
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler error' },
      { status: 500 }
    )
  }
}
