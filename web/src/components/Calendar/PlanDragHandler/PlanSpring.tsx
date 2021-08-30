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
  const d = React.useRef<{dx: number, dy: number}>({dx: 0, dy: 0});

  // update spring every time aimBox is changed
  // layout effect for fast update and bc no component is actually rendered here
  React.useLayoutEffect(() => {
    // get the current spring position
    const x = spring.left.get(), y = spring.top.get(); 

    // the current modifier position, i.e. what style.left/right would be atm
    const cx = x + d.current.dx, cy = y + d.current.dy;

    // calculate the difference in distance we aim to move 
    const dx = aimBox.left - (prvBox.left + cx), dy = aimBox.top - (prvBox.top + cy); 
    
    // move spring with cur position + position diff
    api.start({ left: x + dx, top: y + dy });

    // store the new modifier positions 
    d.current = { dx: -(x + dx), dy: -(y + dy) }; 

    // call the onUpdate callback with new spring info
    onUpdate({
      ...d.current,
      top: spring.top, left: spring.left, // new spring changes
    });
    // eslint-disable-next-line
  }, [aimBox])

  return <></>
}

export default PlanSpring;