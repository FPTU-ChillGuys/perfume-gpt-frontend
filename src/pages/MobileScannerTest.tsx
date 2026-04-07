import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

const SCANNER_REGION_ID = "mobile-scanner-region";

export default function MobileScannerTest() {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scannedCode, setScannedCode] = useState("");
  const [isScanning, setIsScanning] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;

    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
    } catch {
      // Ignore stop errors; clear() below is the important cleanup.
    }

    try {
      await scanner.clear();
    } catch {
      // Ignore clear errors during cleanup.
    }

    scannerRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const startScanner = async () => {
      if (!isScanning || scannedCode) return;

      try {
        const scanner = new Html5Qrcode(SCANNER_REGION_ID, {
          verbose: false,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.UPC_A,
          ],
        });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 300, height: 100 },
          },
          async (decodedText: string) => {
            if (cancelled) return;

            setScannedCode(decodedText);
            setIsScanning(false);
            setErrorMessage("");
            await stopScanner();
          },
          () => {
            // Ignore per-frame decode errors while scanning.
          },
        );
      } catch {
        if (!cancelled) {
          setErrorMessage(
            "Khong the bat camera. Hay cap quyen camera va thu lai.",
          );
          setIsScanning(false);
        }
      }
    };

    startScanner();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [isScanning, scannedCode, stopScanner]);

  const handleReset = () => {
    setScannedCode("");
    setErrorMessage("");
    setIsScanning(true);
  };

  const isSuccess = Boolean(scannedCode);

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto w-full max-w-2xl rounded-3xl bg-white p-6 shadow-xl md:p-8">
        <h1 className="text-center text-2xl font-bold text-slate-900 md:text-3xl">
          Mobile Barcode Scanner Test
        </h1>

        {isScanning && !isSuccess && (
          <div className="mt-6">
            <p className="mb-4 text-center text-sm font-medium text-slate-600">
              Dua ma vach vao giua khung quet
            </p>
            <div className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-slate-300 bg-black">
              <div id={SCANNER_REGION_ID} className="min-h-70 w-full" />
            </div>
          </div>
        )}

        {isSuccess && (
          <div className="mt-8 space-y-5 text-center">
            <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-lg font-semibold text-emerald-700">
              Quet thanh cong
            </div>
            <div className="break-all text-5xl font-extrabold leading-tight text-slate-900 md:text-6xl">
              {scannedCode}
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-3 text-base font-semibold text-white transition hover:bg-slate-700"
            >
              Quet lai
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {errorMessage}
          </div>
        )}
      </div>
    </div>
  );
}
