import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

// NOTE: PrismaClient + PrismaMariaDb adapter now live in src/lib/prisma.ts
// (shared singleton, reused by the /api/conversations routes too) -
// nothing else changes about how the DB connects.

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma), // Fait le pont entre NextAuth et ta DB
    session: { strategy: "jwt" },
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        }),
    ],
    callbacks: {
        async session({ session, token }) {
            if (session?.user && token?.email) {
                // Tag whether this is an official FSBM / UH2C student email
                (session.user as any).isStudent = token.email.endsWith("@etu.univh2c.ma");
            }
            if (session?.user && token?.id) {
                // Needed so /api/conversations/* can scope queries to this user
                // without an extra DB lookup by email on every request.
                session.user.id = token.id as string;
            }
            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                token.email = user.email;
                token.id = user.id;
            }
            return token;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
};

// 1. Generate the standard NextAuth handler
const nextAuthHandler = NextAuth(authOptions);

// 2. Create a dynamic wrapper to intercept the request
async function handler(req: Request, ctx: any) {
    // Capture the dynamic host from the request headers (works for ngrok, local IP, etc.)
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const protocol = req.headers.get("x-forwarded-proto") || "http";

    if (host) {
        // Dynamically override the environment variable for this specific request
        process.env.NEXTAUTH_URL = `${protocol}://${host}`;
    }

    // Call the original NextAuth handler with the updated environment
    return nextAuthHandler(req, ctx);
}

// 3. Export our custom wrapper instead of the default handler
export { handler as GET, handler as POST };