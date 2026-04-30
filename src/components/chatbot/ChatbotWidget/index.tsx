import { useState, useRef, useEffect, useCallback } from "react";
import { v4 as uuid } from "uuid";
import {
  Box,
  IconButton,
  Paper,
  Tooltip,
  Divider,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Switch,
  Select,
  FormControl,
  InputLabel,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  VolumeUp as VolumeUpIcon,
  VolumeOff as VolumeOffIcon,
} from "@mui/icons-material";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { useNavigate, useLocation } from "react-router-dom";
import Draggable from "react-draggable";
import AiLogo from "@/assets/AI_LOGO.png";

import { chatbotService } from "@/services/ai/chatbotService";
import { aiAcceptanceService } from "@/services/ai/aiAcceptanceService";
import { cartService } from "@/services/cartService";
import { useToast } from "@/hooks/useToast";
import { authService } from "@/services/authService";
import { getOrCreateGuestUserId } from "@/utils/guestUserId";
import { conversationStorage } from "@/utils/conversationStorage";
import type { ChatMessage } from "@/types/chatbot";
import type { ConversationHistoryItem, ServerMessage } from "@/types/conversation";

import { parseAssistantPayload, SILENCE_TIMEOUT } from "./helpers";
import { ChatHeader } from "./Header";
import { ChatMessages } from "./Messages";
import { ChatInput } from "./Input";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { ChatHistoryPanel } from "./ChatHistoryPanel";


// ─── Main Widget ─────────────────────────────────────────────────────────────

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationActive, setConversationActive] = useState(false);
  const [textToSpeak, setTextToSpeak] = useState<string | null>(null);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Settings states
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    return localStorage.getItem("chatbot_voice_enabled") === "true";
  });
  const [selectedVoiceURI, setSelectedVoiceURI] = useState(() => {
    return localStorage.getItem("chatbot_selected_voice") || null;
  });
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [settingsAnchor, setSettingsAnchor] = useState<HTMLElement | null>(null);

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
  } = useSpeechRecognition();

  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const isStaffMode =
    location.pathname.startsWith("/staff") ||
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/checkout/counter/staff");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastInputTimeRef = useRef<number>(Date.now());
  // nodeRef is required for React 19 compatibility (findDOMNode was removed)
  const draggableNodeRef = useRef<HTMLDivElement>(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Initialize voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Persist settings
  useEffect(() => {
    localStorage.setItem("chatbot_voice_enabled", String(voiceEnabled));
  }, [voiceEnabled]);

  useEffect(() => {
    if (selectedVoiceURI) {
      localStorage.setItem("chatbot_selected_voice", selectedVoiceURI);
    }
  }, [selectedVoiceURI]);

  // Stable IDs for the lifetime of the widget
  const conversationId = useRef(uuid());
  const userId = useRef(
    authService.getCurrentUser()?.id ?? getOrCreateGuestUserId(),
  );
  const [restored, setRestored] = useState(false);

  // Restore latest conversation from Dexie on mount
  useEffect(() => {
    if (restored) return;
    conversationStorage.getLatest().then((record) => {
      if (record) {
        conversationId.current = record.id;
        setMessages(record.messages);
      }
      setRestored(true);
    });
  }, [restored]);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const stopListening = useCallback(async () => {
    clearSilenceTimer();
    await SpeechRecognition.stopListening();
  }, [clearSilenceTimer]);

  const startListening = useCallback(async (continuous = true) => {
    if (!browserSupportsSpeechRecognition) {
      showToast("Trình duyệt không hỗ trợ nhập giọng nói.", "error");
      return;
    }

    if (!isMicrophoneAvailable) {
      showToast("Vui lòng cấp quyền truy cập microphone.", "error");
      return;
    }

    if (loading || window.speechSynthesis.speaking) return;

    try {
      resetTranscript();
      lastInputTimeRef.current = Date.now();
      await SpeechRecognition.startListening({
        continuous,
        language: "vi-VN",
      });
    } catch (e) {
      console.error("Failed to start listening:", e);
    }
  }, [
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
    loading,
    resetTranscript,
    showToast,
  ]);

  const sendMessageText = useCallback(
    async (text: string) => {
      const finalText = text.trim();
      if (!finalText || loading) return;

      void stopListening();

      const newUserMsg: ChatMessage = { sender: "user", message: finalText };
      const updatedMessages = [...messages, newUserMsg];
      setMessages(updatedMessages);
      setInput("");
      setLoading(true);

      try {
        const data = await chatbotService.sendMessageV11(
          conversationId.current,
          userId.current,
          updatedMessages,
          isStaffMode
        );

        const aiMsg: ChatMessage = { sender: "assistant", message: data.aiMessage.message };
        const finalMessages = [...updatedMessages, aiMsg];
        setMessages(finalMessages);

        void conversationStorage.save(conversationId.current, finalMessages);

        const payload = parseAssistantPayload(data.aiMessage.message);
        setTextToSpeak(payload.message);
      } catch {
        setMessages(messages);
        setInput(finalText);
        showToast("Không thể kết nối chatbot. Vui lòng thử lại.", "error");
      } finally {
        setLoading(false);

        if (conversationActive && !voiceEnabled) {
          setTimeout(() => startListening(true), 300);
        }
      }
    },
    [conversationActive, loading, messages, showToast, startListening],
  );

  // Handle auto-submit in conversation mode
  useEffect(() => {
    if (!conversationActive) {
      clearSilenceTimer();
      return;
    }

    // If input is empty, don't auto-submit
    if (!input.trim()) {
      clearSilenceTimer();
      return;
    }

    // Update last change time whenever input changes
    lastInputTimeRef.current = Date.now();
    clearSilenceTimer();

    // Set timer - if input hasn't changed in 3 seconds, auto-submit
    silenceTimerRef.current = setTimeout(() => {
      const timeSinceLastChange = Date.now() - lastInputTimeRef.current;
      if (timeSinceLastChange >= SILENCE_TIMEOUT && input.trim()) {
        void sendMessageText(input);
      }
    }, SILENCE_TIMEOUT);

    return () => clearSilenceTimer();
  }, [input, conversationActive, sendMessageText, clearSilenceTimer]);

  // Update input field with transcript in real-time
  useEffect(() => {
    // Only update if transcript is NOT empty, AI is NOT speaking, and NOT loading
    if (transcript && !aiSpeaking && !loading && !window.speechSynthesis.speaking) {
      setInput(transcript);
    }
  }, [transcript, aiSpeaking, loading]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Persist messages to Dexie whenever they change
  useEffect(() => {
    if (!restored || messages.length === 0) return;
    void conversationStorage.save(conversationId.current, messages);
  }, [messages, restored]);

  // Handle text-to-speech
  useEffect(() => {
    if (textToSpeak && voiceEnabled && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setAiSpeaking(true);
      resetTranscript();

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = "vi-VN";

      // Apply selected voice
      if (selectedVoiceURI) {
        const voice = voices.find((v) => v.voiceURI === selectedVoiceURI);
        if (voice) utterance.voice = voice;
      } else {
        // Fallback to first Vietnamese voice
        const viVoice = voices.find((v) => v.lang.startsWith("vi"));
        if (viVoice) utterance.voice = viVoice;
      }
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.onend = () => {
        setAiSpeaking(false);
        if (conversationActive && open) {
          setTimeout(() => startListening(true), 300);
        }
      };
      utterance.onerror = () => {
        setAiSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
      setTextToSpeak(null);
    } else if (textToSpeak && !voiceEnabled) {
      setTextToSpeak(null);
    }
  }, [startListening, textToSpeak, conversationActive, open, voiceEnabled, voices, selectedVoiceURI, resetTranscript]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearSilenceTimer();
      window.speechSynthesis.cancel();
    };
  }, [clearSilenceTimer]);

  const handleSend = useCallback(async () => {
    void sendMessageText(input);
  }, [input, sendMessageText]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceInput = useCallback(async () => {
    if (listening) {
      await stopListening();
    } else {
      setConversationActive(false);
      resetTranscript();
      await startListening(false); // Record once
    }
  }, [listening, startListening, stopListening, resetTranscript]);

  const handleConversationToggle = useCallback(async () => {
    if (conversationActive) {
      setConversationActive(false);
      await stopListening();
      window.speechSynthesis.cancel();
    } else {
      setConversationActive(true);
      setInput("");
      resetTranscript();
      await startListening(true); // Persistent mode
    }
  }, [conversationActive, resetTranscript, startListening, stopListening]);

  const handleNewConversation = useCallback(() => {
    const oldId = conversationId.current;
    conversationId.current = uuid();
    setMessages([]);
    setConversationActive(false);
    setHistoryOpen(false);
    window.speechSynthesis.cancel();
    void conversationStorage.remove(oldId);
  }, []);

  const handleAddToCart = useCallback(
    async (variantId: string, productName: string, aiAcceptanceId?: string) => {
      try {
        // Add item to cart
        await cartService.addItem(variantId, 1);
        showToast(`Đã thêm "${productName}" vào giỏ hàng!`, "success");

        // Mark as accepted if aiAcceptanceId exists
        if (aiAcceptanceId) {
          try {
            await aiAcceptanceService.clickAIAcceptance(aiAcceptanceId);
          } catch (e) {
            console.error("Failed to mark AI acceptance on chatbot cart add:", e);
          }
        }
      } catch {
        showToast("Thêm vào giỏ hàng thất bại. Vui lòng thử lại.", "error");
      }
    },
    [showToast],
  );

  const handleNavigate = useCallback(
    (productId: string) => {
      setOpen(false); // Close chatbot when navigating
      navigate(`/products/${productId}`);
    },
    [navigate],
  );

  return (
    <Draggable
      handle=".chat-widget-handle"
      bounds="body"
      nodeRef={draggableNodeRef}
      disabled={isMobile}
    >
      <Box
        ref={draggableNodeRef}
        sx={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 1300,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          pointerEvents: "none", // Let clicks pass through the empty area
        }}
      >
        {/* Chat Window */}
        {open && (
          <Paper
            elevation={10}
            className="chat-widget-handle"
            sx={{
              mb: 2, // Replaces the 96px bottom gap (24px bottom + 56px icon + 16px margin)
              pointerEvents: "auto",
              cursor: "move", // Indicate draggability
              width: {
                xs: "calc(100vw - 32px)",
                sm: "65vw",
                md: "60vw",
                lg: "55vw",
              },
              maxWidth: 700,
              minWidth: 320,
              height: { xs: "70vh", sm: "72vh" },
              display: "flex",
              flexDirection: "column",
              borderRadius: 3,
              overflow: "hidden",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
              animation: "slideUp 0.25s ease-out",
              "@keyframes slideUp": {
                from: { opacity: 0, transform: "translateY(20px)" },
                to: { opacity: 1, transform: "translateY(0)" },
              },
            }}
          >
          <ChatHeader
            onSettingsClick={(e) => setSettingsAnchor(e.currentTarget)}
            onHistoryClick={() => setHistoryOpen((prev) => !prev)}
            onNewConversation={handleNewConversation}
            onClose={() => setOpen(false)}
            isStaffMode={isStaffMode}
            historyOpen={historyOpen}
          />

          <Menu
            anchorEl={settingsAnchor}
            open={Boolean(settingsAnchor)}
            onClose={() => setSettingsAnchor(null)}
            PaperProps={{
              sx: { width: 280, borderRadius: 2, mt: 1 }
            }}
          >
            <MenuItem sx={{ py: 1.5 }}>
              <ListItemIcon>
                {voiceEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
              </ListItemIcon>
              <ListItemText primary="Phát giọng nói AI" />
              <Switch
                edge="end"
                checked={voiceEnabled}
                onChange={(e) => setVoiceEnabled(e.target.checked)}
              />
            </MenuItem>

            <Divider />

            <Box sx={{ p: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Chọn giọng nói</InputLabel>
                <Select
                  value={selectedVoiceURI || ""}
                  label="Chọn giọng nói"
                  onChange={(e) => setSelectedVoiceURI(e.target.value)}
                  disabled={!voiceEnabled}
                >
                  {voices
                    .filter(v => v.lang.startsWith("vi") || v.lang.startsWith("en"))
                    .map((voice) => (
                      <MenuItem key={voice.voiceURI} value={voice.voiceURI}>
                        {voice.name} ({voice.lang})
                      </MenuItem>
                    ))}
                  {voices.length === 0 && (
                    <MenuItem disabled>Đang tải danh sách giọng...</MenuItem>
                  )}
                </Select>
              </FormControl>
            </Box>
          </Menu>

          <Divider />

          {historyOpen ? (
            <ChatHistoryPanel
              onSelectConversation={(conversation: ConversationHistoryItem) => {
                conversationId.current = conversation.id;
                const chatMsgs: ChatMessage[] = (conversation.messages || []).map(
                  (m: ServerMessage) => ({ sender: m.sender, message: m.message })
                );
                setMessages(chatMsgs);
                void conversationStorage.save(conversation.id, chatMsgs);
                setHistoryOpen(false);
              }}
              onNewChat={handleNewConversation}
            />
          ) : (
            <>
              <ChatMessages
                messages={messages}
                loading={loading}
                onMessageClick={(s) => setInput(s)}
                messagesEndRef={messagesEndRef}
                isStaffMode={isStaffMode}
                renderMessage={(msg, idx, isLastMessage) => (
                  <MessageBubble
                    key={idx}
                    msg={msg}
                    onAddToCart={handleAddToCart}
                    onNavigate={handleNavigate}
                    onSuggestionClick={sendMessageText}
                    isLastMessage={isLastMessage}
                  />
                )}
                renderTypingIndicator={() => <TypingIndicator />}
              />

              <ChatInput
                conversationActive={conversationActive}
                input={input}
                transcript={transcript}
                loading={loading}
                listening={listening}
                browserSupportsSpeechRecognition={browserSupportsSpeechRecognition}
                onVoiceInput={handleVoiceInput}
                onConversationToggle={handleConversationToggle}
                onInputChange={setInput}
                onKeyDown={handleKeyDown}
                onSend={handleSend}
              />
            </>
          )}
        </Paper>
      )}

      {/* Toggle Button */}
      <Tooltip title={open ? "Đóng chat" : "Hỏi PerfumeGPT"} placement="left">
        <Box sx={{ pointerEvents: "auto", cursor: "move" }} className="chat-widget-handle">
          <IconButton
            onClick={() => setOpen((prev) => !prev)}
            sx={{
              width: 56,
              height: 56,
              background: open
                ? "linear-gradient(135deg, #374151 0%, #1f2937 100%)"
                : "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)",
              color: "#fff",
              boxShadow: "0 4px 20px rgba(220,38,38,0.5)",
              transition: "all 0.3s ease",
              "&:hover": {
                transform: "scale(1.08)",
                boxShadow: "0 6px 24px rgba(220,38,38,0.6)",
              },
            }}
          >
          {open ? (
            <Box
              component="img"
              src={AiLogo}
              alt="Close"
              sx={{ width: 32, height: 32, objectFit: "contain" }}
            />
          ) : (
            <Box
              component="img"
              src={AiLogo}
              alt="PerfumeGPT"
              sx={{ width: 32, height: 32, objectFit: "contain" }}
            />
          )}
          </IconButton>
        </Box>
      </Tooltip>
      </Box>
    </Draggable>
  );
}
