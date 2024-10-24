import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import invariant from "tiny-invariant";

import { fetchPoolTokenBalance, fetchToken } from "~/api/tokens.server";
import type { PoolToken } from "~/types";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { id } = params;
  invariant(id, "Token ID required");

  const url = new URL(request.url);
  const address = url.searchParams.get("address");
  invariant(address, "User address required");

  const createErrorResponse = (error: string) =>
    json({ ok: false, error } as const);

  let token: PoolToken | null;
  try {
    token = await fetchToken(id);
  } catch (err) {
    return createErrorResponse((err as Error).message);
  }

  if (!token) {
    return createErrorResponse("Token not found");
  }

  if (!token.isNFT) {
    return createErrorResponse("Token must be an NFT vault");
  }

  try {
    const balance = await fetchPoolTokenBalance(token, address);
    return json({ ok: true, balance } as const);
  } catch (err) {
    return createErrorResponse((err as Error).message);
  }
};

export type FetchNFTVaultBalance = typeof loader;
