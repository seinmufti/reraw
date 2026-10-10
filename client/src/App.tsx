import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AdminPasswordGate } from "@/components/AdminPasswordGate";
import { AdminPcOnlyGate } from "@/components/AdminPcOnlyGate";
import { getRouterBasename } from "@/lib/router-basename";
import { PublicViewport } from "@/components/PublicViewport";
import { AdminPage } from "@/pages/admin/AdminPage";
import { HomePage } from "@/pages/HomePage";

const queryClient = new QueryClient();

export default function App() {
  const basename = getRouterBasename();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={basename}>
        <Routes>
          <Route
            path="/"
            element={
              <PublicViewport>
                <HomePage />
              </PublicViewport>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminPcOnlyGate>
                <AdminPasswordGate>
                  <AdminPage />
                </AdminPasswordGate>
              </AdminPcOnlyGate>
            }
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
