import { ScrollView, View, type ViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../constants/colors";
export default function Screen({ children, style, ...props }: ViewProps & { scroll?: boolean }) { return <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}><ScrollView contentContainerStyle={[{ flexGrow: 1, backgroundColor: Colors.background }, style]} showsVerticalScrollIndicator={false}><View {...props}>{children}</View></ScrollView></SafeAreaView>; }
