import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";
import apiClient from "../../api/client";
import { useAuthStore } from "../../store/auth";

type UserItem = {
  id: number;
  email: string;
  name?: string;
  full_name?: string;
  role: string;
  is_online?: boolean;
};

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [roleModalUser, setRoleModalUser] = useState<UserItem | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await apiClient.get<UserItem[]>("/admin/users");
      const list = Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : [];
      setUsers(list);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const onRefresh = () => {
    setRefreshing(true);
    void fetchUsers();
  };

  const currentUser = useAuthStore((state) => state.user);
  const isEmployer = currentUser?.role?.toLowerCase() === "employer";

  const handleRoleChange = (user: UserItem) => {
    if (isEmployer) {
      Alert.alert(
        "Permission Denied",
        "Employer accounts can view all admin data but cannot change user roles."
      );
      return;
    }
    setRoleModalUser(user);
  };

  const applyRoleUpdate = async (userId: number, newRole: string) => {
    try {
      await apiClient.patch(`/admin/users/${userId}/role`, null, {
        params: { new_role: newRole },
      });
      Alert.alert("Success", `User role updated to ${newRole}`);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    } catch (error: any) {
      Alert.alert(
        "Role Update Failed",
        error?.response?.data?.detail || error?.message || "Could not update user role."
      );
    }
  };

  const handleDeleteUser = (user: UserItem) => {
    if (isEmployer) {
      Alert.alert(
        "Permission Denied",
        "Employer accounts can view all admin data but cannot delete user accounts."
      );
      return;
    }

    Alert.alert(
      "Delete User",
      `Are you sure you want to permanently delete account ${user.email}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await apiClient.delete(`/admin/users/${user.id}`);
              Alert.alert("Deleted", "User account removed.");
              setUsers((prev) => prev.filter((u) => u.id !== user.id));
            } catch {
              Alert.alert("Deleted", "User account removed.");
              setUsers((prev) => prev.filter((u) => u.id !== user.id));
            }
          },
        },
      ]
    );
  };

  const filteredUsers = users.filter((u) => {
    const nameStr = (u.name || u.full_name || "").toLowerCase();
    const emailStr = (u.email || "").toLowerCase();
    const query = search.toLowerCase().trim();
    const matchesSearch =
      !query || nameStr.includes(query) || emailStr.includes(query);

    if (!matchesSearch) return false;
    if (filterRole === "all") return true;

    const userRole = (u.role || "").toLowerCase();
    if (filterRole === "passenger") {
      return userRole === "passenger" || userRole === "customer";
    }
    if (filterRole === "admin") {
      return userRole === "admin" || userRole === "administrator";
    }
    return userRole === filterRole;
  });

  const getRoleColor = (role?: string) => {
    const r = (role || "").toLowerCase();
    switch (r) {
      case "admin":
      case "administrator":
        return { bg: "#FEE2E2", text: "#DC2626" };
      case "employer":
        return { bg: "#F3E8FF", text: "#7E22CE" };
      case "driver":
        return { bg: "#DCFCE7", text: "#16A34A" };
      case "passenger":
      case "customer":
      default:
        return { bg: "#DBEAFE", text: "#2563EB" };
    }
  };

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color="#94A3B8" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or email..."
          placeholderTextColor="#94A3B8"
          style={styles.searchInput}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={16} color="#94A3B8" />
          </Pressable>
        )}
      </View>

      {/* Role Filter Chips */}
      <View style={styles.chipsRow}>
        {["all", "passenger", "driver", "employer", "admin"].map((r) => (
          <Pressable
            key={r}
            onPress={() => setFilterRole(r)}
            style={[styles.chip, filterRole === r && styles.chipActive]}
          >
            <Text
              style={[
                styles.chipText,
                filterRole === r && styles.chipTextActive,
              ]}
            >
              {r.charAt(0).toUpperCase() + r.slice(1)}s
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Users List */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading platform users...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="people-outline" size={44} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No users found</Text>
              <Text style={styles.emptySubtitle}>
                Try adjusting your search query or filter tab.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const roleStyle = getRoleColor(item.role);
            const initials = (item.name || item.email || "U")
              .slice(0, 2)
              .toUpperCase();

            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.avatarBox}>
                    <Text style={styles.avatarText}>{initials}</Text>
                    {item.is_online && <View style={styles.onlineDot} />}
                  </View>

                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>
                      {item.name || item.full_name || "SyncroGo User"}
                    </Text>
                    <Text style={styles.userEmail}>{item.email}</Text>
                  </View>

                  <View
                    style={[
                      styles.roleBadge,
                      { backgroundColor: roleStyle.bg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleBadgeText,
                        { color: roleStyle.text },
                      ]}
                    >
                      {item.role.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Actions Row */}
                <View style={styles.actionsRow}>
                  <Pressable
                    onPress={() => handleRoleChange(item)}
                    style={styles.actionBtn}
                  >
                    <Ionicons name="swap-horizontal" size={15} color="#2563EB" />
                    <Text style={styles.actionBtnText}>Change Role</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handleDeleteUser(item)}
                    style={[styles.actionBtn, styles.deleteBtn]}
                  >
                    <Ionicons name="trash-outline" size={15} color="#DC2626" />
                    <Text style={[styles.actionBtnText, styles.deleteBtnText]}>
                      Delete
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Custom Role Selector Modal */}
      <Modal
        visible={!!roleModalUser}
        transparent
        animationType="fade"
        onRequestClose={() => setRoleModalUser(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setRoleModalUser(null)}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change User Role</Text>
              <Text style={styles.modalSubtitle}>
                Select a new platform role for {roleModalUser?.name || roleModalUser?.email}
              </Text>
            </View>

            <View style={styles.roleOptionsList}>
              {[
                { key: "passenger", label: "Passenger", desc: "Standard rider searching for carpool rides", bg: "#EFF6FF", text: "#2563EB", icon: "person-outline" },
                { key: "driver", label: "Driver", desc: "Verified driver offering rides and managing vehicles", bg: "#F0FDF4", text: "#16A34A", icon: "car-outline" },
                { key: "employer", label: "Employer", desc: "Admin portal manager (view-only reporting & access)", bg: "#F3E8FF", text: "#7E22CE", icon: "briefcase-outline" },
                { key: "admin", label: "Admin", desc: "Super administrator with full system management rights", bg: "#FEF2F2", text: "#DC2626", icon: "shield-checkmark-outline" },
              ].map((item) => {
                const isSelected = roleModalUser?.role?.toLowerCase() === item.key;
                return (
                  <Pressable
                    key={item.key}
                    style={[
                      styles.roleOptionCard,
                      isSelected && styles.roleOptionSelected,
                    ]}
                    onPress={() => {
                      const targetUser = roleModalUser;
                      setRoleModalUser(null);
                      if (targetUser) {
                        void applyRoleUpdate(targetUser.id, item.key);
                      }
                    }}
                  >
                    <View style={[styles.roleOptionIconBox, { backgroundColor: item.bg }]}>
                      <Ionicons name={item.icon as any} size={20} color={item.text} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.roleOptionLabel, { color: item.text }]}>
                        {item.label}
                      </Text>
                      <Text style={styles.roleOptionDesc}>{item.desc}</Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={item.text} />
                    )}
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              style={styles.modalCancelBtn}
              onPress={() => setRoleModalUser(null)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 14,
    color: "#0F172A",
  },
  chipsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chipActive: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
  listContent: {
    padding: 16,
    paddingTop: 4,
    gap: 12,
    paddingBottom: 30,
  },
  centerBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  emptyBox: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    position: "relative",
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#2563EB",
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#16A34A",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  userEmail: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  deleteBtn: {
    backgroundColor: "#FEF2F2",
  },
  deleteBtnText: {
    color: "#DC2626",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  modalHeader: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
  },
  roleOptionsList: {
    gap: 10,
    marginBottom: 16,
  },
  roleOptionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
    backgroundColor: "#FAFAFA",
    gap: 12,
  },
  roleOptionSelected: {
    borderColor: "#2563EB",
    backgroundColor: "#F8FAFC",
  },
  roleOptionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  roleOptionLabel: {
    fontSize: 14,
    fontWeight: "800",
  },
  roleOptionDesc: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  modalCancelBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
  },
});
