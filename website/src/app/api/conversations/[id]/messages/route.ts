import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    // On ajoute isStopped ici
    const { sender, text, isStopped } = body as { sender?: string; text?: string; isStopped?: boolean };

    if ((sender !== "user" && sender !== "bot") || typeof text !== "string") {
        return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }

    const conversation = await prisma.conversation.findFirst({
        where: { id, userId: session.user.id },
        select: { id: true },
    });
    if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const message = await prisma.message.create({
        // On sauvegarde isStopped en base de données
        data: { conversationId: id, sender, text, isStopped: isStopped || false },
    });

    await prisma.conversation.update({
        where: { id },
        data: { updatedAt: new Date() },
    });

    return NextResponse.json(message);
}