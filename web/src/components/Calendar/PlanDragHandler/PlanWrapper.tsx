import React from "react";
import { animated } from "react-spring";
import { SpringChanges } from "types/components/Calendar/PlanDragHandler/PlanSpring";
import { DraggingPlansContext } from "./context";

/**
 * Wrapper for the Plan component, giving animated drag 
 * 
 * moveTrigger is used to update the spring
 */
function PlanWrapper({ planId, moveTrigger, children }: { planId: string, moveTrigger: string, children: React.ReactNode }) {
  const staticRoot = React.useRef<HTMLDivElement | null>(null);
  const [spring, setSpring] = React.useState<SpringChanges | null>(null);
  const { declarePlanSpawn } = React.useContext(DraggingPlansContext);

  // custom ref function to declare the spawned plan immediately to drag handler
  const receiveStaticEl = React.useCallback((el: HTMLDivElement | null) => {
    staticRoot.current = el;
    if (el) {
      declarePlanSpawn(planId, el, (spring) => {
        if (!staticRoot.current) return; // callback does nothing if component has unmounted
        setSpring(spring) // receive spring updates
      });
    }
    // ref callback changes when trigger changes
    // note we expect declarePlanSpawn to be memoized
    // eslint-disable-next-line
  }, [planId, moveTrigger, declarePlanSpawn]); 

  return (
    <div ref={receiveStaticEl} fp-role={"calendar-plan-root"} data-id={planId}>
      <animated.div
        style={{ 
          position: 'relative',
          left: spring ? spring.left.to(o => o + spring.dx) : '', 
          top: spring ? spring.top.to(o => o + spring.dy) : '',
        }}
      >
        {children}
      </animated.div>
    </div>
  )
}

export default PlanWrapper;