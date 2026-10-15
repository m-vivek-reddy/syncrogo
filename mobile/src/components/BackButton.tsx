import React from "react";
import { Pressable, StyleSheet, ViewStyle } from "react-native";
import { router, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getPreviousRoute } from "../store/navigationHistory";

type BackButtonProps = {
  /** Optional custom fallback route when history is empty */
  fallbackRoute?: string;
  /** Optional custom press handler */
  onPress?: () => void;
  /** Optional custom style overrides */
  style?: ViewStyle;
  /** Color of the icon (defaults to #0F172A) */
  iconColor?: string;
};

/**
 * Standardized Back Button used across all screens.
 * First returns to the actual previous step/screen in the recorded history.
 * If history is empty, attempts router.back(), and finally falls back to fallbackRoute.
 */
export default function BackButton({
  fallbackRoute,
  onPress,
  style,
  iconColor = "#0F172A",
}: BackButtonProps) {
  const currentPath = usePathname();

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }

    // 1. First check our recorded step-by-step history
    const prev = getPreviousRoute(currentPath);
    if (prev && prev !== currentPath) {
      router.replace(prev as any);
      return;
    }

    // 2. Try router.canGoBack() if native stack has history
    if (router.canGoBack()) {
      router.back();
      return;
    }

    // 3. Fallback to specified route if provided, otherwise home
    if (fallbackRoute) {
      router.replace(fallbackRoute as any);
    } else {
      router.replace("/(user)/home" as any);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed, style]}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons name="chevron-back" size={22} color={iconColor} style={styles.icon} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  pressed: {
    backgroundColor: "#F1F5F9",
    transform: [{ scale: 0.96 }],
  },
  icon: {
    marginLeft: -1, // optical center for chevron-back
  },
});
