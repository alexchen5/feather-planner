import { DocumentFocusContext } from "components/DocumentFocusStack";
import React from "react";
import { DatePlansUpdate } from "types";
import { CalendarPlan } from "types/components/Calendar";
import { DragPlan } from "types/components/Calendar/PlanDragHandler";
import { PlanSpringProps, SpringChanges } from "types/components/Calendar/PlanDragHandler/PlanSpring";
import { getAllPlanIds, getPlanIds } from "utils/dateUtil";
import { getChangeTuples, getDragChanges } from "utils/dragUtil";
import { db, UidContext } from "utils/globalContext";
import { UndoRedoContext } from "utils/useUndoRedo";
import { ScrollHandlerContext } from "../CalendarContainer/context";
import { CalendarContext } from "../context";
import { DraggingPlansContext } from "./context";
import PlanSpring from "./PlanSpring";

function PlanDragHandler({children} : {children: React.ReactNode}) {
  const [ dragPlans, setDragPlans ] = React.useState<DragPlan[]>([]);
  const dragPicture = React.useRef<HTMLDivElement>(null);
  const [ isDragging, setIsDragging ] = React.useState(false);
  const { mountFocus, unmountFocus } = React.useContext(DocumentFocusContext);
  const { calendar, dispatch: dispatchCalendar } = React.useContext(CalendarContext);
  const { addScrollEventListener, removeScrollEventListener } = React.useContext(ScrollHandlerContext);
  const { addAction: addUndo } = React.useContext(UndoRedoContext);
    
  const [springs, setSprings] = React.useState<{ [planId: string]: { el: HTMLElement, props: PlanSpringProps} }>({});

  const { uid } = React.useContext(UidContext);

  // We must update our spring positions every time the calendar is scrolled or resized
  React.useEffect(() => {
    const updateSprings = () => {
      setSprings(springs => 
        getAllPlanIds(calendar.dates) // use ids which are on the page to update, otherwise spring will be scrapped
          .reduce((acc, cur) => (
            springs[cur] // no need to update if spring doesnt exist
            ? {
              ...acc,
              [cur]: {
                ...springs[cur], 
                props: {
                  ...springs[cur].props,
                  updateBox: {
                    // give new coordinates
                    left: springs[cur].el.getBoundingClientRect().left, 
                    top: springs[cur].el.getBoundingClientRect().top,
                  },
                }
              }  
            } 
            : acc
          ), {}) // init as empty obj so we discard unused springs
        || {}
      )
    }
    addScrollEventListener('drag-handler', updateSprings);
    window.addEventListener('resize', updateSprings);

    return () => window.removeEventListener('resize', updateSprings);
    // note no cleanup for drag-handler is needed here, as addScrollEventListener automatically cleans up previous listeners
    // expect addScrollEventListener, removeScrollEventListener to be memoized
  }, [calendar.dates, addScrollEventListener])
  // do clean up on component unmount
  React.useEffect(() => {
    return () => removeScrollEventListener('drag-handler');
  }, [removeScrollEventListener])

  /**
   * Receive the static spawn position of a plan. Callback function gives the spring position to animate
   */
  const declarePlanSpawn = React.useCallback((planId: string, staticEl: HTMLDivElement, onUpdate: (spring: SpringChanges) => void) => {
    const box = staticEl.getBoundingClientRect();

    // add new key into springs obj to store the plan's spring
    setSprings(springs => ({
      ...springs,
      [planId]: {
        el: staticEl,
        props: {
          spawnBox: { top: box.top, left: box.left },
          updateBox: null,
          onUpdate,
        },
      }
    }));
  }, []);

  const registerPlan = React.useCallback((plan: CalendarPlan, dateStr: string, el: HTMLDivElement, onDrag: () => void) => {
    setDragPlans(dragPlans => {
      const ret = [
        ...dragPlans,
        {
          ...plan,
          el, 
          dateStr,
          onDrag,
          plans: getPlanIds(calendar.dates, dateStr),
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
  }, [calendar.dates]);

  const startDrag = React.useCallback((plan: CalendarPlan, dateStr: string, el: HTMLDivElement, clientX: number, clientY: number, onDrag: () => void) => {
    registerPlan(plan, dateStr, el, onDrag);
    
    if (!dragPicture.current) {
      console.error('Expected placeholder at start drag');
      return;
    }
    const x = (parseInt(el.style.width)) / 2;
    const y = (parseInt(el.style.height)) / 2;
    dragPicture.current.style.top =  clientY - y + "px";
    dragPicture.current.style.left = clientX - x + "px";

    dispatchCalendar({ type: 'pause-data-sync' });
    setIsDragging(true); // triggers effect
  }, [registerPlan, dispatchCalendar]);

  const finaliseDrag = async () => {
    // dragChanges are the order of plans at the date we are moving towards, or null
    // if no changes should be made to db
    const changeTuples = await getChangeTuples(dragPlans);
    if (changeTuples) {
      const undo = async () => {
        const undoBatch = db.batch();
        changeTuples.beforeT.forEach(t => undoBatch.update(db.doc(`users/${uid}/plans/${t.planId}`), 'date', t.date, 'prv', t.prv))
        undoBatch.commit();
      }

      const action = async () => {
        const moveBatch = db.batch();
        changeTuples.afterT.forEach(t => moveBatch.update(db.doc(`users/${uid}/plans/${t.planId}`), 'date', t.date, 'prv', t.prv))
        moveBatch.commit();
      }

      // dispatch action
      action(); 
      
      // add undo and redo
      addUndo({ undo, redo: action })

      // resume data sync, after updates have been made
      setTimeout(() => {
        dispatchCalendar({ type: 'resume-data-sync', syncNow: true })
      }, 50); 
    } else {
      // resume data sync immediately as no updates are needed
      dispatchCalendar({ type: 'resume-data-sync', syncNow: true })
    }

    // reset drag plans
    setDragPlans([]);
  }

  // run effect to start and finish up on a drag
  React.useEffect(() => {
    if (isDragging) {
      const dragPic = dragPicture.current

      const callbackRef = { current: null as NodeJS.Timeout | null };
      const dragHandle = getMousemoveCallback([...dragPlans], callbackRef);
      dragPlans.forEach(p => p.onDrag());
      const closeDrag = (e: MouseEvent) => {
        e.preventDefault();
        unmountFocus('dragging-plans');
        setIsDragging(false);
      };

      // add a new focus state to listeners 
      mountFocus(`dragging-plans`, 'calendar-root', [
        {
          key: 'mousemove',
          callback: dragHandle,
        }, {
          key: 'mouseup',
          callback: closeDrag,
        }
      ]);
      document.body.setAttribute('plan-drag-display', '');

      return () => {
        // cleanup function is drag finish function
        document.body.removeAttribute('plan-drag-display');

        callbackRef.current && clearInterval(callbackRef.current);
        // remove all placeholders
        if (dragPic) while (dragPic.lastChild) dragPic.removeChild(dragPic.lastChild);

        // finalise drag in async function
        finaliseDrag();
      }
    }
    return () => {};
    // eslint-disable-next-line
  }, [isDragging])

  const getMousemoveCallback = React.useCallback((dragPlans: DragPlan[], callbackRef: { current: NodeJS.Timeout | null }) => {
    const container = document.querySelector('[fp-role="dates-container"]');
    const box = container ? container.getBoundingClientRect() : null;

    let picture: HTMLElement | null = null, el, x = 0, y = 0;
    if (!dragPicture.current) {
      console.error('Expected placeholder for drag');
    } else {
      picture = dragPicture.current;
      el = picture.firstElementChild as HTMLElement;
  
      x = (parseInt(el.style.width)) / 2;
      y = (parseInt(el.style.height)) / 2;
    }

    const ret = async (e: MouseEvent) => {
      e.preventDefault();
      // cancel any recursive timeouts
      if (callbackRef.current) {
        clearInterval(callbackRef.current);
        callbackRef.current = null;
      }

      if (picture) {
        picture.style.top =  e.clientY - y + "px";
        picture.style.left = e.clientX - x + "px";
      }

      // scroll container if necessary
      if (container && box) {
        const top = e.clientY - box.top;
        const bot = box.bottom - e.clientY;
        if (box.left < e.clientX && e.clientX < box.right) {
          if (top > 0 && top < 80) {
            container.scrollTop -= (top < 40) ? 5 : 2; // faster scroll for closer to the top
            // need to call self recursively, so that scrolling will happen if
            // mouse is hovered but not moved
            callbackRef.current = setTimeout(() => ret(e), 25); 
          } else if (bot > 0 && bot < 80) {
            container.scrollTop += (bot < 40) ? 5 : 2; // faster scroll for closer to the bottom
            callbackRef.current = setTimeout(() => ret(e), 25);
          } 
        }
      }

      // assert that target exists as html element
      const target = e.target as HTMLElement | null;
      // give dragging plans and client x/y
      const datesUpdate: DatePlansUpdate | null = await getDragChanges(dragPlans, target?.closest('[fp-role="calendar-date-root"]') || null, e.clientY);

      // dispatch if there are changes
      if (datesUpdate) {
        dispatchCalendar({ type: 'move-plans', datesUpdate, draggingPlans: dragPlans.reduce((acc, cur) => ({ ...acc, [cur.planId]: {...cur} }), {})});
      }
    }
    return ret;
  }, [dispatchCalendar]);


  return (
    <DraggingPlansContext.Provider value={{dragPlans, isDragging, startDrag, declarePlanSpawn }}>
      {Object.entries(springs).map(([planId, s]) => <PlanSpring key={planId} props={s.props}/>)}
      <div ref={dragPicture} style={{position: 'fixed', zIndex: 999, display: isDragging ? 'block' : 'none', pointerEvents: 'none'}} />
      {children}
    </DraggingPlansContext.Provider>
  )
}

export default PlanDragHandler;