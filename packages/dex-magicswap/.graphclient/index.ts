// @ts-nocheck
import { GraphQLResolveInfo, SelectionSetNode, FieldNode, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
import { gql } from '@graphql-mesh/utils';

import type { GetMeshOptions } from '@graphql-mesh/runtime';
import type { YamlConfig } from '@graphql-mesh/types';
import { PubSub } from '@graphql-mesh/utils';
import { DefaultLogger } from '@graphql-mesh/utils';
import MeshCache from "@graphql-mesh/cache-localforage";
import { fetch as fetchFn } from '@whatwg-node/fetch';

import { MeshResolvedSource } from '@graphql-mesh/runtime';
import { MeshTransform, MeshPlugin } from '@graphql-mesh/types';
import GraphqlHandler from "@graphql-mesh/graphql"
import BareMerger from "@graphql-mesh/merger-bare";
import { printWithCache } from '@graphql-mesh/utils';
import { usePersistedOperations } from '@graphql-yoga/plugin-persisted-operations';
import { createMeshHTTPHandler, MeshHTTPHandler } from '@graphql-mesh/http';
import { getMesh, ExecuteMeshFn, SubscribeMeshFn, MeshContext as BaseMeshContext, MeshInstance } from '@graphql-mesh/runtime';
import { MeshStore, FsStoreStorageAdapter } from '@graphql-mesh/store';
import { path as pathModule } from '@graphql-mesh/cross-helpers';
import { ImportFn } from '@graphql-mesh/types';
import type { Magicswapv2Types } from './sources/magicswapv2/types';
import * as importedModule$0 from "./sources/magicswapv2/introspectionSchema";
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };



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

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};

export type LegacyStitchingResolver<TResult, TParent, TContext, TArgs> = {
  fragment: string;
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};

export type NewStitchingResolver<TResult, TParent, TContext, TArgs> = {
  selectionSet: string | ((fieldNode: FieldNode) => SelectionSetNode);
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type StitchingResolver<TResult, TParent, TContext, TArgs> = LegacyStitchingResolver<TResult, TParent, TContext, TArgs> | NewStitchingResolver<TResult, TParent, TContext, TArgs>;
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> =
  | ResolverFn<TResult, TParent, TContext, TArgs>
  | ResolverWithResolve<TResult, TParent, TContext, TArgs>
  | StitchingResolver<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;



/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  Aggregation_interval: Aggregation_interval;
  BigDecimal: ResolverTypeWrapper<Scalars['BigDecimal']['output']>;
  BigInt: ResolverTypeWrapper<Scalars['BigInt']['output']>;
  BlockChangedFilter: BlockChangedFilter;
  Block_height: Block_height;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  Bytes: ResolverTypeWrapper<Scalars['Bytes']['output']>;
  Collection: ResolverTypeWrapper<Collection>;
  Collection_filter: Collection_filter;
  Collection_orderBy: Collection_orderBy;
  DayData: ResolverTypeWrapper<DayData>;
  DayData_filter: DayData_filter;
  DayData_orderBy: DayData_orderBy;
  Factory: ResolverTypeWrapper<Factory>;
  Factory_filter: Factory_filter;
  Factory_orderBy: Factory_orderBy;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  Int8: ResolverTypeWrapper<Scalars['Int8']['output']>;
  LiquidityPosition: ResolverTypeWrapper<LiquidityPosition>;
  LiquidityPosition_filter: LiquidityPosition_filter;
  LiquidityPosition_orderBy: LiquidityPosition_orderBy;
  NftType: NftType;
  OrderDirection: OrderDirection;
  Pair: ResolverTypeWrapper<Pair>;
  PairDayData: ResolverTypeWrapper<PairDayData>;
  PairDayData_filter: PairDayData_filter;
  PairDayData_orderBy: PairDayData_orderBy;
  Pair_filter: Pair_filter;
  Pair_orderBy: Pair_orderBy;
  Query: ResolverTypeWrapper<{}>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Subscription: ResolverTypeWrapper<{}>;
  Timestamp: ResolverTypeWrapper<Scalars['Timestamp']['output']>;
  Token: ResolverTypeWrapper<Token>;
  Token_filter: Token_filter;
  Token_orderBy: Token_orderBy;
  Transaction: ResolverTypeWrapper<Transaction>;
  TransactionItem: ResolverTypeWrapper<TransactionItem>;
  TransactionItem_filter: TransactionItem_filter;
  TransactionItem_orderBy: TransactionItem_orderBy;
  TransactionType: TransactionType;
  Transaction_filter: Transaction_filter;
  Transaction_orderBy: Transaction_orderBy;
  User: ResolverTypeWrapper<User>;
  User_filter: User_filter;
  User_orderBy: User_orderBy;
  VaultCollection: ResolverTypeWrapper<VaultCollection>;
  VaultCollection_filter: VaultCollection_filter;
  VaultCollection_orderBy: VaultCollection_orderBy;
  VaultReserveItem: ResolverTypeWrapper<VaultReserveItem>;
  VaultReserveItem_filter: VaultReserveItem_filter;
  VaultReserveItem_orderBy: VaultReserveItem_orderBy;
  _Block_: ResolverTypeWrapper<_Block_>;
  _Meta_: ResolverTypeWrapper<_Meta_>;
  _SubgraphErrorPolicy_: _SubgraphErrorPolicy_;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  BigDecimal: Scalars['BigDecimal']['output'];
  BigInt: Scalars['BigInt']['output'];
  BlockChangedFilter: BlockChangedFilter;
  Block_height: Block_height;
  Boolean: Scalars['Boolean']['output'];
  Bytes: Scalars['Bytes']['output'];
  Collection: Collection;
  Collection_filter: Collection_filter;
  DayData: DayData;
  DayData_filter: DayData_filter;
  Factory: Factory;
  Factory_filter: Factory_filter;
  Float: Scalars['Float']['output'];
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  Int8: Scalars['Int8']['output'];
  LiquidityPosition: LiquidityPosition;
  LiquidityPosition_filter: LiquidityPosition_filter;
  Pair: Pair;
  PairDayData: PairDayData;
  PairDayData_filter: PairDayData_filter;
  Pair_filter: Pair_filter;
  Query: {};
  String: Scalars['String']['output'];
  Subscription: {};
  Timestamp: Scalars['Timestamp']['output'];
  Token: Token;
  Token_filter: Token_filter;
  Transaction: Transaction;
  TransactionItem: TransactionItem;
  TransactionItem_filter: TransactionItem_filter;
  Transaction_filter: Transaction_filter;
  User: User;
  User_filter: User_filter;
  VaultCollection: VaultCollection;
  VaultCollection_filter: VaultCollection_filter;
  VaultReserveItem: VaultReserveItem;
  VaultReserveItem_filter: VaultReserveItem_filter;
  _Block_: _Block_;
  _Meta_: _Meta_;
}>;

export type entityDirectiveArgs = { };

export type entityDirectiveResolver<Result, Parent, ContextType = MeshContext, Args = entityDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type subgraphIdDirectiveArgs = {
  id: Scalars['String']['input'];
};

export type subgraphIdDirectiveResolver<Result, Parent, ContextType = MeshContext, Args = subgraphIdDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type derivedFromDirectiveArgs = {
  field: Scalars['String']['input'];
};

export type derivedFromDirectiveResolver<Result, Parent, ContextType = MeshContext, Args = derivedFromDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export interface BigDecimalScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['BigDecimal'], any> {
  name: 'BigDecimal';
}

export interface BigIntScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['BigInt'], any> {
  name: 'BigInt';
}

export interface BytesScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Bytes'], any> {
  name: 'Bytes';
}

export type CollectionResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['Collection'] = ResolversParentTypes['Collection']> = ResolversObject<{
  id?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['NftType'], ParentType, ContextType>;
  vaultCollections?: Resolver<Array<ResolversTypes['VaultCollection']>, ParentType, ContextType, RequireFields<CollectionvaultCollectionsArgs, 'skip' | 'first'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DayDataResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['DayData'] = ResolversParentTypes['DayData']> = ResolversObject<{
  id?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  date?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  reserveUSD?: Resolver<ResolversTypes['BigDecimal'], ParentType, ContextType>;
  reserveNFT?: Resolver<ResolversTypes['BigDecimal'], ParentType, ContextType>;
  volumeUSD?: Resolver<ResolversTypes['BigDecimal'], ParentType, ContextType>;
  txCount?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FactoryResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['Factory'] = ResolversParentTypes['Factory']> = ResolversObject<{
  id?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  pairCount?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  volumeUSD?: Resolver<ResolversTypes['BigDecimal'], ParentType, ContextType>;
  reserveNFT?: Resolver<ResolversTypes['BigDecimal'], ParentType, ContextType>;
  reserveUSD?: Resolver<ResolversTypes['BigDecimal'], ParentType, ContextType>;
  txCount?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  userCount?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  magicUSD?: Resolver<ResolversTypes['BigDecimal'], ParentType, ContextType>;
  lpFee?: Resolver<ResolversTypes['BigDecimal'], ParentType, ContextType>;
  protocolFee?: Resolver<ResolversTypes['BigDecimal'], ParentType, ContextType>;
  protocolFeeBeneficiary?: Resolver<Maybe<ResolversTypes['Bytes']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface Int8ScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Int8'], any> {
  name: 'Int8';
}

export type LiquidityPositionResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['LiquidityPosition'] = ResolversParentTypes['LiquidityPosition']> = ResolversObject<{
  id?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  pair?: Resolver<ResolversTypes['Pair'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  balance?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type PairResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['Pair'] = ResolversParentTypes['Pair']> = ResolversObject<{
  id?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  token0?: Resolver<ResolversTypes['Token'], ParentType, ContextType>;
  token1?: Resolver<ResolversTypes['Token'], ParentType, ContextType>;
  reserve0?: Resolver<ResolversTypes['BigDecimal'], ParentType, ContextType>;
  reserve1?: Resolver<ResolversTypes['BigDecimal'], ParentType, ContextType>;
  reserveUSD?: Resolver<ResolversTypes['BigDecimal'], ParentType, ContextType>;
  totalSupply?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  volume0?: Resolver<ResolversTypes['BigDecimal'], ParentType, ContextType>;
  volume1?: Resolver<ResolversTypes['BigDecimal'], ParentType, ContextType>;
  volumeUSD?: Resolver<ResolversTypes['BigDecimal'], ParentType, ContextType>;
  txCount?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  lpFee?: Resolver<ResolversTypes['BigDecimal'], ParentType, ContextType>;
  protocolFee?: Resolver<ResolversTypes['BigDecimal'], ParentType, ContextType>;
  royaltiesFee?: Resolver<ResolversTypes['BigDecimal'], ParentType, ContextType>;
  royaltiesBeneficiary?: Resolver<Maybe<ResolversTypes['Bytes']>, ParentType, ContextType>;
  totalFee?: Resolver<ResolversTypes['BigDecimal'], ParentType, ContextType>;
  transactions?: Resolver<Array<ResolversTypes['Transaction']>, ParentType, ContextType, RequireFields<PairtransactionsArgs, 'skip' | 'first'>>;
  liquidityPositions?: Resolver<Array<ResolversTypes['LiquidityPosition']>, ParentType, ContextType, RequireFields<PairliquidityPositionsArgs, 'skip' | 'first'>>;
  dayData?: Resolver<Array<ResolversTypes['PairDayData']>, ParentType, ContextType, RequireFields<PairdayDataArgs, 'skip' | 'first'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type PairDayDataResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['PairDayData'] = ResolversParentTypes['PairDayData']> = ResolversObject<{
  id?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  pair?: Resolver<ResolversTypes['Pair'], ParentType, ContextType>;
  date?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  reserve0?: Resolver<ResolversTypes['BigDecimal'], ParentType, ContextType>;
  reserve1?: Resolver<ResolversTypes['BigDecimal'], ParentType, ContextType>;
  reserveUSD?: Resolver<ResolversTypes['BigDecimal'], ParentType, ContextType>;
  totalSupply?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  volume0?: Resolver<ResolversTypes['BigDecimal'], ParentType, ContextType>;
  volume1?: Resolver<ResolversTypes['BigDecimal'], ParentType, ContextType>;
  volumeUSD?: Resolver<ResolversTypes['BigDecimal'], ParentType, ContextType>;
  txCount?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  factory?: Resolver<Maybe<ResolversTypes['Factory']>, ParentType, ContextType, RequireFields<QueryfactoryArgs, 'id' | 'subgraphError'>>;
  factories?: Resolver<Array<ResolversTypes['Factory']>, ParentType, ContextType, RequireFields<QueryfactoriesArgs, 'skip' | 'first' | 'subgraphError'>>;
  dayData?: Resolver<Maybe<ResolversTypes['DayData']>, ParentType, ContextType, RequireFields<QuerydayDataArgs, 'id' | 'subgraphError'>>;
  dayDatas?: Resolver<Array<ResolversTypes['DayData']>, ParentType, ContextType, RequireFields<QuerydayDatasArgs, 'skip' | 'first' | 'subgraphError'>>;
  collection?: Resolver<Maybe<ResolversTypes['Collection']>, ParentType, ContextType, RequireFields<QuerycollectionArgs, 'id' | 'subgraphError'>>;
  collections?: Resolver<Array<ResolversTypes['Collection']>, ParentType, ContextType, RequireFields<QuerycollectionsArgs, 'skip' | 'first' | 'subgraphError'>>;
  vaultCollection?: Resolver<Maybe<ResolversTypes['VaultCollection']>, ParentType, ContextType, RequireFields<QueryvaultCollectionArgs, 'id' | 'subgraphError'>>;
  vaultCollections?: Resolver<Array<ResolversTypes['VaultCollection']>, ParentType, ContextType, RequireFields<QueryvaultCollectionsArgs, 'skip' | 'first' | 'subgraphError'>>;
  token?: Resolver<Maybe<ResolversTypes['Token']>, ParentType, ContextType, RequireFields<QuerytokenArgs, 'id' | 'subgraphError'>>;
  tokens?: Resolver<Array<ResolversTypes['Token']>, ParentType, ContextType, RequireFields<QuerytokensArgs, 'skip' | 'first' | 'subgraphError'>>;
  vaultReserveItem?: Resolver<Maybe<ResolversTypes['VaultReserveItem']>, ParentType, ContextType, RequireFields<QueryvaultReserveItemArgs, 'id' | 'subgraphError'>>;
  vaultReserveItems?: Resolver<Array<ResolversTypes['VaultReserveItem']>, ParentType, ContextType, RequireFields<QueryvaultReserveItemsArgs, 'skip' | 'first' | 'subgraphError'>>;
  pair?: Resolver<Maybe<ResolversTypes['Pair']>, ParentType, ContextType, RequireFields<QuerypairArgs, 'id' | 'subgraphError'>>;
  pairs?: Resolver<Array<ResolversTypes['Pair']>, ParentType, ContextType, RequireFields<QuerypairsArgs, 'skip' | 'first' | 'subgraphError'>>;
  pairDayData?: Resolver<Maybe<ResolversTypes['PairDayData']>, ParentType, ContextType, RequireFields<QuerypairDayDataArgs, 'id' | 'subgraphError'>>;
  pairDayDatas?: Resolver<Array<ResolversTypes['PairDayData']>, ParentType, ContextType, RequireFields<QuerypairDayDatasArgs, 'skip' | 'first' | 'subgraphError'>>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType, RequireFields<QueryuserArgs, 'id' | 'subgraphError'>>;
  users?: Resolver<Array<ResolversTypes['User']>, ParentType, ContextType, RequireFields<QueryusersArgs, 'skip' | 'first' | 'subgraphError'>>;
  liquidityPosition?: Resolver<Maybe<ResolversTypes['LiquidityPosition']>, ParentType, ContextType, RequireFields<QueryliquidityPositionArgs, 'id' | 'subgraphError'>>;
  liquidityPositions?: Resolver<Array<ResolversTypes['LiquidityPosition']>, ParentType, ContextType, RequireFields<QueryliquidityPositionsArgs, 'skip' | 'first' | 'subgraphError'>>;
  transaction?: Resolver<Maybe<ResolversTypes['Transaction']>, ParentType, ContextType, RequireFields<QuerytransactionArgs, 'id' | 'subgraphError'>>;
  transactions?: Resolver<Array<ResolversTypes['Transaction']>, ParentType, ContextType, RequireFields<QuerytransactionsArgs, 'skip' | 'first' | 'subgraphError'>>;
  transactionItem?: Resolver<Maybe<ResolversTypes['TransactionItem']>, ParentType, ContextType, RequireFields<QuerytransactionItemArgs, 'id' | 'subgraphError'>>;
  transactionItems?: Resolver<Array<ResolversTypes['TransactionItem']>, ParentType, ContextType, RequireFields<QuerytransactionItemsArgs, 'skip' | 'first' | 'subgraphError'>>;
  _meta?: Resolver<Maybe<ResolversTypes['_Meta_']>, ParentType, ContextType, Partial<Query_metaArgs>>;
}>;

export type SubscriptionResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['Subscription'] = ResolversParentTypes['Subscription']> = ResolversObject<{
  factory?: SubscriptionResolver<Maybe<ResolversTypes['Factory']>, "factory", ParentType, ContextType, RequireFields<SubscriptionfactoryArgs, 'id' | 'subgraphError'>>;
  factories?: SubscriptionResolver<Array<ResolversTypes['Factory']>, "factories", ParentType, ContextType, RequireFields<SubscriptionfactoriesArgs, 'skip' | 'first' | 'subgraphError'>>;
  dayData?: SubscriptionResolver<Maybe<ResolversTypes['DayData']>, "dayData", ParentType, ContextType, RequireFields<SubscriptiondayDataArgs, 'id' | 'subgraphError'>>;
  dayDatas?: SubscriptionResolver<Array<ResolversTypes['DayData']>, "dayDatas", ParentType, ContextType, RequireFields<SubscriptiondayDatasArgs, 'skip' | 'first' | 'subgraphError'>>;
  collection?: SubscriptionResolver<Maybe<ResolversTypes['Collection']>, "collection", ParentType, ContextType, RequireFields<SubscriptioncollectionArgs, 'id' | 'subgraphError'>>;
  collections?: SubscriptionResolver<Array<ResolversTypes['Collection']>, "collections", ParentType, ContextType, RequireFields<SubscriptioncollectionsArgs, 'skip' | 'first' | 'subgraphError'>>;
  vaultCollection?: SubscriptionResolver<Maybe<ResolversTypes['VaultCollection']>, "vaultCollection", ParentType, ContextType, RequireFields<SubscriptionvaultCollectionArgs, 'id' | 'subgraphError'>>;
  vaultCollections?: SubscriptionResolver<Array<ResolversTypes['VaultCollection']>, "vaultCollections", ParentType, ContextType, RequireFields<SubscriptionvaultCollectionsArgs, 'skip' | 'first' | 'subgraphError'>>;
  token?: SubscriptionResolver<Maybe<ResolversTypes['Token']>, "token", ParentType, ContextType, RequireFields<SubscriptiontokenArgs, 'id' | 'subgraphError'>>;
  tokens?: SubscriptionResolver<Array<ResolversTypes['Token']>, "tokens", ParentType, ContextType, RequireFields<SubscriptiontokensArgs, 'skip' | 'first' | 'subgraphError'>>;
  vaultReserveItem?: SubscriptionResolver<Maybe<ResolversTypes['VaultReserveItem']>, "vaultReserveItem", ParentType, ContextType, RequireFields<SubscriptionvaultReserveItemArgs, 'id' | 'subgraphError'>>;
  vaultReserveItems?: SubscriptionResolver<Array<ResolversTypes['VaultReserveItem']>, "vaultReserveItems", ParentType, ContextType, RequireFields<SubscriptionvaultReserveItemsArgs, 'skip' | 'first' | 'subgraphError'>>;
  pair?: SubscriptionResolver<Maybe<ResolversTypes['Pair']>, "pair", ParentType, ContextType, RequireFields<SubscriptionpairArgs, 'id' | 'subgraphError'>>;
  pairs?: SubscriptionResolver<Array<ResolversTypes['Pair']>, "pairs", ParentType, ContextType, RequireFields<SubscriptionpairsArgs, 'skip' | 'first' | 'subgraphError'>>;
  pairDayData?: SubscriptionResolver<Maybe<ResolversTypes['PairDayData']>, "pairDayData", ParentType, ContextType, RequireFields<SubscriptionpairDayDataArgs, 'id' | 'subgraphError'>>;
  pairDayDatas?: SubscriptionResolver<Array<ResolversTypes['PairDayData']>, "pairDayDatas", ParentType, ContextType, RequireFields<SubscriptionpairDayDatasArgs, 'skip' | 'first' | 'subgraphError'>>;
  user?: SubscriptionResolver<Maybe<ResolversTypes['User']>, "user", ParentType, ContextType, RequireFields<SubscriptionuserArgs, 'id' | 'subgraphError'>>;
  users?: SubscriptionResolver<Array<ResolversTypes['User']>, "users", ParentType, ContextType, RequireFields<SubscriptionusersArgs, 'skip' | 'first' | 'subgraphError'>>;
  liquidityPosition?: SubscriptionResolver<Maybe<ResolversTypes['LiquidityPosition']>, "liquidityPosition", ParentType, ContextType, RequireFields<SubscriptionliquidityPositionArgs, 'id' | 'subgraphError'>>;
  liquidityPositions?: SubscriptionResolver<Array<ResolversTypes['LiquidityPosition']>, "liquidityPositions", ParentType, ContextType, RequireFields<SubscriptionliquidityPositionsArgs, 'skip' | 'first' | 'subgraphError'>>;
  transaction?: SubscriptionResolver<Maybe<ResolversTypes['Transaction']>, "transaction", ParentType, ContextType, RequireFields<SubscriptiontransactionArgs, 'id' | 'subgraphError'>>;
  transactions?: SubscriptionResolver<Array<ResolversTypes['Transaction']>, "transactions", ParentType, ContextType, RequireFields<SubscriptiontransactionsArgs, 'skip' | 'first' | 'subgraphError'>>;
  transactionItem?: SubscriptionResolver<Maybe<ResolversTypes['TransactionItem']>, "transactionItem", ParentType, ContextType, RequireFields<SubscriptiontransactionItemArgs, 'id' | 'subgraphError'>>;
  transactionItems?: SubscriptionResolver<Array<ResolversTypes['TransactionItem']>, "transactionItems", ParentType, ContextType, RequireFields<SubscriptiontransactionItemsArgs, 'skip' | 'first' | 'subgraphError'>>;
  _meta?: SubscriptionResolver<Maybe<ResolversTypes['_Meta_']>, "_meta", ParentType, ContextType, Partial<Subscription_metaArgs>>;
}>;

export interface TimestampScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Timestamp'], any> {
  name: 'Timestamp';
}

export type TokenResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['Token'] = ResolversParentTypes['Token']> = ResolversObject<{
  id?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  symbol?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  totalSupply?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  decimals?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  decimalDivisor?: Resolver<ResolversTypes['BigDecimal'], ParentType, ContextType>;
  isNFT?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isMAGIC?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isETH?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  vaultCollections?: Resolver<Array<ResolversTypes['VaultCollection']>, ParentType, ContextType, RequireFields<TokenvaultCollectionsArgs, 'skip' | 'first'>>;
  vaultReserveItems?: Resolver<Array<ResolversTypes['VaultReserveItem']>, ParentType, ContextType, RequireFields<TokenvaultReserveItemsArgs, 'skip' | 'first'>>;
  magicPairs?: Resolver<Array<ResolversTypes['Pair']>, ParentType, ContextType, RequireFields<TokenmagicPairsArgs, 'skip' | 'first'>>;
  basePairs?: Resolver<Array<ResolversTypes['Pair']>, ParentType, ContextType, RequireFields<TokenbasePairsArgs, 'skip' | 'first'>>;
  quotePairs?: Resolver<Array<ResolversTypes['Pair']>, ParentType, ContextType, RequireFields<TokenquotePairsArgs, 'skip' | 'first'>>;
  volume?: Resolver<ResolversTypes['BigDecimal'], ParentType, ContextType>;
  volumeUSD?: Resolver<ResolversTypes['BigDecimal'], ParentType, ContextType>;
  txCount?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  derivedMAGIC?: Resolver<ResolversTypes['BigDecimal'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TransactionResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['Transaction'] = ResolversParentTypes['Transaction']> = ResolversObject<{
  id?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  hash?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  timestamp?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  type?: Resolver<Maybe<ResolversTypes['TransactionType']>, ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  pair?: Resolver<Maybe<ResolversTypes['Pair']>, ParentType, ContextType>;
  amount0?: Resolver<ResolversTypes['BigDecimal'], ParentType, ContextType>;
  amount1?: Resolver<ResolversTypes['BigDecimal'], ParentType, ContextType>;
  amountUSD?: Resolver<ResolversTypes['BigDecimal'], ParentType, ContextType>;
  isAmount1Out?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  items?: Resolver<Array<ResolversTypes['TransactionItem']>, ParentType, ContextType, RequireFields<TransactionitemsArgs, 'skip' | 'first'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TransactionItemResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['TransactionItem'] = ResolversParentTypes['TransactionItem']> = ResolversObject<{
  id?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  transaction?: Resolver<ResolversTypes['Transaction'], ParentType, ContextType>;
  vault?: Resolver<ResolversTypes['Token'], ParentType, ContextType>;
  collection?: Resolver<ResolversTypes['Collection'], ParentType, ContextType>;
  tokenId?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  amount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = ResolversObject<{
  id?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  liquidityPositionCount?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  transactions?: Resolver<Array<ResolversTypes['Transaction']>, ParentType, ContextType, RequireFields<UsertransactionsArgs, 'skip' | 'first'>>;
  liquidityPositions?: Resolver<Array<ResolversTypes['LiquidityPosition']>, ParentType, ContextType, RequireFields<UserliquidityPositionsArgs, 'skip' | 'first'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VaultCollectionResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['VaultCollection'] = ResolversParentTypes['VaultCollection']> = ResolversObject<{
  id?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  vault?: Resolver<ResolversTypes['Token'], ParentType, ContextType>;
  collection?: Resolver<ResolversTypes['Collection'], ParentType, ContextType>;
  tokenIds?: Resolver<Maybe<Array<ResolversTypes['BigInt']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VaultReserveItemResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['VaultReserveItem'] = ResolversParentTypes['VaultReserveItem']> = ResolversObject<{
  id?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  vault?: Resolver<ResolversTypes['Token'], ParentType, ContextType>;
  collection?: Resolver<ResolversTypes['Collection'], ParentType, ContextType>;
  tokenId?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  amount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type _Block_Resolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['_Block_'] = ResolversParentTypes['_Block_']> = ResolversObject<{
  hash?: Resolver<Maybe<ResolversTypes['Bytes']>, ParentType, ContextType>;
  number?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  timestamp?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  parentHash?: Resolver<Maybe<ResolversTypes['Bytes']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type _Meta_Resolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['_Meta_'] = ResolversParentTypes['_Meta_']> = ResolversObject<{
  block?: Resolver<ResolversTypes['_Block_'], ParentType, ContextType>;
  deployment?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  hasIndexingErrors?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type Resolvers<ContextType = MeshContext> = ResolversObject<{
  BigDecimal?: GraphQLScalarType;
  BigInt?: GraphQLScalarType;
  Bytes?: GraphQLScalarType;
  Collection?: CollectionResolvers<ContextType>;
  DayData?: DayDataResolvers<ContextType>;
  Factory?: FactoryResolvers<ContextType>;
  Int8?: GraphQLScalarType;
  LiquidityPosition?: LiquidityPositionResolvers<ContextType>;
  Pair?: PairResolvers<ContextType>;
  PairDayData?: PairDayDataResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Subscription?: SubscriptionResolvers<ContextType>;
  Timestamp?: GraphQLScalarType;
  Token?: TokenResolvers<ContextType>;
  Transaction?: TransactionResolvers<ContextType>;
  TransactionItem?: TransactionItemResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
  VaultCollection?: VaultCollectionResolvers<ContextType>;
  VaultReserveItem?: VaultReserveItemResolvers<ContextType>;
  _Block_?: _Block_Resolvers<ContextType>;
  _Meta_?: _Meta_Resolvers<ContextType>;
}>;

export type DirectiveResolvers<ContextType = MeshContext> = ResolversObject<{
  entity?: entityDirectiveResolver<any, any, ContextType>;
  subgraphId?: subgraphIdDirectiveResolver<any, any, ContextType>;
  derivedFrom?: derivedFromDirectiveResolver<any, any, ContextType>;
}>;

export type MeshContext = Magicswapv2Types.Context & BaseMeshContext;


import { fileURLToPath } from '@graphql-mesh/utils';
const baseDir = pathModule.join(pathModule.dirname(fileURLToPath(import.meta.url)), '..');

const importFn: ImportFn = <T>(moduleId: string) => {
  const relativeModuleId = (pathModule.isAbsolute(moduleId) ? pathModule.relative(baseDir, moduleId) : moduleId).split('\\').join('/').replace(baseDir + '/', '');
  switch(relativeModuleId) {
    case ".graphclient/sources/magicswapv2/introspectionSchema":
      return Promise.resolve(importedModule$0) as T;
    
    default:
      return Promise.reject(new Error(`Cannot find module '${relativeModuleId}'.`));
  }
};

const rootStore = new MeshStore('.graphclient', new FsStoreStorageAdapter({
  cwd: baseDir,
  importFn,
  fileType: "ts",
}), {
  readonly: true,
  validate: false
});

export const rawServeConfig: YamlConfig.Config['serve'] = undefined as any
export async function getMeshOptions(): Promise<GetMeshOptions> {
const pubsub = new PubSub();
const sourcesStore = rootStore.child('sources');
const logger = new DefaultLogger("GraphClient");
const cache = new (MeshCache as any)({
      ...({} as any),
      importFn,
      store: rootStore.child('cache'),
      pubsub,
      logger,
    } as any)

const sources: MeshResolvedSource[] = [];
const transforms: MeshTransform[] = [];
const additionalEnvelopPlugins: MeshPlugin<any>[] = [];
const magicswapv2Transforms = [];
const additionalTypeDefs = [] as any[];
const magicswapv2Handler = new GraphqlHandler({
              name: "magicswapv2",
              config: {"endpoint":"https://api.goldsky.com/api/public/project_clrm53zqegpoi01x18coz2fb5/subgraphs/magicswapv2-dev/live/gn"},
              baseDir,
              cache,
              pubsub,
              store: sourcesStore.child("magicswapv2"),
              logger: logger.child("magicswapv2"),
              importFn,
            });
sources[0] = {
          name: 'magicswapv2',
          handler: magicswapv2Handler,
          transforms: magicswapv2Transforms
        }
const additionalResolvers = [] as any[]
const merger = new(BareMerger as any)({
        cache,
        pubsub,
        logger: logger.child('bareMerger'),
        store: rootStore.child('bareMerger')
      })
const documentHashMap = {
        "2451e7dbd652f6525df0747331c28a6322d7545437ea8c999d2dbabd2179b771": GetPairTransactionsDocument,
"04b4c6d1c86d3f298b8aeb9d5b9bd0b30f1e0fb8b3f5b64db39b9994d8045b75": GetPairsDocument,
"ade09064317157ace46226a095cca04ebfd8aa1bef80b4a6ab948c7c28912e39": GetPairDocument,
"a50f9c9d997e342257f2b44caa328e1a9a4779b269cb73fcae8681dc70c7af54": GetTokenDocument,
"2dd1aad86f2e77d0af93040df670b19f9570e368e21207a263579582ffd4d21c": GetStatsDocument,
"1479bbe705969a0a352f08c8a8f42295cd95830410411e631d13fd39ecc49460": GetTokensDocument,
"11dd826f7a0865dd4cacd1d013c5192f575a61b1315d88e888289a62572b82d5": GetTokenVaultReserveItemsDocument,
"a9535c67b4df9ae66cbe7153341997771fa337e0f5c3d731a00d1fb14162b598": GetUserPositionsDocument
      }
additionalEnvelopPlugins.push(usePersistedOperations({
        getPersistedOperation(key) {
          return documentHashMap[key];
        },
        ...{}
      }))

  return {
    sources,
    transforms,
    additionalTypeDefs,
    additionalResolvers,
    cache,
    pubsub,
    merger,
    logger,
    additionalEnvelopPlugins,
    get documents() {
      return [
      {
        document: GetPairTransactionsDocument,
        get rawSDL() {
          return printWithCache(GetPairTransactionsDocument);
        },
        location: 'GetPairTransactionsDocument.graphql',
        sha256Hash: '2451e7dbd652f6525df0747331c28a6322d7545437ea8c999d2dbabd2179b771'
      },{
        document: GetPairsDocument,
        get rawSDL() {
          return printWithCache(GetPairsDocument);
        },
        location: 'GetPairsDocument.graphql',
        sha256Hash: '04b4c6d1c86d3f298b8aeb9d5b9bd0b30f1e0fb8b3f5b64db39b9994d8045b75'
      },{
        document: GetPairDocument,
        get rawSDL() {
          return printWithCache(GetPairDocument);
        },
        location: 'GetPairDocument.graphql',
        sha256Hash: 'ade09064317157ace46226a095cca04ebfd8aa1bef80b4a6ab948c7c28912e39'
      },{
        document: GetTokenDocument,
        get rawSDL() {
          return printWithCache(GetTokenDocument);
        },
        location: 'GetTokenDocument.graphql',
        sha256Hash: 'a50f9c9d997e342257f2b44caa328e1a9a4779b269cb73fcae8681dc70c7af54'
      },{
        document: GetStatsDocument,
        get rawSDL() {
          return printWithCache(GetStatsDocument);
        },
        location: 'GetStatsDocument.graphql',
        sha256Hash: '2dd1aad86f2e77d0af93040df670b19f9570e368e21207a263579582ffd4d21c'
      },{
        document: GetTokensDocument,
        get rawSDL() {
          return printWithCache(GetTokensDocument);
        },
        location: 'GetTokensDocument.graphql',
        sha256Hash: '1479bbe705969a0a352f08c8a8f42295cd95830410411e631d13fd39ecc49460'
      },{
        document: GetTokenVaultReserveItemsDocument,
        get rawSDL() {
          return printWithCache(GetTokenVaultReserveItemsDocument);
        },
        location: 'GetTokenVaultReserveItemsDocument.graphql',
        sha256Hash: '11dd826f7a0865dd4cacd1d013c5192f575a61b1315d88e888289a62572b82d5'
      },{
        document: GetUserPositionsDocument,
        get rawSDL() {
          return printWithCache(GetUserPositionsDocument);
        },
        location: 'GetUserPositionsDocument.graphql',
        sha256Hash: 'a9535c67b4df9ae66cbe7153341997771fa337e0f5c3d731a00d1fb14162b598'
      }
    ];
    },
    fetchFn,
  };
}

export function createBuiltMeshHTTPHandler<TServerContext = {}>(): MeshHTTPHandler<TServerContext> {
  return createMeshHTTPHandler<TServerContext>({
    baseDir,
    getBuiltMesh: getBuiltGraphClient,
    rawServeConfig: undefined,
  })
}


let meshInstance$: Promise<MeshInstance> | undefined;

export const pollingInterval = null;

export function getBuiltGraphClient(): Promise<MeshInstance> {
  if (meshInstance$ == null) {
    if (pollingInterval) {
      setInterval(() => {
        getMeshOptions()
        .then(meshOptions => getMesh(meshOptions))
        .then(newMesh =>
          meshInstance$.then(oldMesh => {
            oldMesh.destroy()
            meshInstance$ = Promise.resolve(newMesh)
          })
        ).catch(err => {
          console.error("Mesh polling failed so the existing version will be used:", err);
        });
      }, pollingInterval)
    }
    meshInstance$ = getMeshOptions().then(meshOptions => getMesh(meshOptions)).then(mesh => {
      const id = mesh.pubsub.subscribe('destroy', () => {
        meshInstance$ = undefined;
        mesh.pubsub.unsubscribe(id);
      });
      return mesh;
    });
  }
  return meshInstance$;
}

export const execute: ExecuteMeshFn = (...args) => getBuiltGraphClient().then(({ execute }) => execute(...args));

export const subscribe: SubscribeMeshFn = (...args) => getBuiltGraphClient().then(({ subscribe }) => subscribe(...args));
export function getBuiltGraphSDK<TGlobalContext = any, TOperationContext = any>(globalContext?: TGlobalContext) {
  const sdkRequester$ = getBuiltGraphClient().then(({ sdkRequesterFactory }) => sdkRequesterFactory(globalContext));
  return getSdk<TOperationContext, TGlobalContext>((...args) => sdkRequester$.then(sdkRequester => sdkRequester(...args)));
}
export type TransactionItemFragmentFragment = (
  Pick<TransactionItem, 'id' | 'tokenId' | 'amount'>
  & { vault: Pick<Token, 'id'>, collection: Pick<Collection, 'id'> }
);

export type PairFragmentFragment = (
  Pick<Pair, 'id' | 'reserve0' | 'reserve1' | 'reserveUSD' | 'totalSupply' | 'txCount' | 'volume0' | 'volume1' | 'volumeUSD' | 'lpFee' | 'protocolFee' | 'royaltiesFee' | 'royaltiesBeneficiary' | 'totalFee'>
  & { token0: (
    Pick<Token, 'id' | 'name' | 'symbol' | 'decimals' | 'derivedMAGIC' | 'isNFT' | 'isMAGIC' | 'isETH'>
    & { vaultCollections: Array<(
      Pick<VaultCollection, 'tokenIds'>
      & { collection: Pick<Collection, 'id' | 'type'> }
    )>, vaultReserveItems: Array<Pick<VaultReserveItem, 'tokenId' | 'amount'>> }
  ), token1: (
    Pick<Token, 'id' | 'name' | 'symbol' | 'decimals' | 'derivedMAGIC' | 'isNFT' | 'isMAGIC' | 'isETH'>
    & { vaultCollections: Array<(
      Pick<VaultCollection, 'tokenIds'>
      & { collection: Pick<Collection, 'id' | 'type'> }
    )>, vaultReserveItems: Array<Pick<VaultReserveItem, 'tokenId' | 'amount'>> }
  ) }
);

export type PairDayDataFragmentFragment = Pick<PairDayData, 'date' | 'reserve0' | 'reserve1' | 'reserveUSD' | 'volume0' | 'volume1' | 'volumeUSD' | 'txCount'>;

export type GetPairTransactionsQueryVariables = Exact<{
  pair: Scalars['ID']['input'];
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<Transaction_filter>;
  orderBy?: InputMaybe<Transaction_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
}>;


export type GetPairTransactionsQuery = { pair?: Maybe<{ token0: Pick<Token, 'id'>, token1: Pick<Token, 'id'>, transactions: Array<(
      Pick<Transaction, 'id' | 'hash' | 'timestamp' | 'type' | 'amount0' | 'amount1' | 'amountUSD' | 'isAmount1Out'>
      & { user?: Maybe<Pick<User, 'id'>>, items: Array<(
        Pick<TransactionItem, 'id' | 'tokenId' | 'amount'>
        & { vault: Pick<Token, 'id'>, collection: Pick<Collection, 'id'> }
      )> }
    )> }> };

export type GetPairsQueryVariables = Exact<{
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<Pair_filter>;
  orderBy?: InputMaybe<Pair_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
}>;


export type GetPairsQuery = { pairs: Array<(
    Pick<Pair, 'id' | 'reserve0' | 'reserve1' | 'reserveUSD' | 'totalSupply' | 'txCount' | 'volume0' | 'volume1' | 'volumeUSD' | 'lpFee' | 'protocolFee' | 'royaltiesFee' | 'royaltiesBeneficiary' | 'totalFee'>
    & { dayData: Array<Pick<PairDayData, 'date' | 'reserve0' | 'reserve1' | 'reserveUSD' | 'volume0' | 'volume1' | 'volumeUSD' | 'txCount'>>, token0: (
      Pick<Token, 'id' | 'name' | 'symbol' | 'decimals' | 'derivedMAGIC' | 'isNFT' | 'isMAGIC' | 'isETH'>
      & { vaultCollections: Array<(
        Pick<VaultCollection, 'tokenIds'>
        & { collection: Pick<Collection, 'id' | 'type'> }
      )>, vaultReserveItems: Array<Pick<VaultReserveItem, 'tokenId' | 'amount'>> }
    ), token1: (
      Pick<Token, 'id' | 'name' | 'symbol' | 'decimals' | 'derivedMAGIC' | 'isNFT' | 'isMAGIC' | 'isETH'>
      & { vaultCollections: Array<(
        Pick<VaultCollection, 'tokenIds'>
        & { collection: Pick<Collection, 'id' | 'type'> }
      )>, vaultReserveItems: Array<Pick<VaultReserveItem, 'tokenId' | 'amount'>> }
    ) }
  )> };

export type GetPairQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetPairQuery = { pair?: Maybe<(
    Pick<Pair, 'id' | 'reserve0' | 'reserve1' | 'reserveUSD' | 'totalSupply' | 'txCount' | 'volume0' | 'volume1' | 'volumeUSD' | 'lpFee' | 'protocolFee' | 'royaltiesFee' | 'royaltiesBeneficiary' | 'totalFee'>
    & { dayData: Array<Pick<PairDayData, 'date' | 'reserve0' | 'reserve1' | 'reserveUSD' | 'volume0' | 'volume1' | 'volumeUSD' | 'txCount'>>, token0: (
      Pick<Token, 'id' | 'name' | 'symbol' | 'decimals' | 'derivedMAGIC' | 'isNFT' | 'isMAGIC' | 'isETH'>
      & { vaultCollections: Array<(
        Pick<VaultCollection, 'tokenIds'>
        & { collection: Pick<Collection, 'id' | 'type'> }
      )>, vaultReserveItems: Array<Pick<VaultReserveItem, 'tokenId' | 'amount'>> }
    ), token1: (
      Pick<Token, 'id' | 'name' | 'symbol' | 'decimals' | 'derivedMAGIC' | 'isNFT' | 'isMAGIC' | 'isETH'>
      & { vaultCollections: Array<(
        Pick<VaultCollection, 'tokenIds'>
        & { collection: Pick<Collection, 'id' | 'type'> }
      )>, vaultReserveItems: Array<Pick<VaultReserveItem, 'tokenId' | 'amount'>> }
    ) }
  )> };

export type GetStatsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetStatsQuery = { factories: Array<Pick<Factory, 'pairCount' | 'reserveNFT' | 'txCount'>> };

export type TokenFragmentFragment = (
  Pick<Token, 'id' | 'name' | 'symbol' | 'decimals' | 'derivedMAGIC' | 'isNFT' | 'isMAGIC' | 'isETH'>
  & { vaultCollections: Array<(
    Pick<VaultCollection, 'tokenIds'>
    & { collection: Pick<Collection, 'id' | 'type'> }
  )>, vaultReserveItems: Array<Pick<VaultReserveItem, 'tokenId' | 'amount'>> }
);

export type GetTokenQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetTokenQuery = { token?: Maybe<(
    Pick<Token, 'id' | 'name' | 'symbol' | 'decimals' | 'derivedMAGIC' | 'isNFT' | 'isMAGIC' | 'isETH'>
    & { vaultCollections: Array<(
      Pick<VaultCollection, 'tokenIds'>
      & { collection: Pick<Collection, 'id' | 'type'> }
    )>, vaultReserveItems: Array<Pick<VaultReserveItem, 'tokenId' | 'amount'>> }
  )> };

export type GetTokensQueryVariables = Exact<{
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<Token_filter>;
  orderBy?: InputMaybe<Token_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
}>;


export type GetTokensQuery = { tokens: Array<(
    Pick<Token, 'id' | 'name' | 'symbol' | 'decimals' | 'derivedMAGIC' | 'isNFT' | 'isMAGIC' | 'isETH'>
    & { vaultCollections: Array<(
      Pick<VaultCollection, 'tokenIds'>
      & { collection: Pick<Collection, 'id' | 'type'> }
    )>, vaultReserveItems: Array<Pick<VaultReserveItem, 'tokenId' | 'amount'>> }
  )> };

export type GetTokenVaultReserveItemsQueryVariables = Exact<{
  id: Scalars['String']['input'];
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<VaultReserveItem_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
}>;


export type GetTokenVaultReserveItemsQuery = { vaultReserveItems: Array<(
    Pick<VaultReserveItem, 'tokenId' | 'amount'>
    & { collection: Pick<Collection, 'id'> }
  )> };

export type GetUserPositionsQueryVariables = Exact<{
  id: Scalars['ID']['input'];
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<LiquidityPosition_filter>;
  dayDataWhere?: InputMaybe<PairDayData_filter>;
  orderBy?: InputMaybe<LiquidityPosition_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
}>;


export type GetUserPositionsQuery = { user?: Maybe<(
    Pick<User, 'liquidityPositionCount'>
    & { liquidityPositions: Array<(
      Pick<LiquidityPosition, 'balance'>
      & { pair: (
        Pick<Pair, 'id' | 'reserve0' | 'reserve1' | 'reserveUSD' | 'totalSupply' | 'txCount' | 'volume0' | 'volume1' | 'volumeUSD' | 'lpFee' | 'protocolFee' | 'royaltiesFee' | 'royaltiesBeneficiary' | 'totalFee'>
        & { dayData: Array<Pick<PairDayData, 'date' | 'reserve0' | 'reserve1' | 'reserveUSD' | 'volume0' | 'volume1' | 'volumeUSD' | 'txCount'>>, token0: (
          Pick<Token, 'id' | 'name' | 'symbol' | 'decimals' | 'derivedMAGIC' | 'isNFT' | 'isMAGIC' | 'isETH'>
          & { vaultCollections: Array<(
            Pick<VaultCollection, 'tokenIds'>
            & { collection: Pick<Collection, 'id' | 'type'> }
          )>, vaultReserveItems: Array<Pick<VaultReserveItem, 'tokenId' | 'amount'>> }
        ), token1: (
          Pick<Token, 'id' | 'name' | 'symbol' | 'decimals' | 'derivedMAGIC' | 'isNFT' | 'isMAGIC' | 'isETH'>
          & { vaultCollections: Array<(
            Pick<VaultCollection, 'tokenIds'>
            & { collection: Pick<Collection, 'id' | 'type'> }
          )>, vaultReserveItems: Array<Pick<VaultReserveItem, 'tokenId' | 'amount'>> }
        ) }
      ) }
    )> }
  )> };

export const TransactionItemFragmentFragmentDoc = gql`
    fragment TransactionItemFragment on TransactionItem {
  id
  vault {
    id
  }
  collection {
    id
  }
  tokenId
  amount
}
    ` as unknown as DocumentNode<TransactionItemFragmentFragment, unknown>;
export const TokenFragmentFragmentDoc = gql`
    fragment TokenFragment on Token {
  id
  name
  symbol
  decimals
  derivedMAGIC
  isNFT
  isMAGIC
  isETH
  vaultCollections {
    collection {
      id
      type
    }
    tokenIds
  }
  vaultReserveItems {
    tokenId
    amount
  }
}
    ` as unknown as DocumentNode<TokenFragmentFragment, unknown>;
export const PairFragmentFragmentDoc = gql`
    fragment PairFragment on Pair {
  id
  token0 {
    ...TokenFragment
  }
  token1 {
    ...TokenFragment
  }
  reserve0
  reserve1
  reserveUSD
  totalSupply
  txCount
  volume0
  volume1
  volumeUSD
  lpFee
  protocolFee
  royaltiesFee
  royaltiesBeneficiary
  totalFee
}
    ${TokenFragmentFragmentDoc}` as unknown as DocumentNode<PairFragmentFragment, unknown>;
export const PairDayDataFragmentFragmentDoc = gql`
    fragment PairDayDataFragment on PairDayData {
  date
  reserve0
  reserve1
  reserveUSD
  volume0
  volume1
  volumeUSD
  txCount
}
    ` as unknown as DocumentNode<PairDayDataFragmentFragment, unknown>;
export const GetPairTransactionsDocument = gql`
    query GetPairTransactions($pair: ID!, $skip: Int = 0, $first: Int = 15, $where: Transaction_filter, $orderBy: Transaction_orderBy = timestamp, $orderDirection: OrderDirection = desc) {
  pair(id: $pair) {
    token0 {
      id
    }
    token1 {
      id
    }
    transactions(
      skip: $skip
      first: $first
      where: $where
      orderBy: $orderBy
      orderDirection: $orderDirection
    ) {
      id
      hash
      timestamp
      type
      user {
        id
      }
      amount0
      amount1
      amountUSD
      isAmount1Out
      items {
        ...TransactionItemFragment
      }
    }
  }
}
    ${TransactionItemFragmentFragmentDoc}` as unknown as DocumentNode<GetPairTransactionsQuery, GetPairTransactionsQueryVariables>;
export const GetPairsDocument = gql`
    query GetPairs($skip: Int = 0, $first: Int = 100, $where: Pair_filter = {reserve0_gt: 0}, $orderBy: Pair_orderBy = reserveUSD, $orderDirection: OrderDirection = desc) {
  pairs(
    skip: $skip
    first: $first
    where: $where
    orderBy: $orderBy
    orderDirection: $orderDirection
  ) {
    ...PairFragment
    dayData(orderBy: date, orderDirection: desc) {
      ...PairDayDataFragment
    }
  }
}
    ${PairFragmentFragmentDoc}
${PairDayDataFragmentFragmentDoc}` as unknown as DocumentNode<GetPairsQuery, GetPairsQueryVariables>;
export const GetPairDocument = gql`
    query GetPair($id: ID!) {
  pair(id: $id) {
    ...PairFragment
    dayData(orderBy: date, orderDirection: desc) {
      date
      reserve0
      reserve1
      reserveUSD
      volume0
      volume1
      volumeUSD
      txCount
    }
  }
}
    ${PairFragmentFragmentDoc}` as unknown as DocumentNode<GetPairQuery, GetPairQueryVariables>;
export const GetStatsDocument = gql`
    query GetStats {
  factories {
    pairCount
    reserveNFT
    txCount
  }
}
    ` as unknown as DocumentNode<GetStatsQuery, GetStatsQueryVariables>;
export const GetTokenDocument = gql`
    query GetToken($id: ID!) {
  token(id: $id) {
    ...TokenFragment
  }
}
    ${TokenFragmentFragmentDoc}` as unknown as DocumentNode<GetTokenQuery, GetTokenQueryVariables>;
export const GetTokensDocument = gql`
    query GetTokens($skip: Int = 0, $first: Int = 100, $where: Token_filter, $orderBy: Token_orderBy = symbol, $orderDirection: OrderDirection = asc) {
  tokens(
    skip: $skip
    first: $first
    where: $where
    orderBy: $orderBy
    orderDirection: $orderDirection
  ) {
    ...TokenFragment
  }
}
    ${TokenFragmentFragmentDoc}` as unknown as DocumentNode<GetTokensQuery, GetTokensQueryVariables>;
export const GetTokenVaultReserveItemsDocument = gql`
    query GetTokenVaultReserveItems($id: String!, $skip: Int = 0, $first: Int = 50, $orderBy: VaultReserveItem_orderBy = tokenId, $orderDirection: OrderDirection = asc) {
  vaultReserveItems(
    first: $first
    skip: $skip
    where: {vault: $id}
    orderBy: $orderBy
    orderDirection: $orderDirection
  ) {
    collection {
      id
    }
    tokenId
    amount
  }
}
    ` as unknown as DocumentNode<GetTokenVaultReserveItemsQuery, GetTokenVaultReserveItemsQueryVariables>;
export const GetUserPositionsDocument = gql`
    query GetUserPositions($id: ID!, $skip: Int = 0, $first: Int = 100, $where: LiquidityPosition_filter, $dayDataWhere: PairDayData_filter, $orderBy: LiquidityPosition_orderBy = balance, $orderDirection: OrderDirection = desc) {
  user(id: $id) {
    liquidityPositionCount
    liquidityPositions(
      first: $first
      skip: $skip
      where: $where
      orderBy: $orderBy
      orderDirection: $orderDirection
    ) {
      pair {
        ...PairFragment
        dayData(where: $dayDataWhere, orderBy: date, orderDirection: desc) {
          ...PairDayDataFragment
        }
      }
      balance
    }
  }
}
    ${PairFragmentFragmentDoc}
${PairDayDataFragmentFragmentDoc}` as unknown as DocumentNode<GetUserPositionsQuery, GetUserPositionsQueryVariables>;









export type Requester<C = {}, E = unknown> = <R, V>(doc: DocumentNode, vars?: V, options?: C) => Promise<R> | AsyncIterable<R>
export function getSdk<C, E>(requester: Requester<C, E>) {
  return {
    GetPairTransactions(variables: GetPairTransactionsQueryVariables, options?: C): Promise<GetPairTransactionsQuery> {
      return requester<GetPairTransactionsQuery, GetPairTransactionsQueryVariables>(GetPairTransactionsDocument, variables, options) as Promise<GetPairTransactionsQuery>;
    },
    GetPairs(variables?: GetPairsQueryVariables, options?: C): Promise<GetPairsQuery> {
      return requester<GetPairsQuery, GetPairsQueryVariables>(GetPairsDocument, variables, options) as Promise<GetPairsQuery>;
    },
    GetPair(variables: GetPairQueryVariables, options?: C): Promise<GetPairQuery> {
      return requester<GetPairQuery, GetPairQueryVariables>(GetPairDocument, variables, options) as Promise<GetPairQuery>;
    },
    GetStats(variables?: GetStatsQueryVariables, options?: C): Promise<GetStatsQuery> {
      return requester<GetStatsQuery, GetStatsQueryVariables>(GetStatsDocument, variables, options) as Promise<GetStatsQuery>;
    },
    GetToken(variables: GetTokenQueryVariables, options?: C): Promise<GetTokenQuery> {
      return requester<GetTokenQuery, GetTokenQueryVariables>(GetTokenDocument, variables, options) as Promise<GetTokenQuery>;
    },
    GetTokens(variables?: GetTokensQueryVariables, options?: C): Promise<GetTokensQuery> {
      return requester<GetTokensQuery, GetTokensQueryVariables>(GetTokensDocument, variables, options) as Promise<GetTokensQuery>;
    },
    GetTokenVaultReserveItems(variables: GetTokenVaultReserveItemsQueryVariables, options?: C): Promise<GetTokenVaultReserveItemsQuery> {
      return requester<GetTokenVaultReserveItemsQuery, GetTokenVaultReserveItemsQueryVariables>(GetTokenVaultReserveItemsDocument, variables, options) as Promise<GetTokenVaultReserveItemsQuery>;
    },
    GetUserPositions(variables: GetUserPositionsQueryVariables, options?: C): Promise<GetUserPositionsQuery> {
      return requester<GetUserPositionsQuery, GetUserPositionsQueryVariables>(GetUserPositionsDocument, variables, options) as Promise<GetUserPositionsQuery>;
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;