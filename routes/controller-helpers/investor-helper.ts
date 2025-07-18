import {
  DEALS_FILTERS,
  DEAL_STAGES,
  HTTP_STATUS,
  MESSAGES,
} from "../../constants";
import { Response } from "express";
import { getAllDeals, getDeals } from "../../helpers/zoho";
import { IUser } from "../../schemas/user";
import { isEqual } from "../../helpers/utility";
import { RedisManager } from "../../services/cache/cache.redis";

// redis manager instance
const redisManager = RedisManager.getInstance();

/**
 * deals
 * default page limit is 200
 * default page no. is 1
 * @param user
 * @param res
 * @param query
 * @returns
 */
export const deals = async (user: IUser, res: Response, query: any) => {
  try {
    const pageNo = query.page ? Number(query.page) : 1;
    const dealFilter = query.filter
      ? query.filter.toLowerCase()
      : DEALS_FILTERS.ALL;

    const dealsResult = await getDeals(user.internal_id, user.role, pageNo);
    if (dealsResult.error) throw dealsResult.error;

    if (dealsResult.statusCode === HTTP_STATUS.NO_CONTENT)
      return res.status(204).json({ message: MESSAGES.NO_MORE_CONTENT });

    let deals = dealsResult.data;
    // filter deals if filter applied
    if (dealFilter !== DEALS_FILTERS.ALL) {
      if (dealFilter === DEALS_FILTERS.CLOSED)
        deals = deals.filter(
          (deal: any) => deal.Stage === DEAL_STAGES.DEAL_FULLY_CLOSED
        );
      else if (dealFilter === DEALS_FILTERS.OPEN)
        deals = deals.filter(
          (deal: any) => deal.Stage !== DEAL_STAGES.DEAL_FULLY_CLOSED
        );
    }

    if (!deals.length)
      return res.status(204).json({ message: MESSAGES.NO_MORE_CONTENT });
    return res
      .status(200)
      .json({ message: MESSAGES.DEALS_FETCHED, data: deals });
  } catch (error) {
    console.error(error);
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

/**
 * fetch inverstor deals and calculate different stats
 * @param user
 * @param res
 * @param query
 */
export const investorStats = async (user: IUser, res: Response) => {
  try {
    // get the cache for deals count if any
    const cacheJson = await redisManager.getString(user.internal_id);
    const _dealsCount = JSON.parse(cacheJson);
    if (_dealsCount?.stats)
      return res
        .status(200)
        .json({ message: MESSAGES.STATS_FETCHED, data: _dealsCount.stats });

    const dealsResult = await getAllDeals(user.internal_id, user.role);
    if (dealsResult.error) throw dealsResult.error;

    if (dealsResult.statusCode === HTTP_STATUS.NO_CONTENT)
      return res.status(204).json({ message: MESSAGES.NO_MORE_CONTENT });

    // process data further
    const dealsArray = dealsResult.data;

    const stats = {
      closedDeals: { count: 0, amount: 0 },
      fundedDealsAndProjection: { count: 0, amount: 0 },
      investorIncome: { amount: 0 },
    };

    let fullyClosedDeals = 0;
    let fundedDeals = 0;

    // check for the closed and open deals count and latest deal timestamp
    dealsArray.forEach((deal: any) => {
      if (isEqual(deal.Stage, DEAL_STAGES.DEAL_FULLY_CLOSED))
        fullyClosedDeals++;
      if (
        isEqual(deal.Stage, DEAL_STAGES.FUNDED) ||
        isEqual(deal.Stage, DEAL_STAGES.CLOSED_WON) ||
        isEqual(deal.Stage, DEAL_STAGES.DEAL_FULLY_CLOSED)
      )
        fundedDeals++;

      if (deal.Stage_Funded_Date) {
        // for funded deals
        if (
          isEqual(deal.Stage, DEAL_STAGES.FUNDED) ||
          isEqual(deal.Stage, DEAL_STAGES.CLOSED_WON)
        ) {
          stats.fundedDealsAndProjection.count++;
          stats.fundedDealsAndProjection.amount += deal.Investor_Income;
        }

        // for investor income
        if (
          isEqual(deal.Stage, DEAL_STAGES.FUNDED) ||
          isEqual(deal.Stage, DEAL_STAGES.CLOSED_WON) ||
          isEqual(deal.Stage, DEAL_STAGES.DEAL_FULLY_CLOSED)
        ) {
          stats.investorIncome.amount += deal.Investor_Income;
        }

        // for closed deals
        if (isEqual(deal.Stage, DEAL_STAGES.DEAL_FULLY_CLOSED)) {
          stats.closedDeals.count++;
          stats.closedDeals.amount += deal.Investor_Income;
        }
      }
    });

    const otherCache = _dealsCount ? _dealsCount : {};
    const _cache = JSON.stringify({
      ...otherCache,
      stats,
      fullyClosedDeals,
      fundedDeals,
    });
    await redisManager.setString(user.internal_id, _cache);

    return res
      .status(200)
      .json({ message: MESSAGES.STATS_FETCHED, data: stats });
  } catch (error) {
    console.error(error);
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

/**
 * fetch the all deals and get the new deals count for this month and previous month
 * @param user
 * @param res
 * @param query
 */
export const newDealsCount = async (user: IUser, res: Response) => {
  try {
    // get the cache for deals count if any
    const cacheJson = await redisManager.getString(user.internal_id);
    const _dealsCount = JSON.parse(cacheJson);
    if (_dealsCount?.newDealsCount)
      return res.status(200).json({
        message: MESSAGES.DEALS_COUNT,
        data: _dealsCount.newDealsCount,
      });

    const dealsResult = await getAllDeals();

    if (dealsResult.error) throw dealsResult.error;

    if (dealsResult.statusCode === HTTP_STATUS.NO_CONTENT)
      return res.status(204).json({ message: MESSAGES.NO_MORE_CONTENT });

    // process data further
    const dealsArray = dealsResult.data;

    // check for the closed and open deals count and latest deal timestamp
    const _filteredDeals = dealsArray.filter(
      (deal: any) =>
        (isEqual(deal.Stage, DEAL_STAGES.FUNDED) ||
          isEqual(deal.Stage, DEAL_STAGES.CLOSED_WON)) &&
        !deal.Investor1 &&
        deal.Duration_of_Advance
    );

    const newDealsCount = { count: _filteredDeals.length };

    // dealsArray.forEach((deal: any) => {
    //     // for funded deals
    //     if ((isEqual(deal.Stage, DEAL_STAGES.FUNDED) || isEqual(deal.Stage, DEAL_STAGES.CLOSED_WON)) && !deal.Investor1)
    //       newDealsCount.count++;
    // });

    // set the deals count cache
    const otherCache = _dealsCount ? _dealsCount : {};
    const _cache = JSON.stringify({ ...otherCache, newDealsCount });
    await redisManager.setString(user.internal_id, _cache);

    return res
      .status(200)
      .json({ message: MESSAGES.NEW_DEALS, data: newDealsCount });
  } catch (error) {
    console.error(error);
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

/**
 * fetch the all deals and get new deal from them
 * @param user
 * @param res
 * @param query
 */
export const newDeals = async (user: IUser, res: Response, query: any) => {
  try {
    let pageNo = query.page ? Number(query.page) : 1;
    let newDeals: any[] = [];
    let counter = 0;
    const skipRecords = (pageNo - 1) * 10;

    // reset the page
    pageNo = 1;

    while (true) {
      const dealsResult = await getDeals(null, null, pageNo);
      if (dealsResult.error) throw dealsResult.error;

      if (dealsResult.statusCode === HTTP_STATUS.NO_CONTENT) {
        if (newDeals.length) break;
        return res.status(204).json({ message: MESSAGES.NO_MORE_CONTENT });
      }

      // process data further
      const dealsArray = dealsResult.data;

      dealsArray.forEach((deal: any) => {
        if (
          (isEqual(deal.Stage, DEAL_STAGES.FUNDED) ||
            isEqual(deal.Stage, DEAL_STAGES.CLOSED_WON)) &&
          !deal.Investor1 &&
          deal.Duration_of_Advance
        ) {
          // concat the investor id with investing form url
          deal.investor_investing_in_deal_form += user.internal_id;
          counter++;
          if (skipRecords < counter) newDeals.push(deal);
        }
      });

      if (newDeals.length >= 10) {
        newDeals = newDeals.slice(0, 10);
        break;
      }
      pageNo++;
    }

    // get the cache for deals count if any
    const cacheJson = await redisManager.getString(user.internal_id);
    const _dealsCount = JSON.parse(cacheJson);
    let total;

    if (_dealsCount && _dealsCount.newDealsCount) {
      total = _dealsCount.newDealsCount.count;
    } else {
      const dealsResult = await getAllDeals();

      const dealsArray = dealsResult.data;

      const _filteredDeals = dealsArray.filter(
        (deal: any) =>
          (isEqual(deal.Stage, DEAL_STAGES.FUNDED) ||
            isEqual(deal.Stage, DEAL_STAGES.CLOSED_WON)) &&
          !deal.Investor1 &&
          deal.Duration_of_Advance
      );
      total = _filteredDeals.length;
    }

    return res
      .status(200)
      .json({ message: MESSAGES.NEW_DEALS, data: newDeals, total });
  } catch (error) {
    console.error(error);
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

/**
 * fetch the funded deals
 * @param user
 * @param res
 * @param query
 */
export const fundedDeals = async (user: IUser, res: Response, query: any) => {
  try {
    let pageNo = query.page ? Number(query.page) : 1;
    const dealFilter = query.filter
      ? query.filter.toLowerCase()
      : DEALS_FILTERS.ALL;
    let fundedDeals: any[] = [];
    const skipRecord = (pageNo - 1) * 10;
    let counter = 0;

    // reset page
    pageNo = 1;

    while (true) {
      const dealsResult = await getDeals(user.internal_id, user.role, pageNo);
      if (dealsResult.error) throw dealsResult.error;

      if (dealsResult.statusCode === HTTP_STATUS.NO_CONTENT) {
        if (fundedDeals.length) break;
        return res.status(204).json({ message: MESSAGES.NO_MORE_CONTENT });
      }

      // process data further
      const dealsArray = dealsResult.data;

      dealsArray.forEach((deal: any) => {
        if (dealFilter === DEALS_FILTERS.CLOSED) {
          if (isEqual(deal.Stage, DEAL_STAGES.DEAL_FULLY_CLOSED)) {
            counter++;
            if (counter > skipRecord) fundedDeals.push(deal);
          }
        } else {
          if (
            isEqual(deal.Stage, DEAL_STAGES.FUNDED) ||
            isEqual(deal.Stage, DEAL_STAGES.CLOSED_WON) ||
            isEqual(deal.Stage, DEAL_STAGES.DEAL_FULLY_CLOSED)
          ) {
            counter++;
            if (counter > skipRecord) fundedDeals.push(deal);
          }
        }
      });

      if (fundedDeals.length >= 10) {
        fundedDeals = fundedDeals.slice(0, 10);
        break;
      }
      pageNo++;
    }

    const redisResponse = await redisManager.getString(user.internal_id);
    const dealsCache = JSON.parse(redisResponse ? redisResponse : "{}");
    let total;

    if (dealFilter === DEALS_FILTERS.CLOSED) {
      if (dealsCache && dealsCache.fullyClosedDeals) {
        total = dealsCache.fullyClosedDeals;
      } else {
        const dealsResult = await getAllDeals(user.internal_id, user.role);
        let fullyClosedDeals = 0;
        const dealsArray = dealsResult.data;

        dealsArray.forEach((deal: any) => {
          if (isEqual(deal.Stage, DEAL_STAGES.DEAL_FULLY_CLOSED))
            fullyClosedDeals++;
        });
        total = fullyClosedDeals;
      }
    } else {
      if (dealsCache && dealsCache.fundedDeals) {
        total = dealsCache.fundedDeals;
      } else {
        const dealsResult = await getAllDeals(user.internal_id, user.role);
        let fundedDeals = 0;
        const dealsArray = dealsResult.data;

        dealsArray.forEach((deal: any) => {
          if (
            isEqual(deal.Stage, DEAL_STAGES.FUNDED) ||
            isEqual(deal.Stage, DEAL_STAGES.CLOSED_WON) ||
            isEqual(deal.Stage, DEAL_STAGES.DEAL_FULLY_CLOSED)
          )
            fundedDeals++;
        });
        total = fundedDeals;
      }
    }
    return res
      .status(200)
      .json({ message: MESSAGES.FUNDED_DEALS, data: fundedDeals, total });
  } catch (error) {
    console.error(error);
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};
