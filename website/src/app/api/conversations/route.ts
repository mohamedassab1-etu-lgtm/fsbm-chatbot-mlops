import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Récupération des paramètres de pagination dans l'URL
    const { searchParams } = new URL(request.url);
    const skip = parseInt(searchParams.get('skip') || '0');
    const take = parseInt(searchParams.get('take') || '10');

    const conversations = await prisma.conversation.findMany({
        where: { userId: session.user.id },
        orderBy: [
            { isPinned: "desc" },
            { pinnedAt: "desc" },
            { updatedAt: "desc" }
        ],
        select: { id: true, title: true, updatedAt: true, isPinned: true, pinnedAt: true },
        skip,
        take,
    });

    return NextResponse.json(conversations);
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const rawTitle = typeof body?.title === "string" ? body.title.trim() : "";
    const title = rawTitle ? rawTitle.slice(0, 80) : "New chat";

    const conversation = await prisma.conversation.create({
        data: { userId: session.user.id, title },
        select: { id: true, title: true, updatedAt: true, isPinned: true, pinnedAt: true },
    });

    return NextResponse.json(conversation);
}