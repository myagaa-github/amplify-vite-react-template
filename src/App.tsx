import FaceLiveness from "./component/FaceLiveness";
import { LanguageProvider } from "./component/LanguageContext";

function App() {
  return (
    <LanguageProvider>
      <main>
        <FaceLiveness />
      </main>
    </LanguageProvider>
  );
}

export default App;
