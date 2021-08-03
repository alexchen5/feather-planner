import React from 'react';
import { CalendarContext } from '..';
import { UidContext } from '../../../App';
import { db } from '../../../pages/HomePage';
import { StyleOpenContext } from '../Plan';
import PlanStyle from './PlanStyle';

/**
 * Context for if the plan style menu is in edit state. Boolean.
 */
 export const StyleEditContext = React.createContext(null);

function PlanStyles({ planId, currentStyleId }) {
  const { styleOpen, setStyleOpen } = React.useContext(StyleOpenContext);
  const { planStyles } = React.useContext(CalendarContext);
  const [ inEdit, setInEdit ] = React.useState(false);
  const {uid} = React.useContext(UidContext);

  const getDefaultLabels = () => {
    db.collection(`users/${uid}/plan-style`).doc('default').set({
      label: "Normal Plan",
      color: "#333",
      colorDone: "#34a853",
    }, { merge: true });
    db.collection(`users/${uid}/plan-style`).add({
      label: "Deadline",
      color: "#cc0000",
      colorDone: "#ff9900",
    });
    db.collection(`users/${uid}/plan-style`).add({
      label: "Scheduled Plan",
      color: "#0000ff",
      colorDone: "#40cbcb",
    });
  }

  const handlePlanStyleSelection = (styleId) => {
    if (styleId !== currentStyleId) {
      db.doc(`users/${uid}/plans/${planId}`).set(
        { planStyleId: styleId }, { merge: true }
      );
    }
    setStyleOpen(!styleOpen);
  }

  return (<StyleEditContext.Provider value={{inEdit, setInEdit}}>
    <div fp-role="labels">
      <PlanStyle planStyle={{ id: `${currentStyleId || "default"}`, defaultLabel: "Normal Plan", handleClick: handlePlanStyleSelection }}/>
      {
        styleOpen &&
        <>
        {
          Object.keys(planStyles).filter(id => id !== currentStyleId).map(styleId => 
            <PlanStyle key={styleId} planStyle={{ id: styleId, defaultLabel: "", handleClick: handlePlanStyleSelection }}/>
          )
        }
        {
          !!Object.keys(planStyles).filter(id => id !== currentStyleId).length ||
          <div fp-role="edit" onClick={getDefaultLabels}>Get Default Labels</div>
        }
        {
          <div fp-role="edit">Edit Labels</div>
        }
        {
          inEdit && 
          <PlanStyle planStyle={{ id: null, label: "" }}/>
        }
        </>
      }
    </div>
  </StyleEditContext.Provider>)
}

export default PlanStyles;