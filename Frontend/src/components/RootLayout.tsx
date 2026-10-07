import { Outlet } from "react-router";
import GlobalCartDrawer from "./GlobalCartDrawer";

export default function RootLayout() {
  return (
    <>
      <Outlet />
      <GlobalCartDrawer />
    </>
  );
}
