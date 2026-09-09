import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

interface OpenAIRequest {
  messages?: { role: string; content: string }[];
  model?: string;
  max_tokens?: number;
  stream?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    const body: OpenAIRequest = await req.json();
    const { messages, model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo', max_tokens = 512, stream = false } = body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: '`messages` array is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured on server' }, { status: 500 });
    }

    const payload: Record<string, unknown> = { model, messages, max_tokens };
    if (stream) (payload as Record<string, unknown>).stream = true;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('OpenAI proxy error:', res.status, text);
      return NextResponse.json({ error: 'OpenAI request failed', details: text }, { status: 502 });
    }

    if (stream) {
      // Pipe the raw streaming body through as text/event-stream
      if (!res.body) {
        return NextResponse.json({ error: 'No stream from OpenAI' }, { status: 502 });
      }

      // Save user message before streaming
      const lastUser = messages[messages.length - 1];
      if (lastUser) {
        await prisma.chatMessage.create({
          data: { userId: user.id, role: 'user', content: lastUser.content }
        });
      }

      const streamBody = new ReadableStream({
        async start(controller) {
          const reader = res.body!.getReader();
          const decoder = new TextDecoder();
          let assistantContent = '';
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value);
              assistantContent += chunk;
              controller.enqueue(chunk);
            }
          } catch (err) {
            console.error('Error proxying OpenAI stream:', err);
          } finally {
            // Save assistant message after streaming completes
            if (assistantContent) {
              try {
                await prisma.chatMessage.create({
                  data: { userId: user.id, role: 'assistant', content: assistantContent }
                });
              } catch (dbErr) {
                console.error('Failed to save assistant message:', dbErr);
              }
            }
            controller.close();
            reader.releaseLock();
          }
        },
      });

      return new Response(streamBody, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      });
    }

    // Non-streaming: return parsed JSON (safer for client)
    const data = await res.json();

    // Persist last user message and assistant response
    try {
      const assistantText = data?.choices?.[0]?.message?.content || '';
      const lastUser = messages[messages.length - 1];
      if (lastUser) {
        await prisma.chatMessage.create({
          data: { userId: user.id, role: 'user', content: lastUser.content }
        });
      }
      if (assistantText) {
        await prisma.chatMessage.create({
          data: { userId: user.id, role: 'assistant', content: assistantText }
        });
      }
    } catch (dbErr) {
      console.error('Failed to save chat messages to DB:', dbErr);
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('OpenAI proxy exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
