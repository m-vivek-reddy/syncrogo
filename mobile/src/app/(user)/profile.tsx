import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useCallback, useEffect, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import api, { API_BASE_URL } from "../../api/client";
import { Colors } from "../../constants/colors";
import { useAuthStore } from "../../store/auth";

const resolvePhotoUrl = (url?: string) => {
  if (!url) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:") || url.startsWith("file:")) {
    /* Backend builds absolute URLs from request.base_url, which is plain
     * http:// behind the Render proxy. Android blocks cleartext traffic,
     * so upgrade to https:// to keep the photo visible. */
    if (url.startsWith("http://")) return url.replace("http://", "https://");
    return url;
  }
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
};

export default function Profile() {
  const { user, mode, setMode, logout, setUser } = useAuthStore();
  const [profile, setProfile] = useState(user);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [documents, setDocuments] = useState<
    Array<{ document_type: string; status: string }>
  >([]);
  const isDriver = mode === "driver";

  const loadProfile = useCallback(async () => {
    try {
      const { data } = await api.get("/api/v1/users/me");
      if (data) {
        setProfile(data);
        await setUser(data);
      }
    } catch {
      // Keep cached state if offline or failed
    }
  }, [setUser]);

  /*
   * Fetch uploaded documents so the profile can show the correct
   * driver verification state (email + approved documents).
   */
  const loadDocuments = useCallback(async () => {
    try {
      const { data } = await api.get("/api/v1/documents/");
      if (data && Array.isArray(data.documents)) {
        setDocuments(data.documents);
      }
    } catch {
      // Keep cached documents if offline or failed
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
      void loadDocuments();
    }, [loadProfile, loadDocuments])
  );

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out from SyncroGo?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const handleToggleMode = async (value: boolean) => {
    const nextMode = value ? "driver" : "passenger";
    await setMode(nextMode);
  };

  const handleEditPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Photo permission needed", "Allow photo access to update your profile picture.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;

    const photo = result.assets[0];
    const form = new FormData();
    form.append("file", {
      uri: photo.uri,
      name: photo.fileName || "profile.jpg",
      type: photo.mimeType || "image/jpeg",
    } as any);

    setUploadingPhoto(true);
    try {
      const { data } = await api.post("/api/v1/users/me/profile-photo", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setProfile(data);
      await setUser(data);
    } catch (error: any) {
      Alert.alert("Photo upload failed", error.response?.data?.detail || "Please try another image.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const displayName = profile?.name || profile?.full_name || "SyncroGo User";
  const displayEmail = profile?.email || "";
  const rating = profile?.rating;
  const tripsCount = profile?.completed_trips ?? (profile as any)?.total_rides ?? 0;
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).getFullYear().toString()
    : new Date().getFullYear().toString();
  // Required document types for a driver to be considered fully verified.
  // Identity + vehicle docs all need to be approved (not pending/rejected).
  const REQUIRED_DRIVER_DOCUMENTS = ["aadhaar", "pan", "license", "rc_book", "vehicle_insurance", "pollution_certificate"];
  const documentsByType = documents.reduce<Record<string, string>>((acc, doc) => {
    acc[doc.document_type] = doc.status;
    return acc;
  }, {});
  const driverDocsApproved = REQUIRED_DRIVER_DOCUMENTS.every(
    (type) => documentsByType[type] === "approved" || documentsByType[type] === "verified"
  );
  const driverDocsRejected = REQUIRED_DRIVER_DOCUMENTS.some(
    (type) => documentsByType[type] === "rejected"
  );
  // Email must be verified AND, for drivers, all required documents approved.
  const emailVerified = profile?.is_verified ?? false;
  const isVerified = isDriver ? emailVerified && driverDocsApproved : emailVerified;
  const verificationStatus: "verified" | "pending" | "rejected" = isDriver
    ? !emailVerified
      ? "pending"
      : driverDocsRejected
        ? "rejected"
        : driverDocsApproved
          ? "verified"
          : "pending"
    : emailVerified
      ? "verified"
      : "pending";

  const mainMenu = [
    {
      title: "Account Details",
      subtitle: "Name, Email, Phone Number",
      icon: "👤",
      href: "/(user)/account",
    },
    {
      title: "Identity & Documents",
      subtitle: "Aadhaar, PAN, Driving License",
      icon: "📄",
      href: "/(user)/documents",
    },
    ...(isDriver
      ? [
          {
            title: "My Vehicles",
            subtitle: "Cars, Bikes, RC, Insurance",
            icon: "🚗",
            href: "/(user)/vehicles",
          },
        ]
      : []),
    {
      title: "Payment Methods",
      subtitle: "UPI, Cards, Wallet",
      icon: "💳",
      href: "/(user)/payments",
    },
    {
      title: "Ride Preferences",
      subtitle: "Seat, Music, AC",
      icon: "⚡",
      href: "/(user)/preferences",
    },
  ];

  const supportMenu = [
    {
      title: "Emergency Contacts",
      subtitle: "Trusted Contacts & SOS",
      icon: "🛡️",
      href: "/(user)/emergency",
    },
    {
      title: "Notifications",
      subtitle: "Alerts and trip updates",
      icon: "🔔",
      href: "/(user)/notifications",
    },
    {
      title: "Settings",
      subtitle: "App preferences and privacy",
      icon: "⚙️",
      href: "/(user)/settings",
    },
    {
      title: "Help & Support",
      subtitle: "FAQs and contact support",
      icon: "❓",
      href: "/(user)/support",
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Cover Banner */}
      <View style={styles.coverBanner}>
        <View style={styles.coverGlow} />
      </View>

      {/* Profile Header Info */}
      <View style={styles.headerCard}>
        {/* Avatar */}
        <Pressable
          onPress={handleEditPhoto}
          disabled={uploadingPhoto}
          style={styles.avatarContainer}
          accessibilityLabel="Edit profile photo"
        >
          {profile?.profile_photo_url ? (
            <Image
              source={{ uri: resolvePhotoUrl(profile.profile_photo_url) }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitial}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          {isVerified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedCheck}>✓</Text>
            </View>
          )}
          <View style={styles.editPhotoBadge}>
            {uploadingPhoto ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Ionicons name="camera-outline" size={16} color={Colors.white} />
            )}
          </View>
        </Pressable>

        <Text style={styles.userName}>{displayName}</Text>
        <Text style={styles.userEmail}>{displayEmail}</Text>

        {/* Badges */}
        <View style={styles.badgesRow}>
          <View style={styles.ratingPill}>
            <Text style={styles.starIcon}>★</Text>
            <Text style={styles.ratingText}>
              {rating !== undefined && rating !== null ? rating.toFixed(1) : "No rating"}
            </Text>
          </View>

          <View
            style={[
              styles.rolePill,
              isDriver ? styles.driverRolePill : styles.passengerRolePill,
            ]}
          >
            <Text
              style={[
                styles.roleText,
                isDriver ? styles.driverRoleText : styles.passengerRoleText,
              ]}
            >
              {isDriver ? "Driver" : "Passenger"}
            </Text>
          </View>

          {isVerified && (
            <View style={styles.shieldPill}>
              <Text style={styles.shieldText}>🛡️ Verified</Text>
            </View>
          )}
        </View>

        {/* Location & Member Since */}
        <View style={styles.memberRow}>
          <Text style={styles.memberText}>
            📍 Hyderabad  •  Member since {memberSince}
          </Text>
        </View>

        {/* Stats 3 Columns */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: Colors.primary }]}>
              {tripsCount}
            </Text>
            <Text style={styles.statLabel}>Trips</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: Colors.green }]}>
              {rating !== undefined && rating !== null ? rating.toFixed(1) : "N/A"}
            </Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statBox}>
            <Text
              style={[
                styles.statValue,
                {
                  color:
                    verificationStatus === "verified"
                      ? Colors.green
                      : verificationStatus === "rejected"
                        ? "#DC2626"
                        : "#B45309",
                },
              ]}
            >
              {verificationStatus === "verified"
                ? "Verified"
                : verificationStatus === "rejected"
                  ? "Rejected"
                  : "Pending"}
            </Text>
            <Text style={styles.statLabel}>Status</Text>
          </View>
        </View>
      </View>

      {/* Driver Mode Toggle Card */}
      <View style={styles.modeCard}>
        <View style={styles.modeInfo}>
          <Text style={styles.modeTitle}>
            {isDriver ? "Driver Mode Active" : "Passenger Mode Active"}
          </Text>
          <Text style={styles.modeSubtitle}>
            {isDriver
              ? "Share your ride and earn on daily commutes"
              : "Switch to Driver Mode to offer seats"}
          </Text>
        </View>
        <Switch
          value={isDriver}
          onValueChange={handleToggleMode}
          trackColor={{ false: "#CBD5E1", true: Colors.green }}
          thumbColor={Colors.white}
        />
      </View>

      {/* Main Menu Section */}
      <View style={styles.menuSection}>
        {mainMenu.map((item, index) => (
          <Pressable
            key={item.title}
            onPress={() => router.push(item.href as any)}
            style={({ pressed }) => [
              styles.menuItem,
              index < mainMenu.length - 1 && styles.menuItemBorder,
              pressed && styles.menuItemPressed,
            ]}
          >
            <View style={styles.menuIconContainer}>
              <Text style={styles.menuIcon}>{item.icon}</Text>
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              {item.subtitle && (
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              )}
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </View>

      {/* Safety & Support Menu Section */}
      <View style={styles.menuSection}>
        {supportMenu.map((item, index) => (
          <Pressable
            key={item.title}
            onPress={() => router.push(item.href as any)}
            style={({ pressed }) => [
              styles.menuItem,
              index < supportMenu.length - 1 && styles.menuItemBorder,
              pressed && styles.menuItemPressed,
            ]}
          >
            <View style={styles.menuIconContainer}>
              <Text style={styles.menuIcon}>{item.icon}</Text>
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              {item.subtitle && (
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              )}
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </View>

      {/* Sign Out Button */}
      <Pressable
        onPress={handleLogout}
        style={({ pressed }) => [
          styles.logoutButton,
          pressed && styles.logoutButtonPressed,
        ]}
      >
        <Text style={styles.logoutText}>🚪 Sign Out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    paddingBottom: 40,
  },
  coverBanner: {
    height: 120,
    backgroundColor: "#2563EB",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
  },
  coverGlow: {
    position: "absolute",
    right: -30,
    top: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  headerCard: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginTop: -50,
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 10,
  },
  avatarImage: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 4,
    borderColor: Colors.white,
  },
  avatarFallback: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#EFF6FF",
    borderWidth: 4,
    borderColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: "900",
    color: Colors.primary,
  },
  verifiedBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.green,
    borderWidth: 2,
    borderColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
  },
  verifiedCheck: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: "900",
  },
  editPhotoBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    borderWidth: 2.5,
    borderColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  userName: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.text,
    marginTop: 2,
  },
  userEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  badgesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  starIcon: {
    color: "#F59E0B",
    fontSize: 13,
  },
  ratingText: {
    color: "#B45309",
    fontWeight: "800",
    fontSize: 12,
  },
  rolePill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  passengerRolePill: {
    backgroundColor: "#DBEAFE",
  },
  driverRolePill: {
    backgroundColor: "#DCFCE7",
  },
  roleText: {
    fontWeight: "800",
    fontSize: 12,
  },
  passengerRoleText: {
    color: "#1D4ED8",
  },
  driverRoleText: {
    color: "#15803D",
  },
  shieldPill: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  shieldText: {
    color: "#15803D",
    fontWeight: "800",
    fontSize: 12,
  },
  memberRow: {
    marginTop: 10,
  },
  memberText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "900",
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "700",
    marginTop: 2,
  },
  modeCard: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  modeInfo: {
    flex: 1,
    paddingRight: 12,
  },
  modeTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.text,
  },
  modeSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  menuSection: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    overflow: "hidden",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  menuItemPressed: {
    backgroundColor: "#F8FAFC",
  },
  menuIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  menuIcon: {
    fontSize: 18,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
  },
  menuSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  chevron: {
    fontSize: 20,
    color: "#94A3B8",
    fontWeight: "700",
  },
  logoutButton: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: "#FEE2E2",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  logoutButtonPressed: {
    backgroundColor: "#FCA5A5",
  },
  logoutText: {
    color: "#DC2626",
    fontSize: 15,
    fontWeight: "800",
  },
});
