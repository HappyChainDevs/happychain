import { Link } from "@remix-run/react";
import { MagicSwapLogo } from "@treasure-project/branding";
import { ChevronUpIcon, ExternalLinkIcon } from "lucide-react";
import { Balancer } from "react-wrap-balancer";

import { DiscordIcon, MagicTextLogo, TwitterIcon } from "~/components/Icons";
import {
  BUY_MAGIC_URL,
  DISCORD_URL,
  DOCS_URL,
  GOVERNANCE_FORUM_URL,
  PRIVACY_POLICY_URL,
  TERMS_OF_SERVICE_URL,
  TWITTER_URL,
} from "~/consts";
import { Button } from "./ui/Button";

const FOOTER_LINKS = {
  Treasure: [
    {
      text: "About",
      href: "https://docs.treasure.lol/introduction",
    },
    {
      text: "What is MAGIC?",
      href: "https://docs.treasure.lol/magic/introduction",
      type: "external",
    },
    {
      text: "Governance Forum",
      href: GOVERNANCE_FORUM_URL,
      type: "external",
    },
  ],
  Discover: [
    {
      text: "Games",
      href: "https://app.treasure.lol",
    },
    {
      text: "Marketplace",
      href: "https://app.treasure.lol/trending",
    },
  ],
  Resources: [
    {
      text: "Documentation",
      href: DOCS_URL,
      type: "external",
    },
    {
      text: "GitHub",
      href: "https://github.com/TreasureProject",
      type: "external",
    },
  ],
};

export const Footer = () => {
  return (
    <footer className="border-night-900 border-t-2 bg-night-1200 px-4 py-6 md:p-16">
      <div className="container space-y-8 md:space-y-14">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <MagicSwapLogo className="h-8 shrink-0 md:h-14" />
            <h1 className="max-w-xs font-semibold text-night-500 md:text-2xl">
              <Balancer>
                The gateway to the cross-game{" "}
                <span className="text-white">economy</span>.
              </Balancer>
            </h1>
          </div>
          <ul className="flex items-center gap-2.5">
            <li>
              <a
                className="text-night-100 transition-colors hover:text-honey-25"
                href={DISCORD_URL}
                target="_blank"
                rel="noreferrer"
              >
                <DiscordIcon className="h-8" />
              </a>
            </li>
            <li>
              <a
                className="text-night-100 transition-colors hover:text-honey-25"
                href={TWITTER_URL}
                target="_blank"
                rel="noreferrer"
              >
                <TwitterIcon className="h-5" />
              </a>
            </li>
          </ul>
        </div>
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
          <div className="flex flex-wrap items-start justify-center gap-8">
            {Object.entries(FOOTER_LINKS).map(([title, links]) => (
              <div
                key={title}
                className="space-y-2 text-center md:space-y-4 md:text-left"
              >
                <p className="font-semibold text-honey-25">{title}</p>
                <ul className="space-y-2 text-night-500 md:space-y-4">
                  {links.map(({ text, href }) => (
                    <li key={text}>
                      <a
                        href={href}
                        key={text}
                        className="flex items-center justify-center gap-1 transition-colors hover:text-honey-25 md:justify-start"
                        {...(href.startsWith("https://")
                          ? {
                              target: "_blank",
                              rel: "noopener noreferrer",
                            }
                          : undefined)}
                      >
                        {text}
                        {href.startsWith("https://") ? (
                          <ExternalLinkIcon className="h-3 w-3" />
                        ) : null}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex flex-col items-end gap-2">
            <Link to={BUY_MAGIC_URL} target="_blank" rel="noopener noreferrer">
              <Button size="md" className="flex items-center gap-1">
                Buy <MagicTextLogo className="h-4" />
              </Button>
            </Link>
            <button
              type="button"
              className="flex items-center gap-1 py-4 pl-4 font-semibold text-honey-25 text-sm transition-colors hover:text-white"
              onClick={() => {
                window.scrollTo({
                  top: 0,
                  behavior: "smooth",
                });
              }}
            >
              Back to the top
              <ChevronUpIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="w-full border-night-900 border-t text-night-500 text-sm">
          <div className="flex flex-col items-center justify-between gap-4 pt-6 sm:flex-row">
            <p className="base-500 text-center md:text-start">
              Copyright &copy; {new Date().getFullYear()} Magicswap. All rights
              reserved.
            </p>
            <div className="flex items-center gap-4">
              <Link
                to={TERMS_OF_SERVICE_URL}
                className="transition-colors hover:text-night-400"
                target="_blank"
                rel="noopener noreferrer"
              >
                Terms of Service
              </Link>
              <Link
                to={PRIVACY_POLICY_URL}
                className="transition-colors hover:text-night-400"
                target="_blank"
                rel="noopener noreferrer"
              >
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
