import React from "react";

export const ScrollHandlerContext = React.createContext({} as { 
    addScrollEventListener: (id: string, callback: (e?: React.UIEvent<Element, UIEvent>) => void) => void;
    removeScrollEventListener: (id: string) => void;
})
