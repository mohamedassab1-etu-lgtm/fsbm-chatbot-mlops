import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { question } = body;

    // Talks to the streaming endpoint now, not the JSON one - this is
    // what makes live word-by-word typing possible.
    const pythonResponse = await fetch('http://localhost:8000/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });

    if (!pythonResponse.ok || !pythonResponse.body) {
      throw new Error('Failed to fetch from Python LLM server');
    }

    // Pass the upstream stream straight through to the browser instead
    // of buffering it into a single JSON payload - this is the key
    // change that lets the frontend read chunks as they arrive.
    return new Response(pythonResponse.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error proxying to LLM:', error);
    return NextResponse.json(
      { error: 'Error communicating with the AI server' },
      { status: 500 }
    );
  }
}