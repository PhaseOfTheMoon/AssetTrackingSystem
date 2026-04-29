import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import LayoutWrapper from "@/components/layoutWrapper";
import { authOptions } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side auth check
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <LayoutWrapper>
      {children}
    </LayoutWrapper>
  );
}