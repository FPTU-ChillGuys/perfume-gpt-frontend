import { useEffect, useRef } from "react";

interface UseGlobalBarcodeScannerOptions {
  onDetected: (barcode: string) => void;
  /** Max ms between keystrokes to be considered scanner input (default: 40) */
  charIntervalMs?: number;
  /** Minimum buffer length to treat as a barcode scan (default: 5) */
  minLength?: number;
  /** Cooldown between accepted scans to prevent duplicates (default: 1500) */
  cooldownMs?: number;
  /** Whether the listener is active (default: true) */
  enabled?: boolean;
}

/**
 * Global listener for USB barcode scanners.
 *
 * USB barcode scanners emulate a keyboard — they type characters extremely fast
 * (< 30–50 ms between keystrokes) then send an Enter key.  This hook
 * distinguishes scanner input from human typing by buffering characters that
 * arrive within `charIntervalMs` of each other and flushing the buffer when
 * Enter is pressed.
 *
 * If the active element is an input/textarea the hook calls `e.preventDefault()`
 * so scanned digits don't leak into unrelated form fields.
 */
export function useGlobalBarcodeScanner({
  onDetected,
  charIntervalMs = 20,
  minLength = 5,
  cooldownMs = 1500,
  enabled = true,
}: UseGlobalBarcodeScannerOptions) {
  const bufferRef = useRef("");
  const lastKeyTimeRef = useRef(0);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDetectedTimeRef = useRef(0);
  const onDetectedRef = useRef(onDetected);

  // Keep callback ref in sync without re-attaching the listener.
  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    if (!enabled) return;

    const clearBuffer = () => {
      bufferRef.current = "";
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip processing if the user is using an IME (e.g., Vietnamese Telex/VNI)
      if (e.isComposing || e.key === "Process") return;

      const now = Date.now();

      // --- Enter: attempt to flush the buffer as a barcode ---
      if (e.key === "Enter") {
        if (resetTimerRef.current) {
          clearTimeout(resetTimerRef.current);
          resetTimerRef.current = null;
        }

        const barcode = bufferRef.current.trim();
        clearBuffer();

        if (barcode.length >= minLength) {
          // Prevent Enter from submitting forms / triggering buttons
          e.preventDefault();
          e.stopPropagation();

          // Cooldown guard
          if (now - lastDetectedTimeRef.current < cooldownMs) return;
          lastDetectedTimeRef.current = now;

          onDetectedRef.current(barcode);
        }
        return;
      }

      // --- Ignore modifier / control keys ---
      if (e.key.length !== 1) return;

      const elapsed = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // If gap is too long the previous buffer was human typing — discard it.
      if (elapsed > charIntervalMs) {
        clearBuffer();
      }

      // Detect scanner-speed input while an input is focused → block it.
      const active = document.activeElement;
      const isInInput =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement;

      if (
        isInInput &&
        elapsed <= charIntervalMs &&
        bufferRef.current.length > 0
      ) {
        // We're fairly confident this is the scanner, not the user.
        e.preventDefault();
      }

      bufferRef.current += e.key;

      // Auto-clear buffer if no more keys arrive (safety net).
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
      resetTimerRef.current = setTimeout(clearBuffer, charIntervalMs * 3);
    };

    // Use bubble phase (false) instead of capture phase (true) to allow 
    // input handlers to process events first.
    document.addEventListener("keydown", handleKeyDown, false);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, false);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, [enabled, charIntervalMs, minLength, cooldownMs]);
}
