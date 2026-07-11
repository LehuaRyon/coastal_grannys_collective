import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: 'customer' | 'admin';
      firstName: string | null;
      lastName: string | null;
    } & DefaultSession['user'];
  }

  interface User {
    role?: string | null;
    password?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    firstName: string | null;
    lastName: string | null;
  }
}
