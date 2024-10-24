import { useFetcher } from "@remix-run/react";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect } from "react";
import { useAccount as wagmiUseAccount } from "wagmi";

import type { AddressString, Optional } from "~/types";

type State = {
  isConnected: boolean;
  address: Optional<AddressString>;
  addressArg: AddressString;
};

const Context = createContext({
  isConnected: false,
  address: undefined,
  addressArg: "0x0",
} as State);

export const useAccount = () => {
  const context = useContext(Context);

  if (!context) {
    throw new Error(
      "Must call `useAccount` within an `AccountProvider` component.",
    );
  }

  return context;
};

export const AccountProvider = ({ children }: { children: ReactNode }) => {
  const { submit } = useFetcher();
  const { isConnected, address } = wagmiUseAccount();

  useEffect(() => {
    if (address) {
      submit({ address }, { method: "put", action: "/resources/session" });
    } else {
      submit({}, { method: "delete", action: "/resources/session" });
    }
  }, [address, submit]);

  return (
    <Context.Provider
      value={{
        isConnected,
        address,
        addressArg: address ?? "0x0",
      }}
    >
      {children}
    </Context.Provider>
  );
};
