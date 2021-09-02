import { DatePlansUpdate } from "types";
import { DragPlan } from "types/components/Calendar/PlanDragHandler";

// store the info of the prv drag location
// include a lock so that we will never get race conditions on the info
let locked: boolean = false, prvDate: string | null = null, ids: string[], index: number, num: number;
function timeout() {
  return new Promise(resolve => setTimeout(resolve, Math.random() * 50));
}
async function enterPrvDate() {
  while (locked) {
    console.log('spinlock zone entered'); // this has never been reached in testing
    await timeout(); // spinlock on a random timeout for the lock 
  }
  locked = true; // enter mutex
}

/**
 * Read the value stored about the drag date location. Will clear the value
 * after it is read.
 * 
 * @returns the last date which we dragged towards, with the ids at the date, 
 * or null if there has not been a valid drag location
 */
async function takeDragChanges(): Promise<{ date: string, ids: string[] } | null> {
  await enterPrvDate(); // wait for our turn to access prvDate 
  const ret = prvDate ? { date: prvDate, ids } : null;
  prvDate = null;
  locked = false; // leave mutex 
  return ret;
};

export async function getDragChanges(dragPlans: DragPlan[], dateRoot: Element | null, clientY: number): Promise<DatePlansUpdate | null> {
  if (!dragPlans.length) return null; // no updates if nothing to drag
  await enterPrvDate(); // wait for our turn to access prvDate 
  let ret: DatePlansUpdate | null = null;

  if (!dateRoot) { // no valid drop target 
    // if there is data for prvDate
    if (prvDate) {
      // update the previous date to not include dragging plans anymore
      ids.splice(index, num);
      ret = {
        [prvDate]: [...ids],
      }

      // take dragplans init as the destination 
      dragPlans.forEach(p => {
        ret = {
          ...ret,
          [p.dateStr]: [...p.plans],
        }
      });

      // set prvDate to null
      prvDate = null;
    }
  } else {
    // calculate destination from mouse position 

    // array of plans at destination date which are not currently dragging
    // expensive O(p) to query all plans in date, then O(p*q) for filtering, where p is number plans found and q is number dragging plans 
    const datePlans = [...dateRoot.querySelectorAll(`[fp-role="calendar-plan-root"]`)].filter(p => !dragPlans.some(d => d.planId === p.getAttribute('data-id')));
    
    // find the index of insertion our mouse is hovering in datePlans
    const insertionIndex = datePlans.reduce((closest, cur, i) => {
      const box = cur.getBoundingClientRect();
      const offset = box ? clientY - (box.top + box.height / 2) : -1;
      if (offset >= 0 && offset < closest.offset) {
        return { offset: offset, index: i };
      } else {
        return closest;
      }
    }, { offset: Number.POSITIVE_INFINITY, index: -1}).index + 1; // modify for splice
    
    const date = dateRoot.getAttribute('data-date')!

    // change the move data if either the date changed, or insertion index changed
    if (date !== prvDate || insertionIndex !== index) {
      const target = datePlans.map(p => p.getAttribute('data-id')!);
      const dragIds = dragPlans.map(p => p.planId);
      target.splice(insertionIndex, 0, ...dragIds);
  
      if (prvDate) {
        // update the previous date to not include dragging plans anymore
        ids.splice(index, num);
        ret = {
          [prvDate]: [...ids],
        }
      } else {
        // use original info in place of prvDate (but with dragging plans filtered out)
        dragPlans.forEach(p => {
          ret = {
            ...ret,
            [p.dateStr]: [...p.plans].filter(id => !dragPlans.some(d => d.planId === id)),
          }
        });
      }

      ret = {
        ...ret,
        [date]: [...target],
      }
  
      // save current data
      prvDate = date;
      ids = [...target];
      index = insertionIndex;
      num = dragIds.length;
    }
  }

  locked = false; // finished with mutex
  return ret;
}

/**
 * Get the tuples that we can feed into the db to move our plans. 
 * 
 * Note that this function includes side effects - namely from takeDragChanges,
 * which will clear the history of the previous drag. 
 * @param dragPlans the current dragging plans 
 * @returns tuples to feed, or null if no changes are needed
 */
export async function getChangeTuples(dragPlans: DragPlan[]): Promise<{ beforeT: { date: string, planId: string, prv: string }[], afterT: { date: string, planId: string, prv: string }[] } | null> {
    const dragChanges = await takeDragChanges();
    if (!dragChanges) return null;

    // make two images of our date changes - all releant dates before and after
    // we can make before from dragPlans, and dragChanges without the dragging plans
    const before: { [dateStr: string]: string[] } = {
      [dragChanges.date]: dragChanges.ids.filter(id => !dragPlans.some(d => d.planId === id)),
      ...dragPlans.reduce((acc, cur) => ({ ...acc, [cur.dateStr]: cur.plans }), {})
    };
    
    // and make after from the combination of before and dragChanges 
    const after: { [dateStr: string]: string[] } = { 
      ...Object.entries(before).reduce((acc, [date, ids]) => ({ ...acc, [date]: ids.filter(i => !dragPlans.some(p => i === p.planId)) }), {}),
      [dragChanges.date]: dragChanges.ids,
    }

    // now we can extract out the relevant (dateStr, planId, prv) tuples from before and after
    const extract = (obj: { [dateStr: string]: string[] }): { date: string, planId: string, prv: string }[] => {
      return Object.entries(obj).reduce<{ date: string, planId: string, prv: string }[]>(
        (acc, [date, ids]) => (
          [
            ...acc, 
            ...ids.map((id, i) => ({ date: date, planId: id, prv: ids[i - 1] || '' })),
          ]
        ), []
      );
    }
    const impureBeforeT = extract(before);
    const impureAfterT = extract(after);

    // now we remove tuples which appear twice in afterT and beforeT, so that we're not writing anything
    // redundant 
    // O(n^2) filtering, go through every element in before, check if in after, if not, add to new array. do same for after
    const beforeT: { date: string, planId: string, prv: string }[] = [];
    const afterT: { date: string, planId: string, prv: string }[] = [];
    impureBeforeT.forEach(t => {
      if (!impureAfterT.some(u => u.planId === t.planId && u.prv === t.prv && u.date === t.date)) {
        // element not repeated
        beforeT.push(t);
      }
    })
    impureAfterT.forEach(t => {
      if (!impureBeforeT.some(u => u.planId === t.planId && u.prv === t.prv && u.date === t.date)) {
        // element not repeated
        afterT.push(t);
      }
    })

    if (afterT.length && !beforeT.length) console.error('Expected beforeT to have items');

    // we can return null if theres no db changes that need to be made
    return afterT.length ? { beforeT, afterT } : null;
}