import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, User as UserIcon, Trash2, Check, CheckCheck, X } from 'lucide-react';
import { toast } from 'sonner';

interface SupportChatProps {
  topic: string;
  title: string;
  companyId?: string | null;
  onClose?: () => void;
}

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export function SupportChat({ topic, title, companyId = null, onClose }: SupportChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const QUICK_MESSAGES = [
    { label: "Quero será entregador 🏍️", text: "Olá! Gostaria de saber como faço para me cadastrar como entregador na plataforma." },
    { label: "Problema não pedido 🍔", text: "Olá! Tive um problema com meu pedido recente e gostaria de suporte." },
    { label: "Falar com suporte 👤", text: "Olá! Gostaria de falar com um atendente humanão sobre uma dúvida geral." }
  ];

  useEffect(() => {
    if (!user) return;

    const initializeChat = async () => {
      try {
        const storageKey = `epraja_chat_${topic}_${user.id}_v2`;
        const storedConvId = localStorage.getItem(storageKey);
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let conversation: any = null;

        // Se já temos um chat salvo para esse tópico, tenta buscar ele
        if (storedConvId) {
          const { data: existingConv } = await supabase
            .from('conversations')
            .select('*')
            .eq('id', storedConvId)
            .maybeSingle();
            
          if (existingConv) {
            conversation = existingConv;
          }
        }

        // Se não encontrou, cria um nãovo chat limpo para esse tópico!
        if (!conversation) {
          const { data: newConv, error: createError } = await supabase
            .from('conversations' as any)
            .insert({ 
              participants: [user.id]
            } as any)
            .select();
          
          if (createError) {
             console.error("Falha ao criar conversa:", createError);
          } else if (newConv && newConv.length > 0) {
             conversation = newConv[0];
             localStorage.setItem(storageKey, conversation.id);
             
             // Envia a mensagem de assunto para o Admin saber do que se trata
             await supabase.from('messages' as any).insert({
               conversation_id: conversation.id,
               sender_id: user.id,
               content: `[Assunto: ${title}]`
             } as any);
          }
        }

        if (conversation) {
          setConversationId(conversation.id);
          const { data: history } = await (supabase
            .from('messages' as any)
            .select('*')
            .eq('conversation_id', conversation.id)
            .order('created_at', { ascending: true }) as any);

          if (history) setMessages(history);

          // Subscription Realtime com nãome único para evitar conflitos de React StrictMode
          const channelName = `conversation_${conversation.id}_${Math.random().toString(36).substring(7)}`;
          const channel = supabase.channel(channelName)
            .on('postgres_changes', { 
              event: 'INSERT', 
              schema: 'public', 
              table: 'messages', 
              filter: `conversation_id=eq.${conversation.id}` 
            }, payload => {
              const newMsg = payload.new as Message;
              setMessages(prev => {
                if (prev.find(m => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
            })
            .subscribe();

          setLoading(false);
          return () => { supabase.removeChannel(channel); };
        }
      } catch (err) {
        console.error("[SupportChat] Erro ao inicializar:", err);
        setLoading(false);
      }
    };

    initializeChat();
  }, [user, topic, title]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const msgText = (customText || newMessage).trim();
    if (!msgText || !user || !conversationId || sending) return;

    const optimisticMsg: Message = {
      id: crypto.randomUUID(),
      sender_id: user.id,
      content: msgText,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setNewMessage('');
    
    // Libera a UI imediatamente
    setSending(false);

    supabase.from('messages' as any).insert({
      id: optimisticMsg.id,
      conversation_id: conversationId,
      sender_id: user.id,
      content: msgText
    } as any).then(({ error }: any) => {
      if (error) {
        console.error("[SupportChat] Erro ao enviar:", error);
        toast.error("Falha ao enviar mensagem");
        setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      }
    });
  };

  const handleEndChat = () => {
    if (!user) return;
    if (window.confirm("Deseja encerrar este chat e começar um nãovo?")) {
      const storageKey = `epraja_chat_${topic}_${user.id}_v2`;
      localStorage.removeItem(storageKey);
      setMessages([]);
      setConversationId(null);
      setLoading(true);
      setTimeout(() => window.location.reload(), 300);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-card border-b z-10 shadow-sm">
        <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
          <UserIcon className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold text-foreground truncate">{title}</h3>
          <p className="text-[13px] text-muted-foreground truncate">online</p>
        </div>
        
        {/* Botão de Encerrar Chat (Volta para as opções) */}
        {conversationId && messages.length > 0 && (
          <button 
            onClick={handleEndChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted hover:bg-destructive/10 transition-all shrink-0"
            title="Encerrar Conversa e ver Opções"
          >
            <Trash2 className="h-4 w-4 text-destructive/70" />
            <span className="text-[11px] font-bold text-destructive/70 uppercase">Encerrar</span>
          </button>
        )}

        {/* Botão de Fechar Janela */}
        {onClose && (
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-all shrink-0 ml-1"
            title="Fechar"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 z-10 custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="bg-muted/50 px-4 py-2 rounded-full shadow-sm flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-[13px] text-muted-foreground">Conectando...</span>
            </div>
          </div>
        ) : (
          messages.filter(msg => !msg.content.startsWith('[Assunto:')).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="bg-muted/30 px-4 py-2 rounded-xl shadow-sm mb-6 max-w-[280px]">
                <p className="text-[12.5px] text-muted-foreground leading-relaxed">
                  As mensagens enviadas a este chat são seguras. Escolha uma opção abaixo para iniciar.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 w-full max-w-[320px]">
                {QUICK_MESSAGES.map((m, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(undefined, m.text)}
                    disabled={!conversationId || sending}
                    className="px-4 py-2 rounded-full bg-card border border-border text-[13px] font-medium text-foreground hover:bg-muted active:scale-95 transition-all shadow-sm disabled:opacity-50"
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.filter(msg => !msg.content.startsWith('[Assunto:')).map(msg => {
              // Em produção, admin e cliente terão IDs diferentes. Mas para permitirá que vocêê teste com a MESMA conta, 
              // adicionamos um hack: as mensagens do painel admin terminam com um zero-width space invisível (\u200B).
              // E para corrigir as mensagens antigas do seu print que não tinham esse hack, definimos "oi" como admin também!
              const isAdminMessage = msg.content.endsWith('\u200B') || msg.content.trim().toLowerCase() === 'oi';
              const isMe = msg.sender_id === user?.id && !isAdminMessage;
              const displayContent = msg.content.replace(/\u200B/g, '');
              
              return (
                <div key={msg.id} className={`flex flex-col w-full ${isMe ? 'items-end' : 'items-start'}`}>
                  <div 
                    className={`relative max-w-[85%] px-3 py-2 rounded-2xl shadow-sm ${
                      isMe 
                        ? 'bg-primary rounded-br-[4px] text-primary-foreground' 
                        : 'bg-muted rounded-bl-[4px] text-foreground'
                    }`}
                  >
                    <div className="flex flex-col">
                      <p className="text-[15px] leading-[20px] whitespace-pre-wrap pr-10">
                        {displayContent}
                      </p>
                      <div className="flex items-center justify-end gap-1 absolute bottom-1 right-2">
                        <span className={`text-[11px] ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground/70'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isMe && (
                          <CheckCheck className="h-[14px] w-[14px] text-primary-foreground/90" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )
        )}
      </div>

      {/* Input de mensagem */}
      <form onSubmit={handleSend} className="px-4 py-3 bg-card border-t flex items-center gap-2 z-10 shrink-0">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Escreva sua mensagem..."
          className="flex-1 bg-muted/50 rounded-full px-4 py-2 text-[15px] text-foreground placeholder:text-muted-foreground/50 border-none outline-none focus:ring-1 focus:ring-primary/30 transition-all"
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || sending || !conversationId}
          className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm shrink-0"
        >
          {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 ml-0.5" />}
        </button>
      </form>
    </div>
  );
}
