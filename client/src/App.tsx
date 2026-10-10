import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AdminPcOnlyGate } from "@/components/AdminPcOnlyGate";
import { PublicViewport } from "@/components/PublicViewport";
import { AdminPage } from "@/pages/admin/AdminPage";
import { HomePage } from "@/pages/HomePage";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
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
                <AdminPage />
              </AdminPcOnlyGate>
            }
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
