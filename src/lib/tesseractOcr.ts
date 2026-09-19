/**
 * Client-Side OCR Verification utility using Tesseract.js
 * Dynamically loads Tesseract.js from CDN:
 * https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js
 */

export interface OcrVerificationResult {
  success: boolean;
  extractedText: string;
  matchedUpi: boolean;
  matchedPrice: boolean;
  error?: string;
}

const TESSERACT_CDN_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';

let tesseractLoadingPromise: Promise<any> | null = null;

export function loadTesseractFromCDN(): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Tesseract can only be loaded in a browser environment.'));
  }

  const win = window as any;
  if (win.Tesseract) {
    return Promise.resolve(win.Tesseract);
  }

  if (tesseractLoadingPromise) {
    return tesseractLoadingPromise;
  }

  tesseractLoadingPromise = new Promise((resolve, reject) => {
    // Check if already injected
    const existing = document.querySelector(`script[src="${TESSERACT_CDN_URL}"]`) as HTMLScriptElement;
    if (existing) {
      existing.addEventListener('load', () => resolve((window as any).Tesseract));
      existing.addEventListener('error', (e) => reject(e));
      return;
    }

    const script = document.createElement('script');
    script.src = TESSERACT_CDN_URL;
    script.async = true;
    script.onload = () => {
      if ((window as any).Tesseract) {
        console.log('[Tesseract.js] Successfully loaded from CDN');
        resolve((window as any).Tesseract);
      } else {
        reject(new Error('Tesseract script loaded, but window.Tesseract is undefined'));
      }
    };
    script.onerror = (err) => {
      console.error('[Tesseract.js] Failed to load from CDN', err);
      reject(new Error('Could not load Tesseract.js library from CDN. Please check network connectivity.'));
    };
    document.head.appendChild(script);
  });

  return tesseractLoadingPromise;
}

/**
 * Validates a payment screenshot against expected UPI ID and exact comic price.
 * 
 * Technical specification:
 * - Normalize extracted text (remove spaces, convert to lowercase).
 * - Verify image text contains target UPI ID: mohamedadhilathika@okhdfcbank (or key identifiers like mohamedadhilathika).
 * - Verify image text includes the exact comic price (e.g. 199).
 */
export async function verifyUpiPaymentScreenshot(
  imageSource: File | Blob | string,
  targetPrice: number,
  targetUpiId: string = 'mohamedadhilathika@okhdfcbank'
): Promise<OcrVerificationResult> {
  try {
    const Tesseract = await loadTesseractFromCDN();

    console.log('[Tesseract.js] Starting OCR recognition for payment verification...');
    const result = await Tesseract.recognize(
      imageSource,
      'eng',
      {
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            console.log(`[Tesseract OCR] Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      }
    );

    const rawText = (result?.data?.text || '').trim();
    console.log('[Tesseract.js] Raw Extracted Text:\n', rawText);

    // 1. Normalize text (remove all whitespace and convert to lowercase)
    const normalized = rawText.toLowerCase().replace(/[\s\r\n\t]+/g, '');
    console.log('[Tesseract.js] Normalized Text:\n', normalized);

    // 2. Validate UPI ID
    // mohamedadhilathika@okhdfcbank or mohamedadhilathika
    const normalizedTargetUpi = targetUpiId.toLowerCase().replace(/[\s\r\n\t]+/g, '');
    const matchedUpi = 
      normalized.includes(normalizedTargetUpi) || 
      normalized.includes('mohamedadhilathika') ||
      rawText.toLowerCase().includes('mohamedadhilathika');

    // 3. Validate Exact Comic Price
    // Price could be e.g. 199, ₹199, Rs. 199, INR 199, 199.00
    const roundedPrice = Math.round(targetPrice);
    const priceStr = String(roundedPrice);
    const priceWithDot = `${roundedPrice}.00`;
    const priceWithZeroZero = `${roundedPrice}00`;

    // Also inspect words in raw text in case currency symbols precede the number
    const matchedPrice = 
      normalized.includes(priceStr) || 
      normalized.includes(priceWithDot) ||
      normalized.includes(`rs.${priceStr}`) ||
      normalized.includes(`inr${priceStr}`) ||
      rawText.includes(priceStr);

    console.log('[Tesseract.js] Validation Assessment:', {
      matchedUpi,
      matchedPrice,
      expectedUpi: targetUpiId,
      expectedPrice: targetPrice
    });

    if (matchedUpi && matchedPrice) {
      return {
        success: true,
        extractedText: rawText,
        matchedUpi: true,
        matchedPrice: true,
      };
    } else {
      return {
        success: false,
        extractedText: rawText,
        matchedUpi,
        matchedPrice,
        error: 'Verification failed. Please ensure the UPI ID and exact amount are clearly visible in the screenshot.'
      };
    }
  } catch (err: any) {
    console.error('[Tesseract.js] Error during OCR verification:', err);
    return {
      success: false,
      extractedText: '',
      matchedUpi: false,
      matchedPrice: false,
      error: 'Verification failed. Please ensure the UPI ID and exact amount are clearly visible in the screenshot.'
    };
  }
}
