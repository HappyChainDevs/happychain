import { createCookieSessionStorage } from "@remix-run/node";

export const SESSION_KEY_ADDRESS = "address";

type SessionData = {
  [SESSION_KEY_ADDRESS]: string;
};

type SessionFlashData = {
  error: string;
};

const { getSession, commitSession } = createCookieSessionStorage<
  SessionData,
  SessionFlashData
>({
  cookie: {
    name: "__session",
    secure: true,
  },
});

export { getSession, commitSession };
