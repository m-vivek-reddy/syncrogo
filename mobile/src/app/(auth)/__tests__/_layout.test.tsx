import React from "react";
import AuthLayout from "../_layout";
import { Stack } from "expo-router";

// Mock expo-router Stack component
jest.mock("expo-router", () => {
  const MockStack = jest.fn((props: { children?: React.ReactNode; [key: string]: unknown }) => {
    return React.createElement("Stack", props, props.children);
  });
  Object.assign(MockStack, { displayName: "Stack" });
  return {
    Stack: MockStack,
  };
});

describe("AuthLayout ((auth)/_layout)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Positive Test Cases", () => {
    it("should export a valid React component as default", () => {
      expect(AuthLayout).toBeDefined();
      expect(typeof AuthLayout).toBe("function");
    });

    it("should render the Stack component without crashing", () => {
      const element = AuthLayout();
      expect(element).toBeDefined();
      expect(element.type).toBe(Stack);
    });

    it("should configure screenOptions with headerShown set to false", () => {
      const element = AuthLayout();
      expect(element.props).toBeDefined();
      expect(element.props.screenOptions).toBeDefined();
      expect(element.props.screenOptions.headerShown).toBe(false);
    });

    it("should pass screenOptions object containing only the configured options", () => {
      const element = AuthLayout();
      expect(element.props.screenOptions).toEqual({
        headerShown: false,
      });
      expect(Object.keys(element.props.screenOptions)).toEqual(["headerShown"]);
    });

    it("should instantiate correctly as a JSX element", () => {
      const jsxElement = <AuthLayout />;
      expect(React.isValidElement(jsxElement)).toBe(true);
      expect(jsxElement.type).toBe(AuthLayout);
    });
  });

  describe("Negative Test Cases", () => {
    it("should not enable header visibility (headerShown must not be true)", () => {
      const element = AuthLayout();
      expect(element.props.screenOptions.headerShown).not.toBe(true);
      expect(element.props.screenOptions.headerShown).not.toBeUndefined();
      expect(element.props.screenOptions.headerShown).not.toBeNull();
    });

    it("should not contain unintended screen options (e.g. custom titles, header styles)", () => {
      const element = AuthLayout();
      const screenOptions = element.props.screenOptions;
      expect(screenOptions.title).toBeUndefined();
      expect(screenOptions.headerStyle).toBeUndefined();
      expect(screenOptions.headerTintColor).toBeUndefined();
      expect(screenOptions.gestureEnabled).toBeUndefined();
    });

    it("should not render any static nested children inside Stack", () => {
      const element = AuthLayout();
      expect(element.props.children).toBeUndefined();
    });
  });

  describe("Edge & Purity Cases", () => {
    it("should be pure and return identical props across multiple invocations", () => {
      const firstRender = AuthLayout();
      const secondRender = AuthLayout();

      expect(firstRender.type).toBe(secondRender.type);
      expect(firstRender.props).toEqual(secondRender.props);
      expect(firstRender.props.screenOptions.headerShown).toBe(
        secondRender.props.screenOptions.headerShown
      );
    });

    it("should match snapshot structure", () => {
      const element = AuthLayout();
      expect(element).toMatchInlineSnapshot(`
        <Stack
          screenOptions={
            {
              "headerShown": false,
            }
          }
        />
      `);
    });

    it("should maintain boolean type strictly for headerShown", () => {
      const element = AuthLayout();
      expect(typeof element.props.screenOptions.headerShown).toBe("boolean");
    });
  });
});
