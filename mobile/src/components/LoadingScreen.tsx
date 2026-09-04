import React from "react";
import { ActivityIndicator, Dimensions, Image, StyleSheet, View } from "react-native";

const { width } = Dimensions.get("window");

export default function LoadingScreen() {
  return (
    <View style={styles.container}>
      {/* Official SyncroGo Logo Image */}
      <View style={styles.logoWrapper}>
        <Image
          source={require("../../assets/images/syncrogo-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Loading Spinner */}
      <ActivityIndicator
        size="large"
        color="#16A34A"
        style={styles.spinner}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
  },
  logoWrapper: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: Math.min(width * 0.7, 320),
    height: Math.min(width * 0.7, 320),
    maxWidth: "94%",
  },
  spinner: {
    marginTop: 20,
  },
});
