import React from "react";
import { GridList } from "@material-ui/core";
import { getDayStart } from "./util";

function DayHeaders() {
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  for (let i = 0; i < getDayStart(); i++) weekdays.push(weekdays.shift());

  return (
    <GridList
      cols={7} spacing={0} 
      style={{margin: '0'}}
    >
      {weekdays.map((day, i) => <li 
        key={day} 
        className={'-calendar-bg'}
        style={{height: '', padding: '', position: 'relative', zIndex: '9'}
      }>
        <div 
          className={'datenode-header'}
          style={{
            boxSizing: 'border-box', 
            textAlign: 'center',
            border: '1px solid white',
          }}
        >
          {day}
        </div>
      </li>)} 
    </GridList>
  )
}

export default DayHeaders;
