import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface Props {
  title: string;
  value: any;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
  index?: number;
}

/** Animated count-up for numeric values. */
function useCountUp(target: number, duration = 900) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!Number.isFinite(target)) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(target * eased);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return display;
}

export default function StatCard({
  title,
  value,
  icon,
  color,
  subtitle,
  index = 0,
}: Props) {
  const numeric = typeof value === "number" ? value : null;
  const animated = useCountUp(numeric ?? 0);
  const shown = numeric !== null ? Number(animated.toFixed(2)) : value;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.07, ease: "easeOut" }}
      whileHover={{ scale: 1.03 }}
      className="
        bg-white
        rounded-2xl
        shadow-md
        p-6
        border
        border-gray-200
      "
    >

      <div className="flex justify-between items-start">

        <div>

          <p className="
            text-gray-600
            font-medium
            text-sm
          ">
            {title}
          </p>


          <h2 className="
            text-4xl
            font-bold
            mt-4
            text-gray-900
            tabular-nums
          ">
            {shown}
          </h2>


          <p className="
            text-xs
            text-gray-500
            mt-2
          ">
            {subtitle ?? "Live"}
          </p>

        </div>


        <div
          className={`
            w-14
            h-14
            rounded-xl
            flex
            items-center
            justify-center
            shadow-sm
            ${color}
          `}
        >
          {icon}
        </div>


      </div>

    </motion.div>
  );
}
