import { Check, X } from "lucide-react";

interface PasswordStrengthMeterProps {
  password: string;
}

export default function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  if (!password) return null;

  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const requirements = [
    { label: "At least 8 characters", met: hasMinLength },
    { label: "Uppercase letter (A-Z)", met: hasUppercase },
    { label: "Number (0-9)", met: hasNumber },
    { label: "Special character (!@#$)", met: hasSpecial },
  ];

  const score = [hasMinLength, hasUppercase, hasNumber, hasSpecial].filter(Boolean).length;

  const getLabelAndColor = () => {
    switch (score) {
      case 0:
      case 1:
        return { label: "Weak", color: "bg-red-500", text: "text-red-600" };
      case 2:
        return { label: "Fair", color: "bg-amber-500", text: "text-amber-600" };
      case 3:
        return { label: "Good", color: "bg-blue-500", text: "text-blue-600" };
      case 4:
        return { label: "Strong", color: "bg-emerald-500", text: "text-emerald-600" };
      default:
        return { label: "", color: "bg-slate-200", text: "text-slate-500" };
    }
  };

  const strength = getLabelAndColor();

  return (
    <div className="mt-3 space-y-2 font-sans">
      {/* Progress bar segments */}
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${step <= score ? strength.color : "bg-slate-200"
              }`}
          />
        ))}
      </div>

      {/* Strength label */}
      <div className="flex justify-between items-center text-xs font-semibold">
        <span className="text-slate-500">Password Strength:</span>
        <span className={strength.text}>{strength.label}</span>
      </div>

      {/* Plain language checklist */}
      <div className="grid grid-cols-2 gap-1.5 pt-1">
        {requirements.map((req, index) => (
          <div key={index} className="flex items-center gap-1.5 text-xs">
            {req.met ? (
              <Check className="text-emerald-500 shrink-0" size={14} />
            ) : (
              <X className="text-slate-300 shrink-0" size={14} />
            )}
            <span className={req.met ? "text-slate-700 font-medium" : "text-slate-400"}>
              {req.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
