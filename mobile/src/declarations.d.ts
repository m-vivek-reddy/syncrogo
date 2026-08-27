declare module 'react-native-worklets' {
  export function scheduleOnRN(fn: Function, ...args: any[]): void;
}

declare module 'react-native-maps' {
  import * as React from 'react';

  export interface Region {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  }

  export interface MapPressEvent {
    nativeEvent: {
      coordinate: {
        latitude: number;
        longitude: number;
      };
    };
  }

  export interface Camera {
    center?: { latitude: number; longitude: number };
    pitch?: number;
    heading?: number;
    zoom?: number;
    altitude?: number;
  }

  export class MapView extends React.Component<any> {
    animateToRegion(region: Region, duration?: number): void;
    animateCamera(camera: Partial<Camera>, opts?: { duration?: number }): void;
    fitToCoordinates(coordinates: { latitude: number; longitude: number }[], options?: any): void;
  }

  export class Marker extends React.Component<any> { }
  export class Polyline extends React.Component<any> { }
  export class Circle extends React.Component<any> { }

  export const PROVIDER_GOOGLE: string;
  export const PROVIDER_DEFAULT: string;

  export default MapView;
}
