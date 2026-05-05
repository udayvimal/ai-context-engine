import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function SignInPage() {
  return (
    <main style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "#06060a",
      fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      padding: "32px",
    }}>
      {/* Back to home */}
      <div style={{ width: "100%", maxWidth: "480px", marginBottom: "28px" }}>
        <Link href="/" style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          fontSize: "13px", color: "#5a5a72", textDecoration: "none",
          fontWeight: 500, transition: "color 0.12s",
        }}>
          ← Back to home
        </Link>
      </div>

      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "32px" }}>
        <div style={{
          width: "32px", height: "32px", borderRadius: "9px",
          background: "linear-gradient(135deg,#7c3aed,#a78bfa)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px",
        }}>⚡</div>
        <span style={{ fontSize: "17px", fontWeight: 800, color: "#f0f0f8", letterSpacing: "-0.3px" }}>
          ReSync AI
        </span>
      </div>

      <SignIn
        afterSignInUrl="/dashboard"
        signUpUrl="/sign-up"
        appearance={{
          variables: {
            colorPrimary: "#7c3aed",
            colorBackground: "#0e0e16",
            colorInputBackground: "#131320",
            colorInputText: "#e8e8f4",
            colorText: "#e8e8f4",
            colorTextSecondary: "#7070a0",
            colorNeutral: "#1c1c28",
            borderRadius: "10px",
            fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
          },
          elements: {
            card: { boxShadow: "0 24px 64px rgba(0,0,0,0.6)", border: "1px solid #1c1c28" },
            headerTitle: { color: "#f0f0f8", fontWeight: 800 },
            headerSubtitle: { color: "#7070a0" },
            socialButtonsBlockButton: { border: "1px solid #1c1c28", background: "#131320", color: "#e8e8f4" },
            dividerLine: { background: "#1c1c28" },
            dividerText: { color: "#3a3a52" },
            formFieldLabel: { color: "#9090b4" },
            footerActionLink: { color: "#a78bfa" },
          },
        }}
      />
    </main>
  );
}
