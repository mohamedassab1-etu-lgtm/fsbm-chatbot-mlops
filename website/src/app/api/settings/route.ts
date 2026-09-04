import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma'; // Adjust path if your prisma client is elsewhere

export async function GET() {
    const session = await getServerSession();
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { theme: true, voice: true }
    });
    return NextResponse.json(user || { theme: 'system', voice: 'female' });
}

export async function PATCH(req: Request) {
    const session = await getServerSession();
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const updatedUser = await prisma.user.update({
        where: { email: session.user.email },
        data: {
            ...(body.theme && { theme: body.theme }),
            ...(body.voice && { voice: body.voice })
        }
    });
    return NextResponse.json(updatedUser);
}