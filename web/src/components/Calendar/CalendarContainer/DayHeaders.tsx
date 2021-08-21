import { GridList } from "@material-ui/core";
import { getDayStart } from "../utils/dateUtil";

import style from "./container.module.scss";

function DayHeaders() {
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let i = 0; i < getDayStart(); i++) 
    weekdays.push(weekdays.shift()!); // non-null assertion as all shifted elements are immediatly pushed

  return (
    <GridList
      cols={7} spacing={0} 
      className={style.headers}
    >
      {weekdays.map(day => 
        <li 
          key={day} 
          className={style.day}
          style={{ height: '', padding: '' }}
        >
          {day}
        </li>
      )} 
    </GridList>
  )
}

export default DayHeaders;
