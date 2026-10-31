import NextAuth from "next-auth";
import Nodemailer from "next-auth/providers/nodemailer";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/server/db";
import { isKnownIdentity } from "@/server/repo/identity";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database", maxAge: 8 * 60 * 60 },
  providers: [
    Nodemailer({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
      maxAge: 15 * 60, // single-use link, 15 minutes
    }),
  ],
  pages: { signIn: "/signin", verifyRequest: "/signin/check", error: "/signin" },
  callbacks: {
    async signIn({ user, email }) {
      // Links go only to provisioned employees, existing members or holders of a pending invitation.
      // Unknown addresses get the same "check your inbox" page so registration can't be probed.
      if (email?.verificationRequest) {
        return (await isKnownIdentity(user.email ?? "")) ? true : "/signin/check";
      }
      return true;
    },
    // Expose only what the UI needs; never the session token or adapter internals.
    session({ session, user }) {
      return { expires: session.expires, user: { id: user.id, name: user.name, email: user.email } } as typeof session;
    },
  },
});
