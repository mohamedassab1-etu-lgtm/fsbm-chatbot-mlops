import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const skip = parseInt(searchParams.get('skip') || '0');
    const take = parseInt(searchParams.get('take') || '10');
    const searchLower = q.toLowerCase().trim();

    try {
        if (!searchLower) {
            // Requête SQL classique avec pagination native pour la vue par défaut
            const conversations = await prisma.conversation.findMany({
                where: { userId: session.user.id },
                orderBy: { updatedAt: 'desc' },
                skip,
                take,
                include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } }
            });

            const results = conversations.map(conv => {
                let snippet = (conv.messages[0]?.text || "").replace(/\n/g, ' ').trim();
                if (snippet.length > 100) snippet = snippet.substring(0, 100) + "...";
                return {
                    id: conv.id,
                    title: conv.title,
                    updatedAt: conv.updatedAt,
                    snippet
                };
            });

            return NextResponse.json(results);
        }

        // Pour la recherche avec texte : on récupère tout pour avoir le bon score
        const conversations = await prisma.conversation.findMany({
            where: {
                userId: session.user.id,
                OR: [
                    { title: { contains: searchLower } },
                    { messages: { some: { text: { contains: searchLower } } } }
                ]
            },
            include: { messages: { orderBy: { createdAt: 'desc' } } }
        });

        const scoredResults = conversations.map(conv => {
            let score = 0;
            let snippet = "";

            if (conv.title.toLowerCase().includes(searchLower)) {
                score += 2;
            }

            const matchingMessages = conv.messages.filter(m =>
                m.text.toLowerCase().includes(searchLower)
            );

            if (matchingMessages.length > 0) {
                score += matchingMessages.length;
                const fullText = matchingMessages[0].text.replace(/\n/g, ' ').trim();
                const matchIndex = fullText.toLowerCase().indexOf(searchLower);

                const start = Math.max(0, matchIndex - 40);
                const end = Math.min(fullText.length, matchIndex + searchLower.length + 40);

                snippet = (start > 0 ? "..." : "") + fullText.substring(start, end) + (end < fullText.length ? "..." : "");
            } else {
                snippet = (conv.messages[0]?.text || "").replace(/\n/g, ' ').trim();
                if (snippet.length > 100) snippet = snippet.substring(0, 100) + "...";
            }

            return {
                id: conv.id,
                title: conv.title,
                updatedAt: conv.updatedAt,
                snippet,
                score: score,
                timestamp: new Date(conv.updatedAt).getTime()
            };
        });

        // Tri par score de pertinence, puis par date
        scoredResults.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return b.timestamp - a.timestamp;
        });

        // Application de la pagination manuelle sur les résultats triés
        const paginatedResults = scoredResults.slice(skip, skip + take);

        const finalResults = paginatedResults.map(({ id, title, updatedAt, snippet }) => ({
            id, title, updatedAt, snippet
        }));

        return NextResponse.json(finalResults);

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}