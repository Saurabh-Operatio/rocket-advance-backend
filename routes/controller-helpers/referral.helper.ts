import { DEAL_STAGES, HTTP_STATUS, MESSAGES, USER_ROLES } from '../../constants';
import { Response } from 'express';
import { getAllDeals, getAllReferralContacts, getDetails } from '../../helpers/zoho';
import { IUser } from '../../schemas/user';
import { isEqual } from '../../helpers/utility';
import { RedisManager } from '../../services/cache/cache.redis';


// redis manager instance
const redisManager = RedisManager.getInstance();

/**
 * fetch the lead form
 * @param user 
 * @param res 
 * @returns 
 */
export const leadFrom = async (user: IUser, res: Response) => {
  try {

    // check if there any cache saved for broker commission
    const cacheJson = await redisManager.getString(user.internal_id);
    const _dealsStats = JSON.parse(cacheJson);
    if (_dealsStats?.leadform)
      return res.status(200).json({ message: MESSAGES.LEAD_FORM, data: _dealsStats?.leadform });


    const userResult = await getDetails(user.internal_id, user.role);
    if (userResult.error) throw userResult.error;

    if (userResult.statusCode === HTTP_STATUS.NO_CONTENT) return res.status(204).json({ message: MESSAGES.NO_MORE_CONTENT });
    const userDetails = { 
      Short_Lead_Referral_Form: userResult.data.Short_Lead_Referral_Form,
      Lead_Shortened_Cuttly : userResult.data.Lead_Shortened_Cuttly
    }


    // set the stats cache
    const otherCache = _dealsStats ? _dealsStats : {};
    const _cache = JSON.stringify({ ...otherCache, leadform: userDetails});
    await redisManager.setString(user.internal_id, _cache);

    return res.status(200).json({ message: MESSAGES.LEAD_FORM, data: userDetails });

  } catch (error) {
    console.error(error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};


/**
 * calculate the referral stats
 * @param user 
 * @param res 
 * @returns 
 */
export const referralStats = async (user: IUser, res: Response) => {
  try {

    // check if there any cache saved for broker commission
    const cacheJson = await redisManager.getString(user.internal_id);
    const _dealsStats = JSON.parse(cacheJson);
    if (_dealsStats?.stats)
      return res.status(200).json({ message: MESSAGES.STATS_FETCHED, data: _dealsStats?.stats });

    const userResult = await getAllReferralContacts(user.internal_id);
    if (userResult.error) throw userResult.error;

    if (userResult.statusCode === HTTP_STATUS.NO_CONTENT) return res.status(204).json({ message: MESSAGES.NO_MORE_CONTENT });
    const contacts = userResult.data;

    // fetch deals for all contacts under the current referral
    const deals = [];
    for (const contact of contacts) {
      const _deals = await getAllDeals(contact.id, USER_ROLES.AGENT);
      if (_deals.data?.length) deals.push(..._deals.data);
    }

    const stats = {
      totalCommission: { amount: 0, count: 0 },
      pendingCommission: { amount: 0, count: 0 },
      referralDeals: { count: 0 },
    }

    // check for the closed and open deals count and latest deal timestamp
    deals.forEach((deal: any) => {

      // if (deal.Stage_Funded_Date) {
        // for funded deals
        if (isEqual(deal.Stage, DEAL_STAGES.DEAL_FULLY_CLOSED))
          stats.totalCommission.count++;

        // for investor income
        if (isEqual(deal.Stage, DEAL_STAGES.FUNDED) || isEqual(deal.Stage, DEAL_STAGES.CLOSED_WON))
          stats.pendingCommission.count++;
      // }
    });

    // calculate the commission stats
    stats.totalCommission.amount = (stats.totalCommission.count * 100);
    stats.pendingCommission.amount = (stats.pendingCommission.count * 100);
    stats.referralDeals.count = stats.totalCommission.count + stats.pendingCommission.count;


    // set the stats cache
    const otherCache = _dealsStats ? _dealsStats : {};
    const _cache = JSON.stringify({ ...otherCache, stats: stats });
    await redisManager.setString(user.internal_id, _cache);

    return res.status(200).json({ message: MESSAGES.STATS_FETCHED, data: stats });

  } catch (error) {
    console.error(error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};