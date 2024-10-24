import { defineBadgeComponent, type BadgeProps } from "@happychain/ui";
import { useAccount } from "wagmi";

declare global {
  // biome-ignore lint/style/noNamespace:
  namespace JSX {
    interface IntrinsicElements {
      "connect-button": BadgeProps;
    }
  }
}
void defineBadgeComponent("connect-button", false);

export const ConnectButton = () => {
  const { address, isConnected } = useAccount();
  if (!address || !isConnected) return <connect-button />;
  return null;
};
