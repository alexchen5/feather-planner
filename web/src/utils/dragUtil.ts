import { CalendarDate } from "types/calendar";
import { getPlanById } from "./dateUtil";

function easeInOutCubic(x: number) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
function easeOutCubic(x: number) {
  return 1 - Math.pow(1 - x, 3);
}

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

export function smoothMove(container: Element, placeholder: Element, afterElement: Element) {
  if (placeholder.nextSibling === afterElement) return;

  const moveTargets = [...new Set([
    ...placeholder.closest('[fp-role="calendar-date"]')!.children,
    ...container.children,
  ])].filter(plan => plan.getAttribute('fp-state') !== 'dragging').reduce(
    (acc, cur) => [
      ...acc,
      {
        e: cur,
        posX: cur.getBoundingClientRect().x,
        posY: cur.getBoundingClientRect().y,
      }
    ], 
    [] as any[]
  );
  const heights: any[] = [container.closest('li')?.firstElementChild, placeholder.closest('li')?.firstElementChild].map(e => [e, e && parseInt(getComputedStyle(e).height)]);
  container.insertBefore(placeholder, afterElement); 

  moveTargets.forEach(m => {
    if (m.e.offsetTop !== m.pos) {
      let start: any;
      const animate = `${parseInt(m.e.getAttribute('animate')) + 1 || 0}`;
      m.e.setAttribute('animate', animate);
      const leftPos = parseInt(m.posX) - parseInt(m.e.getBoundingClientRect().x) + (parseInt(m.e.style.left) || 0);
      const topPos = parseInt(m.posY) - parseInt(m.e.getBoundingClientRect().y) + (parseInt(m.e.style.top) || 0);
      function step(timestamp: any) {
        if (start === undefined) start = timestamp;
        const ratio = (timestamp - start) / 200;
        const func = animate === '0' ? easeInOutCubic : easeOutCubic;
        m.e.style.left = leftPos ? (1 - func(Math.min(ratio, 1))) * leftPos + 'px' : '';
        m.e.style.top = topPos ? (1 - func(Math.min(ratio, 1))) * topPos + 'px' : '';

        if (ratio < 1 && animate === m.e.getAttribute('animate')) {
          window.requestAnimationFrame(step);
        } else if (animate === m.e.getAttribute('animate')) {
          m.e.style.left = '';
          m.e.style.top = '';
          m.e.removeAttribute('animate');
        }
      }
      window.requestAnimationFrame(step);
    }
  });
  heights.map(([e, h]) => {
    const curHeight = parseInt(getComputedStyle(e).height);
    if (h !== curHeight) {
      let start: any;
      const animate = `${parseInt(e.getAttribute('animate')) + 1 || 0}`;
      e.setAttribute('animate', animate);
      const marginPos = - curHeight + parseInt(h) + (parseInt(e.style.marginBottom) || 0);
      function step(timestamp: any) {
        if (start === undefined) start = timestamp;
        const ratio = (timestamp - start) / 200;
        e.style.marginBottom = (1 - easeInOutCubic(Math.min(ratio, 1))) * marginPos + 'px';

        if (ratio < 1 && animate === e.getAttribute('animate')) {
          window.requestAnimationFrame(step);
        } else if (animate === e.getAttribute('animate')) {
          e.style.marginBottom = '';
          e.removeAttribute('animate');
        }
      }
      return step;
      // window.requestAnimationFrame(step);
    }
    return null;
  }).forEach(step => step && window.requestAnimationFrame(step));
}