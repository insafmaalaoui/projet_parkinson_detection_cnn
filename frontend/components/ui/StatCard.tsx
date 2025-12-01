"use client";
import React from "react";

interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
  gradient?: string;
  icon?: React.ReactNode;
}

export default function StatCard({ title, value, subtitle, gradient, icon }: Props) {
  return (
    <div className="bg-white rounded-xl shadow p-4 flex items-center gap-4 hover:shadow-2xl transition-shadow">
      <div className={`w-14 h-14 rounded-lg flex items-center justify-center text-white font-bold ${gradient || 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
        {icon ?? value?.toString().slice(0,2)}
      </div>
      <div className="flex-1">
        <div className="text-sm text-slate-500">{title}</div>
        <div className="text-2xl font-extrabold text-slate-900">{value}</div>
        {subtitle ? <div className="text-xs text-slate-400 mt-1">{subtitle}</div> : null}
      </div>
    </div>
  );
}
