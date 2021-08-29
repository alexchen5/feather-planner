import React from "react";
import { useSpring } from "react-spring";
import { PlanSpringProps } from "types/components/Calendar/PlanDragHandler/PlanSpring";

/**
 * Stores the spring for each plan
 * 
 * We assume that onUpdate will never get changed without a change in prvBox or aimBox
 */
function PlanSpring({props: { prvBox, aimBox, onUpdate }}: {props: PlanSpringProps}) {
  // init spring position as zero 
  const [spring, api] = useSpring(() => ({ left: 0, top: 0 }), []);

  // update spring every time prvBox or aimBox is changed
  // layout effect for fast update and bc no component is actually rendered here
  React.useLayoutEffect(() => {
    // calculate the difference in distance we aim to move 
    const dx = aimBox.left - prvBox.left, dy = aimBox.top - prvBox.top; 
    // get the current spring position
    const x = spring.left.get(), y = spring.top.get(); 
    
    // move spring with cur position + position diff
    api.start({ left: x + dx, top: y + dy });
    // update callback function
    onUpdate({
      dx: -(x + dx), dy: -(y + dy), // new modifiers to finish on zero
      top: spring.top, left: spring.left, // new spring changes
    });
    // eslint-disable-next-line
  }, [aimBox, prvBox])

  return <></>
}

export default PlanSpring;