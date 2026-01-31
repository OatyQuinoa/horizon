import { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Watchlist from "./pages/Watchlist";
import Archive from "./pages/Archive";
import CompanyDetail from "./pages/CompanyDetail";
import LoadingSpinner from "./components/LoadingSpinner";
import { Toaster } from "./components/ui/sonner";

function App() {
  return (
    <>
      <Suspense fallback={<LoadingSpinner />}>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/watchlist" element={<Watchlist />} />
            <Route path="/archive" element={<Archive />} />
            <Route path="/company/:id" element={<CompanyDetail />} />
          </Routes>
        </Layout>
      </Suspense>
      <Toaster position="top-right" />
    </>
  );
}

export default App;
