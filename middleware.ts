import { withAuth } from 'next-auth/middleware'

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token
  }
})

export const config = {
  matcher: [
    '/deconstruct',
    '/history',
    '/api/deconstruct',
    '/api/identify',
    '/api/knowledge-card',
    '/api/sessions/:path*'
  ]
}
