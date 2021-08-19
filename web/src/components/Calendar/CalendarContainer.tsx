import { ReactNode } from "react";

function CalendarContainer({children} : {children: ReactNode}) {

  return (
    <div id={'calendar-container'}>
      {children}
    </div>
  )
}

export default CalendarContainer;