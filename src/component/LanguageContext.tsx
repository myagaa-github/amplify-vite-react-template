import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Language, translations } from "./translations";
import { getLanguageFromUrl } from "./utils";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations.en;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  // URL параметрээс хэл унших, байхгүй эсвэл буруу утга байвал default "mn"
  const getInitialLanguage = (): Language => {
    const urlLanguage = getLanguageFromUrl();
    return urlLanguage || "mn";
  };

  const [language, setLanguage] = useState<Language>(getInitialLanguage);

  // URL параметр өөрчлөгдөхөд хэлийг шинэчлэх
  useEffect(() => {
    const urlLanguage = getLanguageFromUrl();
    if (urlLanguage) {
      setLanguage(urlLanguage);
    }
  }, []);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t: translations[language],
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
};
