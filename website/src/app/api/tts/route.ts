import { NextRequest, NextResponse } from 'next/server';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

// Needs the Node.js runtime (streams, Buffer) - not the Edge runtime.
export const runtime = 'nodejs';

// Free Microsoft neural voice, no API key required. Vivienne is Microsoft's
// newer "conversation-optimized" voice - more natural and polished than the
// older general-purpose voices (e.g. DeniseNeural). Swap to
// "fr-FR-RemyMultilingualNeural" for the male equivalent, or back to
// "fr-FR-DeniseNeural" if you want the older/warmer general-purpose voice.

/**
 * Expands abbreviations and spells out things like email addresses so the
 * TTS engine pronounces them naturally instead of reading "Pr." literally
 * and then stalling on the following period, or reading an email as a run
 * of unpronounceable symbols.
 *
 * Order matters: emails are rewritten FIRST, before any generic "M."/"."
 * handling could touch the dots inside them.
 */
function normalizeForSpeech(raw: string): string {
    let text = raw;

    // 1. Email addresses -> spoken form ("nom point prenom arobase domaine point ma")
    const emailRegex = /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+)\.([a-zA-Z]{2,})/g;
    text = text.replace(emailRegex, (_match, local: string, domain: string, tld: string) => {
        const spokenLocal = local.replace(/\./g, ' point ');
        const spokenDomain = domain.replace(/\./g, ' point ');
        return `${spokenLocal} arobase ${spokenDomain} point ${tld}`;
    });

    // 2. French titles and common abbreviations - expanded to full words so
    //    the engine doesn't read the letters/pause on the period.
    const abbreviations: [RegExp, string][] = [
        [/\bPr\.\s*/g, 'Professeur '],
        [/\bPre\.\s*/g, 'Professeure '],
        [/\bDr\.\s*/g, 'Docteur '],
        [/\bMme\.?\s*/g, 'Madame '],
        [/\bMlle\.?\s*/g, 'Mademoiselle '],
        [/\bM\.\s+(?=[A-ZÀ-Ý])/g, 'Monsieur '], // "M. Dupont" - only before a capitalized name
        [/\betc\.\s*/gi, 'et cetera '],
        [/\bex\.\s*/gi, 'exemple '],
    ];
    for (const [pattern, replacement] of abbreviations) {
        text = text.replace(pattern, replacement);
    }

    return text;
}

export async function POST(req: NextRequest) {
    try {
        const { text, voicePreference } = await req.json(); // Extract the preference sent from frontend

        // Dynamically assign the voice
        const VOICE = voicePreference === 'male'
            ? 'fr-FR-RemyMultilingualNeural'
            : 'fr-FR-DeniseNeural';

        if (!text || typeof text !== 'string' || !text.trim()) {
            return NextResponse.json({ error: 'Missing text' }, { status: 400 });
        }

        const spokenText = normalizeForSpeech(text);

        const tts = new MsEdgeTTS();
        await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
        const { audioStream } = tts.toStream(spokenText);

        // Buffer the whole file server-side before responding - this is what
        // lets the client wait for one complete audio file instead of
        // starting playback on a half-generated stream (which is what
        // caused the "generate and speak at the same time" issue before).
        const chunks: Buffer[] = [];
        await new Promise<void>((resolve, reject) => {
            audioStream.on('data', (chunk: Buffer) => chunks.push(chunk));
            audioStream.on('end', () => resolve());
            audioStream.on('close', () => resolve());
            audioStream.on('error', (err: Error) => reject(err));
        });

        const audioBuffer = Buffer.concat(chunks);

        return new NextResponse(audioBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': String(audioBuffer.length),
                'Cache-Control': 'no-store',
            },
        });
    } catch (err) {
        console.error('TTS generation failed:', err);
        return NextResponse.json({ error: 'TTS generation failed' }, { status: 500 });
    }
}