import React from 'react';
import { CalendarContext } from '../..';
import { db, UidContext } from "globalContext";
import { StyleOpenContext } from '..';
import PlanStyle from './PlanStyle';

import style from './labels.module.scss';

/**
 * Context for if the plan style menu is in edit state. Boolean.
 */
 export const StyleEditContext = React.createContext({} as { inEdit: boolean, setInEdit: React.Dispatch<React.SetStateAction<boolean>>});

function PlanStyles({ planId, currentStyleId }: { planId: string, currentStyleId: string }) {
  const { styleOpen, setStyleOpen } = React.useContext(StyleOpenContext);
  const { calendar: { planStyles } } = React.useContext(CalendarContext);
  const [ inEdit, setInEdit ] = React.useState(false);
  const {uid} = React.useContext(UidContext);

  const getDefaultLabels = () => {
    db.doc(`users/${uid}/plan-style/default`).set({
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

  const handlePlanStyleSelection = (styleId: string) => {
    if (styleId !== currentStyleId) {
      db.doc(`users/${uid}/plans/${planId}`).set(
        { planStyleId: styleId }, { merge: true }
      );
    }
    setStyleOpen(!styleOpen);
  }

  return (<StyleEditContext.Provider value={{inEdit, setInEdit}}>
    <div 
      className={style.root}
      onMouseEnter={() => setStyleOpen(true)}
      onMouseLeave={() => setStyleOpen(false)}
    >
      <PlanStyle styleId={currentStyleId} label={planStyles[currentStyleId]?.label || "Normal Plan"} handleClick={handlePlanStyleSelection}/>
      {
        styleOpen &&
        <>
        {
          Object.keys(planStyles).filter(id => id !== currentStyleId).map(styleId => 
            <PlanStyle key={styleId} styleId={styleId} label={planStyles[styleId]!.label} handleClick={handlePlanStyleSelection}/>
          )
        }
        {
          !!Object.keys(planStyles).filter(id => id !== currentStyleId).length ||
          <div className={style.edit} onClick={getDefaultLabels}>Get Default Labels</div>
        }
        {
          <div className={style.edit}>Edit Labels</div>
        }
        {
          inEdit && 
          <PlanStyle styleId={'unused add new style'} label={''}/>
        }
        </>
      }
    </div>
  </StyleEditContext.Provider>)
}

export default PlanStyles;