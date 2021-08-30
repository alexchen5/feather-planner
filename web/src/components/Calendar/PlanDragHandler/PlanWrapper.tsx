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
  const staticRoot = React.useRef<HTMLDivElement>(null);
  const [spring, setSpring] = React.useState(null as SpringChanges | null);
  const { registerWrapper } = React.useContext(DraggingPlansContext);

  // run effect when trigger is changed
  React.useLayoutEffect(() => {
    const el = staticRoot.current;
    if (el) {
      registerWrapper(planId, el, (spring) => {
        if (!staticRoot.current) return; // callback does nothing if component has unmounted
        setSpring(spring) // receive spring updates
      });
    }
  }, [planId, moveTrigger, registerWrapper]);

  // React.useEffect(() => {
  //   const container = document.querySelector('[fp-role="dates-container"]');
  //   if (!container) {
  //     console.error('expected dates container');
  //     return;
  //   }
  //   const callback = () => {
  //     const el = staticRoot.current;
  //     if (!el) {
  //       console.error('expected static root ref');
  //       return;
  //     }
  //     updateWrapperPosition(planId, el.getBoundingClientRect().top);
  //   }
  //   container.addEventListener('scroll', callback);
  //   return () => container.removeEventListener('scroll', callback);
  // }, [planId, updateWrapperPosition]);

  return (
    <div ref={staticRoot} fp-role={"calendar-plan-root"}>
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