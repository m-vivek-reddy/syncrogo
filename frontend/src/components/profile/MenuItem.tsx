import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface MenuItemProps {
  to: string;
  icon: LucideIcon;
  title: string;
  subtitle?: string;
}

export default function MenuItem({
  to,
  icon: Icon,
  title,
  subtitle,
}: MenuItemProps) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors border-b border-gray-100 last:border-b-0"
    >
      <div className="flex items-center gap-4">
        <div className="text-slate-600">
          <Icon size={22} strokeWidth={1.8} />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-800">
            {title}
          </h3>

          {subtitle && (
            <p className="text-xs text-slate-500 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <ChevronRight
        size={20}
        className="text-slate-400"
      />
    </Link>
  );
}