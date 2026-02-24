import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma, createUser } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

/**
 * POST /api/stripe/checkout
 * Creates a Stripe checkout session for new subscription sign-ups.
 *
 * Flow:
 * 1. Accept { email, password } from the signup form
 * 2. Pre-create (or re-use pending) user account in the database
 * 3. Create a Stripe Checkout session in subscription mode
 * 4. Return { url } for the client to redirect to
 *
 * Required environment variables:
 * - STRIPE_SECRET_KEY
 * - STRIPE_PRICE_ID
 * - NEXT_PUBLIC_BASE_URL
 */
export async function POST(request: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_ID) {
    console.error('Stripe environment variables not configured')
    return NextResponse.json(
      { error: 'Payment system not configured. Please contact support.' },
      { status: 503 }
    )
  }

  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Check for an existing user
    const existingUser = await prisma.user.findUnique({ where: { email } })

    if (existingUser && existingUser.subscriptionStatus !== 'pending') {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please log in.' },
        { status: 409 }
      )
    }

    // Create or refresh a pending user
    let userId: string
    if (existingUser && existingUser.subscriptionStatus === 'pending') {
      // Allow the user to restart checkout — update their password hash in case it changed
      const passwordHash = await hashPassword(password)
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { passwordHash },
      })
      userId = existingUser.id
    } else {
      const newUser = await createUser(email, password, 'pending', 'pending')
      userId = newUser.id
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      customer_email: email,
      // Used by the webhook to identify which pending user to activate
      client_reference_id: userId,
      success_url: `${baseUrl}/login?welcome=true`,
      cancel_url: `${baseUrl}/signup?canceled=true`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
