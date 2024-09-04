import { useNavigate } from "@tanstack/react-router";

const ActionButtons = () => {
  const navigate = useNavigate({ from: "/connect" });
  return (
    <div className="flex flex-row w-full items-center justify-between px-2 py-4">
      <button
        className="h-10 w-24 bg-slate-400 rounded-xl"
        onClick={() => {
          navigate({ to: "/send" });
        }}
      >
        Send
      </button>
      <button
        className="h-10 w-24 bg-slate-400 rounded-xl disabled:opacity-80"
        disabled
      >
        Buy / Sell
      </button>
      <button
        className="h-10 w-24 bg-slate-400 rounded-xl disabled:opacity-80"
        disabled
      >
        Top Up
      </button>
    </div>
  );
};

export default ActionButtons;
