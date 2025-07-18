import {
  ACTIONS,
  DEALS_FILTERS,
  DEAL_STAGES,
  ERROR_MESSAGES,
  HTTP_STATUS,
  MESSAGES,
  MESSAGE_PLACEHOLDER,
  MESSAGE_TEMPLATES,
  MILLISEC_IN_1DAY,
  ZOHO,
} from "../../constants";
import { Response } from "express";
import { getAllDeals, getDeals, getDetails } from "../../helpers/zoho";
import { IUser } from "../../schemas/user";
import { isEqual, numberWithCommas } from "../../helpers/utility";
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
    let pageNo = query.page ? Number(query.page) : 1;

    const dealsResult = await getDeals(user.internal_id, user.role, pageNo, 10);
    if (dealsResult.error) throw dealsResult.error;

    if (dealsResult.statusCode === HTTP_STATUS.NO_CONTENT)
      return res.status(204).json({ message: MESSAGES.NO_MORE_CONTENT });
    const deals = dealsResult.data;

    if (!deals.length)
      return res.status(204).json({ message: MESSAGES.NO_MORE_CONTENT });

    // check if there is any cache for deals count
    const redisResponse = await RedisManager.getInstance().getString(
      user.internal_id
    );
    const dealsCountData = JSON.parse(redisResponse ? redisResponse : "{}");
    let total;
    if (dealsCountData?.dealsCount) total = dealsCountData.dealsCount;
    else {
      total = deals.length;
    }

    return res
      .status(200)
      .json({ message: MESSAGES.DEALS_FETCHED, data: deals, total });
  } catch (error) {
    console.error(error);
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

/**
 * fetch broker details from crm
 * @param user
 * @param res
 * @param query
 */
export const brokerDetails = async (user: IUser, res: Response) => {
  try {
    const detailsResult = await getDetails(user.internal_id, user.role);

    // check if there is any error occured while getting the broker details
    if (detailsResult.error) throw detailsResult.error;
    if (detailsResult.statusCode === HTTP_STATUS.NO_CONTENT)
      return res.status(204).json({ message: MESSAGES.NO_MORE_CONTENT });

    return res.status(HTTP_STATUS.OK).json({
      message: MESSAGES.BROKER_DETAILS_FETCHED,
      data: detailsResult.data,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

/**
 * check if any deal need email or document review actions
 * @param user
 * @param res
 * @returns
 */
export const actions = async (user: IUser, res: Response) => {
  try {
    // get the cache for deals count if any
    const cacheJson = await redisManager.getString(user.internal_id);
    const _dealsCount = JSON.parse(cacheJson);
    if (_dealsCount?.actions)
      return res
        .status(200)
        .json({ message: MESSAGES.ACTION_FETCHED, data: _dealsCount.actions });

    const dealsResult = await getAllDeals(user.internal_id, user.role);
    if (dealsResult.error) throw dealsResult.error;

    if (dealsResult.statusCode === HTTP_STATUS.NO_CONTENT)
      return res.status(204).json({ message: MESSAGES.NO_MORE_CONTENT });
    if (dealsResult.statusCode === HTTP_STATUS.UNAUTHORIZED)
      throw new Error(ERROR_MESSAGES.ZOHO_ACCESS_TOKEN_EXPIRED);

    // process data further
    const dealsArray = dealsResult.data;
    const actions = {
      actionReviewEmail: {
        count: 0,
        message: ACTIONS.REVIEW_EMAIL,
        propertyAddress: "",
        propertyAddresses: [] as string[],
      },
    };

    // check for any action pending
    dealsArray.forEach((deal: any) => {
      // check the email review action
      if (deal.Stage === DEAL_STAGES.APPROVED) {
        actions.actionReviewEmail.propertyAddresses.push(
          deal.Property_Street_Address
        );
        actions.actionReviewEmail.count++;
      }
    });

    actions.actionReviewEmail.propertyAddress =
      actions.actionReviewEmail.propertyAddresses.join(", ");

    // set the deals count cache
    const otherCache = _dealsCount ? _dealsCount : {};
    const _cache = JSON.stringify({ ...otherCache, actions });
    await redisManager.setString(user.internal_id, _cache);

    return res
      .status(200)
      .json({ message: MESSAGES.ACTION_FETCHED, data: actions });
  } catch (error) {
    console.error(error);
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

/**
 * fetch the closed and existing deals
 * @param user
 * @param res
 * @returns
 */
export const closedAndExistingDealsCount = async (
  user: IUser,
  res: Response
) => {
  try {
    // get the cache for deals count if any
    const cacheJson = await redisManager.getString(user.internal_id);
    const _dealsCount = JSON.parse(cacheJson);
    if (_dealsCount?.otherDealsCounts)
      return res.status(200).json({
        message: MESSAGES.DEALS_COUNT,
        data: _dealsCount.otherDealsCounts,
      });

    const dealsResult = await getAllDeals(user.internal_id, user.role);
    if (dealsResult.error) throw dealsResult.error;

    if (dealsResult.statusCode === HTTP_STATUS.NO_CONTENT)
      return res.status(204).json({ message: MESSAGES.NO_MORE_CONTENT });

    // process data further
    const dealsArray = dealsResult.data;
    const dealsCount = {
      existingDeals: { count: 0 },
      closedDeals: { count: 0 },
      otherDeals: { count: 0 },
    };

    // check for the closed and open deals count and latest deal timestamp
    dealsArray.forEach((deal: any) => {
      if (deal.Stage === DEAL_STAGES.DEAL_FULLY_CLOSED) {
        dealsCount.closedDeals.count++;
        dealsCount.existingDeals.count++;
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
        dealsCount.existingDeals.count++;
      } else {
        dealsCount.otherDeals.count++;
      }
    });

    // set the deals count cache
    const otherCache = _dealsCount ? _dealsCount : {};
    const _cache = JSON.stringify({
      ...otherCache,
      otherDealsCounts: dealsCount,
      dealsCount: dealsCount.existingDeals.count + dealsCount.otherDeals.count,
    });
    await redisManager.setString(user.internal_id, _cache);

    return res
      .status(200)
      .json({ message: MESSAGES.DEALS_COUNT, data: dealsCount });
  } catch (error) {
    console.error(error);
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

/**
 * calculate the commission advanced for monthly and weekly basis
 * @param user
 * @param res
 */
export const commissionAdvanced = async (user: IUser, res: Response) => {
  try {
    // check if there any cache saved for broker commission
    const cacheJson = await redisManager.getString(user.internal_id);
    const _dealsCommission = JSON.parse(cacheJson);
    if (_dealsCommission?.commissions)
      return res.status(200).json({
        message: MESSAGES.COMMISION_FETCHED,
        data: _dealsCommission.commissions,
      });

    const dealsResult = await getAllDeals(user.internal_id, user.role);
    if (dealsResult.error) throw dealsResult.error;

    if (dealsResult.statusCode === HTTP_STATUS.NO_CONTENT)
      return res.status(204).json({ message: MESSAGES.NO_MORE_CONTENT });

    // process data further
    const dealsArray = dealsResult.data;
    const _commisionAdvanced = {
      monthly: { timestamp: 0, amount: 0 },
      weekly: {
        timestamp: { first: 0, last: 0 },
        amount: 0,
        agents: "",
        agentsArr: [] as string[],
      },
    };

    // check for the closed and open deals count and latest deal timestamp
    dealsArray.forEach((deal: any) => {
      if (deal.Stage_Funded_Date) {
        if (
          isEqual(deal.Stage, DEAL_STAGES.FUNDED) ||
          isEqual(deal.Stage, DEAL_STAGES.DEAL_FULLY_CLOSED) ||
          isEqual(deal.Stage, DEAL_STAGES.CLOSED_WON)
        ) {
          const dealDate = new Date(deal.Stage_Funded_Date);

          const currentDate = new Date();
          const past30Days =
            new Date().setHours(0, 0, 0, 0) - MILLISEC_IN_1DAY * 30;
          const timeStamp = dealDate.getTime();

          // last 30 days commission
          if (dealDate.getTime() >= past30Days) {
            // const currentTimeStamp = _commisionAdvanced.monthly.timestamp;
            // _commisionAdvanced.monthly.timestamp = timeStamp > currentTimeStamp ? timeStamp : currentTimeStamp;
            _commisionAdvanced.monthly.amount +=
              deal.Rocket_Advance_Net_Advance || 0;
          }
          _commisionAdvanced.monthly.timestamp = past30Days;
          const currentTimeStamp = currentDate.getTime();
          // set the day the the starting time
          // currentDate.setHours(0,0,0,0);
          // const todayTimeInMilli =  currentTimeStamp - currentDate.getTime();
          // const skipDays = (dealDate.getDay() === 0 ? 7 : dealDate.getDay());
          // const timeStampAfterSkipingWeeks = currentTimeStamp - ((skipDays * MILLISEC_IN_1DAY) + todayTimeInMilli);
          // const currentDate = new Date();
        }
      }
      if (deal.Due_Date) {
        if (
          isEqual(deal.Stage, DEAL_STAGES.FUNDED) ||
          isEqual(deal.Stage, DEAL_STAGES.DEAL_FULLY_CLOSED) ||
          isEqual(deal.Stage, DEAL_STAGES.CLOSED_WON)
        ) {
          // console.log(deal);
          const currentDate = new Date();
          const firstDayOfWeek = new Date(
            currentDate.setDate(
              currentDate.getDate() -
                (currentDate.getDay() === 0 ? 7 : currentDate.getDay()) +
                1
            )
          ).setHours(0, 0, 0, 0); // Monday of current week
          const lastDayOfWeek = new Date(
            currentDate.setDate(
              currentDate.getDate() -
                (currentDate.getDay() === 0 ? 7 : currentDate.getDay()) +
                7
            )
          ).setHours(0, 0, 0, 0); // Sunday of current week
          const dueDate = new Date(deal.Due_Date);
          // weekly basis commission advanced
          if (
            dueDate.getTime() >= firstDayOfWeek &&
            dueDate.getTime() <= lastDayOfWeek
          ) {
            _commisionAdvanced.weekly.agentsArr.push(deal.Contact_Name["name"]);

            const currentTimeStamp = _commisionAdvanced.weekly.timestamp;
            // _commisionAdvanced.weekly.timestamp = timeStamp > currentTimeStamp ? timeStamp : currentTimeStamp;
            _commisionAdvanced.weekly.amount +=
              deal.Rocket_Advance_Net_Advance || 0;
          }
          _commisionAdvanced.weekly.timestamp = {
            first: firstDayOfWeek,
            last: lastDayOfWeek,
          };
        }
      }
    });
    _commisionAdvanced.weekly.agents =
      _commisionAdvanced.weekly.agentsArr.join(", ");
    // _commisionAdvanced.monthly.amount = Number(
    //   numberWithCommas(_commisionAdvanced.monthly.amount.toFixed(2))
    // );
    // _commisionAdvanced.weekly.amount = Number(
    //   numberWithCommas(_commisionAdvanced.weekly.amount.toFixed(2))
    // );
    // console.log(_commisionAdvanced);

    // set the commission cache
    const otherCache = _dealsCommission ? _dealsCommission : {};
    const _cache = JSON.stringify({
      ...otherCache,
      commissions: _commisionAdvanced,
    });
    await redisManager.setString(user.internal_id, _cache);

    return res
      .status(200)
      .json({ message: MESSAGES.COMMISION_FETCHED, data: _commisionAdvanced });
  } catch (error) {
    console.error(error);
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};
//   try {

//       let pageNo = query.page ? Number(query.page) : 1;
//       const dealFilter = query.filter ? query.filter.toLowerCase() : DEALS_FILTERS.ALL;
//       let _deals = [];

//       while(true) {
//       const dealsResult = await getDeals(user.internal_id, user.role, pageNo, 10);
//       if(dealsResult.error) throw dealsResult.error;

//       if(dealsResult.statusCode === HTTP_STATUS.NO_CONTENT) return res.status(204).json({message: MESSAGES.NO_MORE_CONTENT});
//       const deals = dealsResult.data;

//       // filter deals if filter applied
//       if(dealFilter !== DEALS_FILTERS.ALL) {
//         if(dealFilter === DEALS_FILTERS.CLOSED) _deals.push(...deals.filter((deal:any) => deal.Stage === DEAL_STAGES.DEAL_FULLY_CLOSED));
//         else if(dealFilter === DEALS_FILTERS.OPEN) _deals.push(...deals.filter((deal:any) => deal.Stage !== DEAL_STAGES.DEAL_FULLY_CLOSED));

//         if(_deals.length === 10) break;
//         pageNo++;
//       } else {
//         _deals = deals;
//         break;
//       }
//     }

//       if(!_deals.length) return res.status(204).json({message: MESSAGES.NO_MORE_CONTENT})

//       const redisResponse = await RedisManager.getInstance().getString(user.internal_id);
//       let length = 10;
//       if(!redisResponse) {
//         const allDeals = await getDeals(user.internal_id, user.role);

//       }

//       return res.status(200).json({message: MESSAGES.DEALS_FETCHED, data: _deals});

//   } catch (error) {
//     console.error(error);
//     res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
//   }
// };
