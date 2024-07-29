import { useAtomValue } from "jotai";

import { useRef } from "react";
import { eip1193Provider } from "../services/eip1193Provider";
import { userAtom } from "../state/happyUser";

export function useHappyChain() {
	const user = useAtomValue(userAtom);
	const provider = useRef(eip1193Provider);

	return {
		provider: provider.current,
		user,
	};
}
