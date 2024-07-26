export type EIP1193ErrorObject = {
	code: number;
	message: string;
	data?: unknown;
};

export interface IProviderRpcError extends Error {
	code: number;
	data?: unknown;
}

export class ProviderRpcError extends Error implements IProviderRpcError {
	code: number;
	data?: unknown;
	constructor(errObj: EIP1193ErrorObject) {
		super(errObj.message);
		this.code = errObj.code;
		this.data = errObj.data;
	}
}

export class EIP1193UserRejectionError extends ProviderRpcError {
	constructor() {
		super({
			code: 4001,
			data: "User rejected request",
			message: "User rejected request",
		});
	}
}
