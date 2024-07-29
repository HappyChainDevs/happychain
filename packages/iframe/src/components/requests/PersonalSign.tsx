import { hexToString } from "viem";

interface PersonalSignProps {
	method: string;
	params: [`0x${string}`, `0x${string}`];
	reject: () => void;
	accept: () => void;
}

const signatureTypes: Record<string, string> = {
	personal_sign: "Signature Request",
};

export function PersonalSign({
	method,
	params,
	reject,
	accept,
}: PersonalSignProps) {
	return (
		<main className="flex flex-col items-start justify-between h-dvh gap-4 p-4 bg-base-300">
			<div className="grow gap-4 flex flex-col w-full">
				<div className="font-bold bg-base-200 w-full p-4 rounded-lg">
					{window.location.origin}
				</div>
				<div className="font-bold bg-base-200 w-full p-4 rounded-lg">
					{signatureTypes[method] ?? "Unknown Signature Type"}
				</div>

				<div className="flex flex-col grow bg-zinc-100 p-4 gap-4">
					<div className="text-center text-sm border-b border-zinc-300 pb-2 text-blue-600 font-bold">
						Requested Text
					</div>
					<pre className="grow">{hexToString(params[0])}</pre>
				</div>
			</div>

			<div className="flex gap-4 w-full">
				<button
					type="button"
					className="border-2 border-green-300 bg-green-300 hover:bg-green-400 btn grow"
					onClick={accept}
				>
					Sign
				</button>
				<button
					type="button"
					className="border-2 bg-red-100 border-red-300 hover:border-red-100 hover:bg-red-100 btn"
					onClick={reject}
				>
					Reject
				</button>
			</div>
		</main>
	);
}
