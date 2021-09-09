import React from "react";
import { Calendar } from "types/components/Calendar";
import { CalendarAction } from "types/components/Calendar/reducer";

export const CalendarContext = React.createContext({} as { calendar: Calendar, dispatch: React.Dispatch<CalendarAction> });
