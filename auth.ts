import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),

  // JWT strategy is required when using Credentials provider.
  // Sessions are stored in a signed cookie — no database round-trip on every request.
  session: { strategy: 'jwt' },

  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.password) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!valid) return null;

        return {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],

  callbacks: {
    // Runs when JWT is created or updated — embed id and role into the token
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user.role as string) ?? 'customer';
        token.firstName = (user as { firstName?: string | null }).firstName ?? null;
        token.lastName = (user as { lastName?: string | null }).lastName ?? null;
      } else if (token.id && token.firstName === undefined) {
        // Self-heal sessions minted before firstName/lastName were added to the JWT —
        // avoids forcing every already-logged-in user to sign out and back in.
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { firstName: true, lastName: true },
        });
        token.firstName = dbUser?.firstName ?? null;
        token.lastName = dbUser?.lastName ?? null;
      }
      return token;
    },

    // Runs when session is accessed — expose id and role to the client
    session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) as 'customer' | 'admin';
        session.user.firstName = (token.firstName as string | null) ?? null;
        session.user.lastName = (token.lastName as string | null) ?? null;
      }
      return session;
    },
  },

  pages: {
    signIn: '/account/login',
    error: '/account/login',
  },
});
