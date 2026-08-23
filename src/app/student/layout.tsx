import { BrandLogo } from "@/components/dashboard/BrandLogo";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { requireUser } from "@/lib/auth/user";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <div className="pp-student-shell"><header className="pp-student-shell__header"><BrandLogo href="/" /><ThemeToggle /></header>{children}</div>;
}
