import React from "react";

export interface ScrollEventListener {
    id: string,
    callback: (e?: React.UIEvent<Element, UIEvent>) => void,
}