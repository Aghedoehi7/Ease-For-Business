import { NextRequest, NextResponse } from 'next/server';

interface ChatRequest {
  message?: string;
  messages?: { role: string; content: string }[];
  stream?: boolean;
}

// Mock AI response - in production, this would call OpenAI API or similar
function generateAIResponse(userMessage: string): string {
  const lowerMessage = userMessage.toLowerCase();

  // Inventory-related responses
  if (lowerMessage.includes('inventory') || lowerMessage.includes('stock')) {
    return 'I can help you manage your inventory! You can view all products, track stock levels, and receive alerts for low inventory. Would you like to add a new product or check current stock levels?';
  }

  if (lowerMessage.includes('low stock') || lowerMessage.includes('alert')) {
    return 'Low stock alerts help you maintain optimal inventory levels. You can set minimum stock thresholds for each product, and I\'ll notify you when items fall below these levels. This prevents stockouts and ensures customer satisfaction.';
  }

  if (lowerMessage.includes('product') || lowerMessage.includes('add')) {
    return 'To add a new product, go to the Inventory section and click "Add Product". You\'ll need to provide: product name, SKU, category, price, and initial quantity. This information helps track and manage your inventory efficiently.';
  }

  // General business responses
  if (lowerMessage.includes('help') || lowerMessage.includes('feature')) {
    return 'Ease provides comprehensive inventory management and business analytics for Nigerian SMEs. Key features include: real-time inventory tracking, AI-powered insights, sales reporting, and business recommendations. How can I assist you today?';
  }

  if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('subscription')) {
    return 'Ease offers flexible pricing plans for businesses of all sizes. Our Basic plan starts at ₦5,000/month with essential inventory features. Premium plan includes advanced analytics and unlimited products. Contact our sales team for a customized quote!';
  }

  if (lowerMessage.includes('nigeri') || lowerMessage.includes('sme') || lowerMessage.includes('small business')) {
    return 'Ease is specifically designed for Nigerian small and medium enterprises. We understand the unique challenges of running a business in Nigeria and have built solutions that work locally while maintaining global standards.';
  }

  // Greeting responses
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    return 'Hello! Welcome to Ease. I\'m your AI assistant here to help with inventory management, business insights, and answering your questions. What would you like to know?';
  }

  if (lowerMessage.includes('thank')) {
    return 'You\'re welcome! Feel free to ask me anything about managing your inventory or using Ease features. I\'m here to help!';
  }

  // Default response
  return 'That\'s a great question! I can help you with inventory management, sales tracking, business analytics, and more. Please feel free to ask me specific questions about these topics, and I\'ll provide helpful guidance.';
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, messages } = body;

    // Determine last user message for fallback/mock
    const lastUserMessage = message || (messages && messages.slice().reverse().find(m => m.role === 'user')?.content) || '';

    if (!lastUserMessage || lastUserMessage.trim() === '') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // If OPENAI_API_KEY is provided, forward conversation to OpenAI Chat Completions
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      const { stream } = body as ChatRequest;
      const systemPrompt = {
        role: 'system',
        content:
          "You are Ease Assistant — a helpful assistant specialized in inventory management and small business operations. Provide concise, accurate, and friendly answers tailored to the user's needs.",
      };

      const apiMessages = [
        systemPrompt,
        // include conversation context if provided
        ...(Array.isArray(messages)
          ? messages.map((m) => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content }))
          : []),
        // ensure latest user message is present
        { role: 'user', content: lastUserMessage },
      ];

      // If client requested streaming, use OpenAI streaming and pipe through
      if (stream) {
        const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({ model: 'gpt-3.5-turbo', messages: apiMessages, max_tokens: 512, stream: true }),
        });

        if (!openaiRes.ok || !openaiRes.body) {
          const errText = await openaiRes.text();
          console.error('OpenAI streaming error:', errText);
          const fallback = generateAIResponse(lastUserMessage);
          return NextResponse.json({ response: fallback }, { status: 200 });
        }

        const stream = new ReadableStream({
          async start(controller) {
            const reader = openaiRes.body!.getReader();
            const decoder = new TextDecoder();
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                controller.enqueue(chunk);
              }
            } catch (err) {
              console.error('Error reading OpenAI stream:', err);
            } finally {
              controller.close();
              reader.releaseLock();
            }
          },
        });

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
          },
        });
      }

      // Non-streaming OpenAI request
      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({ model: 'gpt-3.5-turbo', messages: apiMessages, max_tokens: 512 }),
      });

      if (!openaiRes.ok) {
        const errText = await openaiRes.text();
        console.error('OpenAI error:', errText);
        const fallback = generateAIResponse(lastUserMessage);
        return NextResponse.json({ response: fallback }, { status: 200 });
      }

      const openaiData = await openaiRes.json();
      const text = openaiData?.choices?.[0]?.message?.content || generateAIResponse(lastUserMessage);

      return NextResponse.json({ response: text }, { status: 200 });
    }

    // No OpenAI key — use mock response function
    const response = generateAIResponse(lastUserMessage);
    return NextResponse.json({ response }, { status: 200 });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
