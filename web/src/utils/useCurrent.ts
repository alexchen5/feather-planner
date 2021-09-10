import React from "react";

function useCurrent<T>(arg: T) {
    const ref = React.useRef<T>(arg);

    React.useEffect(() => {
        ref.current = arg
    }, [arg])

    return ref
}

export default useCurrent;