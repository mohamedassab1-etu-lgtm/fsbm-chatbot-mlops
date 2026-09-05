import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { text, tags, conversationId, messageId } = body;

    if (!conversationId || !messageId) {
        return NextResponse.json({ error: "Missing conversation or message ID" }, { status: 400 });
    }

    try {
        const report = await prisma.report.create({
            data: {
                userId: session.user.id,
                conversationId,
                messageId: String(messageId),
                text: text || "",
                tags: JSON.stringify(tags || [])
            }
        });

        // NOUVEAU : On marque le message comme signalé dans la base de données
        await prisma.message.update({
            where: { id: String(messageId) },
            data: { isReported: true }
        });

        return NextResponse.json({ ok: true, report });
    } catch (error) {
        console.error("Erreur lors de la création du rapport:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}