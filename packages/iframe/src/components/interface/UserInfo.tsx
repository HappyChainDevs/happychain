import type { HappyUser } from "@happychain/sdk-shared";
import { WalletType } from "@happychain/sdk-shared/lib/interfaces/happyUser";

interface UserProps {
  user: HappyUser;
}

const UserInfo = ({ user }: UserProps) => {
  return (
    <div className="flex flex-row items-center space-x-4">
      <img
        src={user.avatar}
        alt={`${user.name}'s avatar`}
        className="h-12 rounded-full"
      />
      <div className="flex flex-col items-start justify-between">
        {user.type === WalletType.Social && <p>{user?.email || user?.name}</p>}
        <div className="flex flex-row items-center justify-center space-x-1">
          <p>{user?.name}</p>
          <button
            className="w-4 h-4 rounded-xl opacity-50"
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(user?.address);
            }}
          >
            <img src={"/wallet-interface/clipboard-text.svg"}></img>
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserInfo;
