import React from "react";

/**
 * Use for assigning a ref to a mutable value
 * @param val value to be used for updating the ref
 * @returns memoised ref with .current always up to date with val
 */
function useCurrent<T>(ref: React.MutableRefObject<T>, val: T) {
    React.useEffect(() => {
        ref.current = val
    }, [val, ref])
}

export default useCurrent;