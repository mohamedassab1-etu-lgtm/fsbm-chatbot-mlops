import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const resolvedParams = await params;
    const id = resolvedParams.id;

    // Récupération des paramètres de pagination pour les messages
    const { searchParams } = new URL(request.url);
    const skip = parseInt(searchParams.get('skip') || '0');
    const take = parseInt(searchParams.get('take') || '10');

    const conversation = await prisma.conversation.findUnique({
        where: { id, userId: session.user.id },
    });

    if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // On récupère les X messages les plus récents, puis on les remet dans l'ordre chronologique
    const messages = await prisma.message.findMany({
        where: { conversationId: id },
        orderBy: { createdAt: 'desc' }, // Trie par les plus récents
        skip,
        take,
    });

    return NextResponse.json({
        ...conversation,
        messages: messages.reverse() // Remet dans l'ordre de lecture
    });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const resolvedParams = await params;
    const id = resolvedParams.id;
    const body = await request.json().catch(() => ({}));

    const updateData: any = {};
    if (typeof body?.title === "string" && body.title.trim()) {
        updateData.title = body.title.trim().slice(0, 80);
    }
    if (typeof body?.isPinned === "boolean") {
        updateData.isPinned = body.isPinned;
        updateData.pinnedAt = body.isPinned ? new Date() : null;
    }

    if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: "No data provided" }, { status: 400 });
    }

    const result = await prisma.conversation.updateMany({
        where: { id, userId: session.user.id },
        data: updateData,
    });

    if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const resolvedParams = await params;
    const id = resolvedParams.id;

    const result = await prisma.conversation.deleteMany({
        where: { id, userId: session.user.id },
    });

    if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
}