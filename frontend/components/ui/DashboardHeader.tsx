"use client";
import React from "react";
import { Button } from "@/components/ui/button";

interface Props {
  title: string;
  subtitle?: string;
  avatarText?: string;
  onPrimary?: () => void;
  primaryLabel?: string;
}

export default function DashboardHeader({ title, subtitle, avatarText, onPrimary, primaryLabel }: Props) {
  return (
    <header className="relative bg-gradient-to-r from-sky-500 to-indigo-600 rounded-2xl overflow-hidden p-6 shadow-lg text-white">
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">{avatarText || 'U'}</div>
          <div>
            <h1 className="text-2xl font-extrabold">{title}</h1>
            {subtitle ? <p className="text-sm opacity-90 mt-1">{subtitle}</p> : null}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {primaryLabel ? (
            <Button onClick={onPrimary} className="bg-white text-indigo-600 font-semibold shadow-sm">{primaryLabel}</Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
