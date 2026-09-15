import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';

        const response = await fetch(`${backendUrl}/generate-title`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error('Python backend error');
        }

        const data = await response.json();

        return NextResponse.json(data);

    } catch (error) {
        console.error('[generate-title route]', error);

        return NextResponse.json(
            { error: 'Failed to generate title' },
            { status: 500 }
        );
    }
}