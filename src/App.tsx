import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { RequireAuth } from "./components/RequireAuth";
import { PageLoader } from "./components/ui";
import Home from "./pages/Home";

const Menu = lazy(() => import("./pages/Menu"));
const Locations = lazy(() => import("./pages/Locations"));
const Contact = lazy(() => import("./pages/Contact"));
const Order = lazy(() => import("./pages/Order"));
const OrderDetail = lazy(() => import("./pages/OrderDetail"));
const Login = lazy(() => import("./pages/auth/Login"));
const Register = lazy(() => import("./pages/auth/Register"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const Account = lazy(() => import("./pages/Account"));
const Admin = lazy(() => import("./pages/admin/Admin"));
const Privacy = lazy(() => import("./pages/Privacy"));
const NotFound = lazy(() => import("./pages/NotFound"));

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="carte" element={<Menu />} />
          <Route path="ou-nous-trouver" element={<Locations />} />
          <Route path="contact" element={<Contact />} />
          <Route path="commander" element={<Order />} />
          <Route path="connexion" element={<Login />} />
          <Route path="inscription" element={<Register />} />
          <Route path="mot-de-passe-oublie" element={<ForgotPassword />} />
          <Route path="reinitialiser-mot-de-passe" element={<ResetPassword />} />
          <Route path="confidentialite" element={<Privacy />} />
          <Route
            path="compte"
            element={
              <RequireAuth>
                <Account />
              </RequireAuth>
            }
          />
          <Route
            path="compte/commandes/:id"
            element={
              <RequireAuth>
                <OrderDetail />
              </RequireAuth>
            }
          />
          <Route
            path="admin/*"
            element={
              <RequireAuth roles={["staff", "admin"]}>
                <Admin />
              </RequireAuth>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
