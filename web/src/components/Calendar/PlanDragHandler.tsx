import { DocumentListenerContext } from "components/DocumentEventListener";
import React from "react";
import { getAllPlanIds } from "utils/dateUtil";
import { getTargetDragPosition } from "utils/dragUtil";
import { CalendarContext } from ".";
import PlanSpring, { OnUpdate, SpringProps } from "./PlanSpring";

interface Context {
  draggingPlans: DraggingPlan[], 
  addDraggingPlan: (plan: DraggingPlan, placeholder: HTMLElement) => void,
  registerWrapper: (planId: string, el: HTMLDivElement, onUpdate: OnUpdate) => void,
}
export const DraggingPlansContext = React.createContext({} as Context);

/**
 * Holds the initial data of a plan before it goes drag
 */
export interface DraggingPlan {
  planId: string,
  dateStr: string,
  prv: string,
  clientX: number,
  clientY: number,
}

function PlanDragHandler({children} : {children: React.ReactNode}) {
  const [ draggingPlans, setDraggingPlans ] = React.useState([] as DraggingPlan[]);
  const { dispatch: dispatchListeners } = React.useContext(DocumentListenerContext);
  const { calendar, dispatch: dispatchCalendar } = React.useContext(CalendarContext);

  const [springs, setSprings] = React.useState(() => {
    const ret: Array<{ planId: string, props: SpringProps }> = [];
    return ret;
  });

  React.useEffect(() => {
    const curPlans = getAllPlanIds(calendar.dates);
    setSprings(springs => springs.filter(s => curPlans.includes(s.planId)));
  }, [calendar.dates]);

  /**
   * Register a PlanDragWrapper for update callbacks on springs
   * Does nothing if planId is not in springs array
   */
  const registerWrapper = React.useCallback((planId: string, el: HTMLDivElement, onUpdate: OnUpdate) => {
    const box = el.getBoundingClientRect();

    setSprings(springs => {
      const ret = springs.filter(s => s.planId !== planId)
      const s = springs.find(s => s.planId === planId);
      
      return [
        ...ret,
        {
          planId,
          props: {
            prvBox: s ? s.props.aimBox : box,
            aimBox: box,
            onUpdate,
          }
        },
      ]
    })
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
      {springs.map(spring => <PlanSpring key={spring.planId} props={spring.props}/>)}
      {children}
    </DraggingPlansContext.Provider>
  )
}

export default PlanDragHandler;