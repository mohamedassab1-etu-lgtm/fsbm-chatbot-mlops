import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string; messageId: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, messageId } = await params;
    const body = await request.json().catch(() => ({}));

    const updateData: any = {};
    if (body.text !== undefined) updateData.text = body.text;
    if (body.feedback !== undefined) updateData.feedback = body.feedback;
    // On ajoute isStopped ici
    if (body.isStopped !== undefined) updateData.isStopped = body.isStopped;

    if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    const result = await prisma.message.updateMany({
        where: { id: messageId, conversationId: id, conversation: { userId: session.user.id } },
        data: updateData,
    });

    if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.conversation.update({
        where: { id },
        data: { updatedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
}