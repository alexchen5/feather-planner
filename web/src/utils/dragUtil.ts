import { CalendarDate } from "types/components/Calendar";
import { getPlanById } from "./dateUtil";

export function getTargetDatenode(clientX: number, clientY: number) {
  const cBox = document.querySelector('[fp-role="dates-container"]')?.getBoundingClientRect();
  if (!cBox
    || clientX < cBox.left || clientX > cBox.right 
    || clientY < cBox.top  || clientY > cBox.bottom
  ) return null;

  return [...document.querySelectorAll('[fp-role="calendar-date-root"]')].find(node => {
    const r = node.getBoundingClientRect();
    return (
      r.x <= clientX && clientX <= r.right 
      && 
      r.y <= clientY && clientY <= r.bottom 
    )
  }) || null
}

export function getTargetDragPosition(draggingId: string, clientX: number, clientY: number): [string, string] {
  const dateRoot = getTargetDatenode(clientX, clientY);
  if (!dateRoot) return ['', ''];

  // get plans in the date, not including the currently dragging plan
  const datePlans = [...dateRoot.querySelectorAll(`[fp-role="calendar-plan"]:not([data-id="${draggingId}"])`)] as HTMLElement[];
  
  // find the plan above our cursor
  // we are finding the plan with center to cursor distance the smallest 
  const afterPlan = datePlans.reduce((closest, cur) => {
    const box = cur.closest('[fp-role="calendar-plan-root"]')?.getBoundingClientRect();
    const offset = box ? clientY - (box.top + box.height / 2) : -1;
    if (offset >= 0 && offset < closest.offset) {
      return { offset: offset, plan: cur };
    } else {
      return closest;
    }
  }, { offset: Number.POSITIVE_INFINITY, plan: null as Element | null}).plan;

  return [dateRoot.getAttribute('data-date') || '', afterPlan ? (afterPlan.getAttribute('data-id') || '') : ''];
}

export function updatePlanMove(dates: CalendarDate[], planId: string, nxtDateStr: string, nxtPrvPlan: string): CalendarDate[] {
  const p = getPlanById([...dates], planId); // extract plan from dates - expect dates to be valid 
  if (!p || (p.dateStr === nxtDateStr && p.prv === nxtPrvPlan)) return dates; // either no plan, or move info is same
  const targetPlan = {...p, dateStr: nxtDateStr, prv: nxtPrvPlan}; // update plan info 

  return dates.map(date => {
    let plans = date.plans; // copy plans 
    
    if (date.dateStr === p.dateStr) { // if date is prv date
      // ensure plan is gone from prv date
      plans = plans.filter(plan => plan.planId !== p.planId);
    }
    if (date.dateStr === nxtDateStr) { // if date is nxt date
      let i = 0;
      let newPlans = nxtPrvPlan ? [] : [targetPlan]; // start new plans w plan if no prv plan
      while (plans[i]) {
        // push all prv plans 
        if (plans[i].planId !== p.planId) {
          newPlans.push(plans[i]);
        } else { console.log(date.dateStr + ': caught duplicate'); }
        if (plans[i].planId === nxtPrvPlan) newPlans.push(targetPlan);
        i++;
      }
      plans = newPlans;
    }
    return plans === date.plans ? date : { ...date, plans };
  });
}


export function getDragAfterElement(container: Element, y: number) {
  const draggableElements = [...container.querySelectorAll('[fp-role="calendar-plan"]:not([fp-state="dragging"])')];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY, element: null as Element | null }).element;
}
