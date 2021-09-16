import React, { ReactNode } from "react";

function DeferComponentRender({children}: {children: ReactNode}) {
  const [shouldRender, setShouldRender] = React.useState(false);

  React.useEffect(() => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setShouldRender(true));
    });
  })

  return <>{shouldRender && children}</>
}

export default DeferComponentRender