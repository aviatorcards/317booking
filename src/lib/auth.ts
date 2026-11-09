import { type NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "./prisma";
import { clientIp, rateLimit } from "./rateLimit";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials.password) return null;
        const headerBag = req?.headers;
        const ip = headerBag
          ? clientIp({
              get(name: string) {
                const value = (headerBag as Record<string, string | string[] | undefined>)[name];
                if (Array.isArray(value)) return value[0] ?? null;
                return value ?? null;
              },
            })
          : "unknown";
        const emailKey = credentials.email.toLowerCase();
        if (!rateLimit(`login:${ip}`, 10, 15 * 60 * 1000) || !rateLimit(`login:${emailKey}`, 10, 15 * 60 * 1000)) {
          throw new Error("Too many login attempts");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user) return null;

        const valid = await compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, role: user.role, sessionVersion: user.sessionVersion };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.sessionVersion = user.sessionVersion ?? 0;
        token.invalid = false;
        return token;
      }
      if (!token.id) return token;
      const dbUser = await prisma.user.findUnique({
        where: { id: token.id as string },
        select: { sessionVersion: true, role: true },
      });
      if (!dbUser || dbUser.sessionVersion !== (token.sessionVersion ?? 0)) {
        token.invalid = true;
        return token;
      }
      token.role = dbUser.role;
      token.invalid = false;
      return token;
    },
    async session({ session, token }) {
      if (!token?.id || token.invalid) {
        session.user.id = "";
        session.user.role = "";
        return session;
      }
      session.user.id = token.id as string;
      session.user.role = token.role as string;
      return session;
    },
  },
};

export const getSession = () => getServerSession(authOptions);
