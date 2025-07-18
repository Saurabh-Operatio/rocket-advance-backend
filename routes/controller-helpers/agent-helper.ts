import {
  ACTIONS,
  DEALS_FILTERS,
  DEAL_STAGES,
  ERROR_MESSAGES,
  HTTP_STATUS,
  MESSAGES,
  ZOHO,
} from "../../constants";
import { Response } from "express";
import { getAllDeals, getDeals, getDetails } from "../../helpers/zoho";
import { IUser } from "../../schemas/user";
import {
  checkValueInArray,
  countDeals,
  isEqual,
  numberWithCommas,
} from "../../helpers/utility";
import { RedisManager } from "../../services/cache/cache.redis";

// redis manager instance
const redisManager = RedisManager.getInstance();
interface OfferWidget {
  offerAmount: string;
  dealNo: string;
  verificationLink: string;
  propertyAddress: string;
  message: string;
}
/**
 * agent deals
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
    const dealFilter = query.filter
      ? query.filter.toLowerCase()
      : DEALS_FILTERS.ALL;
    let _deals: any[] = [];
    let skipRecords = (pageNo - 1) * 10;
    let counter = 0;

    if (
      dealFilter &&
      !checkValueInArray(Object.values(DEALS_FILTERS), dealFilter)
    ) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .send({ message: MESSAGES.INVALID_QUERY });
    }

    const allDealsFilter = !!dealFilter
      ? dealFilter === DEALS_FILTERS.ALL
      : true;

    // reset page if all deals filter not selected
    pageNo = allDealsFilter ? pageNo : 1;

    while (true) {
      const dealsResult = await getDeals(
        user.internal_id,
        user.role,
        pageNo,
        allDealsFilter ? 10 : 200
      );

      if (dealsResult.error) throw dealsResult.error;

      if (dealsResult.statusCode === HTTP_STATUS.NO_CONTENT) {
        if (_deals.length) break;
        return res.status(204).json({ message: MESSAGES.NO_MORE_CONTENT });
      }
      const deals = dealsResult.data;

      // filter deals if filter applied
      if (!allDealsFilter) {
        deals.forEach((deal: any) => {
          if (dealFilter === DEALS_FILTERS.CLOSED) {
            if (deal.Stage === DEAL_STAGES.DEAL_FULLY_CLOSED) {
              counter++;
              if (skipRecords < counter) _deals.push(deal);
            }
          } else if (dealFilter === DEALS_FILTERS.OPEN) {
            if (
              [
                DEAL_STAGES.NEW_DEAL,
                DEAL_STAGES.MORE_INFO_NEEDED,
                DEAL_STAGES.UNDERWRITING,
                DEAL_STAGES.APPROVED,
                DEAL_STAGES.CLOSED_WON,
                DEAL_STAGES.FUNDED,
              ].includes(deal.Stage)
            ) {
              counter++;
              if (skipRecords < counter) _deals.push(deal);
            }
          }
        });

        if (_deals.length >= 10) {
          _deals = _deals.slice(0, 10);
          break;
        }
        pageNo++;
      } else {
        _deals = deals;
        break;
      }
    }

    if (!_deals.length)
      return res.status(204).json({ message: MESSAGES.NO_MORE_CONTENT });
    _deals = _deals.map((deal) => {
      if (deal.Stage !== DEAL_STAGES.FUNDED) {
        return { ...deal, Request_Amendment_Form: null };
      }
      return deal;
    });

    const redisResponse = await redisManager.getString(user.internal_id);
    const dealsCache = JSON.parse(redisResponse ? redisResponse : "{}");

    // get the total count for all, open, closed deals
    // const total =
    //   dealsCache?.otherDealsCounts && dealFilter === DEALS_FILTERS.CLOSED
    //     ? dealsCache?.otherDealsCounts.closedDeals.count
    //     : dealFilter === DEALS_FILTERS.OPEN
    //     ? dealsCache?.otherDealsCounts.openDeals.count
    //     : dealsCache?.dealsCount
    //     ? dealsCache?.dealsCount
    //     : 10;

    let total;
    let counts = {
      openDeals: { count: 0 },
      closedDeals: { count: 0 },
      total: { count: 0 },
    };

    if (dealsCache?.otherDealsCounts) {
      counts = dealsCache?.otherDealsCounts;
    } else {
      counts = await countDeals(user.internal_id, user.role);
      const otherCache = dealsCache ? dealsCache : {};
      const _cache = JSON.stringify({
        ...otherCache,
        otherDealsCounts: counts,
      });
      await redisManager.setString(user.internal_id, _cache);
    }

    if (dealFilter === DEALS_FILTERS.CLOSED) total = counts?.closedDeals.count;
    else if (dealFilter === DEALS_FILTERS.OPEN) total = counts?.openDeals.count;
    else total = counts?.total.count;

    return res
      .status(200)
      .json({ message: MESSAGES.DEALS_FETCHED, data: _deals, total });
  } catch (error) {
    console.error(error);
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

// export const deals = async (user: IUser, res: Response, query:any) => {
//     try {

//         const pageNo = query.page ? Number(query.page) : 1;
//         const dealFilter = query.filter ? query.filter.toLowerCase() : DEALS_FILTERS.ALL;

//         const dealsResult = await getDeals(user.internal_id, user.role, pageNo);
//         if(dealsResult.error) throw dealsResult.error;

//         if(dealsResult.statusCode === HTTP_STATUS.NO_CONTENT) return res.status(204).json({message: MESSAGES.NO_MORE_CONTENT});

//         let deals = dealsResult.data;
//         // filter deals if filter applied
//         if(dealFilter !== DEALS_FILTERS.ALL) {
//           if(dealFilter === DEALS_FILTERS.CLOSED) deals = deals.filter((deal:any) => deal.Stage === DEAL_STAGES.DEAL_FULLY_CLOSED);
//           else if(dealFilter === DEALS_FILTERS.OPEN) deals = deals.filter((deal:any) => deal.Stage !== DEAL_STAGES.DEAL_FULLY_CLOSED);
//         }

//         if(!deals?.length) return res.status(204).json({message: MESSAGES.NO_MORE_CONTENT})
//         return res.status(200).json({message: MESSAGES.DEALS_FETCHED, data: deals});

//     } catch (error) {
//       console.error(error);
//       res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
//     }
//   };

/**
 * open and close deals
 * @param user
 * @param res
 * @returns
 */
export const openAndClosedDealsCount = async (user: IUser, res: Response) => {
  try {
    // get the cache for deals count if any
    // const cacheJson = await redisManager.getString(user.internal_id);
    // const _dealsCount = JSON.parse(cacheJson);
    // if (_dealsCount?.otherDealsCounts)
    //   return res.status(200).json({
    //     message: MESSAGES.DEALS_COUNT,
    //     data: _dealsCount.otherDealsCounts,
    //   });

    const dealsCount = await countDeals(user.internal_id, user.role);
    // set the deals count cache
    // const otherCache = _dealsCount ? _dealsCount : {};
    // const _cache = JSON.stringify({
    //   ...otherCache,
    //   otherDealsCounts: dealsCount,
    // });
    // await redisManager.setString(user.internal_id, _cache);

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
 * agent commissions
 * @param user
 * @param res
 * @returns
 */
export const commisions = async (user: IUser, res: Response) => {
  try {
    // get the cache for deals count if any
    const cacheJson = await redisManager.getString(user.internal_id);
    const _dealsCount = JSON.parse(cacheJson);
    if (_dealsCount?.commisions)
      return res.status(200).json({
        message: MESSAGES.COMMISION_FETCHED,
        data: _dealsCount?.commisions,
      });

    const dealsResult = await getAllDeals(user.internal_id, user.role);
    if (dealsResult.error) throw dealsResult.error;

    if (dealsResult.statusCode === HTTP_STATUS.NO_CONTENT)
      return res.status(204).json({ message: MESSAGES.NO_MORE_CONTENT });

    // process data further
    const dealsArray = dealsResult.data;
    const _commisions = {
      total_commision_advanced: { amount: "", amountNumber: 0 },
      open_commision_advanced: { amount: "", amountNumber: 0 },
    };

    // check for the closed and open deals count and latest deal timestamp
    dealsArray.forEach((deal: any) => {
      if (deal.Stage_Funded_Date) {
        if (
          deal.Stage === DEAL_STAGES.FUNDED ||
          deal.Stage === DEAL_STAGES.DEAL_FULLY_CLOSED
        )
          _commisions.total_commision_advanced.amountNumber +=
            deal.Rocket_Advance_Contribution || 0;

        if (deal.Stage === DEAL_STAGES.FUNDED)
          _commisions.open_commision_advanced.amountNumber +=
            deal.Rocket_Advance_Contribution || 0;
      }
    });
    _commisions.open_commision_advanced.amount = numberWithCommas(
      _commisions.open_commision_advanced.amountNumber.toFixed(2)
    );
    _commisions.total_commision_advanced.amount = numberWithCommas(
      _commisions.total_commision_advanced.amountNumber.toFixed(2)
    );

    // set the deals count cache
    const otherCache = _dealsCount ? _dealsCount : {};
    const _cache = JSON.stringify({ ...otherCache, commisions: _commisions });
    await redisManager.setString(user.internal_id, _cache);

    return res
      .status(200)
      .json({ message: MESSAGES.COMMISION_FETCHED, data: _commisions });
  } catch (error) {
    console.error(error);
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

/**
 * get the new deal url
 * @param user
 * @param res
 * @returns
 */
export const newDeal = async (user: IUser, res: Response) => {
  try {
    // check if there any cache saved for broker commission
    const cacheJson = await redisManager.getString(user.internal_id);
    const _dealsStats = JSON.parse(cacheJson);
    if (_dealsStats?.newdealform)
      return res.status(200).json({
        message: MESSAGES.NEW_DEAL_URL,
        data: _dealsStats?.newdealform,
      });

    const detailsSearchResponse = await getDetails(user.internal_id, user.role);
    if (detailsSearchResponse.error) throw detailsSearchResponse.error;
    const newDealForm = {
      newDealForm: detailsSearchResponse.data["Pre_Approval_Forms"],
    };

    // set the stats cache
    const otherCache = _dealsStats ? _dealsStats : {};
    const _cache = JSON.stringify({ ...otherCache, newdealform: newDealForm });
    await redisManager.setString(user.internal_id, _cache);

    return res
      .status(200)
      .json({ message: MESSAGES.NEW_DEAL_URL, data: newDealForm });
  } catch (error) {
    console.error(error);
    res
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
      actionReviewDocPage: { count: 0, message: ACTIONS.REVIEW_DOC_PAGE },
    };
    let docsCount = 0;

    // check for any action pending
    dealsArray.forEach((deal: any) => {
      // if supporting doc 1 not null
      if (deal.Supporting_Doc_1_Type) docsCount++;
      // if supporting doc 2 not null
      if (deal.Supporting_Doc_2_Type) docsCount++;

      // check the email review action
      if (deal.Stage === DEAL_STAGES.APPROVED) {
        actions.actionReviewEmail.propertyAddresses.push(
          deal.Property_Street_Address
        );
        actions.actionReviewEmail.count++;
      }

      // check for review doc page action
      if (
        (deal.Supporting_Doc_1_Type &&
          isEqual(
            deal.Supporting_Doc_1_Status,
            ZOHO.SUPPORTING_DOC_TYPE_STATUS_AWAITING
          )) ||
        (deal.Supporting_Doc_2_Type &&
          isEqual(
            deal.Supporting_Doc_2_Status,
            ZOHO.SUPPORTING_DOC_TYPE_STATUS_AWAITING
          ))
      )
        actions.actionReviewDocPage.count++;
    });
    actions.actionReviewEmail.propertyAddress =
      actions.actionReviewEmail.propertyAddresses.join(", ");
    // set the deals count cache
    const otherCache = _dealsCount ? _dealsCount : {};
    const _cache = JSON.stringify({ ...otherCache, actions, docsCount });
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
 * Check if any deals need verification actions and create offer widgets
 * @param user
 * @param res
 * @returns
 */
export const getOfferWidgets = async (user: IUser, res: Response) => {
  try {
    // Get the cache for deals if any
    // const cacheJson = await redisManager.getString(user.internal_id);
    // const _dealsCount = JSON.parse(cacheJson);
    // if (_dealsCount?.offerWidgets) {
    //   return res.status(200).json({
    //     message: MESSAGES.ACTION_FETCHED,
    //     data: _dealsCount.offerWidgets,
    //   });
    // }

    // Fetch all deals for the user
    const dealsResult = await getAllDeals(user.internal_id, user.role);
    if (dealsResult.error) throw dealsResult.error;

    if (dealsResult.statusCode === HTTP_STATUS.NO_CONTENT)
      return res.status(204).json({ message: MESSAGES.NO_MORE_CONTENT });
    if (dealsResult.statusCode === HTTP_STATUS.UNAUTHORIZED)
      throw new Error(ERROR_MESSAGES.ZOHO_ACCESS_TOKEN_EXPIRED);

    // Extract deals data
    const dealsArray = dealsResult.data;
    const offerWidgets: OfferWidget[] = [];

    // Loop through deals to create offer widgets
    dealsArray.forEach((deal: any) => {
      console.log(deal);

      const isEligible =
        (deal.Stage === DEAL_STAGES.NEW_DEAL ||
          deal.Stage === DEAL_STAGES.PRE_APPROVAL_SENT) &&
        deal.Verification_Form_Submitted === false &&
        deal.Verification_Form &&
        deal.Client_Gets;

      if (isEligible) {
        offerWidgets.push({
          offerAmount: deal.Client_Gets,
          dealNo: deal.unique_deal_number1,
          verificationLink: deal.Verification_Form,
          propertyAddress: deal.Property_Street_Address,
          message: `Click to verify offer of ${deal.Client_Gets} for property at ${deal.Property_Street_Address}`,
        });
      }
    });

    // Cache the result for faster retrieval next time
    // const otherCache = _dealsCount ? _dealsCount : {};
    // const _cache = JSON.stringify({ ...otherCache, offerWidgets });
    // await redisManager.setString(user.internal_id, _cache);

    return res
      .status(200)
      .json({ message: MESSAGES.ACTION_FETCHED, data: offerWidgets });
  } catch (error) {
    console.error(error);
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

/**
 * status and uploading url of docs related to deals
 * @param user
 * @param res
 * @returns
 */
export const docs = async (user: IUser, res: Response, query: any) => {
  try {
    let pageNo = query.page ? Number(query.page) : 1;
    let docsList: any[] = [];
    let docsCount = 0;
    const skipDocs = (pageNo - 1) * 10;

    //reset page
    pageNo = 1;

    while (true) {
      const dealsResult = await getDeals(user.internal_id, user.role, pageNo);
      if (dealsResult.error) throw dealsResult.error;

      if (dealsResult.statusCode === HTTP_STATUS.NO_CONTENT) {
        if (docsList.length) break;
        return res.status(204).json({ message: MESSAGES.NO_MORE_CONTENT });
      }

      if (dealsResult.statusCode === HTTP_STATUS.UNAUTHORIZED)
        throw new Error(ERROR_MESSAGES.ZOHO_ACCESS_TOKEN_EXPIRED);

      // process data further
      const dealsList = dealsResult.data;

      // extract the both docs types for all deals
      dealsList.forEach((deal: any) => {
        // if supporting doc 1 not null
        if (deal.Supporting_Doc_1_Type) {
          const doc1 = {
            Supporting_Doc_Status: deal.Supporting_Doc_1_Status,
            Supporting_Doc_Type: deal.Supporting_Doc_1_Type,
            Submit_Supporting_Doc_Form: deal.Submit_Supporting_Doc_1_Form,
            Deal_Name: deal.Deal_Name,
            Property_Street_Address: deal.Property_Street_Address,
          };
          docsCount++;
          if (skipDocs < docsCount) docsList.push(doc1);
        }

        // if supporting doc 2 not null
        if (deal.Supporting_Doc_2_Type) {
          const doc2 = {
            Supporting_Doc_Status: deal.Supporting_Doc_2_Status,
            Supporting_Doc_Type: deal.Supporting_Doc_2_Type,
            Submit_Supporting_Doc_Form: deal.Submit_Supporting_Doc_2_Form,
            Deal_Name: deal.Deal_Name,
            Property_Street_Address: deal.Property_Street_Address,
          };
          docsCount++;
          if (skipDocs < docsCount) docsList.push(doc2);
        }
      });

      if (docsList.length >= 10) {
        docsList = docsList.slice(0, 10);
        break;
      }
      pageNo++;
    }

    // get the cache for deals count if any
    const cacheJson = await redisManager.getString(user.internal_id);
    const _dealsCount = JSON.parse(cacheJson);

    const total = _dealsCount?.docsCount
      ? _dealsCount?.docsCount
      : _dealsCount?.dealsCount
      ? _dealsCount?.dealsCount * 2
      : 20;
    return res
      .status(200)
      .json({ message: MESSAGES.DOCS_FETCHED, data: docsList, total });
  } catch (error) {
    console.error(error);
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};
