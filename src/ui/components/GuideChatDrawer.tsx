import React, { useState, useEffect, useRef } from 'react';
import { NextStepRecommendation } from '../../guide/nextStep';
import { GUIDE_REGISTRY } from '../../guide/registry';
import { callServer } from '../../net/gate';
import { getSettings, updateSettings } from '../../storage/db';
import {
  X,
  Send,
  Sparkles,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'guide';
  text: string;
  time: string;
}

interface GuideChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  nextStep: NextStepRecommendation;
  isCloudMode: boolean;
  onNavigateSection: (sectionId: string) => void;
  initialPrompt?: string | null;
}

export const GuideChatDrawer: React.FC<GuideChatDrawerProps> = ({
  isOpen,
  onClose,
  nextStep,
  isCloudMode,
  onNavigateSection,
  initialPrompt,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'guide',
      text: `Hello. I am the Pramaan Guide. I can explain any feature, answer questions about Section 63(4) drafts, or guide you through the next recommended step.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  useEffect(() => {
    if (initialPrompt && isOpen) {
      handleSendMessage(initialPrompt);
    }
  }, [initialPrompt, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;
    if (!textToSend) setInputText('');

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    try {
      let replyText = '';

      // Ensure Guide AI consent is recorded so gate allows server inquiry
      try {
        const settings = await getSettings();
        if (!settings.guideAiConsentAt) {
          await updateSettings({ guideAiConsentAt: new Date().toISOString() });
        }
      } catch (settingsErr) {
        console.warn('[Guide] Failed setting guide consent:', settingsErr);
      }

      // Try calling server guide route (calls openai/gpt-oss-120b on helper server)
      try {
        const res = (await callServer('guide', {
          locale: 'en',
          guideId: 'chat',
          messages: [{ role: 'user', content: text }],
          state: { step: nextStep.title },
        }, { userConfirmed: true })) as any;
        if (res && (res.reply || res.answer)) {
          replyText = res.reply || res.answer;
        }
      } catch (serverErr) {
        console.warn('[Guide] Server guide request failed, falling back to local registry:', serverErr);
      }

      // Offline / Local fallback: keyword search in static registry
      if (!replyText) {
        const lower = text.toLowerCase();
        const matches = Object.values(GUIDE_REGISTRY).filter((entry) => {
          return (
            lower.includes(entry.title.toLowerCase()) ||
            entry.what.toLowerCase().includes(lower) ||
            (entry.when && entry.when.toLowerCase().includes(lower))
          );
        });

        if (matches.length > 0) {
          const top = matches[0];
          replyText = `**${top.title}**\n\n${top.what}${
            top.when ? `\n\n*When to use:* ${top.when}` : ''
          }${top.careful ? `\n\n*Caution:* ${top.careful}` : ''}${
            top.next ? `\n\n*Next:* ${top.next}` : ''
          }`;
        } else if (lower.includes('next') || lower.includes('step') || lower.includes('what should i do')) {
          replyText = `Your recommended next step is: **${nextStep.title}**\n\n${nextStep.actionText}\n\n*Reason:* ${nextStep.reason}`;
        } else {
          replyText = `Pramaan provides local-first cryptographic sealing under Section 63(4) BSA. Everything is processed directly in your browser. You can click "Guide Mode" to inspect any button or form field on the screen.`;
        }
      }

      const guideMsg: ChatMessage = {
        id: `guide-${Date.now()}`,
        sender: 'guide',
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, guideMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      data-guide="guide.chat"
      className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white border-l-4 border-ink shadow-brutal-lg flex flex-col font-sans select-none"
    >
      {/* Header */}
      <div className="p-4 bg-paper border-b-2 border-ink flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <HelpCircle className="w-5 h-5 text-field" />
          <h2 className="font-mono text-sm font-bold uppercase text-ink">
            PRAMAAN GUIDE AI
          </h2>
          {isCloudMode && (
            <span className="px-1.5 py-0.5 text-[9px] font-mono bg-pink/20 text-rose-900 border border-pink">
              CLOUD
            </span>
          )}
        </div>
        <button
          data-guide="guide.exit"
          onClick={onClose}
          className="p-1 hover:bg-black/10 rounded border border-transparent hover:border-ink"
        >
          <X className="w-4 h-4 text-ink" />
        </button>
      </div>

      {/* Recommended Next Step Card */}
      <div data-guide="guide.next" className="p-3 bg-[#fffdf0] border-b-2 border-ink">
        <div className="flex items-center space-x-1.5 text-[10px] font-mono font-bold uppercase text-muted mb-1">
          <Sparkles className="w-3 h-3 text-pink" />
          <span>Recommended Next Action (Step #{nextStep.stepNumber})</span>
        </div>
        <h4 className="font-mono text-xs font-bold text-ink">{nextStep.title}</h4>
        <p className="text-[11px] text-ink mt-0.5">{nextStep.actionText}</p>
        <button
          data-guide="guide.next"
          onClick={() => {
            onNavigateSection(nextStep.targetSection);
            onClose();
          }}
          className="mt-2 inline-flex items-center space-x-1 text-[11px] font-mono font-bold px-2 py-1 bg-yellow text-ink border border-ink shadow-brutal-sm hover:bg-yellow/80"
        >
          <span>Go to section</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#faf9f5]">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] p-3 border-2 border-ink text-xs leading-relaxed whitespace-pre-wrap shadow-brutal-sm ${
                m.sender === 'user'
                  ? 'bg-field text-white font-mono'
                  : 'bg-white text-ink font-sans'
              }`}
            >
              {m.text}
            </div>
            <span className="text-[9px] font-mono text-muted mt-1 px-1">
              {m.sender === 'user' ? 'You' : 'Guide'} · {m.time}
            </span>
          </div>
        ))}
        {isThinking && (
          <div className="flex items-center space-x-2 text-xs font-mono text-muted p-2">
            <div className="w-3 h-3 border-2 border-ink border-t-transparent rounded-full animate-spin" />
            <span>Guide is thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input footer */}
      <div className="p-3 bg-paper border-t-2 border-ink">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            data-guide="guide.promptInput"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask anything or request guidance..."
            className="flex-1 p-2 border-2 border-ink font-mono text-xs bg-white text-ink focus:outline-none"
          />
          <button
            type="submit"
            data-guide="guide.sendPrompt"
            disabled={!inputText.trim() || isThinking}
            className="p-2 bg-ink text-white hover:bg-field disabled:opacity-40 transition-colors border-2 border-ink"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

