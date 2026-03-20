import { useState, useRef, useEffect, useCallback } from "react";
import { v4 as uuid } from "uuid";
import {
  Box,
  IconButton,
  Paper,
  Tooltip,
  Divider,
} from "@mui/material";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { useNavigate } from "react-router-dom";
import AiLogo from "@/assets/AI_LOGO.png";

import { chatbotService } from "@/services/ai/chatbotService";
import { aiAcceptanceService } from "@/services/ai/aiAcceptanceService";
import { cartService } from "@/services/cartService";
import { useToast } from "@/hooks/useToast";
import { authService } from "@/services/authService";
import { getOrCreateGuestUserId } from "@/utils/guestUserId";
import type { ChatMessage } from "@/types/chatbot";

import { parseAssistantPayload, SILENCE_TIMEOUT } from "./helpers";
import { ChatHeader } from "./Header";
import { ChatMessages } from "./Messages";
import { ChatInput } from "./Input";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";


// ─── Main Widget ─────────────────────────────────────────────────────────────

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [dialogMode, setDialogMode] = useState(false);
  const [conversationActive, setConversationActive] = useState(false);
  const [textToSpeak, setTextToSpeak] = useState<string | null>(null);
  const [testMicMode, setTestMicMode] = useState(false);

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
  } = useSpeechRecognition();

  const { showToast } = useToast();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastInputTimeRef = useRef<number>(Date.now());

  // Stable IDs for the lifetime of the widget
  const conversationId = useRef(uuid());
  const userId = useRef(
    authService.getCurrentUser()?.id ?? getOrCreateGuestUserId(),
  );

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

  const startListening = useCallback(async () => {
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
        continuous: true,
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

      const newUserMsg: ChatMessage = { sender: "user", message: finalText };
      const updatedMessages = [...messages, newUserMsg];
      setMessages(updatedMessages);
      setInput("");
      setLoading(true);

      try {
        const data = await chatbotService.sendMessage(
          conversationId.current,
          userId.current,
          updatedMessages,
        );

        setMessages(data.messages);

        // Auto-speak if dialog mode active
        if (dialogMode && data.messages.length > 0) {
          const lastMsg = data.messages[data.messages.length - 1];
          if (lastMsg && lastMsg.sender === "assistant") {
            const payload = parseAssistantPayload(lastMsg.message);
            setTextToSpeak(payload.message);
          }
        }
      } catch {
        showToast("Không thể kết nối chatbot. Vui lòng thử lại.", "error");
        setMessages(messages);
      } finally {
        setLoading(false);

        // Resume listening if in conversation mode
        if (conversationActive && !testMicMode) {
          setTimeout(() => startListening(), 300);
        }
      }
    },
    [conversationActive, dialogMode, loading, messages, showToast, startListening, testMicMode],
  );

  // Handle auto-submit when input hasn't changed for 3 seconds
  useEffect(() => {
    if (!dialogMode || !conversationActive || testMicMode) {
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
  }, [input, dialogMode, conversationActive, testMicMode, sendMessageText, clearSilenceTimer]);

  // Update input field with transcript in real-time
  useEffect(() => {
    if (dialogMode && conversationActive && !testMicMode) {
      setInput(transcript);
    }
  }, [transcript, dialogMode, conversationActive, testMicMode]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Handle text-to-speech
  useEffect(() => {
    if (textToSpeak && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = "vi-VN";
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.onend = () => {
        if (dialogMode && conversationActive && open) {
          setTimeout(() => startListening(), 300);
        }
      };

      window.speechSynthesis.speak(utterance);
      setTextToSpeak(null);
    }
  }, [startListening, textToSpeak, dialogMode, conversationActive, open]);

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
    if (testMicMode) {
      setTestMicMode(false);
      await stopListening();
    } else if (dialogMode) {
      if (conversationActive) {
        setConversationActive(false);
        clearSilenceTimer();
        await stopListening();
        window.speechSynthesis.cancel();
      } else {
        setConversationActive(true);
        setInput("");
        resetTranscript();
        await startListening();
      }
    } else {
      if (listening) {
        await stopListening();
      } else {
        await startListening();
      }
    }
  }, [
    clearSilenceTimer,
    conversationActive,
    dialogMode,
    listening,
    startListening,
    stopListening,
    testMicMode,
    resetTranscript,
  ]);

  const handleAddToCart = useCallback(
    async (variantId: string, productName: string) => {
      try {
        // Add item to cart
        await cartService.addItem(variantId, 1);
        showToast(`Đã thêm "${productName}" vào giỏ hàng!`, "success");

        // Create AI acceptance record with the actual cartItemId
        try {
          // Fetch cart items to get the actual cartItemId
          const items = await cartService.getItems();
          // Find the item we just added by variantId
          const addedItem = items.find((item) => item.variantId === variantId);
          if (addedItem?.cartItemId) {
            await aiAcceptanceService.createCheckoutAcceptance(
              userId.current,
              addedItem.cartItemId,
            );
          }
        } catch (e) {
          console.error("Failed to create AI acceptance:", e);
          // Don't fail the add-to-cart if acceptance creation fails
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
    <>
      {/* Chat Window */}
      {open && (
        <Paper
          elevation={10}
          sx={{
            position: "fixed",
            bottom: 96,
            right: 24,
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
            zIndex: 1300,
            boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            animation: "slideUp 0.25s ease-out",
            "@keyframes slideUp": {
              from: { opacity: 0, transform: "translateY(20px)" },
              to: { opacity: 1, transform: "translateY(0)" },
            },
          }}
        >
          <ChatHeader
            dialogMode={dialogMode}
            testMicMode={testMicMode}
            onDialogModeChange={(enabled) => {
              setDialogMode(enabled);
              if (!enabled) {
                setConversationActive(false);
                setTestMicMode(false);
              }
            }}
            onTestMicClick={() => {
              if (testMicMode) {
                setTestMicMode(false);
                void stopListening();
              } else {
                setTestMicMode(true);
                resetTranscript();
                void startListening();
              }
            }}
            onClose={() => setOpen(false)}
          />

          <Divider />

          <ChatMessages
            messages={messages}
            loading={loading}
            onMessageClick={(s) => setInput(s)}
            messagesEndRef={messagesEndRef}
            renderMessage={(msg, idx) => (
              <MessageBubble
                key={idx}
                msg={msg}
                onAddToCart={handleAddToCart}
                onNavigate={handleNavigate}
              />
            )}
            renderTypingIndicator={() => <TypingIndicator />}
          />

          <ChatInput
            dialogMode={dialogMode}
            testMicMode={testMicMode}
            conversationActive={conversationActive}
            input={input}
            transcript={transcript}
            loading={loading}
            browserSupportsSpeechRecognition={browserSupportsSpeechRecognition}
            onVoiceInput={handleVoiceInput}
            onInputChange={setInput}
            onKeyDown={handleKeyDown}
            onSend={handleSend}
          />
        </Paper>
      )}

      {/* Toggle Button */}
      <Tooltip title={open ? "Đóng chat" : "Hỏi PerfumeGPT"} placement="left">
        <IconButton
          onClick={() => setOpen((prev) => !prev)}
          sx={{
            position: "fixed",
            bottom: 24,
            right: 24,
            width: 56,
            height: 56,
            zIndex: 1300,
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
      </Tooltip>
    </>
  );
}
