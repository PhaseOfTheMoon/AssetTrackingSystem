// Landing page, redirect to /login
import { redirect } from "next/navigation";

// Redirect the user to the login page
export default function RootPage() {
  redirect("/login");
}