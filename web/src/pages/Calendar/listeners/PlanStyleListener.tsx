import React from "react";
import { AppContext, db, UidContext } from "utils/globalContext";
import { SetStyles } from "../data";

function PlanStyleListener() {
  const { calendar: { dispatch } } = React.useContext(AppContext);
  const { uid } = React.useContext(UidContext);

  React.useEffect(() => {
    // attach listener to db for plan styles 
    const detachPlanStyleListener = db.collection(`users/${uid}/plan-style`) 
      .onSnapshot((snapshot) => {
        const action: SetStyles= {
          type: 'set-styles',
          planStyles: {},
        }
        snapshot.forEach((doc) => {
          const d = doc.data();
          // TODO: complete error checking protocol
          action.planStyles[doc.id] = {
            label: d.label,
            color: d.color,
            colorDone: d.colorDone,
          }
          document.documentElement.style.setProperty(`--plan-color-${doc.id}`, d.color);
          document.documentElement.style.setProperty(`--plan-color-done-${doc.id}`, d.colorDone);
        });
        dispatch(action);
      });

    return () => {
      // detach db listeners 
      detachPlanStyleListener();
    }
  }, [dispatch, uid]);

  return null;
}

export default PlanStyleListener;