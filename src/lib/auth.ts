import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import connectDB from './db';
import { User } from '@/models/User';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        await connectDB();
        const user = await User.findOne({ email: credentials.email.toLowerCase(), isActive: true });

        if (!user) {
          throw new Error('Invalid credentials');
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          throw new Error('Invalid credentials');
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          orgUnitId: user.orgUnitId?.toString(),
          subdivisionId: user.subdivisionId?.toString(),
          divisionId: user.divisionId?.toString(),
          circleId: user.circleId?.toString(),
          wingId: user.wingId?.toString(),
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.orgUnitId = (user as any).orgUnitId;
        token.subdivisionId = (user as any).subdivisionId;
        token.divisionId = (user as any).divisionId;
        token.circleId = (user as any).circleId;
        token.wingId = (user as any).wingId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).orgUnitId = token.orgUnitId;
        (session.user as any).subdivisionId = token.subdivisionId;
        (session.user as any).divisionId = token.divisionId;
        (session.user as any).circleId = token.circleId;
        (session.user as any).wingId = token.wingId;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
