import { router } from "expo-router";
import AccountDetails from "../account";
import DocumentsScreen from "../documents";
import VehiclesScreen from "../vehicles";
import PaymentsScreen from "../payments";
import PreferencesScreen from "../preferences";
import EmergencyScreen from "../emergency";
import NotificationsScreen from "../notifications";
import SettingsScreen from "../settings";
import SupportScreen from "../support";

jest.mock("expo-router", () => ({
  router: {
    back: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
    navigate: jest.fn(),
  },
  useFocusEffect: jest.fn((cb: any) => cb()),
}));

jest.mock("../../api/client", () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue({ data: {} }),
    post: jest.fn().mockResolvedValue({ data: {} }),
    patch: jest.fn().mockResolvedValue({ data: {} }),
    put: jest.fn().mockResolvedValue({ data: {} }),
  },
}));

jest.mock("../../store/auth", () => ({
  useAuthStore: () => ({
    user: { name: "Test User", email: "test@syncrogo.com", phone: "+91 9999999999" },
    setUser: jest.fn(),
    mode: "passenger",
    setMode: jest.fn(),
    logout: jest.fn(),
  }),
}));

describe("Profile Sub-pages Navigation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const subPages = [
    { name: "AccountDetails", Component: AccountDetails },
    { name: "DocumentsScreen", Component: DocumentsScreen },
    { name: "VehiclesScreen", Component: VehiclesScreen },
    { name: "PaymentsScreen", Component: PaymentsScreen },
    { name: "PreferencesScreen", Component: PreferencesScreen },
    { name: "EmergencyScreen", Component: EmergencyScreen },
    { name: "NotificationsScreen", Component: NotificationsScreen },
    { name: "SettingsScreen", Component: SettingsScreen },
    { name: "SupportScreen", Component: SupportScreen },
  ];

  subPages.forEach(({ name, Component }) => {
    it(`${name} renders and header back action redirects directly to profile page`, () => {
      const element = Component();
      expect(element).toBeDefined();

      // Find back button pressable in the element tree
      const header = element.props.children[0];
      const backBtn = header.props.children[0];
      expect(backBtn.props.onPress).toBeDefined();

      // Execute back button onPress
      backBtn.props.onPress();

      // Must replace to profile, NOT navigate to home
      expect(router.replace).toHaveBeenCalledWith("/(user)/profile");
      expect(router.back).not.toHaveBeenCalled();
    });
  });
});
