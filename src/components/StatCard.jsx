import * as Icons from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function StatCard({ title, value, change, icon, tone }) {
  const Icon = Icons[icon];

  return (
    <Card className="group overflow-hidden border-0 transition duration-300 hover:-translate-y-1 hover:shadow-2xl">
      <CardContent className="relative p-6">
        <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${tone}`} />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">{title}</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
            <p className="mt-2 text-sm text-emerald-600">{change}</p>
          </div>
          <div className={`rounded-2xl bg-gradient-to-br p-4 text-white shadow-lg transition group-hover:scale-110 ${tone}`}>
            {Icon ? <Icon className="h-6 w-6" /> : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
