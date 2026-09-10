import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { origin } = new URL(request.url)
  // The application uses client-side implicit flow for OAuth.
  // This server route is intentionally disabled to avoid conflicting with the browser client.
  return NextResponse.redirect(`${origin}/dashboard`)
}
