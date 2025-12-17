export const getSessionIdFromEnv = (): string | null => {
  const envSessionId = import.meta.env.VITE_STATIC_SESSION_ID;
  if (envSessionId && typeof envSessionId === "string" && envSessionId.trim()) {
    return envSessionId.trim();
  }
  return null;
};

export const getSessionIdFromUrl = (): string | null => {
  if (typeof window === "undefined") return null;

  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get("sessionId");

  if (sessionId && sessionId.trim()) {
    return sessionId.trim();
  }
  return null;
};

export const getLanguageFromUrl = (): "mn" | "en" | null => {
  if (typeof window === "undefined") return null;

  const urlParams = new URLSearchParams(window.location.search);
  const language = urlParams.get("language");

  if (language === "mn" || language === "en") {
    return language;
  }
  return null;
};

export const isConnectionError = (errorMessage: string): boolean => {
  const connectionKeywords = [
    "connection",
    "Connection",
    "WebRTC",
    "ICE",
    "network",
  ];
  return connectionKeywords.some((keyword) => errorMessage.includes(keyword));
};

export const loadRegionFromConfig = async (): Promise<string> => {
  try {
    const outputs = await import("../../amplify_outputs.json");
    const outputsData = outputs.default as Record<string, unknown>;
    return (
      (outputsData.aws_rekognition_region as string) ||
      (outputsData.aws_project_region as string) ||
      "us-east-1"
    );
  } catch (err) {
    console.warn(
      "Could not read region from amplify_outputs.json, using default us-east-1"
    );
    return "us-east-1";
  }
};
