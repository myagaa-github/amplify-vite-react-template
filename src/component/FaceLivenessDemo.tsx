import { useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { FaceLivenessDetector } from "@aws-amplify/ui-react-liveness";
import "@aws-amplify/ui-react-liveness/styles.css";
import { useEffect } from "react";

interface LivenessSession {
  sessionId: string;
  stream: unknown;
}

interface AuditImage {
  Bytes?: Uint8Array | string | number[];
  S3Object?: {
    Bucket?: string;
    Name?: string;
  };
}

interface LivenessResult {
  status?: string;
  confidence?: number;
  auditImages?: AuditImage[];
}

// Constants
const TIMEOUTS = {
  CONNECTION: 120000, // 2 минут
  ANALYSIS_WAIT: 3000, // 3 секунд
  RETRY_DELAY: 2000, // 2 секунд
} as const;

const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  DELAY: TIMEOUTS.RETRY_DELAY,
} as const;

// Utility functions
const getErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : String(error);
};

const createButtonStyle = (
  backgroundColor: string,
  cursor: string = "pointer",
  opacity: number = 1
) => ({
  padding: "10px 20px",
  fontSize: "16px",
  backgroundColor,
  color: "white",
  border: "none",
  borderRadius: "5px",
  cursor,
  opacity,
});

const BUTTON_STYLES = {
  primary: createButtonStyle("#007bff"),
  success: createButtonStyle("#28a745"),
  secondary: createButtonStyle("#6c757d"),
  disabled: createButtonStyle("#007bff", "not-allowed", 0.6),
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
      throw new Error(
        `Function URL not found. Please deploy backend first. Error: ${getErrorMessage(
          err
        )}`
      );
    }
  };

  // WebRTC Connection Status Tracking
  useEffect(() => {
    if (isLivenessActive && session) {
      const timeout = setTimeout(() => {
        if (isLivenessActive) {
          setError("Connection timeout. Please try again.");
          setIsLivenessActive(false);
          setConnectionStatus(null);
        }
      }, TIMEOUTS.CONNECTION);

      return () => clearTimeout(timeout);
    }
  }, [isLivenessActive, session]);

  // WebView detection
  const isWebView = () => {
    const userAgent =
      navigator.userAgent ||
      navigator.vendor ||
      (window as Window & { opera?: string }).opera ||
      "";
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
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err);
      const errorMessages = {
        permission: [
          "Permission denied",
          "NotAllowedError",
          "Camera permission denied. Please allow camera access in your browser settings.",
        ],
        notFound: [
          "NotFoundError",
          "DevicesNotFoundError",
          "No camera found. Please connect a camera and try again.",
        ],
        inUse: [
          "NotReadableError",
          "TrackStartError",
          "Camera is already in use by another application.",
        ],
      };

      if (errorMessages.permission.some((msg) => errorMessage.includes(msg))) {
        setError(errorMessages.permission[2]);
      } else if (
        errorMessages.notFound.some((msg) => errorMessage.includes(msg))
      ) {
        setError(errorMessages.notFound[2]);
      } else if (
        errorMessages.inUse.some((msg) => errorMessage.includes(msg))
      ) {
        setError(errorMessages.inUse[2]);
      } else {
        setError(`Camera access error: ${errorMessage}`);
      }

      return false;
    }
  };

  // API call helper function
  const callLambdaFunction = async (
    action: string,
    body?: Record<string, unknown>
  ) => {
    const authSession = await fetchAuthSession();
    const functionUrl = await getFunctionUrl();

    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authSession.tokens?.idToken?.toString()}`,
      },
      body: JSON.stringify({ action, ...body }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to ${action}: ${response.status} ${response.statusText}\n${errorText}`
      );
    }

    return response.json();
  };

  const createSession = async () => {
    setLoading(true);
    setError(null);
    setConnectionStatus(null);

    const hasCameraAccess = await checkCameraAccess();
    if (!hasCameraAccess) {
      setLoading(false);
      return;
    }

    try {
      setConnectionStatus("Creating session...");
      const data = await callLambdaFunction("createSession");

      if (!data.sessionId) {
        throw new Error("Session ID not found in response");
      }

      setSession(data);
      setConnectionStatus("Connecting to camera...");
      setIsLivenessActive(true);
    } catch (err) {
      setError(getErrorMessage(err));
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
    setConnectionStatus("Analysis complete. Processing results...");

    try {
      console.log("Waiting for Rekognition to process audit images...");
      await new Promise((resolve) =>
        setTimeout(resolve, TIMEOUTS.ANALYSIS_WAIT)
      );

      setConnectionStatus("Fetching results...");
      await getResults(session.sessionId);
    } finally {
      setVerifying(false);
      setConnectionStatus(null);
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

  const hasEmptyAuditImages = (data: unknown): boolean => {
    return (
      !data ||
      typeof data !== "object" ||
      !("auditImages" in data) ||
      !Array.isArray((data as { auditImages: unknown }).auditImages) ||
      (data as { auditImages: unknown[] }).auditImages.length === 0
    );
  };

  const getResults = async (sessionId: string, retryCount = 0) => {
    try {
      const data = await callLambdaFunction("getResults", { sessionId });

      // Хэрэв audit images хоосон байвал retry хийх
      if (retryCount < RETRY_CONFIG.MAX_RETRIES && hasEmptyAuditImages(data)) {
        console.log(
          `Audit images not ready yet, retrying... (${retryCount + 1}/${
            RETRY_CONFIG.MAX_RETRIES
          })`
        );
        setConnectionStatus(
          `Waiting for audit images... (${retryCount + 1}/${
            RETRY_CONFIG.MAX_RETRIES
          })`
        );
        await new Promise((resolve) => setTimeout(resolve, RETRY_CONFIG.DELAY));
        return getResults(sessionId, retryCount + 1);
      }

      console.log("getResults response:", {
        status: data.status,
        confidence: data.confidence,
        hasAuditImages: !!data.auditImages,
        auditImagesCount: data.auditImages?.length || 0,
        auditImagesType: data.auditImages ? typeof data.auditImages : "null",
        isArray: Array.isArray(data.auditImages),
        fullData: data,
      });

      if (!data || typeof data !== "object") {
        throw new Error("Invalid results format");
      }

      // AuditImages-ийн эхний image-ийн мэдээллийг log хийх
      if (
        data.auditImages &&
        Array.isArray(data.auditImages) &&
        data.auditImages.length > 0
      ) {
        console.log("First audit image sample:", {
          hasBytes: !!data.auditImages[0].Bytes,
          bytesType: data.auditImages[0].Bytes
            ? typeof data.auditImages[0].Bytes
            : "null",
          isUint8Array: data.auditImages[0].Bytes instanceof Uint8Array,
          isArray: Array.isArray(data.auditImages[0].Bytes),
          bytesPreview: data.auditImages[0].Bytes
            ? typeof data.auditImages[0].Bytes === "string"
              ? data.auditImages[0].Bytes.substring(0, 50) + "..."
              : Array.isArray(data.auditImages[0].Bytes)
              ? `Array[${data.auditImages[0].Bytes.length}]`
              : "Uint8Array"
            : "null",
        });
      }

      setResult(data);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
      setResult(null);
    }
  };

  const startNewSession = () => {
    resetState();
    createSession();
  };

  // Audit image-г base64 data URL болгон хөрвүүлэх функц
  const getImageDataUrl = (auditImage: AuditImage): string | null => {
    try {
      console.log("getImageDataUrl called with:", {
        hasBytes: !!auditImage.Bytes,
        bytesType: auditImage.Bytes ? typeof auditImage.Bytes : "null",
        isUint8Array: auditImage.Bytes instanceof Uint8Array,
        isArray: Array.isArray(auditImage.Bytes),
        bytesLength: auditImage.Bytes
          ? Array.isArray(auditImage.Bytes)
            ? auditImage.Bytes.length
            : auditImage.Bytes instanceof Uint8Array
            ? auditImage.Bytes.length
            : typeof auditImage.Bytes === "string"
            ? auditImage.Bytes.length
            : "unknown"
          : 0,
        hasS3Object: !!auditImage.S3Object,
      });

      // Bytes property байвал ашиглах
      if (auditImage.Bytes) {
        // Uint8Array эсвэл base64 string байж болно
        if (typeof auditImage.Bytes === "string") {
          console.log("Bytes is string, length:", auditImage.Bytes.length);
          // Base64 string байвал шууд ашиглах
          // Хэрэв аль хэдийн "data:image" эхэлж байвал шууд буцаах
          if (auditImage.Bytes.startsWith("data:image")) {
            console.log("Already a data URL, returning as-is");
            return auditImage.Bytes;
          }
          // Эсвэл base64 string байвал data URL болгох
          const dataUrl = `data:image/jpeg;base64,${auditImage.Bytes}`;
          console.log("Created data URL from string, length:", dataUrl.length);
          return dataUrl;
        } else if (auditImage.Bytes instanceof Uint8Array) {
          console.log("Bytes is Uint8Array, length:", auditImage.Bytes.length);
          // Uint8Array байвал base64 болгон хөрвүүлэх
          // Том файлуудын хувьд chunk-ууд ашиглах
          let binary = "";
          const len = auditImage.Bytes.byteLength;
          for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(auditImage.Bytes[i]);
          }
          const base64 = btoa(binary);
          const dataUrl = `data:image/jpeg;base64,${base64}`;
          console.log(
            "Converted Uint8Array to base64, dataUrl length:",
            dataUrl.length
          );
          return dataUrl;
        } else if (Array.isArray(auditImage.Bytes)) {
          console.log("Bytes is Array, length:", auditImage.Bytes.length);
          // Array байвал (JSON serialization-ийн үр дүн) Uint8Array болгон хөрвүүлэх
          // Том файлуудын хувьд chunk-ууд ашиглах
          let binary = "";
          for (let i = 0; i < auditImage.Bytes.length; i++) {
            binary += String.fromCharCode(auditImage.Bytes[i]);
          }
          const base64 = btoa(binary);
          const dataUrl = `data:image/jpeg;base64,${base64}`;
          console.log(
            "Converted Array to base64, dataUrl length:",
            dataUrl.length
          );
          return dataUrl;
        } else {
          console.warn("Bytes is unknown type:", typeof auditImage.Bytes);
        }
      }

      // S3Object байвал (одоогоор дэмжэхгүй, гэхдээ ирээдүйд нэмж болно)
      if (auditImage.S3Object) {
        console.warn("S3Object images are not yet supported for display");
      }

      console.warn("No valid image data found in auditImage");
      return null;
    } catch (error) {
      console.error("Error converting audit image:", error, auditImage);
      return null;
    }
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
            disableStartScreen={false}
            // Session-ийг илүү удаан хүлээх - timeout нэмэгдүүлсэн
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
              <strong>Liveness Confidence:</strong>{" "}
              {typeof result.confidence === "number"
                ? `${(result.confidence * 100).toFixed(2)}%`
                : String(result.confidence)}
            </div>
          )}

          {result.auditImages && Array.isArray(result.auditImages) && (
            <div style={{ marginBottom: "20px" }}>
              <strong>Audit Images:</strong> {result.auditImages.length}{" "}
              image(s)
              {result.auditImages.length === 0 && (
                <div
                  style={{
                    marginTop: "10px",
                    padding: "10px",
                    backgroundColor: "#fff3cd",
                    borderRadius: "5px",
                    fontSize: "14px",
                    color: "#856404",
                  }}
                >
                  <strong>⚠️ No audit images available</strong>
                  <div style={{ marginTop: "5px", fontSize: "12px" }}>
                    This might be because:
                    <ul style={{ marginTop: "5px", marginLeft: "20px" }}>
                      <li>Session was not completed properly</li>
                      <li>Rekognition did not capture audit images</li>
                      <li>Please check CloudWatch Logs for more details</li>
                    </ul>
                  </div>
                </div>
              )}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "15px",
                  marginTop: "15px",
                }}
              >
                {result.auditImages.map((auditImage, index) => {
                  console.log(`Processing audit image ${index}:`, auditImage);
                  const imageUrl = getImageDataUrl(auditImage);
                  console.log(
                    `Image ${index} URL:`,
                    imageUrl ? `${imageUrl.substring(0, 50)}...` : "null"
                  );

                  return (
                    <div
                      key={index}
                      style={{
                        border: "1px solid #ddd",
                        borderRadius: "5px",
                        padding: "10px",
                        backgroundColor: "#f8f9fa",
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#666",
                          marginBottom: "8px",
                        }}
                      >
                        <span>Image {index + 1}</span>
                      </div>
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={`Audit image ${index + 1}`}
                          style={{
                            width: "100%",
                            height: "auto",
                            borderRadius: "3px",
                            maxHeight: "300px",
                            objectFit: "contain",
                          }}
                          onError={(e) => {
                            console.error(
                              `Error loading image ${index + 1}:`,
                              e
                            );
                            console.error(
                              "Image URL:",
                              imageUrl.substring(0, 100) + "..."
                            );
                          }}
                          onLoad={() => {
                            console.log(
                              `Image ${index + 1} loaded successfully`
                            );
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            padding: "20px",
                            textAlign: "center",
                            color: "#999",
                            backgroundColor: "#f0f0f0",
                            borderRadius: "3px",
                          }}
                        >
                          <div>Unable to display image</div>
                          <div
                            style={{
                              fontSize: "10px",
                              marginTop: "5px",
                              color: "#666",
                            }}
                          >
                            Bytes type:{" "}
                            {auditImage.Bytes
                              ? typeof auditImage.Bytes
                              : "null"}
                            {auditImage.Bytes &&
                              Array.isArray(auditImage.Bytes) && (
                                <> | Array length: {auditImage.Bytes.length}</>
                              )}
                            {auditImage.Bytes &&
                              auditImage.Bytes instanceof Uint8Array && (
                                <>
                                  {" "}
                                  | Uint8Array length: {auditImage.Bytes.length}
                                </>
                              )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
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
