import { DocumentListenerContext } from "components/DocumentEventListener/context";
import React from "react";
import { DraggingPlan } from "types/components/Calendar/PlanDragHandler";
import { PlanSpringProps, SpringChanges } from "types/components/Calendar/PlanDragHandler/PlanSpring";
import { getAllPlanIds } from "utils/dateUtil";
import { getTargetDragPosition } from "utils/dragUtil";
import { CalendarContext } from "../context";
import { DraggingPlansContext } from "./context";
import PlanSpring from "./PlanSpring";

function PlanDragHandler({children} : {children: React.ReactNode}) {
  const [ draggingPlans, setDraggingPlans ] = React.useState([] as DraggingPlan[]);
  const { dispatch: dispatchListeners } = React.useContext(DocumentListenerContext);
  const { calendar, dispatch: dispatchCalendar } = React.useContext(CalendarContext);
    
  const [springs, setSprings] = React.useState(() => ({} as { [planId: string]: PlanSpringProps }));

  // if no dragging, clean up springs for plans which are no longer on the page
  React.useEffect(() => {
    if (draggingPlans.length === 0) {
      // get plan ids which are actually on page
      const curPlans = getAllPlanIds(calendar.dates); 

      // new springs object with keys not on page removed
      setSprings(springs => curPlans.reduce((acc, curId) => 
        (springs[curId] ? { ...acc, [curId]: springs[curId] } : acc
      ), {} ));
    }
  }, [draggingPlans, calendar.dates]);

  /**
   * Register a PlanDragWrapper for update callbacks on springs
   */
  const registerWrapper = React.useCallback((planId: string, el: HTMLDivElement, onUpdate: (spring: SpringChanges) => void) => {
    const box = el.getBoundingClientRect();

    // add new key into springs obj to store the plan's spring
    setSprings(springs => ({
      ...springs,
      [planId]: {
        prvBox: springs[planId] ? springs[planId].aimBox : box,
        aimBox: box,
        onUpdate,
      },
    }));
  }, []);

  const getDragCallback = React.useCallback((plan: DraggingPlan, placeholder: HTMLElement) => {
    const ret = (e: MouseEvent) => {
      e.preventDefault();
      if (!placeholder) {
        console.error('Expected placeholder during drag');
        return;
      }

      const x = (parseInt(placeholder.style.width)) / 2;
      const y = (parseInt(placeholder.style.height)) / 2;
      
      placeholder.style.top =  e.clientY - y + "px";
      placeholder.style.left = e.clientX - x + "px";

      let [newDateStr, newPrv] = getTargetDragPosition(plan.planId, e.clientX, e.clientY);
      if (!newDateStr) {
        newDateStr = plan.dateStr;
        newPrv = plan.prv;
      }
      dispatchCalendar({ type: 'move-plan', planId: plan.planId, dateStr: newDateStr, prv: newPrv });
    };
    return ret;
  }, [dispatchCalendar]);

  const getCloseCallback = React.useCallback((plan: DraggingPlan) => {
    const ret = (e: MouseEvent) => {
      e.preventDefault();
      dispatchListeners({ type: 'deregister-focus', focusId: `plan-dragging-${plan.planId}`, removeListeners: true });

      // remove plan from dragging plans 
      setDraggingPlans(draggingPlans => draggingPlans.filter(p => p.planId !== plan.planId));
    };
    return ret;
  }, [dispatchListeners]);

  const addDraggingPlan = React.useCallback((plan: DraggingPlan, placeholder: HTMLElement) => {
    setDraggingPlans(draggingPlans => [...draggingPlans, plan]);

    const dragCallback = getDragCallback(plan, placeholder) as (e: DocumentEventMap[keyof DocumentEventMap]) => void;
    const closeCallback = getCloseCallback(plan) as (e: DocumentEventMap[keyof DocumentEventMap]) => void;

    // add drag handle listeners 
    dispatchListeners({ 
      type: 'register-focus', 
      focusId: `plan-dragging-${plan.planId}`,
      listeners: [
        { 
          focusId: `plan-dragging-${plan.planId}`, 
          type: 'mousemove', 
          callback: dragCallback, 
        },
        {
          focusId: `plan-dragging-${plan.planId}`, 
          type: 'mouseup', 
          callback: closeCallback,
        }
      ],
    });
  }, [dispatchListeners, getDragCallback, getCloseCallback]);

  return (
    <DraggingPlansContext.Provider value={{draggingPlans, addDraggingPlan, registerWrapper}}>
      {Object.entries(springs).map(([planId, props]) => <PlanSpring key={planId} props={props}/>)}
      {children}
    </DraggingPlansContext.Provider>
  )
}

export default PlanDragHandler;