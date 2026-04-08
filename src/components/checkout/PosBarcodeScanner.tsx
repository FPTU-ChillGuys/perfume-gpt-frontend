import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Alert, Box, Button, Chip, Stack, Typography } from "@mui/material";
import { QrCodeScanner } from "@mui/icons-material";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

interface PosBarcodeScannerProps {
  onDetected: (barcode: string) => void;
  scanCooldownMs?: number;
}

export const PosBarcodeScanner = ({
  onDetected,
  scanCooldownMs = 2200,
}: PosBarcodeScannerProps) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastDetectedRef = useRef<{ value: string; ts: number } | null>(null);
  const isHandlingScanRef = useRef(false);
  const [cameraError, setCameraError] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState("");

  const regionId = `pos-scanner-region-${useId().replace(/:/g, "")}`;

  const playBeep = useCallback(() => {
    const AudioContextCtor =
      window.AudioContext ||
      ((window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext as typeof AudioContext | undefined);

    if (!AudioContextCtor) return;

    try {
      const ctx = new AudioContextCtor();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(1560, ctx.currentTime);

      gainNode.gain.setValueAtTime(0.0001, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + 0.015);
      gainNode.gain.exponentialRampToValueAtTime(
        0.0001,
        ctx.currentTime + 0.12,
      );

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.13);

      oscillator.onended = () => {
        ctx.close();
      };
    } catch {
      // Ignore audio failures (e.g. blocked autoplay policy).
    }
  }, []);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;

    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
    } catch {
      // Ignore scanner stop errors during cleanup.
    }

    try {
      await scanner.clear();
    } catch {
      // Ignore scanner clear errors during cleanup.
    }

    scannerRef.current = null;
  }, []);

  const startScanner = useCallback(async () => {
    try {
      const scanner = new Html5Qrcode(regionId, {
        verbose: false,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.CODE_128,
        ],
      });

      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 240, height: 80 },
        },
        async (decodedText: string) => {
          const value = decodedText.trim();
          if (!value || isHandlingScanRef.current) return;

          const previous = lastDetectedRef.current;
          const now = Date.now();
          if (previous && now - previous.ts < scanCooldownMs) {
            return;
          }

          lastDetectedRef.current = { value, ts: now };
          isHandlingScanRef.current = true;
          setLastScannedCode(value);
          playBeep();

          try {
            await Promise.resolve(onDetected(value));
          } finally {
            isHandlingScanRef.current = false;
            await stopScanner();
            setIsScanning(false);
          }
        },
        () => {
          // Ignore per-frame decode errors while scanning.
        },
      );

      setCameraError("");
      setIsScanning(true);
    } catch {
      setCameraError(
        "Không thể bật camera. Hãy cấp quyền camera hoặc kiểm tra webcam.",
      );
      setIsScanning(false);
    }
  }, [onDetected, playBeep, regionId, scanCooldownMs, stopScanner]);

  const handleStartScan = useCallback(async () => {
    setIsStarting(true);
    await stopScanner();
    await startScanner();
    setIsStarting(false);
  }, [startScanner, stopScanner]);

  const handleStopScan = useCallback(async () => {
    await stopScanner();
    setIsScanning(false);
  }, [stopScanner]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        bgcolor: "background.paper",
        p: 2,
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={1.25}
        mb={1.5}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <QrCodeScanner fontSize="small" color="action" />
          <Typography variant="subtitle1" fontWeight={700}>
            Quét mã vạch EAN
          </Typography>
          <Chip
            size="small"
            label={isScanning ? "Đang quét" : "Sẵn sàng"}
            color={isScanning ? "success" : "default"}
            variant={isScanning ? "filled" : "outlined"}
          />
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="contained"
            onClick={handleStartScan}
            disabled={isStarting || isScanning}
            sx={{ minWidth: 106 }}
          >
            {lastScannedCode ? "Quét tiếp" : "Bắt đầu quét"}
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={handleStopScan}
            disabled={!isScanning}
            sx={{ minWidth: 96 }}
          >
            Dừng quét
          </Button>
        </Stack>
      </Stack>

      <Box
        sx={{
          position: "relative",
          borderRadius: 2,
          overflow: "hidden",
          border: "1px solid",
          borderColor: isScanning ? "success.light" : "divider",
          bgcolor: "black",
          width: "100%",
          maxWidth: 560,
          mx: "auto",
          mt: 0.5,
        }}
      >
        <Box
          id={regionId}
          sx={{
            width: "100%",
            height: 168,
            opacity: isScanning ? 1 : 0.45,
            "& video, & canvas": {
              width: "100% !important",
              height: "100% !important",
              objectFit: "cover",
            },
            "& #qr-shaded-region": {
              borderWidth: "2px !important",
            },
          }}
        />

        <Box
          sx={{
            position: "absolute",
            left: "50%",
            top: "56%",
            transform: "translate(-50%, -50%)",
            width: { xs: 186, sm: 240 },
            height: { xs: 62, sm: 78 },
            pointerEvents: "none",
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.28)",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              left: 0,
              top: 0,
              width: 24,
              height: 24,
              borderTop: "3px solid #fff",
              borderLeft: "3px solid #fff",
              borderTopLeftRadius: 10,
            }}
          />
          <Box
            sx={{
              position: "absolute",
              right: 0,
              top: 0,
              width: 24,
              height: 24,
              borderTop: "3px solid #fff",
              borderRight: "3px solid #fff",
              borderTopRightRadius: 10,
            }}
          />
          <Box
            sx={{
              position: "absolute",
              left: 0,
              bottom: 0,
              width: 24,
              height: 24,
              borderBottom: "3px solid #fff",
              borderLeft: "3px solid #fff",
              borderBottomLeftRadius: 10,
            }}
          />
          <Box
            sx={{
              position: "absolute",
              right: 0,
              bottom: 0,
              width: 24,
              height: 24,
              borderBottom: "3px solid #fff",
              borderRight: "3px solid #fff",
              borderBottomRightRadius: 10,
            }}
          />
        </Box>

        {!isScanning && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Chip
              label={isStarting ? "Đang mở camera..." : "Nhấn Bắt đầu quét"}
              color="default"
              sx={{ bgcolor: "rgba(255,255,255,0.9)" }}
            />
          </Box>
        )}
      </Box>
      <Typography
        variant="caption"
        color="text.secondary"
        mt={1.25}
        display="block"
      >
        {isScanning
          ? "Đưa mã vạch vào giữa khung quét. Sau khi nhận mã, hệ thống sẽ tự dừng để staff kiểm tra."
          : "Scanner đang dừng. Bấm Bắt đầu quét để quét lần tiếp theo."}
      </Typography>
      {lastScannedCode && (
        <Typography
          variant="caption"
          color="text.secondary"
          mt={0.5}
          display="block"
        >
          Mã gần nhất: {lastScannedCode}
        </Typography>
      )}
      {cameraError && (
        <Alert severity="warning" sx={{ mt: 1.5 }}>
          {cameraError}
        </Alert>
      )}
    </Box>
  );
};
