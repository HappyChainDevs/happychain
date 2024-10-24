import { useFetcher } from "@remix-run/react";
import { Avatar, ConnectKitButton, useModal } from "connectkit";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

import { truncateEthAddress } from "~/lib/address";
import type { DomainLoader } from "~/routes/resources.domain";
import type { AddressString } from "~/types";
import { LoaderIcon } from "./Icons";
import { Button } from "./ui/Button";

export const ConnectButton = () => (
  <ConnectKitButton.Custom>
    {({ isConnected, address, show }) =>
      isConnected && address ? (
        <ConnectedButton address={address} />
      ) : (
        <Button onClick={show}>Connect Wallet</Button>
      )
    }
  </ConnectKitButton.Custom>
);

// TODO: fallback to truncate addy if it errors out
const ConnectedButton = ({ address }: { address: AddressString }) => {
  const { load, state, data } = useFetcher<DomainLoader>();
  const { openProfile } = useModal();
  const [error, setError] = useState(false);

  const truncatedAddress = truncateEthAddress(address);
  const domain = data?.ok ? data.domain : null;
  const preferredDomainType = domain?.preferredDomainType ?? "address";
  const domainType = domain?.[preferredDomainType];
  const name =
    typeof domainType === "string"
      ? truncatedAddress
      : (domainType?.name ?? truncatedAddress);
  const image =
    (domainType &&
      typeof domainType !== "string" &&
      "pfp" in domainType &&
      domainType?.pfp) ??
    (domain?.treasuretag?.pfp || domain?.smol?.pfp || domain?.ens?.pfp);

  useEffect(() => {
    load(`/resources/domain?address=${address}`);
  }, [address, load]);

  return (
    <motion.div
      layout
      className="relative inline-flex h-9 items-center justify-center overflow-hidden rounded-md bg-secondary font-medium text-secondary-foreground text-sm transition-colors hover:bg-secondary/80"
    >
      <div className="relative h-9 w-9">
        <Avatar size={36} address={address} radius={0} />
        {!data && state === "loading" ? (
          <div className="absolute inset-0 flex h-full w-full items-center justify-center bg-night-900/50">
            <LoaderIcon className="h-5 w-5" />
          </div>
        ) : (
          <AnimatePresence>
            {!error && image && (
              <motion.img
                key={name}
                src={image}
                alt={name}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 h-full w-full"
                onError={() => setError(true)}
              />
            )}
          </AnimatePresence>
        )}
      </div>
      <div className="flex items-center space-x-1 px-3">
        <AnimatePresence mode="wait" initial={false}>
          {preferredDomainType === "treasuretag" ? (
            <TreasureTag name={name} />
          ) : (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {name}
            </motion.span>
          )}
        </AnimatePresence>
        <ChevronDown className="h-4 w-4 text-night-400" />
      </div>

      <button
        type="button"
        className="absolute inset-0 h-full w-full"
        onClick={openProfile}
      >
        <span className="sr-only">Open Profile</span>
      </button>
    </motion.div>
  );
};

const TreasureTag = ({ name }: { name: string }) => {
  const [treasureTag, treasureTagDiscriminant] = name.split("#");
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex items-center space-x-1"
    >
      <MagicStarsIcon className="h-3 w-3 text-ruby-900" />
      <span className="text-honey-25">
        {treasureTag}
        <span className="text-night-500">#{treasureTagDiscriminant}</span>
      </span>
    </motion.div>
  );
};

const MagicStarsIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 34 34" className={className}>
    <path
      d="M33.6126 16.4686L28.6047 14.793C26.7642 14.1802 25.3984 12.6387 25.011 10.762L22.8993 0.450014C22.8412 0.191495 22.6087 0 22.3375 0C22.0662 0 21.8338 0.191495 21.7756 0.450014L19.664 10.762C19.2765 12.6387 17.9107 14.1802 16.0702 14.793L11.0623 16.4686C10.8298 16.5452 10.6748 16.7654 10.6748 17.0048C10.6748 17.2442 10.8298 17.4644 11.0623 17.541L16.0702 19.2166C17.9107 19.8293 19.2765 21.3709 19.664 23.2475L21.7756 33.55C21.8338 33.8085 22.0662 34 22.3375 34C22.6087 34 22.8412 33.8085 22.8993 33.55L25.011 23.2475C25.3984 21.3709 26.7642 19.8293 28.6047 19.2166L33.6126 17.541C33.8451 17.4644 34.0001 17.2442 34.0001 17.0048C34.0001 16.7654 33.8451 16.5452 33.6126 16.4686Z"
      fill="currentColor"
    />
    <path
      d="M6.70299 7.01829L8.46596 7.61193C9.11496 7.83215 9.59929 8.36833 9.7349 9.03857L10.4808 12.677C10.5001 12.7727 10.5776 12.8398 10.6745 12.8398C10.7714 12.8398 10.8489 12.7727 10.8682 12.677L11.6141 9.03857C11.7497 8.37791 12.234 7.83215 12.883 7.61193L14.646 7.01829C14.7235 6.98957 14.7816 6.91297 14.7816 6.8268C14.7816 6.74062 14.7235 6.66403 14.646 6.6353L12.883 6.04167C12.234 5.82145 11.7497 5.28526 11.6141 4.61503L10.8682 0.976614C10.8489 0.880866 10.7714 0.813843 10.6745 0.813843C10.5776 0.813843 10.5001 0.880866 10.4808 0.976614L9.7349 4.61503C9.59929 5.27568 9.11496 5.82145 8.46596 6.04167L6.70299 6.6353C6.6255 6.66403 6.56738 6.74062 6.56738 6.8268C6.56738 6.91297 6.6255 6.98957 6.70299 7.01829Z"
      fill="currentColor"
    />
    <path
      d="M10.8199 24.8944L8.45642 24.0997C7.58462 23.8124 6.93562 23.0848 6.76126 22.1943L5.76353 17.3208C5.73447 17.1963 5.62793 17.1101 5.502 17.1101C5.37607 17.1101 5.25983 17.1963 5.24046 17.3208L4.24274 22.1943C4.05869 23.0848 3.40969 23.8124 2.54758 24.0997L0.184048 24.8944C0.0774952 24.9327 0 25.0284 0 25.1433C0 25.2582 0.0774952 25.3636 0.184048 25.3923L2.54758 26.187C3.41938 26.4742 4.06838 27.2019 4.24274 28.0924L5.24046 32.9659C5.26952 33.0904 5.37607 33.1766 5.502 33.1766C5.62793 33.1766 5.74415 33.0904 5.76353 32.9659L6.76126 28.0924C6.94531 27.2019 7.59431 26.4742 8.45642 26.187L10.8199 25.3923C10.9265 25.354 11.004 25.2582 11.004 25.1433C11.004 25.0284 10.9265 24.9231 10.8199 24.8944Z"
      fill="currentColor"
    />
  </svg>
);
