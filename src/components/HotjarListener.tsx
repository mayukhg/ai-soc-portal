import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { initHotjar, trackHotjarStateChange } from "@/lib/hotjar";

export function HotjarListener() {
  const location = useLocation();

  useEffect(() => {
    initHotjar();
    trackHotjarStateChange(location.pathname);
  }, [location.pathname]);

  return null;
}
