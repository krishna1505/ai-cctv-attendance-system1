import "./globals.css";
import React from "react";

export const metadata = {
  title: "StaffPie AI CCTV Attendance",
  description: "Workforce Presence & CCTV Intelligence Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#F8FAFC] text-slate-800 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}