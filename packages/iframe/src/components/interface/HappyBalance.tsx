import { formatEther } from "viem";

interface HappyBalanceProps {
  balance: bigint | undefined;
}

const HappyBalance = ({ balance }: HappyBalanceProps) => {
  return (
    <div className="flex flex-row w-full items-center justify-between">
      <p className="text-[18px]">$HAPPY</p>
      <div className="flex flex-col items-center">
        <p className="text-[25px]">
          {balance ? formatEther(balance) : "--"}
        </p>
      </div>
    </div>
  );
};

export default HappyBalance;
