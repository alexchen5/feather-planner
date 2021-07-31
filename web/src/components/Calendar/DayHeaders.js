import React from "react";
import { GridList } from "@material-ui/core";
import { getDayStart } from "./util";

function DayHeaders() {
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let i = 0; i < getDayStart(); i++) weekdays.push(weekdays.shift());

  return (
    <GridList
      cols={7} spacing={0} 
      style={{margin: '0', padding: '0px 4px'}}
    >
      {weekdays.map((day, i) => <li 
        key={day} 
        // className={'-calendar-bg'}
        style={{height: '', padding: '', position: 'relative'}
      }>
        <div 
          style={{
            textAlign: 'right',
            fontSize: 'var(--day-label-font-size)',
            fontWeight: '300',
            padding: '4px 6px',
            color: '#333',
          }}
        >
          {day}
        </div>
      </li>)} 
    </GridList>
  )
}

export default DayHeaders;
