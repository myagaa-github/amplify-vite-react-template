import { styles } from "./styles";
import { useLanguage } from "./LanguageContext";

export const StatusMessage = ({ message }: { message: string }) => (
  <div style={styles.statusContainer}>
    <div style={styles.statusText}>🔄 {message}</div>
  </div>
);

export const ErrorMessage = ({ message }: { message: string }) => {
  const { t } = useLanguage();
  return (
    <div style={styles.errorContainer}>
      <strong>{t.error}</strong> {message}
    </div>
  );
};

export const SessionIdDisplay = ({ sessionId }: { sessionId: string }) => {
  const { t } = useLanguage();
  return (
    <div style={styles.section}>
      <p style={styles.sessionIdText}>
        {t.sessionId} {sessionId}
      </p>
    </div>
  );
};
