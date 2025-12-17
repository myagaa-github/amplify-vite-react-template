import { useState, useEffect } from "react";
import { FaceLivenessDetector } from "@aws-amplify/ui-react-liveness";
import "@aws-amplify/ui-react-liveness/styles.css";
import { LivenessSession } from "./types";
import { TIMEOUTS, SPACING } from "./constants";
import { styles } from "./styles";
import {
  getSessionIdFromEnv,
  getSessionIdFromUrl,
  isConnectionError,
  loadRegionFromConfig,
} from "./utils";
import { StatusMessage, ErrorMessage, SessionIdDisplay } from "./components";
import { useLanguage } from "./LanguageContext";

export default function FaceLivenessDemo() {
  const { t } = useLanguage();
  const [session, setSession] = useState<LivenessSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLivenessActive, setIsLivenessActive] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [sessionIdInput, setSessionIdInput] = useState<string>("");
  const [rekognitionRegion, setRekognitionRegion] =
    useState<string>("ap-northeast-1");

  // Load region from amplify_outputs.json on component mount
  useEffect(() => {
    loadRegionFromConfig().then(setRekognitionRegion);
  }, []);

  // Check for sessionId in URL parameters on mount
  useEffect(() => {
    const urlSessionId = getSessionIdFromUrl();
    if (urlSessionId) {
      // URL-аас sessionId олдвол шууд FaceLivenessDetector ажиллуулах
      setError(null);
      setConnectionStatus(t.connectingToCamera);
      setSession({ sessionId: urlSessionId, stream: null });
      setIsLivenessActive(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // WebRTC Connection Status Tracking
  useEffect(() => {
    if (!isLivenessActive || !session) return;

    const timeout = setTimeout(() => {
      if (isLivenessActive) {
        setError(t.connectionTimeout);
        setIsLivenessActive(false);
        setConnectionStatus(null);
      }
    }, TIMEOUTS.CONNECTION);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLivenessActive, session]);

  const getSessionId = (): string | null => {
    const trimmedInput = sessionIdInput?.trim();
    return trimmedInput || getSessionIdFromUrl() || getSessionIdFromEnv();
  };

  const startLivenessCheck = () => {
    const sessionId = getSessionId();
    if (!sessionId) {
      setError(t.sessionIdRequired);
      return;
    }

    setError(null);
    setConnectionStatus(t.connectingToCamera);
    setSession({ sessionId, stream: null });
    setIsLivenessActive(true);
  };

  const handleAnalysisComplete = async () => {
    if (!session) return;

    setIsLivenessActive(false);
    setError(null);
    setConnectionStatus(t.analysisComplete);
    setTimeout(() => {
      setConnectionStatus(null);
    }, TIMEOUTS.STATUS_DISPLAY);
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

    if (isConnectionError(errorMessage)) {
      setError(t.connectionError);
      setIsLivenessActive(false);
      return;
    }

    setError(`${t.livenessError} ${errorMessage}`);
    setIsLivenessActive(false);
  };

  const isSessionIdValid = Boolean(sessionIdInput?.trim());

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>{t.title}</h1>

      {connectionStatus && <StatusMessage message={connectionStatus} />}

      {!session && (
        <div style={{ marginTop: SPACING.sm }}>
          <div style={styles.inputContainer}>
            <label htmlFor="session-id" style={styles.label}>
              {t.sessionIdLabel}
            </label>
            <input
              id="session-id"
              type="text"
              value={sessionIdInput}
              onChange={(e) => setSessionIdInput(e.target.value)}
              placeholder={t.sessionIdPlaceholder}
              style={styles.input}
            />
            {isSessionIdValid && (
              <div style={styles.successText}>{t.sessionIdEntered}</div>
            )}
          </div>
          <button
            onClick={startLivenessCheck}
            disabled={!isSessionIdValid}
            style={styles.button(isSessionIdValid)}
          >
            {t.startButton}
          </button>
        </div>
      )}

      {session && isLivenessActive && (
        <div style={styles.section}>
          <FaceLivenessDetector
            sessionId={session.sessionId}
            region={rekognitionRegion}
            onAnalysisComplete={handleAnalysisComplete}
            onUserCancel={handleUserCancel}
            onError={handleLivenessError}
            disableStartScreen={true}
          />
        </div>
      )}

      {session && !isLivenessActive && (
        <SessionIdDisplay sessionId={session.sessionId} />
      )}

      {error && <ErrorMessage message={error} />}
    </div>
  );
}
