import React from "react";
import { FeatherPlanner } from "types/pages/HomePage";
import { FeatherPlannerAction } from "types/pages/HomePage/reducer";

export const FeatherContext = React.createContext({} as { 
    featherPlanner: FeatherPlanner, 
    dispatch: React.Dispatch<FeatherPlannerAction> 
});
