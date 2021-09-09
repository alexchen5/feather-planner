import { RawDraftContentState } from "draft-js";
import { db, UidContext } from "utils/globalContext";
import React from "react";
import { CalendarPlan } from "types/components/Calendar";
import { getUpdateRange } from "../../utils/dateUtil";
import { FeatherContext } from "pages/HomePage/context";
import { SetLabels, SetPlans } from "types/pages/HomePage/reducer";

/**
 * Dummy component that takes care of listening to db on a given range of dates
 * @param props given DateRange to listen to
 * @returns null (renders nothing)
 */
function DateRangeListener({startDate, endDate}: { startDate: string, endDate: string }) {
  const { dispatch } = React.useContext(FeatherContext);
  const { uid } = React.useContext(UidContext);

  React.useEffect(() => { 
    // console.log('attaching listeners on: ' + startDate + ' to ' + endDate);
    const detachLabelListener = db.collection(`users/${uid}/date-labels`) // labels for each date
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .onSnapshot((snapshot) => {
        const action: SetLabels = {
          type: 'set-labels', 
          labels: getUpdateRange(startDate, endDate, 'object'), 
        }
        snapshot.forEach((doc) => {
          const d = doc.data();
          const content = d.content as string | RawDraftContentState | undefined;
          if (!content) {
            console.error('Deleting date label due to empty content. labelId: ' + doc.id);
            db.doc(`users/${uid}/date-labels/${doc.id}`).delete();
          } else {
            action.labels[d.date] = {
              labelId: doc.id,
              content,
            };
          }
        })
        dispatch(action);
      });

    const detachPlansListener = db.collection(`users/${uid}/plans`) // user's plans
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .onSnapshot((snapshot) => {
        const action: SetPlans = { 
          type: 'set-plans', 
          plans: getUpdateRange(startDate, endDate, 'array'), 
        }
        let reserves: { date: string, plan: CalendarPlan, prv: string }[] = [];
        snapshot.forEach((doc) => {
          const d = doc.data();
          const dateStr = d.date                              as string | undefined;
          const isDone  = (d.done || d.content?.done || false) as boolean;
          const content = (d.header || d.content?.textContent) as string | RawDraftContentState | undefined;
          const styleId = (d.planStyleId || "default")        as string;
          const prv     = (d.prv || '')                       as string;
  
          if (!dateStr) {
            console.error('Deleting plan due to corrupt date string. planId: ' + doc.id);
            db.doc(`users/${uid}/plans/${doc.id}`).delete();
          } else if (!content) {
            console.error('Deleting plan due to empty content. planId: ' + doc.id);
            db.doc(`users/${uid}/plans/${doc.id}`).delete();
          } else {
            const newPlan: CalendarPlan = {
              planId: doc.id,
              restoreData: d,
              isDone,
              content,
              styleId,
            };
            if (!prv) {
              action.plans[dateStr].push(newPlan);
            }  else {
              reserves.push({ date: d.date, plan: newPlan, prv });
            }
          }
        });
        let prvlen;
        while (reserves.length && reserves.length !== prvlen) {
          let nextReserves: { date: string, plan: CalendarPlan, prv: string }[] = [];
          reserves.forEach(r => {
            const prv = action.plans[r.date].findIndex(plan => plan.planId === r.prv);
            if (prv !== -1) action.plans[r.date].splice(prv + 1, 0, r.plan);
            else nextReserves.push(r);
          })
          prvlen = reserves.length;
          reserves = nextReserves;
        }
        reserves.forEach(r => {
          console.error('Caught plan with no valid prv: ', r);
          action.plans[r.date].push(r.plan);
        })
        dispatch(action);
      })
    
    return (() => {
      // console.log('detaching listeners on: ' + startDate + ' to ' + endDate);
      detachLabelListener();
      detachPlansListener();
    })
  }, [uid, dispatch, startDate, endDate])

  return null
}

export default DateRangeListener;