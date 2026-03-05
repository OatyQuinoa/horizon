import { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Watchlist from "./pages/Watchlist";
import Archive from "./pages/Archive";
import CompanyDetail from "./pages/CompanyDetail";
import ProspectusEditor from "./pages/ProspectusEditor";
import Glossary from "./pages/Glossary";
import LoadingSpinner from "./components/LoadingSpinner";
import { Toaster } from "./components/ui/sonner";
import { CompaniesProvider } from "./context/CompaniesContext";

function App() {
  return (
    <CompaniesProvider>
      <Suspense fallback={<LoadingSpinner />}>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/watchlist" element={<Watchlist />} />
            <Route path="/archive" element={<Archive />} />
            <Route path="/glossary" element={<Glossary />} />
            <Route path="/company/:id" element={<CompanyDetail />} />
            <Route path="/company/:id/prospectus-editor" element={<ProspectusEditor />} />
          </Routes>
        </Layout>
      </Suspense>
      <Toaster position="top-right" />
    </CompaniesProvider>
  );
}

export default App;
