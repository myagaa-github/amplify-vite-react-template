import { useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { FaceLivenessDetector } from "@aws-amplify/ui-react-liveness";
import "@aws-amplify/ui-react-liveness/styles.css";
import { useEffect } from "react";

interface LivenessSession {
  sessionId: string;
  stream: unknown;
}

interface LivenessResult {
  status?: string;
  confidence?: number;
  auditImages?: unknown[];
}

const BUTTON_STYLES = {
  primary: {
    padding: "10px 20px",
    fontSize: "16px",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
  success: {
    padding: "10px 20px",
    fontSize: "16px",
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
  secondary: {
    padding: "10px 20px",
    fontSize: "16px",
    backgroundColor: "#6c757d",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
  disabled: {
    padding: "10px 20px",
    fontSize: "16px",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "not-allowed",
    opacity: 0.6,
  },
};

export default function FaceLivenessDemo() {
  const [session, setSession] = useState<LivenessSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LivenessResult | null>(null);
  const [isLivenessActive, setIsLivenessActive] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null); // Нэмэлт state

  const resetState = () => {
    setSession(null);
    setResult(null);
    setError(null);
    setIsLivenessActive(false);
  };

  const getFunctionUrl = async (): Promise<string> => {
    const envFunctionUrl = import.meta.env.VITE_REKOGNITION_FUNCTION_URL;
    if (envFunctionUrl) {
      return envFunctionUrl;
    }

    try {
      const outputs = await import("../../amplify_outputs.json");
      const outputsData = outputs.default as Record<string, unknown>;
      const custom = outputsData.custom as Record<string, unknown> | undefined;
      const functionData = custom?.rekognitionLivenessFunction as
        | Record<string, unknown>
        | undefined;

      const functionUrl =
        (functionData?.rekognitionLivenessFunctionUrl as string) ||
        (functionData?.url as string) ||
        ((
          (custom?.functions as Record<string, unknown>)
            ?.rekognitionLivenessFunction as Record<string, unknown>
        )?.url as string);

      if (functionUrl) {
        return functionUrl;
      }

      throw new Error(
        "Function URL not found. Please set VITE_REKOGNITION_FUNCTION_URL in .env.local or deploy backend."
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Function URL not found. Please deploy backend first. Error: ${errorMessage}`
      );
    }
  };

  // WebRTC Connection Status Tracking
  useEffect(() => {
    if (isLivenessActive && session) {
      // Connection timeout (30 секунд)
      const timeout = setTimeout(() => {
        if (isLivenessActive) {
          setError("Connection timeout. Please try again.");
          setIsLivenessActive(false);
          setConnectionStatus(null);
        }
      }, 30000);

      return () => clearTimeout(timeout);
    }
  }, [isLivenessActive, session]);

  // WebView detection
  const isWebView = () => {
    const userAgent =
      navigator.userAgent || navigator.vendor || (window as any).opera;
    return /(android|iphone|ipad|ipod|blackberry|iemobile|opera mini)/i.test(
      userAgent.toLowerCase()
    );
  };

  // Camera constraints optimization for WebView
  const getCameraConstraints = () => {
    if (isWebView()) {
      // WebView-д зориулсан бага resolution (performance)
      return {
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 15, max: 30 },
        },
      };
    }
    // Desktop/regular browser
    return {
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    };
  };

  // Camera access шалгах функц
  const checkCameraAccess = async (): Promise<boolean> => {
    try {
      // getUserMedia API байгаа эсэхийг шалгах
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError(
          "Camera API is not available. Please use HTTPS or a modern browser."
        );
        return false;
      }

      const constraints = getCameraConstraints();
      // Camera access шалгах
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Stream-г хаах (зөвхөн шалгах зориулалтаар)
      stream.getTracks().forEach((track) => track.stop());

      return true;
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      if (
        errorMessage.includes("Permission denied") ||
        errorMessage.includes("NotAllowedError")
      ) {
        setError(
          "Camera permission denied. Please allow camera access in your browser settings."
        );
      } else if (
        errorMessage.includes("NotFoundError") ||
        errorMessage.includes("DevicesNotFoundError")
      ) {
        setError("No camera found. Please connect a camera and try again.");
      } else if (
        errorMessage.includes("NotReadableError") ||
        errorMessage.includes("TrackStartError")
      ) {
        setError("Camera is already in use by another application.");
      } else {
        setError(`Camera access error: ${errorMessage}`);
      }

      return false;
    }
  };

  const createSession = async () => {
    setLoading(true);
    setError(null);
    setConnectionStatus(null);

    // Camera access шалгах
    const hasCameraAccess = await checkCameraAccess();
    if (!hasCameraAccess) {
      setLoading(false);
      return;
    }

    try {
      setConnectionStatus("Creating session...");
      const authSession = await fetchAuthSession();
      const functionUrl = await getFunctionUrl();

      console.log("🔐 Fetching auth session...");
      console.log("✅ Auth session:", {
        hasTokens: !!authSession.tokens,
        hasIdToken: !!authSession.tokens?.idToken,
      });

      console.log("🔗 Getting function URL...");
      console.log("✅ Function URL:", functionUrl);

      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authSession.tokens?.idToken?.toString()}`,
        },
        body: JSON.stringify({ action: "createSession" }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to create session: ${response.status} ${response.statusText}\n${errorText}`
        );
      }

      const data = await response.json();

      if (!data.sessionId) {
        throw new Error("Session ID not found in response");
      }

      setSession(data);
      setConnectionStatus("Connecting to camera...");
      setIsLivenessActive(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      setConnectionStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalysisComplete = async () => {
    if (!session) return;

    setIsLivenessActive(false);
    setVerifying(true);
    setError(null);
    setConnectionStatus(null);

    try {
      await getResults(session.sessionId);
    } finally {
      setVerifying(false);
    }
  };

  const handleUserCancel = () => {
    setIsLivenessActive(false);
    setSession(null);
    setConnectionStatus(null);
  };

  const handleLivenessError = (livenessError: {
    state: string;
    error: Error;
  }) => {
    const errorMessage = livenessError.error.message;
    setConnectionStatus(null);

    // WebRTC connection алдаа
    if (
      errorMessage.includes("connection") ||
      errorMessage.includes("Connection") ||
      errorMessage.includes("WebRTC") ||
      errorMessage.includes("ICE") ||
      errorMessage.includes("network")
    ) {
      setError(
        "Connection error. Please check your internet connection and try again. If using WebView, ensure WebRTC is enabled."
      );
      setIsLivenessActive(false);
      return;
    }

    if (
      errorMessage.includes("has results available") ||
      errorMessage.includes("session has results")
    ) {
      setError("Previous session completed. Creating new session...");
      setIsLivenessActive(false);
      setTimeout(() => {
        resetState();
        createSession();
      }, 1000);
      return;
    }

    setError(`Liveness error: ${errorMessage}`);
    setIsLivenessActive(false);
  };

  const getResults = async (sessionId: string) => {
    try {
      const authSession = await fetchAuthSession();
      const functionUrl = await getFunctionUrl();

      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authSession.tokens?.idToken?.toString()}`,
        },
        body: JSON.stringify({
          action: "getResults",
          sessionId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to get results: ${response.status} ${response.statusText}\n${errorText}`
        );
      }

      const data = await response.json();

      if (!data || typeof data !== "object") {
        throw new Error("Invalid results format");
      }

      setResult(data);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      setResult(null);
    }
  };

  const startNewSession = () => {
    resetState();
    createSession();
  };

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <h1>AWS Face Rekognition Liveness Demo</h1>

      {/* Connection status indicator */}
      {connectionStatus && (
        <div
          style={{
            marginTop: "10px",
            padding: "10px",
            backgroundColor: "#e7f3ff",
            borderRadius: "5px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "14px", color: "#0066cc" }}>
            🔄 {connectionStatus}
          </div>
        </div>
      )}

      {!session && (
        <button
          onClick={createSession}
          disabled={loading}
          style={loading ? BUTTON_STYLES.disabled : BUTTON_STYLES.primary}
        >
          {loading ? "Creating session..." : "Start Face Liveness Check"}
        </button>
      )}

      {session && isLivenessActive && (
        <div style={{ marginTop: "20px" }}>
          <FaceLivenessDetector
            sessionId={session.sessionId}
            // sessionId="078a994c-d53a-4068-8da6-2ca199a6adef"
            region="us-east-1"
            onAnalysisComplete={handleAnalysisComplete}
            onUserCancel={handleUserCancel}
            onError={handleLivenessError}
            // WebView-д зориулсан optimization
            disableInstructionScreen={false}
            config={{
              // Connection timeout нэмэх
              binaryVersion: "1.0.0",
            }}
          />
        </div>
      )}

      {session && !isLivenessActive && (
        <div style={{ marginTop: "20px" }}>
          <p>Session ID: {session.sessionId}</p>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button onClick={startNewSession} style={BUTTON_STYLES.primary}>
              Start New Session
            </button>
            <button
              onClick={() => setIsLivenessActive(true)}
              style={BUTTON_STYLES.success}
            >
              Start Liveness Check
            </button>
            <button
              onClick={() => getResults(session.sessionId)}
              style={BUTTON_STYLES.secondary}
            >
              Get Results
            </button>
          </div>
        </div>
      )}

      {verifying && (
        <div
          style={{
            marginTop: "20px",
            padding: "20px",
            textAlign: "center",
            backgroundColor: "#e7f3ff",
            borderRadius: "5px",
          }}
        >
          <div style={{ fontSize: "18px", marginBottom: "10px" }}>
            🔍 Verifying results...
          </div>
          <div style={{ color: "#666" }}>
            Please wait while we verify your liveness check results.
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            color: "red",
            marginTop: "10px",
            padding: "10px",
            backgroundColor: "#ffe7e7",
            borderRadius: "5px",
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && !verifying && (
        <div
          style={{
            marginTop: "20px",
            padding: "20px",
            backgroundColor:
              result.status === "SUCCEEDED" ? "#e7f5e7" : "#fff3cd",
            borderRadius: "5px",
            border: `2px solid ${
              result.status === "SUCCEEDED" ? "#28a745" : "#ffc107"
            }`,
          }}
        >
          <h3 style={{ marginTop: 0 }}>
            {result.status === "SUCCEEDED"
              ? "✅ Liveness Check Passed"
              : "⚠️ Liveness Check Results"}
          </h3>

          {result.status && typeof result.status === "string" && (
            <div style={{ marginBottom: "10px" }}>
              <strong>Status:</strong>{" "}
              <span
                style={{
                  color: result.status === "SUCCEEDED" ? "#28a745" : "#856404",
                  fontWeight: "bold",
                }}
              >
                {result.status}
              </span>
            </div>
          )}

          {result.confidence !== undefined && (
            <div style={{ marginBottom: "10px" }}>
              <strong>Confidence:</strong>{" "}
              {typeof result.confidence === "number"
                ? `${(result.confidence * 100).toFixed(2)}%`
                : String(result.confidence)}
            </div>
          )}

          {result.auditImages && Array.isArray(result.auditImages) && (
            <div style={{ marginBottom: "10px" }}>
              <strong>Audit Images:</strong> {result.auditImages.length}{" "}
              image(s)
            </div>
          )}

          <details style={{ marginTop: "15px" }}>
            <summary style={{ cursor: "pointer", color: "#007bff" }}>
              View Raw Results
            </summary>
            <pre
              style={{
                marginTop: "10px",
                padding: "10px",
                backgroundColor: "#f8f9fa",
                borderRadius: "3px",
                overflow: "auto",
                maxHeight: "300px",
              }}
            >
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>

          <div style={{ marginTop: "15px" }}>
            <button onClick={startNewSession} style={BUTTON_STYLES.primary}>
              Start New Session
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
