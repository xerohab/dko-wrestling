import React from "react";

const DKO_LOGO = "https://media.base44.com/images/public/6a0fab0df03ef3f099fbfaf0/782e6a111_dkowrestl.jpg";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10 relative overflow-hidden">
      {/* Subtle red/gold ambient glow */}
      <div className="pointer-events-none absolute -top-32 -left-24 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 w-96 h-96 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        {/* DKO logo */}
        <div className="flex flex-col items-center mb-8">
          <img src={DKO_LOGO} alt="DKO Wrestling" className="h-16 w-auto mb-4 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]" />
          <div className="h-px w-16 bg-gradient-to-r from-transparent via-accent to-transparent" />
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary mb-3">
            <Icon className="w-6 h-6 text-primary-foreground" aria-hidden="true" />
          </div>
          <h1 className="font-oswald font-bold text-2xl md:text-3xl uppercase tracking-wider text-foreground">
            {title}
          </h1>
          {subtitle && <p className="text-muted-foreground mt-2 font-inter text-sm">{subtitle}</p>}
        </div>

        <div className="bg-card rounded-2xl shadow-xl border border-border p-7">
          {children}
        </div>

        {footer && (
          <p className="text-center text-sm text-muted-foreground mt-6 font-inter">{footer}</p>
        )}

        <p className="text-center text-xs text-muted-foreground/70 mt-8 font-inter">
          © 2026 DKO Wrestling · Part of DKO LTD
        </p>
      </div>
    </div>
  );
}