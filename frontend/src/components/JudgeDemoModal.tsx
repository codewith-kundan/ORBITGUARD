import React from 'react';
import { LiveWebGuide } from './LiveWebGuide';

// Backwards-compatible wrapper redirecting legacy JudgeDemoModal calls to LiveWebGuide
export const JudgeDemoModal: React.FC<any> = (props) => {
  return (
    <LiveWebGuide
      {...props}
      onSelectObject={props.onSelectObject || (() => {})}
      onOpenOrbitAI={props.onOpenOrbitAI || (() => {})}
    />
  );
};
