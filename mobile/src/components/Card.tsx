import { View, type ViewProps } from "react-native";
import { Colors } from "../constants/colors";

export default function Card({ children, style, ...props }: ViewProps) {
  return <View {...props} style={[{ backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 20, padding: 18, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2 }, style]}>{children}</View>;
}
