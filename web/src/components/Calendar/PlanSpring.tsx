import React from "react";
import { SpringValue, useSpring } from "react-spring";

export interface SpringProps {
  prvBox: DOMRect,
  aimBox: DOMRect,
  onUpdate: OnUpdate,
}

export type OnUpdate = (spring: SpringChanges) => void;

export type SpringChanges = {
  dx: number, 
  dy: number, 
  top: SpringValue<number>;
  left: SpringValue<number>;
}

function PlanSpring({props: { prvBox, aimBox, onUpdate }}: {props: SpringProps}) {
  const springUpdate = React.useRef<SpringChanges | null>(null);
  const [spring, api] = useSpring(() => {
    return { // init position as zero 
      left: 0, 
      top: 0,
    }
  }, []);

  React.useEffect(() => {
    const dx = aimBox.left - prvBox.left; // difference we aim to move 
    const dy = aimBox.top - prvBox.top;
    const x = spring.left.get(); // the current spring position
    const y = spring.top.get();

    api.start({ // move spring with new difference
      left: x + dx, 
      top: y + dy,
    })

    springUpdate.current = { // store changes 
      dx: -(x + dx), // modifier to finish on zero
      dy: -(y + dy), 
      top: spring.top,
      left: spring.left,
    }

    onUpdate({...springUpdate.current});
    // only needs to update when prvBox and aimBox are changed
    // eslint-disable-next-line
  }, [aimBox, prvBox])

  // run update if the update function gets changed
  React.useEffect(() => {
    springUpdate.current && onUpdate({...springUpdate.current});
  }, [ onUpdate ]);

  return <></>
}

export default PlanSpring;