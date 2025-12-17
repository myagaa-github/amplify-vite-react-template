import { useLanguage } from "./LanguageContext";
import { COLORS, SPACING } from "./constants";

export const LanguageSwitcher = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      style={{
        display: "flex",
        gap: SPACING.xs,
        marginBottom: SPACING.md,
        justifyContent: "flex-end",
      }}
    >
      <button
        onClick={() => setLanguage("en")}
        style={{
          padding: "6px 12px",
          fontSize: "12px",
          backgroundColor: language === "en" ? COLORS.primary : "transparent",
          color: language === "en" ? "white" : COLORS.text,
          border: `1px solid ${
            language === "en" ? COLORS.primary : COLORS.border
          }`,
          borderRadius: SPACING.xs,
          cursor: "pointer",
          fontWeight: language === "en" ? "600" : "400",
        }}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage("mn")}
        style={{
          padding: "6px 12px",
          fontSize: "12px",
          backgroundColor: language === "mn" ? COLORS.primary : "transparent",
          color: language === "mn" ? "white" : COLORS.text,
          border: `1px solid ${
            language === "mn" ? COLORS.primary : COLORS.border
          }`,
          borderRadius: SPACING.xs,
          cursor: "pointer",
          fontWeight: language === "mn" ? "600" : "400",
        }}
      >
        MN
      </button>
    </div>
  );
};
