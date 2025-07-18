import { DEAL_STAGES, HTTP_STATUS } from "../constants";
import { HelperResponsePOD } from "../pod";
import { getDeals } from "./zoho";

export const createQuery = (
  url: string,
  query: Record<string, string | undefined>
) => {
  let urlWithQuery = `${url}?`;
  for (const item in query) {
    const queryAnswer = query[item];
    if (!queryAnswer) continue;
    urlWithQuery += `${item}=${queryAnswer}&`;
  }

  return urlWithQuery;
};

export const createMessageFromTemplate = (
  template: string,
  match: string,
  replace: string
) => {
  if (!template || !match || !replace) return "";
  return template.replace(match, replace);
};

export const isEqual = (
  val1: string | number | boolean,
  val2: string | number | boolean
) => {
  return val1 === val2;
};

export const checkValueInArray = (arr: any[], str: string) => {
  return !!arr.find((item) => item === str);
};

export const formatAccessToken = (token: string) => `Zoho-oauthtoken ${token}`;

export const countDeals = async (internal_id: string, role: string) => {
  let pageNo = 1;
  const dealsCount = {
    openDeals: { count: 0 },
    closedDeals: { count: 0 },
    total: { count: 0 },
  };
  while (true) {
    const dealsResult = await getDeals(internal_id, role, pageNo, 200);
    if (dealsResult.error) throw dealsResult.error;

    if (dealsResult.statusCode === HTTP_STATUS.NO_CONTENT) {
      break;
    }
    const deals = dealsResult.data;
    deals.forEach((deal: any) => {
      if (deal.Stage === DEAL_STAGES.DEAL_FULLY_CLOSED) {
        dealsCount.closedDeals.count++;
      } else if (
        [
          DEAL_STAGES.NEW_DEAL,
          DEAL_STAGES.MORE_INFO_NEEDED,
          DEAL_STAGES.UNDERWRITING,
          DEAL_STAGES.APPROVED,
          DEAL_STAGES.CLOSED_WON,
          DEAL_STAGES.FUNDED,
        ].includes(deal.Stage)
      ) {
        dealsCount.openDeals.count++;
      }
      dealsCount.total.count++;
    });
    pageNo++;
    if (!deals.length) break;
  }

  return dealsCount;
};

export function numberWithCommas(x: number | string) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
