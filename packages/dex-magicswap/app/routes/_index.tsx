import type { MetaFunction } from "@remix-run/react";
import { Link } from "@remix-run/react";
import { motion } from "framer-motion";
import { ChevronRight as ChevronRightIcon } from "lucide-react";

import { Button } from "~/components/ui/Button";
import { DOCS_URL } from "~/consts";
import { generateUrl, getSocialMetas } from "~/lib/seo";
import type { RootLoader } from "~/root";

// export async function loader() {
//   const stats = await fetchStats();
//   return json({
//     stats,
//   });
// }

export const meta: MetaFunction<
  unknown, // typeof loader,
  {
    root: RootLoader;
  }
> = ({ matches, location }) => {
  const requestInfo = matches.find((match) => match.id === "root")?.data
    .requestInfo;
  return getSocialMetas({
    url: generateUrl(requestInfo?.origin, location.pathname),
    image: generateUrl(requestInfo?.origin, "/img/seo-banner.png"),
  });
};

export default function Homepage() {
  // const { stats } = useLoaderData<typeof loader>();
  return (
    <>
      <div className="h-auto bg-[url(/img/home/hero.png)] bg-bottom bg-cover bg-night-1100 py-24 md:h-[548px] md:py-0">
        <div className="mx-auto flex h-full w-full max-w-[90%] flex-col items-center justify-center space-y-8 text-center md:max-w-lg">
          <div className="space-y-3">
            <motion.h1
              initial={{
                opacity: 0,
                y: -30,
              }}
              animate={{
                opacity: 100,
                y: 0,
              }}
              className="font-bold text-3xl text-honey-25 md:text-4xl"
            >
              Magicswap Protocol
            </motion.h1>
            <motion.p
              className="text-night-300"
              initial={{
                opacity: 0,
                y: -30,
              }}
              animate={{
                opacity: 100,
                y: 0,
              }}
              transition={{
                delay: 0.1,
              }}
            >
              A decentralized trading protocol with universal token
              compatibility
            </motion.p>
          </div>
          <motion.div
            className="flex items-center justify-center gap-3"
            initial={{
              opacity: 0,
              y: -30,
            }}
            animate={{
              opacity: 100,
              y: 0,
            }}
            transition={{
              delay: 0.2,
            }}
          >
            <Link to="/swap" prefetch="render">
              <Button className="w-full" size="lg">
                Start Trading
              </Button>
            </Link>
            <Link to="/pools" prefetch="render">
              <Button className="w-full" variant="secondary" size="lg">
                Add Liquidity
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
      {/* <div className="-translate-y-1/4 md:-translate-y-1/2 container grid w-full grid-cols-2 gap-3 md:grid-cols-4 md:gap-6">
        <motion.div
          className="div"
          initial={{
            opacity: 0,
            y: -30,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.2,
          }}
        >
          <StatisticCard value={stats?.pairCount ?? 0} title="Trading Pairs" />
        </motion.div>
        <motion.div
          className="div"
          initial={{
            opacity: 0,
            y: -30,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.25,
          }}
        >
          <StatisticCard value={stats?.userCount ?? 0} title="Traders" />
        </motion.div>
        <motion.div
          className="div"
          initial={{
            opacity: 0,
            y: -30,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.3,
          }}
        >
          <StatisticCard
            value={formatNumber(stats?.reserveNFT ?? 0)}
            title="NFTs Supplied"
          />
        </motion.div>
        <motion.div
          className="div"
          initial={{
            opacity: 0,
            y: -30,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.35,
          }}
        >
          <StatisticCard value={stats?.txCount ?? 0} title="Transactions" />
        </motion.div>
      </div> */}
      <motion.div
        className="container mt-12 flex flex-col items-center justify-between gap-8 md:mt-0 md:mb-0 md:h-[556px] md:flex-row"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="max-w-[90%] gap-6 space-y-6 md:max-w-md md:space-y-10">
          <div className="space-y-5 text-center md:text-left">
            <h1 className="font-semibold text-2xl text-honey-25 md:text-4xl">
              Universal Token Compatibility
            </h1>
            <p className="text-night-500 md:text-xl">
              Support pools for both ERC-20s and NFTs through a single router
              and enable trading of all items within game economies.
            </p>
          </div>
          <Link
            to={DOCS_URL}
            className="mx-auto flex items-center gap-1 text-night-500 transition-colors hover:text-night-100 md:mx-0 md:text-xl"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn more
            <ChevronRightIcon className="w-6" />
          </Link>
        </div>
        <img
          src="/img/home/universal-token.png"
          alt=""
          className="w-full md:h-full md:w-auto"
        />
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="container grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
          <div className="space-y-6 rounded-xl bg-night-1100 p-6 md:p-8">
            <img src="/img/home/lp-rewards.svg" className="w-[42px]" alt="" />
            <div className="space-y-1">
              <h2 className="font-semibold text-honey-25 text-xl md:text-2xl">
                Diverse LP rewards
              </h2>
              <p className="text-night-400">
                Issue NFTs, ERC20s, or both as liquidity incentives to your
                pool.
              </p>
            </div>
          </div>
          <div className="space-y-6 rounded-xl bg-night-1100 p-6 md:p-8">
            <img
              src="/img/home/automated-royalties.svg"
              className="w-[42px]"
              alt=""
            />
            <div className="space-y-1">
              <h2 className="font-semibold text-honey-25 text-xl md:text-2xl">
                Automated royalties
              </h2>
              <p className="text-night-400">
                Magicswap pools utilize a three-tiered royalty system that
                includes fees for LPs, project creators, and the protocol.
              </p>
            </div>
          </div>
          <div className="space-y-6 rounded-xl bg-night-1100 p-6 md:p-8">
            <img
              src="/img/home/cheaper-trading.svg"
              className="w-[42px]"
              alt=""
            />
            <div className="space-y-1">
              <h2 className="font-semibold text-honey-25 text-xl md:text-2xl">
                Cheaper trading
              </h2>
              <p className="text-night-400">
                Create ERC-721 collections that can be bought from the pool in
                any quantity with only one transaction cost.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
      <motion.div
        className="container"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="relative mt-4 flex flex-col gap-2 overflow-hidden rounded-xl bg-night-1100 p-6 md:mt-6 md:p-8">
          <h1 className="relative z-10 font-semibold text-honey-25 text-xl md:text-2xl">
            <span className="text-ruby-900 uppercase">$MAGIC</span> and Fee
            Structure
          </h1>
          <p className="relative z-10 max-w-3xl text-night-400 md:text-lg">
            Magicswap utilizes $MAGIC as the governance and fee token. The
            protocol collects a 0.3% baseline fee for transactions that can be
            overridden by pool. Additional fees may be set by the pool creator
            and collected for projects and liquidity providers.
          </p>
          <img
            src="/img/home/magic.png"
            alt="Magic Illustration"
            className="absolute top-0 right-10 hidden h-full opacity-20 md:block xl:opacity-100"
          />
          <div className="absolute right-0 bottom-0 hidden h-72 w-96 translate-y-3/4 rounded-full bg-ruby-900 opacity-20 blur-[999px] md:block" />
        </div>
      </motion.div>
      <div className="relative mt-8 overflow-hidden border-t border-t-night-1000 py-8 md:mt-16 md:py-16">
        <div className="container">
          <div className="relative flex w-full flex-col justify-between gap-6 overflow-hidden rounded-lg border border-night-800 bg-night-1100 p-8 sm:flex-row sm:items-center">
            <div className="relative space-y-1">
              <h1 className="font-semibold text-2xl text-honey-25">
                Start trading today
              </h1>
              <p className="max-w-80 text-lg text-night-400">
                Explore our pools to trade your NFTs, tokens, and game assets!
              </p>
            </div>
            <Link to="/pools">
              <Button size="md" className="relative z-10">
                Explore Pools
              </Button>
            </Link>
            <img
              src="/img/home/collections.png"
              alt=""
              className="absolute top-0 right-28 hidden h-full opacity-20 md:block xl:opacity-100"
            />
          </div>
        </div>
      </div>
    </>
  );
}
