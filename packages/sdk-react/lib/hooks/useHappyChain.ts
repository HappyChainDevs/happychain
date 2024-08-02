import { useAtomValue } from "jotai";

import { eip1193Provider } from "../services/eip1193Provider";
import { userAtom } from "../state/happyUser";

export function useHappyChain() {
	const user = useAtomValue(userAtom);

	return {
		provider: eip1193Provider,
		user,
	};
}
