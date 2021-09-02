import React from "react";
import { useSpring } from "react-spring";
import { PlanSpringProps } from "types/components/Calendar/PlanDragHandler/PlanSpring";

/**
 * Stores the spring for each plan
 * 
 * We assume that onUpdate will never get changed without a change in prvBox or aimBox
 */
function PlanSpring({props: { spawnBox, updateBox, onUpdate }}: {props: PlanSpringProps}) {
  // init spring position as zero 
  const [spring, api] = useSpring(() => ({ left: 0, top: 0 }), []);
  const modifier = React.useRef<{dx: number, dy: number}>({dx: 0, dy: 0});
  const prvSpawnBox = React.useRef<{ left: number, top: number } | null>(null);

  // useEffect here as updating prv position doesnt need to be immediate 99% of the time 
  React.useEffect(() => {
    // update the previous box position if the update is valid, and we actually 
    // have stored a previous position
    if (updateBox && prvSpawnBox.current) {
      prvSpawnBox.current = { ...updateBox };
    }
  }, [updateBox]);

  // update spring every time spawnBox is changed
  // layoutEffect to animate as soon as we can
  React.useLayoutEffect(() => {
    // run animation if there is a previous position for the box
    if (prvSpawnBox.current) {
      // get the current spring position
      const x = spring.left.get(), y = spring.top.get(); 

      // the current modifier position, i.e. what style.left/right would be atm
      const cx = x + modifier.current.dx, cy = y + modifier.current.dy;

      // calculate the difference in distance we aim to move 
      const dx = spawnBox.left - (prvSpawnBox.current.left + cx), dy = spawnBox.top - (prvSpawnBox.current.top + cy); 
      
      // move spring with cur position + position diff
      api.start({ left: x + dx, top: y + dy });

      // store the new modifier positions 
      modifier.current = { dx: -(x + dx), dy: -(y + dy) }; 

      // call the onUpdate callback with new spring info
      onUpdate({
        ...modifier.current,
        top: spring.top, left: spring.left, // new spring changes
      });
    }

    // store update
    prvSpawnBox.current = { ...spawnBox };

    // eslint-disable-next-line
  }, [spawnBox])

  return <></>
}

export default PlanSpring;