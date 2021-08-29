import { DocumentListenerContext } from "components/DocumentEventListener/context";
import React from "react";
import { DragPlan } from "types/components/Calendar/PlanDragHandler";
import { PlanSpringProps, SpringChanges } from "types/components/Calendar/PlanDragHandler/PlanSpring";
import { getAllPlanIds } from "utils/dateUtil";
import { getLastDragPlans, getNextDragPlans } from "utils/dragUtil";
import { db, UidContext } from "utils/globalContext";
import { CalendarContext } from "../context";
import { DraggingPlansContext } from "./context";
import PlanSpring from "./PlanSpring";

function PlanDragHandler({children} : {children: React.ReactNode}) {
  const [ dragPlans, setDragPlans ] = React.useState<DragPlan[]>([]);
  const dragPicture = React.useRef<HTMLDivElement>(null);
  const [ isDragging, setIsDragging ] = React.useState(false);
  const { dispatch: dispatchListeners } = React.useContext(DocumentListenerContext);
  const { calendar, dispatch: dispatchCalendar } = React.useContext(CalendarContext);
    
  const [springs, setSprings] = React.useState(() => ({} as { [planId: string]: PlanSpringProps }));

  const { uid } = React.useContext(UidContext);

  // if no dragging, clean up springs for plans which are no longer on the page
  React.useEffect(() => {
    if (dragPlans.length === 0) {
      // get plan ids which are actually on page
      const curPlans = getAllPlanIds(calendar.dates); 

      // new springs object with keys not on page removed
      setSprings(springs => curPlans.reduce((acc, curId) => 
        (springs[curId] ? { ...acc, [curId]: springs[curId] } : acc
      ), {} ));
    }
    // eslint-disable-next-line
  }, [calendar.dates]);

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

  const updateDb = (
    planId: string, 
    to_date: string, from_date: string, 
    to_prv_id: string, from_prv_id: string, 
    to_nxt_id: string, from_nxt_id: string
  ) => {
    if (to_date === from_date && to_prv_id === from_prv_id && to_nxt_id === from_nxt_id) {
      // no need to move position
      // resume data sync, with immediate update
      dispatchCalendar({ type: 'resume-data-sync', syncNow: true });
    } else {
      // update db
      const action = () => {
        const moveBatch = db.batch();
        if (to_nxt_id) moveBatch.update(db.doc(`users/${uid}/plans/${to_nxt_id}`), 'prv', planId);
        moveBatch.update(db.doc(`users/${uid}/plans/${planId}`), 'date', to_date, 'prv', to_prv_id);
        if (from_nxt_id) moveBatch.update(db.doc(`users/${uid}/plans/${from_nxt_id}`), 'prv', from_prv_id);
        moveBatch.commit();
      }
      const undo = () => {
        const restoreBatch = db.batch();
        if (to_nxt_id) restoreBatch.update(db.doc(`users/${uid}/plans/${to_nxt_id}`), 'prv', to_prv_id);
        restoreBatch.update(db.doc(`users/${uid}/plans/${planId}`), 'date', from_date, 'prv', from_prv_id);
        if (from_nxt_id) restoreBatch.update(db.doc(`users/${uid}/plans/${from_nxt_id}`), 'prv', planId);
        restoreBatch.commit();
      }
      dispatchCalendar({ type: 'add-undo', undo: {undo: undo, redo: action} });

      action();
      // resume data sync, after updates have been made
      setTimeout(() => {
        dispatchCalendar({ type: 'resume-data-sync', syncNow: true })
      }, 50); 
    }
  }

  const registerPlan = React.useCallback((planId: string, el: HTMLDivElement, dateStr: string, nxt: string, prv: string) => {
    // const newNode = el.cloneNode(true) as HTMLDivElement;
    // newNode.setAttribute()
    setDragPlans(dragPlans => {
      const ret = [
        ...dragPlans,
        {
          planId,
          el, 
          fromDate: dateStr,
          fromNxt: nxt,
          fromPrv: prv,
          toDate: dateStr,
          toNxt: nxt,
          toPrv: prv,
        },
      ]

      // first sort all ret planIds, in ascending order
      ret.sort((a, b) => a.planId < b.planId ? -1 : 1);
      // now we compare all elements in dragPicture with what we want 
      // we can assume that all elements in dragPicture are sorted already
      // note this is insertion, assume no deletes are necessary here
      const picture = dragPicture.current;
      if (!picture) return ret;

      let i = 0;
      ret.forEach((plan) => {
        if (picture.children[i] === plan.el) {
          // do nothing, just incremenet i
        } else {
          // insert plan element into picture children at this index
          picture.insertBefore(plan.el, picture.children[i]);
        }
        // increment i
        i += 1;
      });

      return ret;
    });
  }, []);

  const startDrag = React.useCallback((planId: string, el: HTMLDivElement, dateStr: string, nxt: string, prv: string) => {
    registerPlan(planId, el, dateStr, nxt, prv);
    setIsDragging(true); // triggers effect
  }, [dragPlans, dispatchListeners, registerPlan]);

  const closeDrag = React.useCallback((e: MouseEvent) => {
    e.preventDefault();
    // reset drag plans
    setIsDragging(false); // triggers effect
  }, [])

  // run effect to start and finish up on a drag
  React.useEffect(() => {
    if (!isDragging) {
      dispatchListeners({ type: 'deregister-focus', focusId: `dragging-plans`, removeListeners: false });

      getLastDragPlans()?.forEach(p => updateDb(p.planId, p.toDate, p.fromDate, p.toPrv, p.fromPrv, p.toNxt, p.fromNxt))
      setDragPlans([]);

      // remove all placeholders
      const p = dragPicture.current
      if (p) while (p.lastChild) p.removeChild(p.lastChild);
    } else if (isDragging) {
      const dragHandle = getDragHandle([...dragPlans]);

      // add a new focus state to listeners 
      dispatchListeners({ type: 'register-focus', focusId: `dragging-plans` });
      // mount listeners directly to document for performance 
      document.addEventListener('mousemove', dragHandle);
      document.addEventListener('mouseup', closeDrag);

      return () => {
        document.removeEventListener('mousemove', dragHandle);
        document.removeEventListener('mouseup', closeDrag);
      }
    }
    return () => {};
    // eslint-disable-next-line
  }, [isDragging])

  const getDragHandle = React.useCallback((dragPlans: DragPlan[]) => {
    const ret = (e: MouseEvent) => {
      e.preventDefault();
      if (!dragPicture.current) {
        console.error('Expected placeholder during drag');
        return;
      }
      const el = dragPicture.current.firstElementChild as HTMLElement;

      const x = (parseInt(el.style.width)) / 2;
      const y = (parseInt(el.style.height)) / 2;
      
      dragPicture.current.style.top =  e.clientY - y + "px";
      dragPicture.current.style.left = e.clientX - x + "px";

      const container = document.querySelector('[fp-role="dates-container"]');
      if (container) {
        const box = container.getBoundingClientRect();
        const top = e.clientY - box.top;
        const bot = box.bottom - e.clientY;
        if (box.left < e.clientX && e.clientX < box.right) {
          if (top > 0 && top < 80) container.scrollTop -= 3;
          if (bot > 0 && bot < 80) container.scrollTop += 3;
        }
      }

      // give dragging plans and client x/y
      dispatchCalendar({ type: 'move-plans', dragPlans: getNextDragPlans(dragPlans, e.clientX, e.clientY) });
    }
    return ret;
  }, [dragPlans]);


  return (
    <DraggingPlansContext.Provider value={{dragPlans, isDragging, startDrag, registerWrapper}}>
      {Object.entries(springs).map(([planId, props]) => <PlanSpring key={planId} props={props}/>)}
      <div ref={dragPicture} style={{position: 'fixed', zIndex: 999, display: isDragging ? 'block' : 'none'}} />
      {children}
    </DraggingPlansContext.Provider>
  )
}

export default PlanDragHandler;