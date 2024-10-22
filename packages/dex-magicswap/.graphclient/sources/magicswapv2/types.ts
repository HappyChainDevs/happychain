// @ts-nocheck

import { InContextSdkMethod } from '@graphql-mesh/types';
import { MeshContext } from '@graphql-mesh/runtime';

export namespace Magicswapv2Types {
  export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  BigDecimal: { input: string; output: string; }
  BigInt: { input: string; output: string; }
  Bytes: { input: string; output: string; }
  Int8: { input: any; output: any; }
  Timestamp: { input: any; output: any; }
};

export type Aggregation_interval =
  | 'hour'
  | 'day';

export type BlockChangedFilter = {
  number_gte: Scalars['Int']['input'];
};

export type Block_height = {
  hash?: InputMaybe<Scalars['Bytes']['input']>;
  number?: InputMaybe<Scalars['Int']['input']>;
  number_gte?: InputMaybe<Scalars['Int']['input']>;
};

export type Collection = {
  id: Scalars['Bytes']['output'];
  type: NftType;
  vaultCollections: Array<VaultCollection>;
};


export type CollectionvaultCollectionsArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<VaultCollection_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<VaultCollection_filter>;
};

export type Collection_filter = {
  id?: InputMaybe<Scalars['Bytes']['input']>;
  id_not?: InputMaybe<Scalars['Bytes']['input']>;
  id_gt?: InputMaybe<Scalars['Bytes']['input']>;
  id_lt?: InputMaybe<Scalars['Bytes']['input']>;
  id_gte?: InputMaybe<Scalars['Bytes']['input']>;
  id_lte?: InputMaybe<Scalars['Bytes']['input']>;
  id_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  id_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  id_contains?: InputMaybe<Scalars['Bytes']['input']>;
  id_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  type?: InputMaybe<NftType>;
  type_not?: InputMaybe<NftType>;
  type_in?: InputMaybe<Array<NftType>>;
  type_not_in?: InputMaybe<Array<NftType>>;
  vaultCollections_?: InputMaybe<VaultCollection_filter>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<Collection_filter>>>;
  or?: InputMaybe<Array<InputMaybe<Collection_filter>>>;
};

export type Collection_orderBy =
  | 'id'
  | 'type'
  | 'vaultCollections';

export type DayData = {
  id: Scalars['Bytes']['output'];
  date: Scalars['BigInt']['output'];
  reserveUSD: Scalars['BigDecimal']['output'];
  reserveNFT: Scalars['BigDecimal']['output'];
  volumeUSD: Scalars['BigDecimal']['output'];
  txCount: Scalars['BigInt']['output'];
};

export type DayData_filter = {
  id?: InputMaybe<Scalars['Bytes']['input']>;
  id_not?: InputMaybe<Scalars['Bytes']['input']>;
  id_gt?: InputMaybe<Scalars['Bytes']['input']>;
  id_lt?: InputMaybe<Scalars['Bytes']['input']>;
  id_gte?: InputMaybe<Scalars['Bytes']['input']>;
  id_lte?: InputMaybe<Scalars['Bytes']['input']>;
  id_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  id_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  id_contains?: InputMaybe<Scalars['Bytes']['input']>;
  id_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  date?: InputMaybe<Scalars['BigInt']['input']>;
  date_not?: InputMaybe<Scalars['BigInt']['input']>;
  date_gt?: InputMaybe<Scalars['BigInt']['input']>;
  date_lt?: InputMaybe<Scalars['BigInt']['input']>;
  date_gte?: InputMaybe<Scalars['BigInt']['input']>;
  date_lte?: InputMaybe<Scalars['BigInt']['input']>;
  date_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  date_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  reserveUSD?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserveUSD_not?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserveUSD_gt?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserveUSD_lt?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserveUSD_gte?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserveUSD_lte?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserveUSD_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  reserveUSD_not_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  reserveNFT?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserveNFT_not?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserveNFT_gt?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserveNFT_lt?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserveNFT_gte?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserveNFT_lte?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserveNFT_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  reserveNFT_not_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  volumeUSD?: InputMaybe<Scalars['BigDecimal']['input']>;
  volumeUSD_not?: InputMaybe<Scalars['BigDecimal']['input']>;
  volumeUSD_gt?: InputMaybe<Scalars['BigDecimal']['input']>;
  volumeUSD_lt?: InputMaybe<Scalars['BigDecimal']['input']>;
  volumeUSD_gte?: InputMaybe<Scalars['BigDecimal']['input']>;
  volumeUSD_lte?: InputMaybe<Scalars['BigDecimal']['input']>;
  volumeUSD_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  volumeUSD_not_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  txCount?: InputMaybe<Scalars['BigInt']['input']>;
  txCount_not?: InputMaybe<Scalars['BigInt']['input']>;
  txCount_gt?: InputMaybe<Scalars['BigInt']['input']>;
  txCount_lt?: InputMaybe<Scalars['BigInt']['input']>;
  txCount_gte?: InputMaybe<Scalars['BigInt']['input']>;
  txCount_lte?: InputMaybe<Scalars['BigInt']['input']>;
  txCount_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  txCount_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<DayData_filter>>>;
  or?: InputMaybe<Array<InputMaybe<DayData_filter>>>;
};

export type DayData_orderBy =
  | 'id'
  | 'date'
  | 'reserveUSD'
  | 'reserveNFT'
  | 'volumeUSD'
  | 'txCount';

export type Factory = {
  id: Scalars['Bytes']['output'];
  pairCount: Scalars['BigInt']['output'];
  volumeUSD: Scalars['BigDecimal']['output'];
  reserveNFT: Scalars['BigDecimal']['output'];
  reserveUSD: Scalars['BigDecimal']['output'];
  txCount: Scalars['BigInt']['output'];
  userCount: Scalars['BigInt']['output'];
  magicUSD: Scalars['BigDecimal']['output'];
  lpFee: Scalars['BigDecimal']['output'];
  protocolFee: Scalars['BigDecimal']['output'];
  protocolFeeBeneficiary?: Maybe<Scalars['Bytes']['output']>;
};

export type Factory_filter = {
  id?: InputMaybe<Scalars['Bytes']['input']>;
  id_not?: InputMaybe<Scalars['Bytes']['input']>;
  id_gt?: InputMaybe<Scalars['Bytes']['input']>;
  id_lt?: InputMaybe<Scalars['Bytes']['input']>;
  id_gte?: InputMaybe<Scalars['Bytes']['input']>;
  id_lte?: InputMaybe<Scalars['Bytes']['input']>;
  id_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  id_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  id_contains?: InputMaybe<Scalars['Bytes']['input']>;
  id_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  pairCount?: InputMaybe<Scalars['BigInt']['input']>;
  pairCount_not?: InputMaybe<Scalars['BigInt']['input']>;
  pairCount_gt?: InputMaybe<Scalars['BigInt']['input']>;
  pairCount_lt?: InputMaybe<Scalars['BigInt']['input']>;
  pairCount_gte?: InputMaybe<Scalars['BigInt']['input']>;
  pairCount_lte?: InputMaybe<Scalars['BigInt']['input']>;
  pairCount_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  pairCount_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  volumeUSD?: InputMaybe<Scalars['BigDecimal']['input']>;
  volumeUSD_not?: InputMaybe<Scalars['BigDecimal']['input']>;
  volumeUSD_gt?: InputMaybe<Scalars['BigDecimal']['input']>;
  volumeUSD_lt?: InputMaybe<Scalars['BigDecimal']['input']>;
  volumeUSD_gte?: InputMaybe<Scalars['BigDecimal']['input']>;
  volumeUSD_lte?: InputMaybe<Scalars['BigDecimal']['input']>;
  volumeUSD_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  volumeUSD_not_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  reserveNFT?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserveNFT_not?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserveNFT_gt?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserveNFT_lt?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserveNFT_gte?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserveNFT_lte?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserveNFT_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  reserveNFT_not_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  reserveUSD?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserveUSD_not?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserveUSD_gt?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserveUSD_lt?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserveUSD_gte?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserveUSD_lte?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserveUSD_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  reserveUSD_not_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  txCount?: InputMaybe<Scalars['BigInt']['input']>;
  txCount_not?: InputMaybe<Scalars['BigInt']['input']>;
  txCount_gt?: InputMaybe<Scalars['BigInt']['input']>;
  txCount_lt?: InputMaybe<Scalars['BigInt']['input']>;
  txCount_gte?: InputMaybe<Scalars['BigInt']['input']>;
  txCount_lte?: InputMaybe<Scalars['BigInt']['input']>;
  txCount_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  txCount_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  userCount?: InputMaybe<Scalars['BigInt']['input']>;
  userCount_not?: InputMaybe<Scalars['BigInt']['input']>;
  userCount_gt?: InputMaybe<Scalars['BigInt']['input']>;
  userCount_lt?: InputMaybe<Scalars['BigInt']['input']>;
  userCount_gte?: InputMaybe<Scalars['BigInt']['input']>;
  userCount_lte?: InputMaybe<Scalars['BigInt']['input']>;
  userCount_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  userCount_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  magicUSD?: InputMaybe<Scalars['BigDecimal']['input']>;
  magicUSD_not?: InputMaybe<Scalars['BigDecimal']['input']>;
  magicUSD_gt?: InputMaybe<Scalars['BigDecimal']['input']>;
  magicUSD_lt?: InputMaybe<Scalars['BigDecimal']['input']>;
  magicUSD_gte?: InputMaybe<Scalars['BigDecimal']['input']>;
  magicUSD_lte?: InputMaybe<Scalars['BigDecimal']['input']>;
  magicUSD_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  magicUSD_not_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  lpFee?: InputMaybe<Scalars['BigDecimal']['input']>;
  lpFee_not?: InputMaybe<Scalars['BigDecimal']['input']>;
  lpFee_gt?: InputMaybe<Scalars['BigDecimal']['input']>;
  lpFee_lt?: InputMaybe<Scalars['BigDecimal']['input']>;
  lpFee_gte?: InputMaybe<Scalars['BigDecimal']['input']>;
  lpFee_lte?: InputMaybe<Scalars['BigDecimal']['input']>;
  lpFee_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  lpFee_not_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  protocolFee?: InputMaybe<Scalars['BigDecimal']['input']>;
  protocolFee_not?: InputMaybe<Scalars['BigDecimal']['input']>;
  protocolFee_gt?: InputMaybe<Scalars['BigDecimal']['input']>;
  protocolFee_lt?: InputMaybe<Scalars['BigDecimal']['input']>;
  protocolFee_gte?: InputMaybe<Scalars['BigDecimal']['input']>;
  protocolFee_lte?: InputMaybe<Scalars['BigDecimal']['input']>;
  protocolFee_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  protocolFee_not_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  protocolFeeBeneficiary?: InputMaybe<Scalars['Bytes']['input']>;
  protocolFeeBeneficiary_not?: InputMaybe<Scalars['Bytes']['input']>;
  protocolFeeBeneficiary_gt?: InputMaybe<Scalars['Bytes']['input']>;
  protocolFeeBeneficiary_lt?: InputMaybe<Scalars['Bytes']['input']>;
  protocolFeeBeneficiary_gte?: InputMaybe<Scalars['Bytes']['input']>;
  protocolFeeBeneficiary_lte?: InputMaybe<Scalars['Bytes']['input']>;
  protocolFeeBeneficiary_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  protocolFeeBeneficiary_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  protocolFeeBeneficiary_contains?: InputMaybe<Scalars['Bytes']['input']>;
  protocolFeeBeneficiary_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<Factory_filter>>>;
  or?: InputMaybe<Array<InputMaybe<Factory_filter>>>;
};

export type Factory_orderBy =
  | 'id'
  | 'pairCount'
  | 'volumeUSD'
  | 'reserveNFT'
  | 'reserveUSD'
  | 'txCount'
  | 'userCount'
  | 'magicUSD'
  | 'lpFee'
  | 'protocolFee'
  | 'protocolFeeBeneficiary';

export type LiquidityPosition = {
  id: Scalars['Bytes']['output'];
  pair: Pair;
  user: User;
  balance: Scalars['BigInt']['output'];
};

export type LiquidityPosition_filter = {
  id?: InputMaybe<Scalars['Bytes']['input']>;
  id_not?: InputMaybe<Scalars['Bytes']['input']>;
  id_gt?: InputMaybe<Scalars['Bytes']['input']>;
  id_lt?: InputMaybe<Scalars['Bytes']['input']>;
  id_gte?: InputMaybe<Scalars['Bytes']['input']>;
  id_lte?: InputMaybe<Scalars['Bytes']['input']>;
  id_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  id_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  id_contains?: InputMaybe<Scalars['Bytes']['input']>;
  id_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  pair?: InputMaybe<Scalars['String']['input']>;
  pair_not?: InputMaybe<Scalars['String']['input']>;
  pair_gt?: InputMaybe<Scalars['String']['input']>;
  pair_lt?: InputMaybe<Scalars['String']['input']>;
  pair_gte?: InputMaybe<Scalars['String']['input']>;
  pair_lte?: InputMaybe<Scalars['String']['input']>;
  pair_in?: InputMaybe<Array<Scalars['String']['input']>>;
  pair_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  pair_contains?: InputMaybe<Scalars['String']['input']>;
  pair_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  pair_not_contains?: InputMaybe<Scalars['String']['input']>;
  pair_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  pair_starts_with?: InputMaybe<Scalars['String']['input']>;
  pair_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  pair_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  pair_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  pair_ends_with?: InputMaybe<Scalars['String']['input']>;
  pair_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  pair_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  pair_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  pair_?: InputMaybe<Pair_filter>;
  user?: InputMaybe<Scalars['String']['input']>;
  user_not?: InputMaybe<Scalars['String']['input']>;
  user_gt?: InputMaybe<Scalars['String']['input']>;
  user_lt?: InputMaybe<Scalars['String']['input']>;
  user_gte?: InputMaybe<Scalars['String']['input']>;
  user_lte?: InputMaybe<Scalars['String']['input']>;
  user_in?: InputMaybe<Array<Scalars['String']['input']>>;
  user_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  user_contains?: InputMaybe<Scalars['String']['input']>;
  user_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  user_not_contains?: InputMaybe<Scalars['String']['input']>;
  user_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  user_starts_with?: InputMaybe<Scalars['String']['input']>;
  user_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  user_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  user_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  user_ends_with?: InputMaybe<Scalars['String']['input']>;
  user_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  user_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  user_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  user_?: InputMaybe<User_filter>;
  balance?: InputMaybe<Scalars['BigInt']['input']>;
  balance_not?: InputMaybe<Scalars['BigInt']['input']>;
  balance_gt?: InputMaybe<Scalars['BigInt']['input']>;
  balance_lt?: InputMaybe<Scalars['BigInt']['input']>;
  balance_gte?: InputMaybe<Scalars['BigInt']['input']>;
  balance_lte?: InputMaybe<Scalars['BigInt']['input']>;
  balance_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  balance_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<LiquidityPosition_filter>>>;
  or?: InputMaybe<Array<InputMaybe<LiquidityPosition_filter>>>;
};

export type LiquidityPosition_orderBy =
  | 'id'
  | 'pair'
  | 'pair__id'
  | 'pair__reserve0'
  | 'pair__reserve1'
  | 'pair__reserveUSD'
  | 'pair__totalSupply'
  | 'pair__volume0'
  | 'pair__volume1'
  | 'pair__volumeUSD'
  | 'pair__txCount'
  | 'pair__lpFee'
  | 'pair__protocolFee'
  | 'pair__royaltiesFee'
  | 'pair__royaltiesBeneficiary'
  | 'pair__totalFee'
  | 'user'
  | 'user__id'
  | 'user__liquidityPositionCount'
  | 'balance';

export type NftType =
  | 'ERC721'
  | 'ERC1155';

/** Defines the order direction, either ascending or descending */
export type OrderDirection =
  | 'asc'
  | 'desc';

export type Pair = {
  id: Scalars['Bytes']['output'];
  token0: Token;
  token1: Token;
  reserve0: Scalars['BigDecimal']['output'];
  reserve1: Scalars['BigDecimal']['output'];
  reserveUSD: Scalars['BigDecimal']['output'];
  totalSupply: Scalars['BigInt']['output'];
  volume0: Scalars['BigDecimal']['output'];
  volume1: Scalars['BigDecimal']['output'];
  volumeUSD: Scalars['BigDecimal']['output'];
  txCount: Scalars['BigInt']['output'];
  lpFee: Scalars['BigDecimal']['output'];
  protocolFee: Scalars['BigDecimal']['output'];
  royaltiesFee: Scalars['BigDecimal']['output'];
  royaltiesBeneficiary?: Maybe<Scalars['Bytes']['output']>;
  totalFee: Scalars['BigDecimal']['output'];
  transactions: Array<Transaction>;
  liquidityPositions: Array<LiquidityPosition>;
  dayData: Array<PairDayData>;
};


export type PairtransactionsArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Transaction_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<Transaction_filter>;
};


export type PairliquidityPositionsArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<LiquidityPosition_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<LiquidityPosition_filter>;
};


export type PairdayDataArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<PairDayData_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<PairDayData_filter>;
};

export type PairDayData = {
  id: Scalars['Bytes']['output'];
  pair: Pair;
  date: Scalars['BigInt']['output'];
  reserve0: Scalars['BigDecimal']['output'];
  reserve1: Scalars['BigDecimal']['output'];
  reserveUSD: Scalars['BigDecimal']['output'];
  totalSupply: Scalars['BigInt']['output'];
  volume0: Scalars['BigDecimal']['output'];
  volume1: Scalars['BigDecimal']['output'];
  volumeUSD: Scalars['BigDecimal']['output'];
  txCount: Scalars['BigInt']['output'];
};

export type PairDayData_filter = {
  id?: InputMaybe<Scalars['Bytes']['input']>;
  id_not?: InputMaybe<Scalars['Bytes']['input']>;
  id_gt?: InputMaybe<Scalars['Bytes']['input']>;
  id_lt?: InputMaybe<Scalars['Bytes']['input']>;
  id_gte?: InputMaybe<Scalars['Bytes']['input']>;
  id_lte?: InputMaybe<Scalars['Bytes']['input']>;
  id_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  id_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  id_contains?: InputMaybe<Scalars['Bytes']['input']>;
  id_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  pair?: InputMaybe<Scalars['String']['input']>;
  pair_not?: InputMaybe<Scalars['String']['input']>;
  pair_gt?: InputMaybe<Scalars['String']['input']>;
  pair_lt?: InputMaybe<Scalars['String']['input']>;
  pair_gte?: InputMaybe<Scalars['String']['input']>;
  pair_lte?: InputMaybe<Scalars['String']['input']>;
  pair_in?: InputMaybe<Array<Scalars['String']['input']>>;
  pair_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  pair_contains?: InputMaybe<Scalars['String']['input']>;
  pair_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  pair_not_contains?: InputMaybe<Scalars['String']['input']>;
  pair_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  pair_starts_with?: InputMaybe<Scalars['String']['input']>;
  pair_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  pair_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  pair_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  pair_ends_with?: InputMaybe<Scalars['String']['input']>;
  pair_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  pair_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  pair_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  pair_?: InputMaybe<Pair_filter>;
  date?: InputMaybe<Scalars['BigInt']['input']>;
  date_not?: InputMaybe<Scalars['BigInt']['input']>;
  date_gt?: InputMaybe<Scalars['BigInt']['input']>;
  date_lt?: InputMaybe<Scalars['BigInt']['input']>;
  date_gte?: InputMaybe<Scalars['BigInt']['input']>;
  date_lte?: InputMaybe<Scalars['BigInt']['input']>;
  date_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  date_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  reserve0?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserve0_not?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserve0_gt?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserve0_lt?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserve0_gte?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserve0_lte?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserve0_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  reserve0_not_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  reserve1?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserve1_not?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserve1_gt?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserve1_lt?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserve1_gte?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserve1_lte?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserve1_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  reserve1_not_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  reserveUSD?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserveUSD_not?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserveUSD_gt?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserveUSD_lt?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserveUSD_gte?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserveUSD_lte?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserveUSD_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  reserveUSD_not_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  totalSupply?: InputMaybe<Scalars['BigInt']['input']>;
  totalSupply_not?: InputMaybe<Scalars['BigInt']['input']>;
  totalSupply_gt?: InputMaybe<Scalars['BigInt']['input']>;
  totalSupply_lt?: InputMaybe<Scalars['BigInt']['input']>;
  totalSupply_gte?: InputMaybe<Scalars['BigInt']['input']>;
  totalSupply_lte?: InputMaybe<Scalars['BigInt']['input']>;
  totalSupply_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  totalSupply_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  volume0?: InputMaybe<Scalars['BigDecimal']['input']>;
  volume0_not?: InputMaybe<Scalars['BigDecimal']['input']>;
  volume0_gt?: InputMaybe<Scalars['BigDecimal']['input']>;
  volume0_lt?: InputMaybe<Scalars['BigDecimal']['input']>;
  volume0_gte?: InputMaybe<Scalars['BigDecimal']['input']>;
  volume0_lte?: InputMaybe<Scalars['BigDecimal']['input']>;
  volume0_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  volume0_not_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  volume1?: InputMaybe<Scalars['BigDecimal']['input']>;
  volume1_not?: InputMaybe<Scalars['BigDecimal']['input']>;
  volume1_gt?: InputMaybe<Scalars['BigDecimal']['input']>;
  volume1_lt?: InputMaybe<Scalars['BigDecimal']['input']>;
  volume1_gte?: InputMaybe<Scalars['BigDecimal']['input']>;
  volume1_lte?: InputMaybe<Scalars['BigDecimal']['input']>;
  volume1_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  volume1_not_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  volumeUSD?: InputMaybe<Scalars['BigDecimal']['input']>;
  volumeUSD_not?: InputMaybe<Scalars['BigDecimal']['input']>;
  volumeUSD_gt?: InputMaybe<Scalars['BigDecimal']['input']>;
  volumeUSD_lt?: InputMaybe<Scalars['BigDecimal']['input']>;
  volumeUSD_gte?: InputMaybe<Scalars['BigDecimal']['input']>;
  volumeUSD_lte?: InputMaybe<Scalars['BigDecimal']['input']>;
  volumeUSD_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  volumeUSD_not_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  txCount?: InputMaybe<Scalars['BigInt']['input']>;
  txCount_not?: InputMaybe<Scalars['BigInt']['input']>;
  txCount_gt?: InputMaybe<Scalars['BigInt']['input']>;
  txCount_lt?: InputMaybe<Scalars['BigInt']['input']>;
  txCount_gte?: InputMaybe<Scalars['BigInt']['input']>;
  txCount_lte?: InputMaybe<Scalars['BigInt']['input']>;
  txCount_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  txCount_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<PairDayData_filter>>>;
  or?: InputMaybe<Array<InputMaybe<PairDayData_filter>>>;
};

export type PairDayData_orderBy =
  | 'id'
  | 'pair'
  | 'pair__id'
  | 'pair__reserve0'
  | 'pair__reserve1'
  | 'pair__reserveUSD'
  | 'pair__totalSupply'
  | 'pair__volume0'
  | 'pair__volume1'
  | 'pair__volumeUSD'
  | 'pair__txCount'
  | 'pair__lpFee'
  | 'pair__protocolFee'
  | 'pair__royaltiesFee'
  | 'pair__royaltiesBeneficiary'
  | 'pair__totalFee'
  | 'date'
  | 'reserve0'
  | 'reserve1'
  | 'reserveUSD'
  | 'totalSupply'
  | 'volume0'
  | 'volume1'
  | 'volumeUSD'
  | 'txCount';

export type Pair_filter = {
  id?: InputMaybe<Scalars['Bytes']['input']>;
  id_not?: InputMaybe<Scalars['Bytes']['input']>;
  id_gt?: InputMaybe<Scalars['Bytes']['input']>;
  id_lt?: InputMaybe<Scalars['Bytes']['input']>;
  id_gte?: InputMaybe<Scalars['Bytes']['input']>;
  id_lte?: InputMaybe<Scalars['Bytes']['input']>;
  id_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  id_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  id_contains?: InputMaybe<Scalars['Bytes']['input']>;
  id_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  token0?: InputMaybe<Scalars['String']['input']>;
  token0_not?: InputMaybe<Scalars['String']['input']>;
  token0_gt?: InputMaybe<Scalars['String']['input']>;
  token0_lt?: InputMaybe<Scalars['String']['input']>;
  token0_gte?: InputMaybe<Scalars['String']['input']>;
  token0_lte?: InputMaybe<Scalars['String']['input']>;
  token0_in?: InputMaybe<Array<Scalars['String']['input']>>;
  token0_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  token0_contains?: InputMaybe<Scalars['String']['input']>;
  token0_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  token0_not_contains?: InputMaybe<Scalars['String']['input']>;
  token0_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  token0_starts_with?: InputMaybe<Scalars['String']['input']>;
  token0_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  token0_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  token0_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  token0_ends_with?: InputMaybe<Scalars['String']['input']>;
  token0_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  token0_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  token0_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  token0_?: InputMaybe<Token_filter>;
  token1?: InputMaybe<Scalars['String']['input']>;
  token1_not?: InputMaybe<Scalars['String']['input']>;
  token1_gt?: InputMaybe<Scalars['String']['input']>;
  token1_lt?: InputMaybe<Scalars['String']['input']>;
  token1_gte?: InputMaybe<Scalars['String']['input']>;
  token1_lte?: InputMaybe<Scalars['String']['input']>;
  token1_in?: InputMaybe<Array<Scalars['String']['input']>>;
  token1_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  token1_contains?: InputMaybe<Scalars['String']['input']>;
  token1_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  token1_not_contains?: InputMaybe<Scalars['String']['input']>;
  token1_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  token1_starts_with?: InputMaybe<Scalars['String']['input']>;
  token1_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  token1_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  token1_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  token1_ends_with?: InputMaybe<Scalars['String']['input']>;
  token1_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  token1_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  token1_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  token1_?: InputMaybe<Token_filter>;
  reserve0?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserve0_not?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserve0_gt?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserve0_lt?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserve0_gte?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserve0_lte?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserve0_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  reserve0_not_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  reserve1?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserve1_not?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserve1_gt?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserve1_lt?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserve1_gte?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserve1_lte?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserve1_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  reserve1_not_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  reserveUSD?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserveUSD_not?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserveUSD_gt?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserveUSD_lt?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserveUSD_gte?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserveUSD_lte?: InputMaybe<Scalars['BigDecimal']['input']>;
  reserveUSD_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  reserveUSD_not_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  totalSupply?: InputMaybe<Scalars['BigInt']['input']>;
  totalSupply_not?: InputMaybe<Scalars['BigInt']['input']>;
  totalSupply_gt?: InputMaybe<Scalars['BigInt']['input']>;
  totalSupply_lt?: InputMaybe<Scalars['BigInt']['input']>;
  totalSupply_gte?: InputMaybe<Scalars['BigInt']['input']>;
  totalSupply_lte?: InputMaybe<Scalars['BigInt']['input']>;
  totalSupply_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  totalSupply_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  volume0?: InputMaybe<Scalars['BigDecimal']['input']>;
  volume0_not?: InputMaybe<Scalars['BigDecimal']['input']>;
  volume0_gt?: InputMaybe<Scalars['BigDecimal']['input']>;
  volume0_lt?: InputMaybe<Scalars['BigDecimal']['input']>;
  volume0_gte?: InputMaybe<Scalars['BigDecimal']['input']>;
  volume0_lte?: InputMaybe<Scalars['BigDecimal']['input']>;
  volume0_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  volume0_not_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  volume1?: InputMaybe<Scalars['BigDecimal']['input']>;
  volume1_not?: InputMaybe<Scalars['BigDecimal']['input']>;
  volume1_gt?: InputMaybe<Scalars['BigDecimal']['input']>;
  volume1_lt?: InputMaybe<Scalars['BigDecimal']['input']>;
  volume1_gte?: InputMaybe<Scalars['BigDecimal']['input']>;
  volume1_lte?: InputMaybe<Scalars['BigDecimal']['input']>;
  volume1_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  volume1_not_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  volumeUSD?: InputMaybe<Scalars['BigDecimal']['input']>;
  volumeUSD_not?: InputMaybe<Scalars['BigDecimal']['input']>;
  volumeUSD_gt?: InputMaybe<Scalars['BigDecimal']['input']>;
  volumeUSD_lt?: InputMaybe<Scalars['BigDecimal']['input']>;
  volumeUSD_gte?: InputMaybe<Scalars['BigDecimal']['input']>;
  volumeUSD_lte?: InputMaybe<Scalars['BigDecimal']['input']>;
  volumeUSD_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  volumeUSD_not_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  txCount?: InputMaybe<Scalars['BigInt']['input']>;
  txCount_not?: InputMaybe<Scalars['BigInt']['input']>;
  txCount_gt?: InputMaybe<Scalars['BigInt']['input']>;
  txCount_lt?: InputMaybe<Scalars['BigInt']['input']>;
  txCount_gte?: InputMaybe<Scalars['BigInt']['input']>;
  txCount_lte?: InputMaybe<Scalars['BigInt']['input']>;
  txCount_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  txCount_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  lpFee?: InputMaybe<Scalars['BigDecimal']['input']>;
  lpFee_not?: InputMaybe<Scalars['BigDecimal']['input']>;
  lpFee_gt?: InputMaybe<Scalars['BigDecimal']['input']>;
  lpFee_lt?: InputMaybe<Scalars['BigDecimal']['input']>;
  lpFee_gte?: InputMaybe<Scalars['BigDecimal']['input']>;
  lpFee_lte?: InputMaybe<Scalars['BigDecimal']['input']>;
  lpFee_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  lpFee_not_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  protocolFee?: InputMaybe<Scalars['BigDecimal']['input']>;
  protocolFee_not?: InputMaybe<Scalars['BigDecimal']['input']>;
  protocolFee_gt?: InputMaybe<Scalars['BigDecimal']['input']>;
  protocolFee_lt?: InputMaybe<Scalars['BigDecimal']['input']>;
  protocolFee_gte?: InputMaybe<Scalars['BigDecimal']['input']>;
  protocolFee_lte?: InputMaybe<Scalars['BigDecimal']['input']>;
  protocolFee_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  protocolFee_not_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  royaltiesFee?: InputMaybe<Scalars['BigDecimal']['input']>;
  royaltiesFee_not?: InputMaybe<Scalars['BigDecimal']['input']>;
  royaltiesFee_gt?: InputMaybe<Scalars['BigDecimal']['input']>;
  royaltiesFee_lt?: InputMaybe<Scalars['BigDecimal']['input']>;
  royaltiesFee_gte?: InputMaybe<Scalars['BigDecimal']['input']>;
  royaltiesFee_lte?: InputMaybe<Scalars['BigDecimal']['input']>;
  royaltiesFee_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  royaltiesFee_not_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  royaltiesBeneficiary?: InputMaybe<Scalars['Bytes']['input']>;
  royaltiesBeneficiary_not?: InputMaybe<Scalars['Bytes']['input']>;
  royaltiesBeneficiary_gt?: InputMaybe<Scalars['Bytes']['input']>;
  royaltiesBeneficiary_lt?: InputMaybe<Scalars['Bytes']['input']>;
  royaltiesBeneficiary_gte?: InputMaybe<Scalars['Bytes']['input']>;
  royaltiesBeneficiary_lte?: InputMaybe<Scalars['Bytes']['input']>;
  royaltiesBeneficiary_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  royaltiesBeneficiary_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  royaltiesBeneficiary_contains?: InputMaybe<Scalars['Bytes']['input']>;
  royaltiesBeneficiary_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  totalFee?: InputMaybe<Scalars['BigDecimal']['input']>;
  totalFee_not?: InputMaybe<Scalars['BigDecimal']['input']>;
  totalFee_gt?: InputMaybe<Scalars['BigDecimal']['input']>;
  totalFee_lt?: InputMaybe<Scalars['BigDecimal']['input']>;
  totalFee_gte?: InputMaybe<Scalars['BigDecimal']['input']>;
  totalFee_lte?: InputMaybe<Scalars['BigDecimal']['input']>;
  totalFee_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  totalFee_not_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  transactions_?: InputMaybe<Transaction_filter>;
  liquidityPositions_?: InputMaybe<LiquidityPosition_filter>;
  dayData_?: InputMaybe<PairDayData_filter>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<Pair_filter>>>;
  or?: InputMaybe<Array<InputMaybe<Pair_filter>>>;
};

export type Pair_orderBy =
  | 'id'
  | 'token0'
  | 'token0__id'
  | 'token0__name'
  | 'token0__symbol'
  | 'token0__totalSupply'
  | 'token0__decimals'
  | 'token0__decimalDivisor'
  | 'token0__isNFT'
  | 'token0__isMAGIC'
  | 'token0__isETH'
  | 'token0__volume'
  | 'token0__volumeUSD'
  | 'token0__txCount'
  | 'token0__derivedMAGIC'
  | 'token1'
  | 'token1__id'
  | 'token1__name'
  | 'token1__symbol'
  | 'token1__totalSupply'
  | 'token1__decimals'
  | 'token1__decimalDivisor'
  | 'token1__isNFT'
  | 'token1__isMAGIC'
  | 'token1__isETH'
  | 'token1__volume'
  | 'token1__volumeUSD'
  | 'token1__txCount'
  | 'token1__derivedMAGIC'
  | 'reserve0'
  | 'reserve1'
  | 'reserveUSD'
  | 'totalSupply'
  | 'volume0'
  | 'volume1'
  | 'volumeUSD'
  | 'txCount'
  | 'lpFee'
  | 'protocolFee'
  | 'royaltiesFee'
  | 'royaltiesBeneficiary'
  | 'totalFee'
  | 'transactions'
  | 'liquidityPositions'
  | 'dayData';

export type Query = {
  factory?: Maybe<Factory>;
  factories: Array<Factory>;
  dayData?: Maybe<DayData>;
  dayDatas: Array<DayData>;
  collection?: Maybe<Collection>;
  collections: Array<Collection>;
  vaultCollection?: Maybe<VaultCollection>;
  vaultCollections: Array<VaultCollection>;
  token?: Maybe<Token>;
  tokens: Array<Token>;
  vaultReserveItem?: Maybe<VaultReserveItem>;
  vaultReserveItems: Array<VaultReserveItem>;
  pair?: Maybe<Pair>;
  pairs: Array<Pair>;
  pairDayData?: Maybe<PairDayData>;
  pairDayDatas: Array<PairDayData>;
  user?: Maybe<User>;
  users: Array<User>;
  liquidityPosition?: Maybe<LiquidityPosition>;
  liquidityPositions: Array<LiquidityPosition>;
  transaction?: Maybe<Transaction>;
  transactions: Array<Transaction>;
  transactionItem?: Maybe<TransactionItem>;
  transactionItems: Array<TransactionItem>;
  /** Access to subgraph metadata */
  _meta?: Maybe<_Meta_>;
};


export type QueryfactoryArgs = {
  id: Scalars['ID']['input'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryfactoriesArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Factory_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<Factory_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QuerydayDataArgs = {
  id: Scalars['ID']['input'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QuerydayDatasArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<DayData_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<DayData_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QuerycollectionArgs = {
  id: Scalars['ID']['input'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QuerycollectionsArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Collection_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<Collection_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryvaultCollectionArgs = {
  id: Scalars['ID']['input'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryvaultCollectionsArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<VaultCollection_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<VaultCollection_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QuerytokenArgs = {
  id: Scalars['ID']['input'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QuerytokensArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Token_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<Token_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryvaultReserveItemArgs = {
  id: Scalars['ID']['input'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryvaultReserveItemsArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<VaultReserveItem_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<VaultReserveItem_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QuerypairArgs = {
  id: Scalars['ID']['input'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QuerypairsArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Pair_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<Pair_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QuerypairDayDataArgs = {
  id: Scalars['ID']['input'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QuerypairDayDatasArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<PairDayData_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<PairDayData_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryuserArgs = {
  id: Scalars['ID']['input'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryusersArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<User_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<User_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryliquidityPositionArgs = {
  id: Scalars['ID']['input'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryliquidityPositionsArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<LiquidityPosition_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<LiquidityPosition_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QuerytransactionArgs = {
  id: Scalars['ID']['input'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QuerytransactionsArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Transaction_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<Transaction_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QuerytransactionItemArgs = {
  id: Scalars['ID']['input'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QuerytransactionItemsArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<TransactionItem_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<TransactionItem_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Query_metaArgs = {
  block?: InputMaybe<Block_height>;
};

export type Subscription = {
  factory?: Maybe<Factory>;
  factories: Array<Factory>;
  dayData?: Maybe<DayData>;
  dayDatas: Array<DayData>;
  collection?: Maybe<Collection>;
  collections: Array<Collection>;
  vaultCollection?: Maybe<VaultCollection>;
  vaultCollections: Array<VaultCollection>;
  token?: Maybe<Token>;
  tokens: Array<Token>;
  vaultReserveItem?: Maybe<VaultReserveItem>;
  vaultReserveItems: Array<VaultReserveItem>;
  pair?: Maybe<Pair>;
  pairs: Array<Pair>;
  pairDayData?: Maybe<PairDayData>;
  pairDayDatas: Array<PairDayData>;
  user?: Maybe<User>;
  users: Array<User>;
  liquidityPosition?: Maybe<LiquidityPosition>;
  liquidityPositions: Array<LiquidityPosition>;
  transaction?: Maybe<Transaction>;
  transactions: Array<Transaction>;
  transactionItem?: Maybe<TransactionItem>;
  transactionItems: Array<TransactionItem>;
  /** Access to subgraph metadata */
  _meta?: Maybe<_Meta_>;
};


export type SubscriptionfactoryArgs = {
  id: Scalars['ID']['input'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionfactoriesArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Factory_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<Factory_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptiondayDataArgs = {
  id: Scalars['ID']['input'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptiondayDatasArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<DayData_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<DayData_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptioncollectionArgs = {
  id: Scalars['ID']['input'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptioncollectionsArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Collection_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<Collection_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionvaultCollectionArgs = {
  id: Scalars['ID']['input'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionvaultCollectionsArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<VaultCollection_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<VaultCollection_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptiontokenArgs = {
  id: Scalars['ID']['input'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptiontokensArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Token_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<Token_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionvaultReserveItemArgs = {
  id: Scalars['ID']['input'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionvaultReserveItemsArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<VaultReserveItem_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<VaultReserveItem_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionpairArgs = {
  id: Scalars['ID']['input'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionpairsArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Pair_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<Pair_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionpairDayDataArgs = {
  id: Scalars['ID']['input'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionpairDayDatasArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<PairDayData_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<PairDayData_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionuserArgs = {
  id: Scalars['ID']['input'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionusersArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<User_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<User_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionliquidityPositionArgs = {
  id: Scalars['ID']['input'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionliquidityPositionsArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<LiquidityPosition_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<LiquidityPosition_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptiontransactionArgs = {
  id: Scalars['ID']['input'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptiontransactionsArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Transaction_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<Transaction_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptiontransactionItemArgs = {
  id: Scalars['ID']['input'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptiontransactionItemsArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<TransactionItem_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<TransactionItem_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Subscription_metaArgs = {
  block?: InputMaybe<Block_height>;
};

export type Token = {
  id: Scalars['Bytes']['output'];
  name: Scalars['String']['output'];
  symbol: Scalars['String']['output'];
  totalSupply: Scalars['BigInt']['output'];
  decimals: Scalars['BigInt']['output'];
  decimalDivisor: Scalars['BigDecimal']['output'];
  isNFT: Scalars['Boolean']['output'];
  isMAGIC: Scalars['Boolean']['output'];
  isETH: Scalars['Boolean']['output'];
  vaultCollections: Array<VaultCollection>;
  vaultReserveItems: Array<VaultReserveItem>;
  magicPairs: Array<Pair>;
  basePairs: Array<Pair>;
  quotePairs: Array<Pair>;
  volume: Scalars['BigDecimal']['output'];
  volumeUSD: Scalars['BigDecimal']['output'];
  txCount: Scalars['BigInt']['output'];
  derivedMAGIC: Scalars['BigDecimal']['output'];
};


export type TokenvaultCollectionsArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<VaultCollection_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<VaultCollection_filter>;
};


export type TokenvaultReserveItemsArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<VaultReserveItem_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<VaultReserveItem_filter>;
};


export type TokenmagicPairsArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Pair_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<Pair_filter>;
};


export type TokenbasePairsArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Pair_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<Pair_filter>;
};


export type TokenquotePairsArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Pair_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<Pair_filter>;
};

export type Token_filter = {
  id?: InputMaybe<Scalars['Bytes']['input']>;
  id_not?: InputMaybe<Scalars['Bytes']['input']>;
  id_gt?: InputMaybe<Scalars['Bytes']['input']>;
  id_lt?: InputMaybe<Scalars['Bytes']['input']>;
  id_gte?: InputMaybe<Scalars['Bytes']['input']>;
  id_lte?: InputMaybe<Scalars['Bytes']['input']>;
  id_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  id_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  id_contains?: InputMaybe<Scalars['Bytes']['input']>;
  id_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  name_not?: InputMaybe<Scalars['String']['input']>;
  name_gt?: InputMaybe<Scalars['String']['input']>;
  name_lt?: InputMaybe<Scalars['String']['input']>;
  name_gte?: InputMaybe<Scalars['String']['input']>;
  name_lte?: InputMaybe<Scalars['String']['input']>;
  name_in?: InputMaybe<Array<Scalars['String']['input']>>;
  name_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  name_contains?: InputMaybe<Scalars['String']['input']>;
  name_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  name_not_contains?: InputMaybe<Scalars['String']['input']>;
  name_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  name_starts_with?: InputMaybe<Scalars['String']['input']>;
  name_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  name_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  name_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  name_ends_with?: InputMaybe<Scalars['String']['input']>;
  name_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  name_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  name_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  symbol?: InputMaybe<Scalars['String']['input']>;
  symbol_not?: InputMaybe<Scalars['String']['input']>;
  symbol_gt?: InputMaybe<Scalars['String']['input']>;
  symbol_lt?: InputMaybe<Scalars['String']['input']>;
  symbol_gte?: InputMaybe<Scalars['String']['input']>;
  symbol_lte?: InputMaybe<Scalars['String']['input']>;
  symbol_in?: InputMaybe<Array<Scalars['String']['input']>>;
  symbol_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  symbol_contains?: InputMaybe<Scalars['String']['input']>;
  symbol_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  symbol_not_contains?: InputMaybe<Scalars['String']['input']>;
  symbol_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  symbol_starts_with?: InputMaybe<Scalars['String']['input']>;
  symbol_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  symbol_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  symbol_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  symbol_ends_with?: InputMaybe<Scalars['String']['input']>;
  symbol_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  symbol_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  symbol_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  totalSupply?: InputMaybe<Scalars['BigInt']['input']>;
  totalSupply_not?: InputMaybe<Scalars['BigInt']['input']>;
  totalSupply_gt?: InputMaybe<Scalars['BigInt']['input']>;
  totalSupply_lt?: InputMaybe<Scalars['BigInt']['input']>;
  totalSupply_gte?: InputMaybe<Scalars['BigInt']['input']>;
  totalSupply_lte?: InputMaybe<Scalars['BigInt']['input']>;
  totalSupply_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  totalSupply_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  decimals?: InputMaybe<Scalars['BigInt']['input']>;
  decimals_not?: InputMaybe<Scalars['BigInt']['input']>;
  decimals_gt?: InputMaybe<Scalars['BigInt']['input']>;
  decimals_lt?: InputMaybe<Scalars['BigInt']['input']>;
  decimals_gte?: InputMaybe<Scalars['BigInt']['input']>;
  decimals_lte?: InputMaybe<Scalars['BigInt']['input']>;
  decimals_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  decimals_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  decimalDivisor?: InputMaybe<Scalars['BigDecimal']['input']>;
  decimalDivisor_not?: InputMaybe<Scalars['BigDecimal']['input']>;
  decimalDivisor_gt?: InputMaybe<Scalars['BigDecimal']['input']>;
  decimalDivisor_lt?: InputMaybe<Scalars['BigDecimal']['input']>;
  decimalDivisor_gte?: InputMaybe<Scalars['BigDecimal']['input']>;
  decimalDivisor_lte?: InputMaybe<Scalars['BigDecimal']['input']>;
  decimalDivisor_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  decimalDivisor_not_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  isNFT?: InputMaybe<Scalars['Boolean']['input']>;
  isNFT_not?: InputMaybe<Scalars['Boolean']['input']>;
  isNFT_in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
  isNFT_not_in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
  isMAGIC?: InputMaybe<Scalars['Boolean']['input']>;
  isMAGIC_not?: InputMaybe<Scalars['Boolean']['input']>;
  isMAGIC_in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
  isMAGIC_not_in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
  isETH?: InputMaybe<Scalars['Boolean']['input']>;
  isETH_not?: InputMaybe<Scalars['Boolean']['input']>;
  isETH_in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
  isETH_not_in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
  vaultCollections_?: InputMaybe<VaultCollection_filter>;
  vaultReserveItems_?: InputMaybe<VaultReserveItem_filter>;
  magicPairs?: InputMaybe<Array<Scalars['String']['input']>>;
  magicPairs_not?: InputMaybe<Array<Scalars['String']['input']>>;
  magicPairs_contains?: InputMaybe<Array<Scalars['String']['input']>>;
  magicPairs_contains_nocase?: InputMaybe<Array<Scalars['String']['input']>>;
  magicPairs_not_contains?: InputMaybe<Array<Scalars['String']['input']>>;
  magicPairs_not_contains_nocase?: InputMaybe<Array<Scalars['String']['input']>>;
  magicPairs_?: InputMaybe<Pair_filter>;
  basePairs_?: InputMaybe<Pair_filter>;
  quotePairs_?: InputMaybe<Pair_filter>;
  volume?: InputMaybe<Scalars['BigDecimal']['input']>;
  volume_not?: InputMaybe<Scalars['BigDecimal']['input']>;
  volume_gt?: InputMaybe<Scalars['BigDecimal']['input']>;
  volume_lt?: InputMaybe<Scalars['BigDecimal']['input']>;
  volume_gte?: InputMaybe<Scalars['BigDecimal']['input']>;
  volume_lte?: InputMaybe<Scalars['BigDecimal']['input']>;
  volume_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  volume_not_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  volumeUSD?: InputMaybe<Scalars['BigDecimal']['input']>;
  volumeUSD_not?: InputMaybe<Scalars['BigDecimal']['input']>;
  volumeUSD_gt?: InputMaybe<Scalars['BigDecimal']['input']>;
  volumeUSD_lt?: InputMaybe<Scalars['BigDecimal']['input']>;
  volumeUSD_gte?: InputMaybe<Scalars['BigDecimal']['input']>;
  volumeUSD_lte?: InputMaybe<Scalars['BigDecimal']['input']>;
  volumeUSD_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  volumeUSD_not_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  txCount?: InputMaybe<Scalars['BigInt']['input']>;
  txCount_not?: InputMaybe<Scalars['BigInt']['input']>;
  txCount_gt?: InputMaybe<Scalars['BigInt']['input']>;
  txCount_lt?: InputMaybe<Scalars['BigInt']['input']>;
  txCount_gte?: InputMaybe<Scalars['BigInt']['input']>;
  txCount_lte?: InputMaybe<Scalars['BigInt']['input']>;
  txCount_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  txCount_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  derivedMAGIC?: InputMaybe<Scalars['BigDecimal']['input']>;
  derivedMAGIC_not?: InputMaybe<Scalars['BigDecimal']['input']>;
  derivedMAGIC_gt?: InputMaybe<Scalars['BigDecimal']['input']>;
  derivedMAGIC_lt?: InputMaybe<Scalars['BigDecimal']['input']>;
  derivedMAGIC_gte?: InputMaybe<Scalars['BigDecimal']['input']>;
  derivedMAGIC_lte?: InputMaybe<Scalars['BigDecimal']['input']>;
  derivedMAGIC_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  derivedMAGIC_not_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<Token_filter>>>;
  or?: InputMaybe<Array<InputMaybe<Token_filter>>>;
};

export type Token_orderBy =
  | 'id'
  | 'name'
  | 'symbol'
  | 'totalSupply'
  | 'decimals'
  | 'decimalDivisor'
  | 'isNFT'
  | 'isMAGIC'
  | 'isETH'
  | 'vaultCollections'
  | 'vaultReserveItems'
  | 'magicPairs'
  | 'basePairs'
  | 'quotePairs'
  | 'volume'
  | 'volumeUSD'
  | 'txCount'
  | 'derivedMAGIC';

export type Transaction = {
  id: Scalars['Bytes']['output'];
  hash: Scalars['Bytes']['output'];
  timestamp: Scalars['BigInt']['output'];
  type?: Maybe<TransactionType>;
  user?: Maybe<User>;
  pair?: Maybe<Pair>;
  amount0: Scalars['BigDecimal']['output'];
  amount1: Scalars['BigDecimal']['output'];
  amountUSD: Scalars['BigDecimal']['output'];
  isAmount1Out?: Maybe<Scalars['Boolean']['output']>;
  items: Array<TransactionItem>;
};


export type TransactionitemsArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<TransactionItem_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<TransactionItem_filter>;
};

export type TransactionItem = {
  id: Scalars['Bytes']['output'];
  transaction: Transaction;
  vault: Token;
  collection: Collection;
  tokenId: Scalars['BigInt']['output'];
  amount: Scalars['Int']['output'];
};

export type TransactionItem_filter = {
  id?: InputMaybe<Scalars['Bytes']['input']>;
  id_not?: InputMaybe<Scalars['Bytes']['input']>;
  id_gt?: InputMaybe<Scalars['Bytes']['input']>;
  id_lt?: InputMaybe<Scalars['Bytes']['input']>;
  id_gte?: InputMaybe<Scalars['Bytes']['input']>;
  id_lte?: InputMaybe<Scalars['Bytes']['input']>;
  id_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  id_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  id_contains?: InputMaybe<Scalars['Bytes']['input']>;
  id_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  transaction?: InputMaybe<Scalars['String']['input']>;
  transaction_not?: InputMaybe<Scalars['String']['input']>;
  transaction_gt?: InputMaybe<Scalars['String']['input']>;
  transaction_lt?: InputMaybe<Scalars['String']['input']>;
  transaction_gte?: InputMaybe<Scalars['String']['input']>;
  transaction_lte?: InputMaybe<Scalars['String']['input']>;
  transaction_in?: InputMaybe<Array<Scalars['String']['input']>>;
  transaction_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  transaction_contains?: InputMaybe<Scalars['String']['input']>;
  transaction_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  transaction_not_contains?: InputMaybe<Scalars['String']['input']>;
  transaction_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  transaction_starts_with?: InputMaybe<Scalars['String']['input']>;
  transaction_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  transaction_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  transaction_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  transaction_ends_with?: InputMaybe<Scalars['String']['input']>;
  transaction_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  transaction_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  transaction_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  transaction_?: InputMaybe<Transaction_filter>;
  vault?: InputMaybe<Scalars['String']['input']>;
  vault_not?: InputMaybe<Scalars['String']['input']>;
  vault_gt?: InputMaybe<Scalars['String']['input']>;
  vault_lt?: InputMaybe<Scalars['String']['input']>;
  vault_gte?: InputMaybe<Scalars['String']['input']>;
  vault_lte?: InputMaybe<Scalars['String']['input']>;
  vault_in?: InputMaybe<Array<Scalars['String']['input']>>;
  vault_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  vault_contains?: InputMaybe<Scalars['String']['input']>;
  vault_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  vault_not_contains?: InputMaybe<Scalars['String']['input']>;
  vault_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  vault_starts_with?: InputMaybe<Scalars['String']['input']>;
  vault_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  vault_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  vault_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  vault_ends_with?: InputMaybe<Scalars['String']['input']>;
  vault_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  vault_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  vault_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  vault_?: InputMaybe<Token_filter>;
  collection?: InputMaybe<Scalars['String']['input']>;
  collection_not?: InputMaybe<Scalars['String']['input']>;
  collection_gt?: InputMaybe<Scalars['String']['input']>;
  collection_lt?: InputMaybe<Scalars['String']['input']>;
  collection_gte?: InputMaybe<Scalars['String']['input']>;
  collection_lte?: InputMaybe<Scalars['String']['input']>;
  collection_in?: InputMaybe<Array<Scalars['String']['input']>>;
  collection_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  collection_contains?: InputMaybe<Scalars['String']['input']>;
  collection_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  collection_not_contains?: InputMaybe<Scalars['String']['input']>;
  collection_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  collection_starts_with?: InputMaybe<Scalars['String']['input']>;
  collection_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  collection_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  collection_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  collection_ends_with?: InputMaybe<Scalars['String']['input']>;
  collection_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  collection_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  collection_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  collection_?: InputMaybe<Collection_filter>;
  tokenId?: InputMaybe<Scalars['BigInt']['input']>;
  tokenId_not?: InputMaybe<Scalars['BigInt']['input']>;
  tokenId_gt?: InputMaybe<Scalars['BigInt']['input']>;
  tokenId_lt?: InputMaybe<Scalars['BigInt']['input']>;
  tokenId_gte?: InputMaybe<Scalars['BigInt']['input']>;
  tokenId_lte?: InputMaybe<Scalars['BigInt']['input']>;
  tokenId_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  tokenId_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  amount?: InputMaybe<Scalars['Int']['input']>;
  amount_not?: InputMaybe<Scalars['Int']['input']>;
  amount_gt?: InputMaybe<Scalars['Int']['input']>;
  amount_lt?: InputMaybe<Scalars['Int']['input']>;
  amount_gte?: InputMaybe<Scalars['Int']['input']>;
  amount_lte?: InputMaybe<Scalars['Int']['input']>;
  amount_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  amount_not_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<TransactionItem_filter>>>;
  or?: InputMaybe<Array<InputMaybe<TransactionItem_filter>>>;
};

export type TransactionItem_orderBy =
  | 'id'
  | 'transaction'
  | 'transaction__id'
  | 'transaction__hash'
  | 'transaction__timestamp'
  | 'transaction__type'
  | 'transaction__amount0'
  | 'transaction__amount1'
  | 'transaction__amountUSD'
  | 'transaction__isAmount1Out'
  | 'vault'
  | 'vault__id'
  | 'vault__name'
  | 'vault__symbol'
  | 'vault__totalSupply'
  | 'vault__decimals'
  | 'vault__decimalDivisor'
  | 'vault__isNFT'
  | 'vault__isMAGIC'
  | 'vault__isETH'
  | 'vault__volume'
  | 'vault__volumeUSD'
  | 'vault__txCount'
  | 'vault__derivedMAGIC'
  | 'collection'
  | 'collection__id'
  | 'collection__type'
  | 'tokenId'
  | 'amount';

export type TransactionType =
  | 'Swap'
  | 'Deposit'
  | 'Withdrawal';

export type Transaction_filter = {
  id?: InputMaybe<Scalars['Bytes']['input']>;
  id_not?: InputMaybe<Scalars['Bytes']['input']>;
  id_gt?: InputMaybe<Scalars['Bytes']['input']>;
  id_lt?: InputMaybe<Scalars['Bytes']['input']>;
  id_gte?: InputMaybe<Scalars['Bytes']['input']>;
  id_lte?: InputMaybe<Scalars['Bytes']['input']>;
  id_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  id_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  id_contains?: InputMaybe<Scalars['Bytes']['input']>;
  id_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  hash?: InputMaybe<Scalars['Bytes']['input']>;
  hash_not?: InputMaybe<Scalars['Bytes']['input']>;
  hash_gt?: InputMaybe<Scalars['Bytes']['input']>;
  hash_lt?: InputMaybe<Scalars['Bytes']['input']>;
  hash_gte?: InputMaybe<Scalars['Bytes']['input']>;
  hash_lte?: InputMaybe<Scalars['Bytes']['input']>;
  hash_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  hash_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  hash_contains?: InputMaybe<Scalars['Bytes']['input']>;
  hash_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  timestamp?: InputMaybe<Scalars['BigInt']['input']>;
  timestamp_not?: InputMaybe<Scalars['BigInt']['input']>;
  timestamp_gt?: InputMaybe<Scalars['BigInt']['input']>;
  timestamp_lt?: InputMaybe<Scalars['BigInt']['input']>;
  timestamp_gte?: InputMaybe<Scalars['BigInt']['input']>;
  timestamp_lte?: InputMaybe<Scalars['BigInt']['input']>;
  timestamp_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  timestamp_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  type?: InputMaybe<TransactionType>;
  type_not?: InputMaybe<TransactionType>;
  type_in?: InputMaybe<Array<TransactionType>>;
  type_not_in?: InputMaybe<Array<TransactionType>>;
  user?: InputMaybe<Scalars['String']['input']>;
  user_not?: InputMaybe<Scalars['String']['input']>;
  user_gt?: InputMaybe<Scalars['String']['input']>;
  user_lt?: InputMaybe<Scalars['String']['input']>;
  user_gte?: InputMaybe<Scalars['String']['input']>;
  user_lte?: InputMaybe<Scalars['String']['input']>;
  user_in?: InputMaybe<Array<Scalars['String']['input']>>;
  user_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  user_contains?: InputMaybe<Scalars['String']['input']>;
  user_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  user_not_contains?: InputMaybe<Scalars['String']['input']>;
  user_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  user_starts_with?: InputMaybe<Scalars['String']['input']>;
  user_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  user_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  user_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  user_ends_with?: InputMaybe<Scalars['String']['input']>;
  user_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  user_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  user_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  user_?: InputMaybe<User_filter>;
  pair?: InputMaybe<Scalars['String']['input']>;
  pair_not?: InputMaybe<Scalars['String']['input']>;
  pair_gt?: InputMaybe<Scalars['String']['input']>;
  pair_lt?: InputMaybe<Scalars['String']['input']>;
  pair_gte?: InputMaybe<Scalars['String']['input']>;
  pair_lte?: InputMaybe<Scalars['String']['input']>;
  pair_in?: InputMaybe<Array<Scalars['String']['input']>>;
  pair_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  pair_contains?: InputMaybe<Scalars['String']['input']>;
  pair_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  pair_not_contains?: InputMaybe<Scalars['String']['input']>;
  pair_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  pair_starts_with?: InputMaybe<Scalars['String']['input']>;
  pair_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  pair_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  pair_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  pair_ends_with?: InputMaybe<Scalars['String']['input']>;
  pair_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  pair_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  pair_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  pair_?: InputMaybe<Pair_filter>;
  amount0?: InputMaybe<Scalars['BigDecimal']['input']>;
  amount0_not?: InputMaybe<Scalars['BigDecimal']['input']>;
  amount0_gt?: InputMaybe<Scalars['BigDecimal']['input']>;
  amount0_lt?: InputMaybe<Scalars['BigDecimal']['input']>;
  amount0_gte?: InputMaybe<Scalars['BigDecimal']['input']>;
  amount0_lte?: InputMaybe<Scalars['BigDecimal']['input']>;
  amount0_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  amount0_not_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  amount1?: InputMaybe<Scalars['BigDecimal']['input']>;
  amount1_not?: InputMaybe<Scalars['BigDecimal']['input']>;
  amount1_gt?: InputMaybe<Scalars['BigDecimal']['input']>;
  amount1_lt?: InputMaybe<Scalars['BigDecimal']['input']>;
  amount1_gte?: InputMaybe<Scalars['BigDecimal']['input']>;
  amount1_lte?: InputMaybe<Scalars['BigDecimal']['input']>;
  amount1_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  amount1_not_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  amountUSD?: InputMaybe<Scalars['BigDecimal']['input']>;
  amountUSD_not?: InputMaybe<Scalars['BigDecimal']['input']>;
  amountUSD_gt?: InputMaybe<Scalars['BigDecimal']['input']>;
  amountUSD_lt?: InputMaybe<Scalars['BigDecimal']['input']>;
  amountUSD_gte?: InputMaybe<Scalars['BigDecimal']['input']>;
  amountUSD_lte?: InputMaybe<Scalars['BigDecimal']['input']>;
  amountUSD_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  amountUSD_not_in?: InputMaybe<Array<Scalars['BigDecimal']['input']>>;
  isAmount1Out?: InputMaybe<Scalars['Boolean']['input']>;
  isAmount1Out_not?: InputMaybe<Scalars['Boolean']['input']>;
  isAmount1Out_in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
  isAmount1Out_not_in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
  items_?: InputMaybe<TransactionItem_filter>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<Transaction_filter>>>;
  or?: InputMaybe<Array<InputMaybe<Transaction_filter>>>;
};

export type Transaction_orderBy =
  | 'id'
  | 'hash'
  | 'timestamp'
  | 'type'
  | 'user'
  | 'user__id'
  | 'user__liquidityPositionCount'
  | 'pair'
  | 'pair__id'
  | 'pair__reserve0'
  | 'pair__reserve1'
  | 'pair__reserveUSD'
  | 'pair__totalSupply'
  | 'pair__volume0'
  | 'pair__volume1'
  | 'pair__volumeUSD'
  | 'pair__txCount'
  | 'pair__lpFee'
  | 'pair__protocolFee'
  | 'pair__royaltiesFee'
  | 'pair__royaltiesBeneficiary'
  | 'pair__totalFee'
  | 'amount0'
  | 'amount1'
  | 'amountUSD'
  | 'isAmount1Out'
  | 'items';

export type User = {
  id: Scalars['Bytes']['output'];
  liquidityPositionCount: Scalars['BigInt']['output'];
  transactions: Array<Transaction>;
  liquidityPositions: Array<LiquidityPosition>;
};


export type UsertransactionsArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Transaction_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<Transaction_filter>;
};


export type UserliquidityPositionsArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<LiquidityPosition_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<LiquidityPosition_filter>;
};

export type User_filter = {
  id?: InputMaybe<Scalars['Bytes']['input']>;
  id_not?: InputMaybe<Scalars['Bytes']['input']>;
  id_gt?: InputMaybe<Scalars['Bytes']['input']>;
  id_lt?: InputMaybe<Scalars['Bytes']['input']>;
  id_gte?: InputMaybe<Scalars['Bytes']['input']>;
  id_lte?: InputMaybe<Scalars['Bytes']['input']>;
  id_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  id_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  id_contains?: InputMaybe<Scalars['Bytes']['input']>;
  id_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  liquidityPositionCount?: InputMaybe<Scalars['BigInt']['input']>;
  liquidityPositionCount_not?: InputMaybe<Scalars['BigInt']['input']>;
  liquidityPositionCount_gt?: InputMaybe<Scalars['BigInt']['input']>;
  liquidityPositionCount_lt?: InputMaybe<Scalars['BigInt']['input']>;
  liquidityPositionCount_gte?: InputMaybe<Scalars['BigInt']['input']>;
  liquidityPositionCount_lte?: InputMaybe<Scalars['BigInt']['input']>;
  liquidityPositionCount_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  liquidityPositionCount_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  transactions_?: InputMaybe<Transaction_filter>;
  liquidityPositions_?: InputMaybe<LiquidityPosition_filter>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<User_filter>>>;
  or?: InputMaybe<Array<InputMaybe<User_filter>>>;
};

export type User_orderBy =
  | 'id'
  | 'liquidityPositionCount'
  | 'transactions'
  | 'liquidityPositions';

export type VaultCollection = {
  id: Scalars['Bytes']['output'];
  vault: Token;
  collection: Collection;
  tokenIds?: Maybe<Array<Scalars['BigInt']['output']>>;
};

export type VaultCollection_filter = {
  id?: InputMaybe<Scalars['Bytes']['input']>;
  id_not?: InputMaybe<Scalars['Bytes']['input']>;
  id_gt?: InputMaybe<Scalars['Bytes']['input']>;
  id_lt?: InputMaybe<Scalars['Bytes']['input']>;
  id_gte?: InputMaybe<Scalars['Bytes']['input']>;
  id_lte?: InputMaybe<Scalars['Bytes']['input']>;
  id_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  id_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  id_contains?: InputMaybe<Scalars['Bytes']['input']>;
  id_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  vault?: InputMaybe<Scalars['String']['input']>;
  vault_not?: InputMaybe<Scalars['String']['input']>;
  vault_gt?: InputMaybe<Scalars['String']['input']>;
  vault_lt?: InputMaybe<Scalars['String']['input']>;
  vault_gte?: InputMaybe<Scalars['String']['input']>;
  vault_lte?: InputMaybe<Scalars['String']['input']>;
  vault_in?: InputMaybe<Array<Scalars['String']['input']>>;
  vault_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  vault_contains?: InputMaybe<Scalars['String']['input']>;
  vault_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  vault_not_contains?: InputMaybe<Scalars['String']['input']>;
  vault_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  vault_starts_with?: InputMaybe<Scalars['String']['input']>;
  vault_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  vault_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  vault_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  vault_ends_with?: InputMaybe<Scalars['String']['input']>;
  vault_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  vault_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  vault_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  vault_?: InputMaybe<Token_filter>;
  collection?: InputMaybe<Scalars['String']['input']>;
  collection_not?: InputMaybe<Scalars['String']['input']>;
  collection_gt?: InputMaybe<Scalars['String']['input']>;
  collection_lt?: InputMaybe<Scalars['String']['input']>;
  collection_gte?: InputMaybe<Scalars['String']['input']>;
  collection_lte?: InputMaybe<Scalars['String']['input']>;
  collection_in?: InputMaybe<Array<Scalars['String']['input']>>;
  collection_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  collection_contains?: InputMaybe<Scalars['String']['input']>;
  collection_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  collection_not_contains?: InputMaybe<Scalars['String']['input']>;
  collection_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  collection_starts_with?: InputMaybe<Scalars['String']['input']>;
  collection_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  collection_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  collection_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  collection_ends_with?: InputMaybe<Scalars['String']['input']>;
  collection_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  collection_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  collection_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  collection_?: InputMaybe<Collection_filter>;
  tokenIds?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  tokenIds_not?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  tokenIds_contains?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  tokenIds_contains_nocase?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  tokenIds_not_contains?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  tokenIds_not_contains_nocase?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<VaultCollection_filter>>>;
  or?: InputMaybe<Array<InputMaybe<VaultCollection_filter>>>;
};

export type VaultCollection_orderBy =
  | 'id'
  | 'vault'
  | 'vault__id'
  | 'vault__name'
  | 'vault__symbol'
  | 'vault__totalSupply'
  | 'vault__decimals'
  | 'vault__decimalDivisor'
  | 'vault__isNFT'
  | 'vault__isMAGIC'
  | 'vault__isETH'
  | 'vault__volume'
  | 'vault__volumeUSD'
  | 'vault__txCount'
  | 'vault__derivedMAGIC'
  | 'collection'
  | 'collection__id'
  | 'collection__type'
  | 'tokenIds';

export type VaultReserveItem = {
  id: Scalars['Bytes']['output'];
  vault: Token;
  collection: Collection;
  tokenId: Scalars['BigInt']['output'];
  amount: Scalars['Int']['output'];
};

export type VaultReserveItem_filter = {
  id?: InputMaybe<Scalars['Bytes']['input']>;
  id_not?: InputMaybe<Scalars['Bytes']['input']>;
  id_gt?: InputMaybe<Scalars['Bytes']['input']>;
  id_lt?: InputMaybe<Scalars['Bytes']['input']>;
  id_gte?: InputMaybe<Scalars['Bytes']['input']>;
  id_lte?: InputMaybe<Scalars['Bytes']['input']>;
  id_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  id_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  id_contains?: InputMaybe<Scalars['Bytes']['input']>;
  id_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  vault?: InputMaybe<Scalars['String']['input']>;
  vault_not?: InputMaybe<Scalars['String']['input']>;
  vault_gt?: InputMaybe<Scalars['String']['input']>;
  vault_lt?: InputMaybe<Scalars['String']['input']>;
  vault_gte?: InputMaybe<Scalars['String']['input']>;
  vault_lte?: InputMaybe<Scalars['String']['input']>;
  vault_in?: InputMaybe<Array<Scalars['String']['input']>>;
  vault_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  vault_contains?: InputMaybe<Scalars['String']['input']>;
  vault_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  vault_not_contains?: InputMaybe<Scalars['String']['input']>;
  vault_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  vault_starts_with?: InputMaybe<Scalars['String']['input']>;
  vault_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  vault_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  vault_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  vault_ends_with?: InputMaybe<Scalars['String']['input']>;
  vault_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  vault_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  vault_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  vault_?: InputMaybe<Token_filter>;
  collection?: InputMaybe<Scalars['String']['input']>;
  collection_not?: InputMaybe<Scalars['String']['input']>;
  collection_gt?: InputMaybe<Scalars['String']['input']>;
  collection_lt?: InputMaybe<Scalars['String']['input']>;
  collection_gte?: InputMaybe<Scalars['String']['input']>;
  collection_lte?: InputMaybe<Scalars['String']['input']>;
  collection_in?: InputMaybe<Array<Scalars['String']['input']>>;
  collection_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  collection_contains?: InputMaybe<Scalars['String']['input']>;
  collection_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  collection_not_contains?: InputMaybe<Scalars['String']['input']>;
  collection_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  collection_starts_with?: InputMaybe<Scalars['String']['input']>;
  collection_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  collection_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  collection_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  collection_ends_with?: InputMaybe<Scalars['String']['input']>;
  collection_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  collection_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  collection_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  collection_?: InputMaybe<Collection_filter>;
  tokenId?: InputMaybe<Scalars['BigInt']['input']>;
  tokenId_not?: InputMaybe<Scalars['BigInt']['input']>;
  tokenId_gt?: InputMaybe<Scalars['BigInt']['input']>;
  tokenId_lt?: InputMaybe<Scalars['BigInt']['input']>;
  tokenId_gte?: InputMaybe<Scalars['BigInt']['input']>;
  tokenId_lte?: InputMaybe<Scalars['BigInt']['input']>;
  tokenId_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  tokenId_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  amount?: InputMaybe<Scalars['Int']['input']>;
  amount_not?: InputMaybe<Scalars['Int']['input']>;
  amount_gt?: InputMaybe<Scalars['Int']['input']>;
  amount_lt?: InputMaybe<Scalars['Int']['input']>;
  amount_gte?: InputMaybe<Scalars['Int']['input']>;
  amount_lte?: InputMaybe<Scalars['Int']['input']>;
  amount_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  amount_not_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<VaultReserveItem_filter>>>;
  or?: InputMaybe<Array<InputMaybe<VaultReserveItem_filter>>>;
};

export type VaultReserveItem_orderBy =
  | 'id'
  | 'vault'
  | 'vault__id'
  | 'vault__name'
  | 'vault__symbol'
  | 'vault__totalSupply'
  | 'vault__decimals'
  | 'vault__decimalDivisor'
  | 'vault__isNFT'
  | 'vault__isMAGIC'
  | 'vault__isETH'
  | 'vault__volume'
  | 'vault__volumeUSD'
  | 'vault__txCount'
  | 'vault__derivedMAGIC'
  | 'collection'
  | 'collection__id'
  | 'collection__type'
  | 'tokenId'
  | 'amount';

export type _Block_ = {
  /** The hash of the block */
  hash?: Maybe<Scalars['Bytes']['output']>;
  /** The block number */
  number: Scalars['Int']['output'];
  /** Integer representation of the timestamp stored in blocks for the chain */
  timestamp?: Maybe<Scalars['Int']['output']>;
  /** The hash of the parent block */
  parentHash?: Maybe<Scalars['Bytes']['output']>;
};

/** The type for the top-level _meta field */
export type _Meta_ = {
  /**
   * Information about a specific subgraph block. The hash of the block
   * will be null if the _meta field has a block constraint that asks for
   * a block number. It will be filled if the _meta field has no block constraint
   * and therefore asks for the latest  block
   *
   */
  block: _Block_;
  /** The deployment ID */
  deployment: Scalars['String']['output'];
  /** If `true`, the subgraph encountered indexing errors at some past block */
  hasIndexingErrors: Scalars['Boolean']['output'];
};

export type _SubgraphErrorPolicy_ =
  /** Data will be returned even if the subgraph has indexing errors */
  | 'allow'
  /** If the subgraph has indexing errors, data will be omitted. The default. */
  | 'deny';

  export type QuerySdk = {
      /** null **/
  factory: InContextSdkMethod<Query['factory'], QueryfactoryArgs, MeshContext>,
  /** null **/
  factories: InContextSdkMethod<Query['factories'], QueryfactoriesArgs, MeshContext>,
  /** null **/
  dayData: InContextSdkMethod<Query['dayData'], QuerydayDataArgs, MeshContext>,
  /** null **/
  dayDatas: InContextSdkMethod<Query['dayDatas'], QuerydayDatasArgs, MeshContext>,
  /** null **/
  collection: InContextSdkMethod<Query['collection'], QuerycollectionArgs, MeshContext>,
  /** null **/
  collections: InContextSdkMethod<Query['collections'], QuerycollectionsArgs, MeshContext>,
  /** null **/
  vaultCollection: InContextSdkMethod<Query['vaultCollection'], QueryvaultCollectionArgs, MeshContext>,
  /** null **/
  vaultCollections: InContextSdkMethod<Query['vaultCollections'], QueryvaultCollectionsArgs, MeshContext>,
  /** null **/
  token: InContextSdkMethod<Query['token'], QuerytokenArgs, MeshContext>,
  /** null **/
  tokens: InContextSdkMethod<Query['tokens'], QuerytokensArgs, MeshContext>,
  /** null **/
  vaultReserveItem: InContextSdkMethod<Query['vaultReserveItem'], QueryvaultReserveItemArgs, MeshContext>,
  /** null **/
  vaultReserveItems: InContextSdkMethod<Query['vaultReserveItems'], QueryvaultReserveItemsArgs, MeshContext>,
  /** null **/
  pair: InContextSdkMethod<Query['pair'], QuerypairArgs, MeshContext>,
  /** null **/
  pairs: InContextSdkMethod<Query['pairs'], QuerypairsArgs, MeshContext>,
  /** null **/
  pairDayData: InContextSdkMethod<Query['pairDayData'], QuerypairDayDataArgs, MeshContext>,
  /** null **/
  pairDayDatas: InContextSdkMethod<Query['pairDayDatas'], QuerypairDayDatasArgs, MeshContext>,
  /** null **/
  user: InContextSdkMethod<Query['user'], QueryuserArgs, MeshContext>,
  /** null **/
  users: InContextSdkMethod<Query['users'], QueryusersArgs, MeshContext>,
  /** null **/
  liquidityPosition: InContextSdkMethod<Query['liquidityPosition'], QueryliquidityPositionArgs, MeshContext>,
  /** null **/
  liquidityPositions: InContextSdkMethod<Query['liquidityPositions'], QueryliquidityPositionsArgs, MeshContext>,
  /** null **/
  transaction: InContextSdkMethod<Query['transaction'], QuerytransactionArgs, MeshContext>,
  /** null **/
  transactions: InContextSdkMethod<Query['transactions'], QuerytransactionsArgs, MeshContext>,
  /** null **/
  transactionItem: InContextSdkMethod<Query['transactionItem'], QuerytransactionItemArgs, MeshContext>,
  /** null **/
  transactionItems: InContextSdkMethod<Query['transactionItems'], QuerytransactionItemsArgs, MeshContext>,
  /** Access to subgraph metadata **/
  _meta: InContextSdkMethod<Query['_meta'], Query_metaArgs, MeshContext>
  };

  export type MutationSdk = {
    
  };

  export type SubscriptionSdk = {
      /** null **/
  factory: InContextSdkMethod<Subscription['factory'], SubscriptionfactoryArgs, MeshContext>,
  /** null **/
  factories: InContextSdkMethod<Subscription['factories'], SubscriptionfactoriesArgs, MeshContext>,
  /** null **/
  dayData: InContextSdkMethod<Subscription['dayData'], SubscriptiondayDataArgs, MeshContext>,
  /** null **/
  dayDatas: InContextSdkMethod<Subscription['dayDatas'], SubscriptiondayDatasArgs, MeshContext>,
  /** null **/
  collection: InContextSdkMethod<Subscription['collection'], SubscriptioncollectionArgs, MeshContext>,
  /** null **/
  collections: InContextSdkMethod<Subscription['collections'], SubscriptioncollectionsArgs, MeshContext>,
  /** null **/
  vaultCollection: InContextSdkMethod<Subscription['vaultCollection'], SubscriptionvaultCollectionArgs, MeshContext>,
  /** null **/
  vaultCollections: InContextSdkMethod<Subscription['vaultCollections'], SubscriptionvaultCollectionsArgs, MeshContext>,
  /** null **/
  token: InContextSdkMethod<Subscription['token'], SubscriptiontokenArgs, MeshContext>,
  /** null **/
  tokens: InContextSdkMethod<Subscription['tokens'], SubscriptiontokensArgs, MeshContext>,
  /** null **/
  vaultReserveItem: InContextSdkMethod<Subscription['vaultReserveItem'], SubscriptionvaultReserveItemArgs, MeshContext>,
  /** null **/
  vaultReserveItems: InContextSdkMethod<Subscription['vaultReserveItems'], SubscriptionvaultReserveItemsArgs, MeshContext>,
  /** null **/
  pair: InContextSdkMethod<Subscription['pair'], SubscriptionpairArgs, MeshContext>,
  /** null **/
  pairs: InContextSdkMethod<Subscription['pairs'], SubscriptionpairsArgs, MeshContext>,
  /** null **/
  pairDayData: InContextSdkMethod<Subscription['pairDayData'], SubscriptionpairDayDataArgs, MeshContext>,
  /** null **/
  pairDayDatas: InContextSdkMethod<Subscription['pairDayDatas'], SubscriptionpairDayDatasArgs, MeshContext>,
  /** null **/
  user: InContextSdkMethod<Subscription['user'], SubscriptionuserArgs, MeshContext>,
  /** null **/
  users: InContextSdkMethod<Subscription['users'], SubscriptionusersArgs, MeshContext>,
  /** null **/
  liquidityPosition: InContextSdkMethod<Subscription['liquidityPosition'], SubscriptionliquidityPositionArgs, MeshContext>,
  /** null **/
  liquidityPositions: InContextSdkMethod<Subscription['liquidityPositions'], SubscriptionliquidityPositionsArgs, MeshContext>,
  /** null **/
  transaction: InContextSdkMethod<Subscription['transaction'], SubscriptiontransactionArgs, MeshContext>,
  /** null **/
  transactions: InContextSdkMethod<Subscription['transactions'], SubscriptiontransactionsArgs, MeshContext>,
  /** null **/
  transactionItem: InContextSdkMethod<Subscription['transactionItem'], SubscriptiontransactionItemArgs, MeshContext>,
  /** null **/
  transactionItems: InContextSdkMethod<Subscription['transactionItems'], SubscriptiontransactionItemsArgs, MeshContext>,
  /** Access to subgraph metadata **/
  _meta: InContextSdkMethod<Subscription['_meta'], Subscription_metaArgs, MeshContext>
  };

  export type Context = {
      ["magicswapv2"]: { Query: QuerySdk, Mutation: MutationSdk, Subscription: SubscriptionSdk },
      
    };
}
