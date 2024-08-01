import { createLazyFileRoute } from "@tanstack/react-router";
import { useAtomValue } from "jotai";
import { useState } from "react";
import { ConnectButton } from "../components/ConnectButton";
import { DotLinearMotionBlurLoader } from "../components/loaders/DotLinearMotionBlurLoader";
import { useHappyAccount } from "../hooks/useHappyAccount";
import { useInjectedProviders } from "../hooks/useInjectedProviders";
import { useSocialProviders } from "../hooks/useSocialProviders";
import { messageBus } from "../services/eventBus";
import { AuthState, authStateAtom } from "../state/app";

export const Route = createLazyFileRoute("/connect")({
	component: Connect,
});

function Connect() {
	const authState = useAtomValue(authStateAtom);
	const { user } = useHappyAccount();
	const web3Providers = useInjectedProviders();
	const socialProviders = useSocialProviders();

	const [isOpen, setIsOpen] = useState(false);

	function disconnectAll() {
		for (const prov of socialProviders.concat(web3Providers)) {
			prov.disable();
		}
	}

	function open() {
		messageBus.emit("modal-toggle", true);
		setIsOpen(true);
	}

	function close() {
		setIsOpen(false);
		messageBus.emit("modal-toggle", false);
	}

	if (authState === AuthState.Loading) {
		return (
			<main className="w-screen min-h-dvh">
				<div className="h-12 w-20 fixed top-4 right-4 flex items-center justify-center">
					<DotLinearMotionBlurLoader />
				</div>
			</main>
		);
	}

	if (!user) {
		return <ConnectButton />;
	}

	return (
		<>
			<main className="flex items-stretch gap-4 fixed top-4 right-4 w-screen min-h-dvh">
				<div className="absolute top-0 right-0">
					{isOpen && (
						// biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
						<div
							className="bg-base-200 rounded-lg w-72 p-4 h-72 flex flex-col gap-4"
							onClick={close}
						>
							<div className="flex justify-center items-center gap-2">
								<img
									src={user.avatar}
									alt={`${user.name}'s avatar`}
									className="rounded-full h-8"
								/>
								<p>{user?.email || user?.name}</p>
							</div>
							<div className="bg-slate-200 rounded p-4 w-full h-full grow flex flex-col items-end justify-end">
								<button
									type="button"
									onClick={disconnectAll}
									className="btn btn-warning"
								>
									Logout
								</button>
							</div>
						</div>
					)}

					{!isOpen && (
						// biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
						<div
							className="flex gap-2 items-center justify-center bg-base-200 w-44 rounded-lg p-2"
							onClick={open}
						>
							<img
								src={user.avatar}
								alt={`${user.name}'s avatar`}
								className="rounded-full h-8"
							/>
							<p>{user?.email || user?.name}</p>
						</div>
					)}
				</div>
			</main>
		</>
	);
}
