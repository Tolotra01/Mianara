"use client";

import { usePathname } from "next/navigation";
import { createContext, type ReactNode, useContext } from "react";

const ReadOnlyContext = createContext(false);

/** Vrai quand l'Admin consulte l'espace d'un Office : les boutons d'action sont désactivés. */
export const useReadOnly = () => useContext(ReadOnlyContext);

export function ReadOnlyProvider({ visiting, children }: { visiting: boolean; children: ReactNode }) {
  const pathname = usePathname();
  return (
    <ReadOnlyContext.Provider value={visiting && pathname.startsWith("/office")}>
      {children}
    </ReadOnlyContext.Provider>
  );
}
