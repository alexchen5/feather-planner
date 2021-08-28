// a functional component which comes with drag animations built in, given the planId 

import React from "react";
import { animated } from "react-spring";
import { DraggingPlansContext } from "../PlanDragHandler";
import { OnUpdate, SpringChanges } from "../PlanSpring";

function PlanDragWrapper({ planId, remountTrigger, children }: { planId: string, remountTrigger: string, children: React.ReactNode }) {
  const staticRoot = React.useRef<HTMLDivElement>(null);
  const [spring, setSpring] = React.useState(null as SpringChanges | null);
  const { registerWrapper } = React.useContext(DraggingPlansContext);

  const handleSpringUpdate: OnUpdate = (spring): void => {
    if (!staticRoot.current) {
      return;
    }
    setSpring({...spring});
  }

  React.useEffect(() => {
    const el = staticRoot.current;
    el && registerWrapper(planId, el, handleSpringUpdate);

    // run effect when trigger is changed
    // eslint-disable-next-line
  }, [remountTrigger]);

  React.useEffect(() => {
    return () => console.log('unmount');
    
  }, [])

  return (
    <div ref={staticRoot} fp-role={"calendar-plan-root"}>
      <animated.div
        style={
          spring ?
          { 
            position: 'relative',
            left: spring.left.to(o => o + spring.dx), 
            top: spring.top.to(o => o + spring.dy),
          } : 
          {
            position: 'relative',
          }
        }
      >
        {children}
      </animated.div>
    </div>
  )
}

export default PlanDragWrapper;