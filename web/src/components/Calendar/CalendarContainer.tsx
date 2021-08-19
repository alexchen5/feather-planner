import React from "react";

function CalendarContainer({children}) {

  return (
    <div id={'calendar-container'}>
      {children}
    </div>
  )
}

export default CalendarContainer;