import { COLORS, SPACING } from "./constants";

// Style utilities
export const createResponsiveFontSize = (
  min: number,
  vw: number,
  max: number
) => `clamp(${min}px, ${vw}vw, ${max}px)`;

export const styles = {
  container: {
    padding: SPACING.sm,
    maxWidth: "100%",
    margin: "0 auto",
    width: "100%",
    boxSizing: "border-box" as const,
  },
  title: {
    fontSize: createResponsiveFontSize(20, 5, 28),
    marginBottom: SPACING.md,
    textAlign: "center" as const,
  },
  statusContainer: {
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: COLORS.statusBg,
    borderRadius: SPACING.xs,
    textAlign: "center" as const,
  },
  statusText: {
    fontSize: createResponsiveFontSize(12, 3, 14),
    color: COLORS.statusText,
    wordBreak: "break-word" as const,
  },
  errorContainer: {
    color: COLORS.error,
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: COLORS.errorBg,
    borderRadius: SPACING.xs,
    fontSize: createResponsiveFontSize(12, 3, 14),
    wordBreak: "break-word" as const,
  },
  inputContainer: {
    marginBottom: SPACING.sm,
    fontSize: createResponsiveFontSize(12, 3, 14),
    color: COLORS.text,
  },
  label: {
    display: "block" as const,
    marginBottom: SPACING.xs,
    fontWeight: "500" as const,
  },
  input: {
    width: "100%",
    padding: SPACING.sm,
    fontSize: createResponsiveFontSize(12, 3, 14),
    border: `1px solid ${COLORS.border}`,
    borderRadius: SPACING.xs,
    boxSizing: "border-box" as const,
  },
  successText: {
    marginTop: SPACING.xs,
    fontSize: createResponsiveFontSize(11, 2.5, 12),
    color: COLORS.success,
  },
  button: (isEnabled: boolean) => ({
    padding: "12px 20px",
    fontSize: createResponsiveFontSize(14, 4, 16),
    backgroundColor: isEnabled ? COLORS.primary : COLORS.disabled,
    color: "white",
    border: "none",
    borderRadius: SPACING.xs,
    cursor: isEnabled ? ("pointer" as const) : ("not-allowed" as const),
    width: "100%",
    opacity: isEnabled ? 1 : 0.6,
  }),
  section: {
    marginTop: SPACING.lg,
  },
  sessionIdText: {
    fontSize: createResponsiveFontSize(12, 3, 14),
    wordBreak: "break-all" as const,
    marginBottom: SPACING.sm,
  },
};
