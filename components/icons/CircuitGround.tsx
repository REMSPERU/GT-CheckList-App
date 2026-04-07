import React, { memo } from 'react';
import Svg, { Path } from 'react-native-svg';
import type { IconProps } from './types';

function CircuitGround({
  size = 24,
  color = 'currentColor',
  title = 'circuit-ground',
  ...props
}: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      accessibilityRole="image"
      accessibilityLabel={title}
      {...props}>
      <Path
        d="M12 13V5m-8 8h16M7 16h10m-7 3h4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default memo(CircuitGround);
