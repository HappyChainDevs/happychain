import type { ConnectionProvider } from "@happychain/core";
import clsx from "clsx";
import { useState } from "react";
import { useInjectedProviders } from "../hooks/useInjectedProviders";
import { useSocialProviders } from "../hooks/useSocialProviders";
import { messageBus } from "../services/eventBus";

export function ConnectButton() {
	const [isOpen, setIsOpen] = useState(false);

	const web3Providers = useInjectedProviders();
	const socialProviders = useSocialProviders();

	function open() {
		messageBus.emit("modal-toggle", true);

		setIsOpen(true);
	}

	function close() {
		setIsOpen(false);
		setTimeout(() => {
			messageBus.emit("modal-toggle", false);
		}, 300);
	}

	async function connect(provider: ConnectionProvider) {
		await provider.enable();
		close();
	}

	return (
		<>
			<main className="w-screen min-h-dvh">
				<button
					type="button"
					onClick={open}
					className="btn btn-primary h-12 w-20 fixed top-4 right-4"
				>
					Login
				</button>
				{/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
				<div
					className={clsx(
						!isOpen && "opacity-0 pointer-events-none",
						isOpen && "opacity-100",
						"bg-slate-900/50 backdrop-blur-sm fixed top-0 bottom-0 right-0 left-0 flex items-center justify-center transition duration-300",
					)}
					onClick={close}
				>
					{/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
					<div
						className="bg-zinc-100 p-8 rounded-md flex flex-coll gap-4"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex items-center justify-center">
							<div className="flex flex-col items-center gap-4">
								<img
									alt="HappyChain Logo"
									src="/happychain.png"
									className="w-24 h-24 mx-auto"
								/>
								<p className="font-bold text-2xl">HappyChain</p>
							</div>
						</div>
						<div className="flex flex-col gap-4">
							{socialProviders.concat(web3Providers).map((prov) => {
								return (
									<button
										type="button"
										key={prov.id}
										onClick={() => connect(prov)}
										className="flex w-full items-center gap-4 bg-zinc-200 px-4 py-2 shadow-md hover:scale-[103%] hover:bg-white active:scale-[95%] focus:shadow transition"
									>
										<img
											className="w-8 h-8"
											src={prov.icon}
											alt={`${prov.name} icon`}
										/>
										{prov.name}
									</button>
								);
							})}
						</div>
					</div>
				</div>
			</main>
		</>
	);
}
