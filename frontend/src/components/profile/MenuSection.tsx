import MenuItem from "./MenuItem";
import type { LucideIcon } from "lucide-react";

interface Item {
  to: string;
  icon: LucideIcon;
  title: string;
  subtitle?: string;
}

interface MenuSectionProps {
  items: Item[];
}

export default function MenuSection({
  items,
}: MenuSectionProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {items.map((item) => (
        <MenuItem
          key={item.title}
          to={item.to}
          icon={item.icon}
          title={item.title}
          subtitle={item.subtitle}
        />
      ))}
    </div>
  );
}