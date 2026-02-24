'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, Loader2, Bot, User, Sparkles, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Breadcrumbs from '@/components/Breadcrumbs';
import AssessmentTabs from '@/components/AssessmentTabs';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

const AI_URL = process.env.NEXT_PUBLIC_AI_URL || 'http://localhost:8000';

export default function ChatPage() {
    const { id } = useParams();
    const router = useRouter();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [streaming, setStreaming] = useState(false);
    const [streamStatus, setStreamStatus] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = useCallback(async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!input.trim() || loading || streaming) return;

        const question = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: question }]);
        setLoading(true);

        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const abort = new AbortController();
            abortRef.current = abort;

            const res = await fetch(`${AI_URL}/ai/chat?stream=true`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    session_id: id,
                    educator_id: 'current',
                    question,
                }),
                signal: abort.signal,
            });

            if (!res.ok) throw new Error('Failed to get response');

            setLoading(false);

            const reader = res.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) throw new Error('No response body');

            let buffer = '';
            let hasStartedTokens = false;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || !trimmed.startsWith('data: ')) continue;

                    const data = trimmed.slice(6);
                    if (data === '[DONE]') {
                        setStreaming(false);
                        setStreamStatus('');
                        continue;
                    }

                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.status) {
                            // Status events from pre-processing phases
                            const statusMap: Record<string, string> = {
                                thinking: 'Analyzing your question...',
                                fetching_data: 'Loading class data...',
                                generating: 'Generating response...',
                            };
                            setStreamStatus(statusMap[parsed.status] || parsed.status);
                        } else if (parsed.token) {
                            if (!hasStartedTokens) {
                                hasStartedTokens = true;
                                setStreaming(true);
                                setStreamStatus('');
                                setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
                            }
                            setMessages(prev => {
                                const updated = [...prev];
                                const last = updated[updated.length - 1];
                                if (last && last.role === 'assistant') {
                                    updated[updated.length - 1] = {
                                        ...last,
                                        content: last.content + parsed.token,
                                    };
                                }
                                return updated;
                            });
                        }
                    } catch {
                        // Ignore parse errors
                    }
                }
            }

            setStreaming(false);
        } catch (err: any) {
            if (err.name === 'AbortError') return;
            toast.error('Failed to get response');
            setMessages(prev => [
                ...prev,
                { role: 'assistant', content: 'Sorry, I was unable to process your question. Please try again.' },
            ]);
        } finally {
            setLoading(false);
            setStreaming(false);
            setStreamStatus('');
            abortRef.current = null;
        }
    }, [input, loading, streaming, id]);

    const [clearing, setClearing] = useState(false);

    async function clearHistory() {
        if (clearing) return;
        setClearing(true);
        try {
            await fetch(`${AI_URL}/ai/chat/${id}?educator_id=current`, { method: 'DELETE' });
            setMessages([]);
            toast.success('Chat history cleared', { id: 'clear-chat' });
        } catch {
            toast.error('Failed to clear history', { id: 'clear-chat-err' });
        } finally {
            setClearing(false);
        }
    }

    const suggestions = [
        'Which students need the most support?',
        'What are the weakest domains in this class?',
        'How many students are Tier 3?',
        'What interventions do you recommend for numeracy?',
        'Compare reading vs numeracy scores',
    ];

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)]">
            {/* Navigation */}
            <div className="assessment-nav">
                <Breadcrumbs items={[
                    { label: "Assessments", href: "/sessions" },
                    { label: "Chat" },
                ]} />
                <AssessmentTabs assessmentId={id as string} />
            </div>

            {/* Header */}
            <div className="glass-card p-4 flex items-center gap-3 mb-4 rounded-xl">
                <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-700 transition">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h2 className="text-slate-800 font-semibold text-sm">Assessment Assistant</h2>
                        <p className="text-slate-500 text-xs">
                            {streaming ? (
                                <span className="text-indigo-600 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" /> Streaming...
                                </span>
                            ) : streamStatus ? (
                                <span className="text-amber-600 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" /> {streamStatus}
                                </span>
                            ) : 'Ask questions about this class\u0027s data'}
                        </p>
                    </div>
                </div>
                <div className="ml-auto flex items-center gap-3">
                    <div className="flex items-center gap-1 text-indigo-500 text-xs">
                        <Sparkles className="w-3 h-3" />
                        <span>AI-Powered</span>
                    </div>
                    {messages.length > 0 && (
                        <button onClick={clearHistory} className="text-slate-400 hover:text-red-500 transition" title="Clear chat">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 px-2">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
                            <Bot className="w-8 h-8 text-indigo-500" />
                        </div>
                        <h3 className="text-slate-800 font-semibold mb-2">Ask me anything</h3>
                        <p className="text-slate-500 text-sm max-w-md mb-6">
                            I can answer questions about this class&apos;s screening data, student
                            performance, tier distributions, and intervention recommendations.
                        </p>
                        <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                            {suggestions.map((s, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setInput(s)}
                                    className="text-xs px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 
                                               hover:bg-indigo-100 transition-colors border border-indigo-200"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex items-start gap-2 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user'
                                ? 'bg-blue-50'
                                : 'bg-indigo-50'
                                }`}>
                                {msg.role === 'user'
                                    ? <User className="w-3.5 h-3.5 text-blue-600" />
                                    : <Bot className="w-3.5 h-3.5 text-indigo-600" />
                                }
                            </div>
                            <div className={`rounded-xl px-4 py-2.5 text-sm leading-relaxed ${msg.role === 'user'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                                }`}>
                                <div className="whitespace-pre-wrap">{msg.content}
                                    {streaming && idx === messages.length - 1 && msg.role === 'assistant' && (
                                        <span className="inline-block w-1.5 h-4 bg-indigo-500 ml-0.5 animate-pulse" />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {(loading || (streamStatus && !streaming)) && (
                    <div className="flex items-start gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center">
                            <Bot className="w-3.5 h-3.5 text-indigo-600" />
                        </div>
                        <div className="bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5">
                            <div className="flex items-center gap-2 text-slate-500 text-sm">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                {streamStatus || 'Thinking...'}
                            </div>
                        </div>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="glass-card p-3 mt-4 rounded-xl">
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about this class's data..."
                        className="flex-1 bg-transparent text-slate-800 placeholder-slate-400 outline-none text-sm"
                        disabled={loading || streaming || !!streamStatus}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || loading || streaming || !!streamStatus}
                        className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:hover:bg-indigo-600 
                                   flex items-center justify-center transition-colors"
                    >
                        <Send className="w-3.5 h-3.5 text-white" />
                    </button>
                </div>
            </form>
        </div>
    );
}
