import { AuthProvider } from "@/lib/authContext";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-full flex flex-col items-center justify-center px-6 py-12">
        {children}
      </div>
    </AuthProvider>
  );
}
