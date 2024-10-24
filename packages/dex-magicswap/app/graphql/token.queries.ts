import gql from "graphql-tag";

export const TOKEN_FRAGMENT = gql`
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
`;

export const getToken = gql`
  ${TOKEN_FRAGMENT}
  query GetToken($id: ID!) {
    token(id: $id) {
      ...TokenFragment
    }
  }
`;

export const getTokens = gql`
  ${TOKEN_FRAGMENT}
  query GetTokens(
    $skip: Int = 0
    $first: Int = 100
    $where: Token_filter
    $orderBy: Token_orderBy = symbol
    $orderDirection: OrderDirection = asc
  ) {
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
`;

export const getTokenVaultReserveItems = gql`
  query GetTokenVaultReserveItems(
    $id: String!
    $skip: Int = 0
    $first: Int = 50
    $orderBy: VaultReserveItem_orderBy = tokenId
    $orderDirection: OrderDirection = asc
  ) {
    vaultReserveItems(
      first: $first
      skip: $skip
      where: { vault: $id }
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
`;
