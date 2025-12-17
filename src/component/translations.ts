export type Language = "en" | "mn";

export interface Translations {
  title: string;
  sessionIdLabel: string;
  sessionIdPlaceholder: string;
  sessionIdEntered: string;
  startButton: string;
  connectingToCamera: string;
  analysisComplete: string;
  sessionId: string;
  connectionTimeout: string;
  sessionIdRequired: string;
  connectionError: string;
  livenessError: string;
  error: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    title: "KYC , Face Liveness Check",
    sessionIdLabel: "Session ID:",
    sessionIdPlaceholder: "Enter session ID",
    sessionIdEntered: "✓ Session ID entered",
    startButton: "Start KYC , Face Liveness Check",
    connectingToCamera: "Connecting to camera...",
    analysisComplete: "✅ KYC , Face Liveness Check completed successfully.",
    sessionId: "Session ID:",
    connectionTimeout: "Connection timeout. Please try again.",
    sessionIdRequired: "Session ID is required",
    connectionError:
      "Connection error. Please check your internet connection and try again. If using WebView, ensure WebRTC is enabled.",
    livenessError: "Liveness error:",
    error: "Error:",
  },
  mn: {
    title: "KYC , Face Liveness шалгах",
    sessionIdLabel: "Session ID:",
    sessionIdPlaceholder: "Session ID оруулах",
    sessionIdEntered: "✓ Session ID оруулсан",
    startButton: "KYC , Face Liveness эхлүүлэх",
    connectingToCamera: "Камертай холбогдож байна...",
    analysisComplete: "✅ KYC , Face Liveness Check амжилттай дууслаа.",
    sessionId: "Session ID:",
    connectionTimeout: "Холболт тасарлаа. Дахин оролдоно уу.",
    sessionIdRequired: "Session ID оруулах шаардлагатай",
    connectionError:
      "Холболтын алдаа. Интернэт холболтоо шалгаад дахин оролдоно уу. WebView ашиглаж байгаа бол WebRTC идэвхжсэн эсэхийг шалгана уу.",
    livenessError: "Liveness алдаа:",
    error: "Алдаа:",
  },
};
