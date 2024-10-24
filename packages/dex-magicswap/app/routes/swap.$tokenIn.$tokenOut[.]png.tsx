import type { LoaderFunctionArgs } from "@remix-run/node";
import invariant from "tiny-invariant";

import { fetchToken } from "~/api/tokens.server";
import { ENV } from "~/lib/env.server";
import {
  NIGHT_100,
  NIGHT_400,
  TokenDisplay,
  generateOgImage,
} from "~/lib/og.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { origin } = new URL(request.url);

  const tokenInAddress = params.tokenIn ?? ENV.PUBLIC_DEFAULT_TOKEN_ADDRESS;
  const tokenOutAddress = params.tokenOut;

  invariant(tokenOutAddress, "Missing output address");

  const [tokenIn, tokenOut] = await Promise.all([
    fetchToken(tokenInAddress),
    fetchToken(tokenOutAddress),
  ]);

  const png = await generateOgImage(
    <div tw="flex p-16 w-full">
      <div tw="flex justify-end flex-col">
        <TokenDisplay token0={tokenIn} token1={tokenOut} origin={origin} />
        <div tw="flex flex-col mt-8">
          <div
            style={{
              color: NIGHT_400,
            }}
            tw="text-3xl"
          >
            Swap
          </div>
          <div
            tw="flex font-semibold text-5xl mt-4 items-center"
            style={{
              color: NIGHT_100,
            }}
          >
            <div tw="flex">{tokenIn?.symbol}</div>
            <svg
              width="30"
              height="40"
              viewBox="0 0 30 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              tw="mx-4 mt-2"
            >
              <path
                d="M30 32L22 40L19.1 37.2L22.3 34L8 34C5.8 34 3.91667 33.2167 2.35 31.65C0.783333 30.0833 -5.16248e-07 28.2 -6.12497e-07 26C-7.08747e-07 23.8 0.783333 21.9167 2.35 20.35C3.91667 18.7833 5.8 18 8 18L22 18C23.1 18 24.0417 17.6083 24.825 16.825C25.6083 16.0417 26 15.1 26 14C26 12.9 25.6083 11.9583 24.825 11.175C24.0417 10.3917 23.1 10 22 10L7.7 10L10.9 13.2L8 16L-1.39999e-06 8L8 -3.49384e-07L10.9 2.8L7.7 6L22 6C24.2 6 26.0833 6.78333 27.65 8.35C29.2167 9.91667 30 11.8 30 14C30 16.2 29.2167 18.0833 27.65 19.65C26.0833 21.2167 24.2 22 22 22L8 22C6.9 22 5.95833 22.3917 5.175 23.175C4.39167 23.9583 4 24.9 4 26C4 27.1 4.39167 28.0417 5.175 28.825C5.95833 29.6083 6.9 30 8 30L22.3 30L19.1 26.8L22 24L30 32Z"
                fill="#70747D"
              />
            </svg>

            <div tw="flex">{tokenOut?.symbol}</div>
          </div>
        </div>
      </div>
    </div>,
    origin,
  );

  return new Response(png, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "cache-control":
        ENV.NODE_ENV === "development"
          ? "no-cache, no-store"
          : "public, immutable, no-transform, max-age=86400",
    },
  });
};
