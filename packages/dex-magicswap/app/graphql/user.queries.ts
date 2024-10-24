import gql from "graphql-tag";

import { PAIR_DAY_DATA_FRAGMENT, PAIR_FRAGMENT } from "./pair.queries";
import { TOKEN_FRAGMENT } from "./token.queries";

export const getUserPositions = gql`
  ${TOKEN_FRAGMENT}
  ${PAIR_FRAGMENT}
  ${PAIR_DAY_DATA_FRAGMENT}
  query GetUserPositions(
    $id: ID!
    $skip: Int = 0
    $first: Int = 100
    $where: LiquidityPosition_filter
    $dayDataWhere: PairDayData_filter
    $orderBy: LiquidityPosition_orderBy = balance
    $orderDirection: OrderDirection = desc
  ) {
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
          dayData(
            where: $dayDataWhere
            orderBy: date
            orderDirection: desc
          ) {
            ...PairDayDataFragment
          }
        }
        balance
      }
    }
  }
`;
