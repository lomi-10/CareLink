// svg.d.ts
declare module 'react-native-svg';

declare module '*.svg' {
  import React from 'react';
  import { SvgProps } from 'react-native-svg'; // Adds better type support
  const content: React.FC<SvgProps>;
  export default content;
}