import { GridList } from "@material-ui/core";
import { getDayStart } from "utils/dateUtil";

import style from "./container.module.scss";

function DayHeaders() {
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let i = 0; i < getDayStart(); i++) 
    weekdays.push(weekdays.shift()!); // non-null assertion as all shifted elements are immediatly pushed

  return (
    <GridList
      cols={7} spacing={0} 
      style={{margin: '0px', padding: '0px 4px'}} // override materialUi styles
    >
      {weekdays.map(day => 
        <li 
          key={day} 
          style={{height: '', padding: '', position: 'relative'}} // override materialUi styles
        >
          <div className={style.day}>{day}</div>
        </li>
      )} 
    </GridList>
  )
}

export default DayHeaders;
