import { motion } from "framer-motion";

interface Props {
  title: string;
  value: any;
  icon: React.ReactNode;
  color: string;
}

export default function StatCard({
  title,
  value,
  icon,
  color,
}: Props) {
  return (
    <motion.div
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
          ">
            {value}
          </h2>


          <p className="
            text-xs
            text-gray-500
            mt-2
          ">
            Updated recently
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